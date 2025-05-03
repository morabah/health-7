import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Badge component props
 * @interface BadgeProps
 * @property {React.ReactNode} children - The content of the badge
 * @property {'info' | 'success' | 'warning' | 'danger' | 'pending' | 'default' | 'primary'} [variant] - Visual style variant
 * @property {string} [className] - Additional CSS classes
 */
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'pending' | 'default' | 'primary';
  className?: string;
}

/**
 * Badge component for status indication or labeling
 * Pill style with color variants
 *
 * @example
 * <Badge variant="success">Completed</Badge>
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', className, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
    };

    return (
      <span
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            variantStyles[variant],
            className
          )
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
