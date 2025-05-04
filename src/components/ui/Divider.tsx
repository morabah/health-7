import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

interface DividerProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  label?: string;
}

/**
 * Divider component for separating content
 * Uses CSS borders instead of SVG to avoid viewBox errors
 */
const Divider: React.FC<DividerProps> = ({
  className,
  orientation = 'horizontal',
  variant = 'solid',
  label
}) => {
  const getBorderStyle = () => {
    switch (variant) {
      case 'dashed':
        return 'border-dashed';
      case 'dotted':
        return 'border-dotted';
      default:
        return 'border-solid';
    }
  };
  
  if (orientation === 'vertical') {
    return (
      <div 
        className={twMerge(
          clsx(
            'h-full w-0 border-l border-slate-200 dark:border-slate-700',
            getBorderStyle(),
            className
          )
        )}
        aria-hidden="true"
      />
    );
  }
  
  if (label) {
    return (
      <div className="flex items-center my-4">
        <div 
          className={twMerge(
            clsx(
              'flex-1 border-t border-slate-200 dark:border-slate-700',
              getBorderStyle(),
              className
            )
          )}
          aria-hidden="true"
        />
        <span className="px-3 text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <div 
          className={twMerge(
            clsx(
              'flex-1 border-t border-slate-200 dark:border-slate-700',
              getBorderStyle(),
              className
            )
          )}
          aria-hidden="true"
        />
      </div>
    );
  }
  
  return (
    <div 
      className={twMerge(
        clsx(
          'w-full border-t border-slate-200 dark:border-slate-700',
          getBorderStyle(),
          className
        )
      )}
      aria-hidden="true"
    />
  );
};

export default Divider; 