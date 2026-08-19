import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { UploadedFileInfo } from '../types';

interface FileUploadProps {
  stepNumber: number;
  title: string;
  buttonText: string;
  acceptFormats?: string;
  fileInfo: UploadedFileInfo | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isLoading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  stepNumber,
  title,
  buttonText,
  acceptFormats = '.csv, .xlsx, .xls',
  fileInfo,
  onFileSelect,
  onFileRemove,
  isLoading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelect(file);
    }
    // Reset value so re-selecting same file triggers change
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col flex-1 w-full space-y-2">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
        {stepNumber}. {title}
      </h3>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptFormats}
        onChange={handleInputChange}
        className="hidden"
        id={`file-input-step-${stepNumber}`}
      />

      <div
        id={`upload-box-step-${stepNumber}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer select-none min-h-[130px] ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/70'
            : fileInfo
            ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50'
            : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
        }`}
      >
        {fileInfo ? (
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            
            <div className="flex items-center gap-2 max-w-full px-2.5 py-1 bg-white rounded border border-slate-200 shadow-xs mb-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-700 text-xs truncate max-w-[180px] sm:max-w-[240px]">
                {fileInfo.fileName}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove();
                }}
                className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Remove file"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span>{formatBytes(fileInfo.fileSize)}</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">{fileInfo.rowCount} records loaded</span>
            </div>

            <div className="mt-2 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium">
              <RefreshCw className="w-3 h-3" />
              <span>Click to replace file</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center pointer-events-none">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
              <Upload className="w-4 h-4" />
            </div>

            <span className="text-sm font-semibold text-slate-700 mb-0.5">
              {buttonText}
            </span>

            <span className="text-xs text-slate-400 uppercase tracking-wider">
              CSV, XLSX, XLS
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
