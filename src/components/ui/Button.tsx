import React from 'react';
import type { ElementType, ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { logInfo } from '@/lib/logger';
import Spinner from './Spinner';

/**
 * Polymorphic Button component props
 */
type ButtonProps<T extends ElementType = 'button'> = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'link' | 'success' | 'themed';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  isFullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  className?: string;
  as?: T;
} & ComponentPropsWithoutRef<T>;

/**
 * Button component with multiple variants and sizes
 * Supports polymorphic behavior through the 'as' prop
 * Logs clicks via logger.info
 * Shows a spinner when isLoading is true
 *
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 *
 * // As a link
 * <Button as={Link} href="/path" variant="primary">
 *   Go to page
 * </Button>
 */
const Button = <T extends ElementType = 'button'>({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isFullWidth = false,
  iconLeft,
  iconRight,
  className = '',
  onClick,
  disabled,
  as,
  ...props
}: ButtonProps<T>) => {
  // Define base styles
  const baseStyles =
    'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none disabled:transition-opacity';

  // Define variant styles
  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
    danger: 'bg-danger text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm',
    outline:
      'border border-slate-300 bg-transparent text-slate-800 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/50 dark:active:bg-slate-700/50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-700',
    link: 'bg-transparent text-primary hover:underline hover:text-primary-600 active:text-primary-700 p-0 h-auto dark:text-primary-400 dark:hover:text-primary-300',
    themed: 'bg-gradient-to-r from-primary to-primary-600 text-white hover:opacity-90 active:opacity-95 shadow-md hover:shadow-lg transition-all duration-200',
  };

  // Define size styles
  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded',
    md: 'h-10 px-4 py-2 text-sm rounded-md',
    lg: 'h-12 px-6 py-2.5 text-base rounded-lg',
    xl: 'h-14 px-8 py-3 text-lg rounded-lg',
  };

  // Handle button click
  const handleClick = (e: React.MouseEvent) => {
    if (!isLoading && !disabled) {
      logInfo(`Button clicked: ${variant} ${size}`, { variant, size });
      if (onClick) {
        // Cast the event to the appropriate type for the onClick handler
        onClick(e as React.MouseEvent<Element, MouseEvent>);
      }
    }
  };

  // Compute final class names
  const classes = twMerge(
    clsx(
      baseStyles,
      variantStyles[variant],
      variant !== 'link' && sizeStyles[size],
      isFullWidth && 'w-full',
      isLoading && 'cursor-not-allowed',
      className
    )
  );

  // For loading state content
  const content = (
    <>
      {isLoading && <Spinner className="mr-2" size="sm" />}
      {iconLeft && !isLoading && <span className="mr-2 -ml-1">{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span className="ml-2 -mr-1">{iconRight}</span>}
    </>
  );

  // Use the as prop or default to button
  const Component = as || 'button';

  return (
    <Component
      className={classes}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {content}
    </Component>
  );
};

export default Button;
