export interface UploadedFileInfo {
  file: File | null;
  fileName: string;
  fileSize: number;
  rowCount: number;
  headers: string[];
  records: Record<string, any>[];
  detectedColumn?: string;
  isSample?: boolean;
}

export interface MatchRecord {
  id: number;
  userName: string;
  country: string;
  matchedEmail: string;
  matchPercentage: number;
  originalName?: string;
  emailScoreBreakdown?: string;
  [key: string]: any;
}

export interface MatchingRange {
  maxPercent: number; // e.g. 100
  minPercent: number; // e.g. 50
}

export type MatchingState = 'idle' | 'matching' | 'completed';

export interface MatchingStats {
  totalProcessed: number;
  totalMatched: number;
  matchingRange: string;
  durationMs: number;
}

export interface AlertState {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
}
