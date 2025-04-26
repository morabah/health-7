import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Spinner component props
 * @interface SpinnerProps
 * @property {string} [className] - Additional CSS classes
 */
interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Spinner component for loading states
 * 
 * @example
 * <Spinner />
 * 
 * @example
 * <Spinner className="w-8 h-8" />
 */
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx('w-5 h-5 border-2 border-t-transparent border-primary rounded-full animate-spin'),
          className
        )}
        {...props}
        aria-label="Loading"
        role="status"
      />
    );
  }
);

Spinner.displayName = 'Spinner';

export default Spinner; 