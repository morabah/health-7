import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, className = '', label }) => {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full ${className}`} aria-label={label || 'Progress'}>
      {label && <div className="mb-1 text-xs text-slate-500">{label}</div>}
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${safeValue}%` }}
          aria-valuenow={safeValue}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
      <div className="text-xs text-right text-slate-500 mt-1">{safeValue}%</div>
    </div>
  );
};

export default ProgressBar; 