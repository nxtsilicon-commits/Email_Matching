import React, { useState } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { MatchingRangeSelector } from './components/MatchingRangeSelector';
import { StartMatching } from './components/StartMatching';
import { MatchedResultsTable } from './components/MatchedResultsTable';
import { ErrorAlert } from './components/ErrorAlert';
import {
  UploadedFileInfo,
  MatchRecord,
  MatchingRange,
  MatchingState,
  MatchingStats,
  AlertState,
} from './types';
import { parseUploadedFile, getFileFromUploadedInfo } from './utils/fileParser';
import { matchFilesToBackend } from './services/api';
import {
  getSampleEmailFileInfo,
  getSampleNamesFileInfo,
} from './utils/sampleData';

import { performMatching as performClientMatching } from './utils/matchingAlgorithm';

export default function App() {
  // State for uploaded files
  const [emailFile, setEmailFile] = useState<UploadedFileInfo | null>(null);
  const [namesFile, setNamesFile] = useState<UploadedFileInfo | null>(null);

  // Matching range state: 100% to 50% by default
  const [matchingRange, setMatchingRange] = useState<MatchingRange>({
    maxPercent: 100,
    minPercent: 50,
  });

  // Matching execution states
  const [matchingState, setMatchingState] = useState<MatchingState>('idle');
  const [matchedResults, setMatchedResults] = useState<MatchRecord[]>([]);
  const [matchingStats, setMatchingStats] = useState<MatchingStats | null>(null);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle email file upload
  const handleEmailFileSelect = async (file: File) => {
    setAlert(null);
    setIsUploading(true);
    try {
      const info = await parseUploadedFile(file);
      setEmailFile(info);
      // Reset previous matching state if new file is loaded
      if (matchingState === 'completed') {
        setMatchingState('idle');
        setMatchedResults([]);
        setMatchingStats(null);
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error processing email file. Please verify CSV or Excel format.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle names file upload
  const handleNamesFileSelect = async (file: File) => {
    setAlert(null);
    setIsUploading(true);
    try {
      const info = await parseUploadedFile(file);
      setNamesFile(info);
      // Reset previous matching state if new file is loaded
      if (matchingState === 'completed') {
        setMatchingState('idle');
        setMatchedResults([]);
        setMatchingStats(null);
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Error processing names file. Please verify CSV or Excel format.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Load sample demonstration datasets
  const handleLoadSampleData = () => {
    setAlert(null);
    setEmailFile(getSampleEmailFileInfo());
    setNamesFile(getSampleNamesFileInfo());
    setMatchingState('idle');
    setMatchedResults([]);
    setMatchingStats(null);
  };

  // Execute matching algorithm via backend API POST /api/match with client fallback
  const handleStartMatching = async () => {
    setAlert(null);

    // Validation checks
    if (!emailFile && !namesFile) {
      setAlert({
        type: 'error',
        message: 'Please upload both Email File and Names File.',
      });
      return;
    }

    if (!emailFile) {
      setAlert({
        type: 'error',
        message: 'Please upload the Email File (Step 1).',
      });
      return;
    }

    if (!namesFile) {
      setAlert({
        type: 'error',
        message: 'Please upload the Names File (Step 2).',
      });
      return;
    }

    if (matchingRange.maxPercent < matchingRange.minPercent) {
      setAlert({
        type: 'error',
        message: 'Invalid matching range: From (Maximum %) must be greater than or equal to To (Minimum %).',
      });
      return;
    }

    // Begin matching process
    setMatchingState('matching');
    const startTime = performance.now();

    try {
      const eFile = getFileFromUploadedInfo(emailFile);
      const nFile = getFileFromUploadedInfo(namesFile);

      let formattedRecords: MatchRecord[] = [];
      let totalProcessed = 0;
      let totalMatched = 0;

      try {
        const apiResponse = await matchFilesToBackend(
          eFile,
          nFile,
          matchingRange.maxPercent,
          matchingRange.minPercent
        );
        formattedRecords = apiResponse.results.map((r, i) => ({
          id: i + 1,
          userName: r.name || r['User Name (FB)'] || r['User Name'] || r['Name'] || '',
          country: r.Country || r['country'] || r['Nation'] || 'Norway',
          matchedEmail: r.email || r['Matched Email'] || r['Email'] || '',
          matchPercentage: r.match_percentage,
          ...r,
        }));
        totalProcessed = apiResponse.total_records_processed;
        totalMatched = apiResponse.total_matched_records;
      } catch (backendErr: any) {
        console.warn('Backend API unreachable, executing client matching fallback:', backendErr.message);
        formattedRecords = performClientMatching(
          namesFile.records,
          emailFile.records,
          matchingRange,
          namesFile.detectedColumn,
          emailFile.detectedColumn
        );
        totalProcessed = namesFile.rowCount;
        totalMatched = formattedRecords.length;
      }

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      setMatchedResults(formattedRecords);
      setMatchingStats({
        totalProcessed,
        totalMatched,
        matchingRange: `From ${matchingRange.maxPercent}% to ${matchingRange.minPercent}%`,
        durationMs: duration,
      });
      setMatchingState('completed');
    } catch (err: any) {
      setMatchingState('idle');
      setAlert({
        type: 'error',
        message: err.message || 'Matching calculation error occurred.',
      });
    }
  };

  // Range change handler
  const handleRangeChange = (newRange: MatchingRange) => {
    setMatchingRange(newRange);
    // If completed and range changed, user can re-match
    if (matchingState === 'completed') {
      setMatchingState('idle');
    }
  };

  const hasLoadedFiles = Boolean(emailFile || namesFile);

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-5 md:p-6 antialiased flex justify-center items-start">
      {/* Main Container */}
      <div
        id="app-container"
        className="w-full max-w-5xl bg-white shadow-lg rounded-xl overflow-hidden border border-slate-200 flex flex-col"
      >
        {/* Header Section */}
        <Header
          onLoadSampleData={handleLoadSampleData}
          hasLoadedFiles={hasLoadedFiles}
        />

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-5 md:p-6 space-y-4">
          {/* Error Alert Display */}
          <ErrorAlert alert={alert} onDismiss={() => setAlert(null)} />

          {/* Steps 1 & 2: File Upload Section */}
          <section id="section-file-uploads" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FileUpload
              stepNumber={1}
              title="Upload Email File"
              buttonText="Choose Email File"
              fileInfo={emailFile}
              onFileSelect={handleEmailFileSelect}
              onFileRemove={() => {
                setEmailFile(null);
                setMatchingState('idle');
              }}
              isLoading={isUploading}
            />

            <FileUpload
              stepNumber={2}
              title="Upload Names File"
              buttonText="Choose Names File"
              fileInfo={namesFile}
              onFileSelect={handleNamesFileSelect}
              onFileRemove={() => {
                setNamesFile(null);
                setMatchingState('idle');
              }}
              isLoading={isUploading}
            />
          </section>

          {/* Divider */}
          <hr className="border-slate-100" />

          {/* Step 3: Select Matching Range */}
          <section id="section-matching-range">
            <MatchingRangeSelector
              range={matchingRange}
              onChange={handleRangeChange}
              disabled={matchingState === 'matching'}
            />
          </section>

          {/* Divider */}
          <hr className="border-slate-100" />

          {/* Step 4: Start Matching */}
          <section id="section-start-matching">
            <StartMatching
              matchingState={matchingState}
              stats={matchingStats}
              onStartMatching={handleStartMatching}
              canMatch={Boolean(emailFile && namesFile)}
            />
          </section>

          {/* Matched Result Section */}
          <section id="section-matched-results">
            <MatchedResultsTable
              records={matchedResults}
              isMatchingCompleted={matchingState === 'completed'}
              matchingRangeUsed={`${matchingRange.maxPercent}%_to_${matchingRange.minPercent}%`}
              onError={(errMsg) => setAlert({ type: 'error', message: errMsg })}
            />
          </section>
        </div>

        {/* Footer Info */}
        <footer className="bg-slate-50 p-2.5 border-t border-slate-200 text-center">
          <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
            Professional Grade Matching Utility v2.4
          </span>
        </footer>
      </div>
    </main>
  );
}
