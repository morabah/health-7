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
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
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
  className = '',
  onClick,
  disabled,
  as,
  ...props
}: ButtonProps<T>) => {
  // Define base styles
  const baseStyles =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:transition-opacity';

  // Define variant styles
  const variantStyles = {
    primary: 'bg-primary text-white hover:opacity-90',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    danger: 'bg-danger text-white hover:opacity-90',
    outline:
      'border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
    link: 'bg-transparent text-primary hover:underline p-0 h-auto',
  };

  // Define size styles
  const sizeStyles = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 text-lg',
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
      isLoading && 'cursor-not-allowed',
      className
    )
  );

  // For loading state content
  const content = isLoading ? (
    <>
      <Spinner className="mr-2" />
      <span>Loading...</span>
    </>
  ) : (
    children
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
