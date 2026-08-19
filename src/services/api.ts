export interface FileSummaryResponse {
  filename: string;
  columns: string[];
  row_count: number;
  detected_column: string;
}

export interface UploadApiResponse {
  success: boolean;
  email_file: FileSummaryResponse;
  names_file: FileSummaryResponse;
}

export interface BackendMatchRecord {
  name: string;
  email: string;
  match_percentage: number;
  [key: string]: any;
}

export interface MatchApiResponse {
  success: boolean;
  total_records_processed: number;
  total_matched_records: number;
  matching_range: {
    from: number;
    to: number;
  };
  results: BackendMatchRecord[];
}

/**
 * Sends Email File and Names File to the backend API endpoint POST /api/upload.
 */
export async function uploadFilesToBackend(
  emailFile: File,
  namesFile: File
): Promise<UploadApiResponse> {
  const formData = new FormData();
  formData.append('email_file', emailFile);
  formData.append('names_file', namesFile);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to upload files to backend server.');
  }

  return data as UploadApiResponse;
}

/**
 * Sends Email File, Names File, and percentage range to POST /api/match.
 */
export async function matchFilesToBackend(
  emailFile: File,
  namesFile: File,
  fromPercentage: number,
  toPercentage: number
): Promise<MatchApiResponse> {
  const formData = new FormData();
  formData.append('email_file', emailFile);
  formData.append('names_file', namesFile);
  formData.append('from_percentage', fromPercentage.toString());
  formData.append('to_percentage', toPercentage.toString());

  const response = await fetch('/api/match', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'An error occurred during matching execution.');
  }

  return data as MatchApiResponse;
}

/**
 * Downloads the latest session matched results from GET /api/download in CSV or XLSX format.
 */
export async function downloadMatchedResultsFromBackend(
  format: 'csv' | 'xlsx',
  filenameStem: string = 'matched_results'
): Promise<void> {
  const response = await fetch(`/api/download?format=${format}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || 'Unable to generate matched file. Please try again.');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenameStem}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
