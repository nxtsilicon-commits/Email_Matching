import React, { useState, useMemo } from 'react';
import { Search, FileText, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2 } from 'lucide-react';
import { MatchRecord } from '../types';
import { exportToCSV, exportToXLSX } from '../utils/fileParser';
import { downloadMatchedResultsFromBackend } from '../services/api';

interface MatchedResultsTableProps {
  records: MatchRecord[];
  isMatchingCompleted: boolean;
  matchingRangeUsed: string;
  onError?: (errorMessage: string) => void;
}

export const MatchedResultsTable: React.FC<MatchedResultsTableProps> = ({
  records,
  isMatchingCompleted,
  matchingRangeUsed,
  onError,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const pageSize = 10;

  // Filter records based on search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const lower = searchTerm.toLowerCase();
    return records.filter(
      (r) =>
        r.userName.toLowerCase().includes(lower) ||
        r.matchedEmail.toLowerCase().includes(lower) ||
        r.country.toLowerCase().includes(lower) ||
        `${r.matchPercentage}%`.includes(lower)
    );
  }, [records, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  const handleDownloadCSV = async () => {
    if (isDownloading || !isMatchingCompleted || records.length === 0) return;
    setIsDownloading(true);
    const filenameStem = `Matched_Results_${matchingRangeUsed.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      await downloadMatchedResultsFromBackend('csv', filenameStem);
    } catch (err: any) {
      try {
        exportToCSV(records, `${filenameStem}.csv`);
      } catch (fallbackErr: any) {
        if (onError) {
          onError(err.message || 'Unable to generate matched file. Please try again.');
        }
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadXLSX = async () => {
    if (isDownloading || !isMatchingCompleted || records.length === 0) return;
    setIsDownloading(true);
    const filenameStem = `Matched_Results_${matchingRangeUsed.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      await downloadMatchedResultsFromBackend('xlsx', filenameStem);
    } catch (err: any) {
      try {
        exportToXLSX(records, `${filenameStem}.xlsx`);
      } catch (fallbackErr: any) {
        if (onError) {
          onError(err.message || 'Unable to generate matched file. Please try again.');
        }
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Get color badge class for percentage
  const getBadgeClass = (pct: number) => {
    if (pct === 100) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (pct >= 90) {
      return 'bg-teal-100 text-teal-800 border-teal-300';
    } else if (pct >= 70) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="pt-2 flex-1 min-h-0 flex flex-col space-y-2">
      {/* Section Header with Download Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Matched Result
        </h3>

        {/* Download Buttons */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-download-csv"
            type="button"
            onClick={handleDownloadCSV}
            disabled={!isMatchingCompleted || records.length === 0 || isDownloading}
            className={`text-white text-[11px] font-bold px-4 py-2 rounded-md shadow-sm flex items-center space-x-1 transition-colors ${
              isMatchingCompleted && records.length > 0 && !isDownloading
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>↓</span>
            )}
            <span>Download Matched File (CSV)</span>
          </button>

          {isMatchingCompleted && records.length > 0 && (
            <button
              id="btn-download-xlsx"
              type="button"
              onClick={handleDownloadXLSX}
              disabled={isDownloading}
              className={`bg-emerald-50 text-emerald-700 border border-emerald-300 text-[11px] font-bold px-2.5 py-2 rounded-md shadow-xs flex items-center space-x-1 transition-colors ${
                isDownloading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-emerald-100'
              }`}
              title="Download Excel XLSX format"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>XLSX</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Content */}
      {!isMatchingCompleted ? (
        <div className="w-full border border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-slate-50 text-slate-400">
          <FileText className="w-8 h-8 text-slate-300 mb-1" />
          <p className="text-xs font-semibold text-slate-600">
            No matched results to display yet.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Upload files, select percentage range, and click &ldquo;Do Matching&rdquo; to populate results.
          </p>
        </div>
      ) : records.length === 0 ? (
        <div className="w-full border border-amber-200 rounded-lg p-5 flex flex-col items-center justify-center text-center bg-amber-50 text-amber-800">
          <p className="text-xs font-semibold">
            No matching records found for the selected range.
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Try expanding the range (e.g. down to 50%) or reviewing the source data.
          </p>
        </div>
      ) : (
        <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
          {/* Table Search & Toolbar */}
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <input
                id="input-search-matches"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search matches..."
                className="w-full h-7 pl-7 pr-2.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
              />
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              {filteredRecords.length} records found
            </div>
          </div>

          {/* Responsive Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="px-4 py-2 border-r border-slate-100 w-10">#</th>
                  <th className="px-4 py-2 border-r border-slate-100">User Name (FB)</th>
                  <th className="px-4 py-2 border-r border-slate-100">Country</th>
                  <th className="px-4 py-2 border-r border-slate-100">Matched Email</th>
                  <th className="px-4 py-2">Match %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((record, index) => {
                  const globalIdx = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={record.id || globalIdx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-2 border-r border-slate-100 text-slate-400 font-medium">
                        {globalIdx}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-100 font-medium text-slate-800">
                        {record.userName}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-100 text-slate-600">
                        {record.country || 'Norway'}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-100 text-slate-500">
                        {record.matchedEmail}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-xs ${
                            record.matchPercentage >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {record.matchPercentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronLeft className="w-3 h-3" />
                Previous
              </button>

              <span className="text-[11px] text-slate-500 font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
