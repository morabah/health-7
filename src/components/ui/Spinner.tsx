import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Spinner component props
 * @interface SpinnerProps
 * @property {string} [className] - Additional CSS classes
 * @property {string} [size] - Size of spinner: 'xs', 'sm', 'md', 'lg'
 * @property {string} [color] - Color of spinner: 'primary', 'white', 'black'
 */
interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'black' | 'gray';
}

/**
 * Spinner component for loading states
 * 
 * @example
 * <Spinner />
 * 
 * @example
 * <Spinner size="lg" color="white" />
 */
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', color = 'primary', ...props }, ref) => {
    // Size variants
    const sizeStyles = {
      xs: 'w-3 h-3 border-[1.5px]',
      sm: 'w-4 h-4 border-2',
      md: 'w-6 h-6 border-2',
      lg: 'w-8 h-8 border-3',
    };

    // Color variants
    const colorStyles = {
      primary: 'border-primary/10 border-t-primary',
      white: 'border-white/30 border-t-white',
      black: 'border-black/10 border-t-black',
      gray: 'border-gray-200 border-t-gray-500 dark:border-gray-700 dark:border-t-gray-400',
    };

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'rounded-full animate-spin',
            sizeStyles[size],
            colorStyles[color]
          ),
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