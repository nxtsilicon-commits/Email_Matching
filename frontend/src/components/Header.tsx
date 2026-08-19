import React from 'react';
import { Layers, Sparkles } from 'lucide-react';

interface HeaderProps {
  onLoadSampleData?: () => void;
  hasLoadedFiles?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLoadSampleData, hasLoadedFiles }) => {
  return (
    <header className="bg-blue-700 p-6 text-center text-white relative">
      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto">
        <h1 id="app-title" className="text-2xl font-bold tracking-tight">
          Name &amp; Email Matching Tool
        </h1>
        <p id="app-subtitle" className="text-blue-100 text-sm mt-1">
          Upload your files, select matching range and get matched results.
        </p>

        {onLoadSampleData && (
          <div className="mt-3 flex items-center gap-2">
            <button
              id="btn-load-sample"
              type="button"
              onClick={onLoadSampleData}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-800/80 hover:bg-blue-800 text-blue-100 transition-colors border border-blue-500/40 shadow-xs"
              title="Quickly fill in sample email & name files to test matching"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              {hasLoadedFiles ? 'Reload Sample Data' : 'Try With Sample Demo Data'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
