import React from 'react';
import { Settings, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { MatchingState, MatchingStats } from '../types';

interface StartMatchingProps {
  matchingState: MatchingState;
  stats: MatchingStats | null;
  onStartMatching: () => void;
  canMatch: boolean;
}

export const StartMatching: React.FC<StartMatchingProps> = ({
  matchingState,
  stats,
  onStartMatching,
  canMatch,
}) => {
  const isMatching = matchingState === 'matching';
  const isCompleted = matchingState === 'completed';

  return (
    <div className="w-full flex flex-col space-y-3">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
        4. Start Matching
      </h3>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
        {/* Status Message Container */}
        <div className="flex-1">
          {!isCompleted && !isMatching && (
            <div
              id="status-initial"
              className="flex items-center space-x-3 bg-amber-50 border border-amber-100 p-3 rounded-lg text-amber-800"
            >
              <span className="text-amber-500 text-lg leading-none">⚠</span>
              <span className="text-xs font-medium">
                No matching performed yet. Click &ldquo;Do Matching&rdquo; to start.
              </span>
            </div>
          )}

          {isMatching && (
            <div
              id="status-processing"
              className="flex items-center space-x-3 bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-800"
            >
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <div className="text-xs font-medium">
                Performing fuzzy matching across email and name records...
              </div>
            </div>
          )}

          {isCompleted && stats && (
            <div
              id="status-completed"
              className="flex items-center space-x-3 bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-emerald-800"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs font-medium flex flex-wrap items-center gap-x-2">
                <span className="font-bold text-emerald-900">Matching Completed Successfully.</span>
                <span>Processed: <strong>{stats.totalProcessed}</strong></span>
                <span>•</span>
                <span>Matched: <strong className="text-emerald-700">{stats.totalMatched}</strong></span>
                <span>•</span>
                <span>Range: <strong>{stats.matchingRange}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Main Action Button */}
        <div className="shrink-0">
          <button
            id="btn-do-matching"
            type="button"
            onClick={onStartMatching}
            disabled={!canMatch || isMatching || isCompleted}
            className={`w-full sm:w-auto font-bold py-3 px-8 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm ${
              isMatching
                ? 'bg-blue-400 text-white cursor-not-allowed shadow-sm'
                : isCompleted
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                : canMatch
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isMatching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Matching...</span>
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Matching Completed</span>
              </>
            ) : (
              <>
                <span>⚙</span>
                <span>Do Matching</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
