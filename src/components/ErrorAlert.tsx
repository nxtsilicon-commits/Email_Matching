import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { AlertState } from '../types';

interface ErrorAlertProps {
  alert: AlertState | null;
  onDismiss: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ alert, onDismiss }) => {
  if (!alert) return null;

  const bgStyles =
    alert.type === 'error'
      ? 'bg-red-50 border-red-200 text-red-800'
      : alert.type === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : alert.type === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : 'bg-blue-50 border-blue-200 text-blue-800';

  const iconStyles =
    alert.type === 'error'
      ? 'text-red-500'
      : alert.type === 'warning'
      ? 'text-amber-500'
      : alert.type === 'success'
      ? 'text-emerald-500'
      : 'text-blue-500';

  return (
    <div
      id="app-alert"
      className={`border rounded-lg p-3 flex items-start justify-between gap-3 text-xs font-medium shadow-xs ${bgStyles}`}
    >
      <div className="flex items-center space-x-2.5">
        <span className={`text-base leading-none ${iconStyles}`}>
          {alert.type === 'error' ? '⚠' : alert.type === 'warning' ? '⚠' : '✓'}
        </span>
        <p className="leading-snug">{alert.message}</p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
        title="Dismiss alert"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
