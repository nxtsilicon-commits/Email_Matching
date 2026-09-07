import * as XLSX from 'xlsx';
import { UploadedFileInfo, MatchRecord } from '../types';

function detectBestCandidateColumn(headers: string[]): string {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const emailIndex = lowerHeaders.findIndex(h => h.includes('email') || h.includes('mail'));
  const nameIndex = lowerHeaders.findIndex(h => h.includes('name') || h.includes('user') || h.includes('fb'));

  if (emailIndex !== -1) {
    return headers[emailIndex];
  } else if (nameIndex !== -1) {
    return headers[nameIndex];
  } else if (headers.length > 0) {
    return headers[0];
  }
  return '';
}

function parseCSVHeadersAndDelimiter(firstLine: string): { headers: string[]; delimiter: string } {
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  const headers: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      headers.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  headers.push(current.trim().replace(/^["']|["']$/g, ''));
  return { headers: headers.filter(h => h.length > 0), delimiter };
}

export async function parseUploadedFile(file: File): Promise<UploadedFileInfo> {
  const isCSV = file.name.toLowerCase().endsWith('.csv');

  if (isCSV) {
    // Fast path for CSV (prevents Chrome freeze on large 800k+ row files)
    const chunkText = await file.slice(0, 65536).text();
    const firstLineEnd = chunkText.indexOf('\n');
    const firstLine = (firstLineEnd !== -1 ? chunkText.slice(0, firstLineEnd) : chunkText).replace(/\r$/, '');

    if (!firstLine.trim()) {
      throw new Error('The file appears to be empty or has no header row.');
    }

    const { headers, delimiter } = parseCSVHeadersAndDelimiter(firstLine);
    if (headers.length === 0) {
      throw new Error('No column headers could be detected in the CSV file.');
    }

    // Fast newline counting without allocating millions of JS objects in memory
    const fullText = await file.text();
    let rowCount = 0;
    for (let i = 0; i < fullText.length; i++) {
      if (fullText.charCodeAt(i) === 10) rowCount++;
    }
    if (fullText.length > 0 && fullText.charCodeAt(fullText.length - 1) !== 10) rowCount++;
    // Exclude header row
    const actualRowCount = Math.max(1, rowCount - 1);

    // Keep only a small sample preview (first 20 rows) for memory efficiency
    const sampleLines = fullText.split(/\r?\n/).slice(1, 21);
    const sampleRecords: Record<string, any>[] = [];
    for (const line of sampleLines) {
      if (!line.trim()) continue;
      const parts = line.split(delimiter);
      const rowObj: Record<string, any> = {};
      headers.forEach((h, i) => {
        rowObj[h] = parts[i] ? parts[i].trim().replace(/^["']|["']$/g, '') : '';
      });
      sampleRecords.push(rowObj);
    }

    const detectedColumn = detectBestCandidateColumn(headers);

    return {
      file,
      fileName: file.name,
      fileSize: file.size,
      rowCount: actualRowCount,
      headers,
      records: sampleRecords,
      detectedColumn,
      selectedColumn: detectedColumn,
      isSample: false,
    };
  }

  // Excel spreadsheets (.xlsx, .xls)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // Only parse the first 30 rows into memory for instant header extraction
        const workbook = XLSX.read(data, { type: 'array', sheetRows: 30 });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('The uploaded file does not contain any sheets.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          throw new Error('The file appears to be empty or has no data rows.');
        }

        const headers = Object.keys(jsonData[0] || {});
        let estimatedRows = jsonData.length;

        // Try reading total dimensions from range if available
        if (worksheet['!ref']) {
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          estimatedRows = Math.max(jsonData.length, range.e.r);
        }

        const detectedColumn = detectBestCandidateColumn(headers);

        resolve({
          file,
          fileName: file.name,
          fileSize: file.size,
          rowCount: estimatedRows,
          headers,
          records: jsonData,
          detectedColumn,
          selectedColumn: detectedColumn,
          isSample: false,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse file. Please verify it is a valid CSV, XLSX, or XLS file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('File reading error. Please try uploading again.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// Convert UploadedFileInfo into an optimized File object for API submission
export function getFileFromUploadedInfo(info: UploadedFileInfo): File {
  // If native file handle is present, return it directly! Zero serialization overhead.
  if (info.file) {
    return info.file;
  }
  // Only for sample demonstration datasets where info.file is null
  if (info.records && info.records.length > 0) {
    const worksheet = XLSX.utils.json_to_sheet(info.records);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const stem = (info.fileName || 'data').replace(/\.[^/.]+$/, '');
    return new File([blob], `${stem}.csv`, { type: 'text/csv' });
  }
  return new File([], 'empty.csv', { type: 'text/csv' });
}

// Export matched results as CSV file
export function exportToCSV(records: MatchRecord[], filename: string = 'matched_results.csv'): void {
  if (records.length === 0) return;

  const header = ['#', 'User Name (FB)', 'Country', 'Matched Email', 'Match %'];
  const rows = records.map((r, i) => [
    i + 1,
    `"${(r.userName || '').replace(/"/g, '""')}"`,
    `"${(r.country || '').replace(/"/g, '""')}"`,
    `"${(r.matchedEmail || '').replace(/"/g, '""')}"`,
    `${r.matchPercentage}%`
  ]);

  const csvContent = [header.join(','), ...rows.map(e => e.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export matched results as XLSX file
export function exportToXLSX(records: MatchRecord[], filename: string = 'matched_results.xlsx'): void {
  if (records.length === 0) return;

  const exportData = records.map((r, i) => ({
    '#': i + 1,
    'User Name (FB)': r.userName,
    'Country': r.country,
    'Matched Email': r.matchedEmail,
    'Match %': `${r.matchPercentage}%`
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Matched Results');

  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
