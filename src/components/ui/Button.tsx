import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { logInfo } from '@/lib/logger';
import Spinner from './Spinner';

/**
 * Button component props
 * @interface ButtonProps
 * @property {React.ReactNode} children - The content of the button
 * @property {'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'} [variant] - The visual style variant
 * @property {'sm' | 'md' | 'lg'} [size] - The size of the button
 * @property {boolean} [isLoading] - Whether to show a loading spinner
 * @property {boolean} [disabled] - Whether the button is disabled
 * @property {string} [className] - Additional CSS classes
 * @property {() => void} [onClick] - Click handler
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  className?: string;
}

/**
 * Button component with multiple variants and sizes
 * Logs clicks via logger.info
 * Shows a spinner when isLoading is true
 * 
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    className = '',
    onClick,
    disabled,
    ...props 
  }, ref) => {
    // Define base styles
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:transition-opacity';
    
    // Define variant styles
    const variantStyles = {
      primary: 'bg-primary text-white hover:opacity-90',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      danger: 'bg-danger text-white hover:opacity-90',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800',
      ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
    };
    
    // Define size styles
    const sizeStyles = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-6 text-lg'
    };
    
    // Handle button click
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isLoading && !disabled) {
        logInfo(`Button clicked: ${variant} ${size}`, { variant, size });
        onClick?.(e);
      }
    };
    
    return (
      <button
        ref={ref}
        className={twMerge(
          clsx(
            baseStyles,
            variantStyles[variant],
            sizeStyles[size],
            isLoading && 'cursor-not-allowed',
            className
          )
        )}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner className="mr-2" />
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button; 