import React from 'react';
import { Info, ChevronDown } from 'lucide-react';
import { MatchingRange } from '../types';

interface MatchingRangeSelectorProps {
  range: MatchingRange;
  onChange: (range: MatchingRange) => void;
  disabled?: boolean;
}

export const MatchingRangeSelector: React.FC<MatchingRangeSelectorProps> = ({
  range,
  onChange,
  disabled = false,
}) => {
  // Generate percentage options: 100%, 99%, ..., 50% (and down to 30% for extra flexibility if needed)
  const percentageOptions: number[] = [];
  for (let i = 100; i >= 30; i--) {
    percentageOptions.push(i);
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    onChange({
      ...range,
      maxPercent: val,
      // If max is less than min, adjust min
      minPercent: Math.min(range.minPercent, val),
    });
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    onChange({
      ...range,
      minPercent: val,
      // If min is greater than max, adjust max
      maxPercent: Math.max(range.maxPercent, val),
    });
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
        3. Select Matching Range
      </h3>

      {/* Dropdown controls row */}
      <div className="flex items-center space-x-3">
        {/* From (Maximum %) */}
        <div className="flex-1">
          <label
            htmlFor="select-from-max-percent"
            className="block text-[10px] text-slate-500 font-bold uppercase mb-1"
          >
            From (Maximum %)
          </label>
          <div className="relative">
            <select
              id="select-from-max-percent"
              value={range.maxPercent}
              onChange={handleMaxChange}
              disabled={disabled}
              className="w-full border border-slate-200 rounded p-2 text-sm text-slate-700 bg-white shadow-sm appearance-none pr-8 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
            >
              {percentageOptions.map((pct) => (
                <option key={`max-${pct}`} value={pct}>
                  {pct}%
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 'to' separator */}
        <div className="mt-5 text-slate-400 font-medium italic select-none">
          to
        </div>

        {/* To (Minimum %) */}
        <div className="flex-1">
          <label
            htmlFor="select-to-min-percent"
            className="block text-[10px] text-slate-500 font-bold uppercase mb-1"
          >
            To (Minimum %)
          </label>
          <div className="relative">
            <select
              id="select-to-min-percent"
              value={range.minPercent}
              onChange={handleMinChange}
              disabled={disabled}
              className="w-full border border-slate-200 rounded p-2 text-sm text-slate-700 bg-white shadow-sm appearance-none pr-8 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
            >
              {percentageOptions.map((pct) => (
                <option key={`min-${pct}`} value={pct}>
                  {pct}%
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Information Box */}
      <div
        id="matching-range-info-box"
        className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start space-x-3 shadow-xs"
      >
        <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] italic font-serif">
          i
        </div>
        <p className="text-[11px] text-blue-800 leading-snug">
          Matching will be performed for every percentage between the selected range. <br />
          <span className="font-semibold opacity-75">
            Example: From {range.maxPercent}% to {range.minPercent}% will match {range.maxPercent}%,{' '}
            {Math.max(range.minPercent, range.maxPercent - 1)}% ...{' '}
            {Math.min(range.maxPercent, range.minPercent + 1)}%, {range.minPercent}%
          </span>
        </p>
      </div>
    </div>
  );
};
