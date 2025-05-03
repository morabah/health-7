import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  label?: string;
  max?: number; // Add max property
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, className = '', label, max = 100 }) => {
  // Calculate percentage based on max value
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const safeValue = Math.max(0, Math.min(100, percentage));

  return (
    <div className={`w-full ${className}`} aria-label={label || 'Progress'}>
      {label && <div className="mb-1 text-xs text-slate-500">{label}</div>}
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${safeValue}%` }}
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          role="progressbar"
        />
      </div>
      <div className="text-xs text-right text-slate-500 mt-1">
        {value}/{max}
      </div>
    </div>
  );
};

export default ProgressBar;
