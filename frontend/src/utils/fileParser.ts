import * as XLSX from 'xlsx';
import { UploadedFileInfo, MatchRecord } from '../types';

export async function parseUploadedFile(file: File): Promise<UploadedFileInfo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

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

        // Automatically identify best candidate column
        let detectedColumn = '';
        const lowerHeaders = headers.map(h => h.toLowerCase());
        const emailIndex = lowerHeaders.findIndex(h => h.includes('email') || h.includes('mail'));
        const nameIndex = lowerHeaders.findIndex(h => h.includes('name') || h.includes('user') || h.includes('fb'));

        if (emailIndex !== -1) {
          detectedColumn = headers[emailIndex];
        } else if (nameIndex !== -1) {
          detectedColumn = headers[nameIndex];
        } else if (headers.length > 0) {
          detectedColumn = headers[0];
        }

        resolve({
          file,
          fileName: file.name,
          fileSize: file.size,
          rowCount: jsonData.length,
          headers,
          records: jsonData,
          detectedColumn,
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

// Convert UploadedFileInfo into a File object for API submission
export function getFileFromUploadedInfo(info: UploadedFileInfo): File {
  if (info.file) {
    return info.file;
  }
  const worksheet = XLSX.utils.json_to_sheet(info.records);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  return new File([blob], info.fileName || 'data.csv', { type: 'text/csv' });
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
