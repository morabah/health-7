import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Badge component props
 * @interface BadgeProps
 * @property {React.ReactNode} children - The content of the badge
 * @property {'info' | 'success' | 'warning' | 'danger' | 'pending' | 'default' | 'primary' | 'secondary'} [variant] - Visual style variant
 * @property {'filled' | 'outline' | 'subtle'} [appearance] - Visual appearance of the badge
 * @property {'xs' | 'sm' | 'md' | 'lg'} [size] - Size of the badge
 * @property {boolean} [dot] - Whether to display a dot indicator
 * @property {boolean} [pill] - Whether to make the badge fully rounded (pill-shaped)
 * @property {boolean} [interactive] - Whether the badge is clickable
 * @property {string} [className] - Additional CSS classes
 */
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'pending' | 'default' | 'primary' | 'secondary';
  appearance?: 'filled' | 'outline' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  dot?: boolean;
  pill?: boolean;
  interactive?: boolean;
  className?: string;
}

/**
 * Badge component for status indication or labeling
 * Supports different styles, sizes, and visual indicators
 *
 * @example
 * <Badge variant="success" appearance="subtle" size="md">Completed</Badge>
 * 
 * @example
 * <Badge variant="warning" dot pill>Pending Review</Badge>
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    children, 
    variant = 'default', 
    appearance = 'filled',
    size = 'sm',
    dot = false,
    pill = true,
    interactive = false,
    className, 
    ...props 
  }, ref) => {
    // Define color schemes for different variants and appearance
    const colorSchemes = {
      default: {
        filled: 'bg-slate-500 text-white',
        outline: 'border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300',
        subtle: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        dot: 'bg-slate-500'
      },
      primary: {
        filled: 'bg-primary text-white',
        outline: 'border border-primary text-primary',
        subtle: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
        dot: 'bg-primary'
      },
      secondary: {
        filled: 'bg-slate-600 text-white',
        outline: 'border border-slate-500 text-slate-600 dark:border-slate-500 dark:text-slate-400',
        subtle: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
        dot: 'bg-slate-600'
      },
      info: {
        filled: 'bg-blue-500 text-white',
        outline: 'border border-blue-500 text-blue-600 dark:border-blue-500 dark:text-blue-400',
        subtle: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        dot: 'bg-blue-500'
      },
      success: {
        filled: 'bg-green-500 text-white',
        outline: 'border border-green-500 text-green-600 dark:border-green-500 dark:text-green-400',
        subtle: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        dot: 'bg-green-500'
      },
      warning: {
        filled: 'bg-amber-500 text-white',
        outline: 'border border-amber-500 text-amber-600 dark:border-amber-500 dark:text-amber-400',
        subtle: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        dot: 'bg-amber-500'
      },
      danger: {
        filled: 'bg-red-500 text-white',
        outline: 'border border-red-500 text-red-600 dark:border-red-500 dark:text-red-400',
        subtle: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        dot: 'bg-red-500'
      },
      pending: {
        filled: 'bg-purple-500 text-white',
        outline: 'border border-purple-500 text-purple-600 dark:border-purple-500 dark:text-purple-400',
        subtle: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        dot: 'bg-purple-500'
      }
    };

    // Define sizes
    const sizeStyles = {
      xs: 'text-xs px-1.5 py-0.5',
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-0.5',
      lg: 'text-sm px-3 py-1'
    };

    return (
      <span
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center font-medium',
            sizeStyles[size],
            pill ? 'rounded-full' : 'rounded',
            colorSchemes[variant][appearance],
            interactive && 'cursor-pointer hover:opacity-80 transition-opacity',
            className
          )
        )}
        {...props}
      >
        {dot && (
          <span
            className={clsx(
              'h-1.5 w-1.5 rounded-full mr-1.5',
              colorSchemes[variant].dot
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
