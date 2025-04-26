import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Card component props
 * @interface CardProps
 * @property {React.ReactNode} children - The content of the card
 * @property {string} [className] - Additional CSS classes
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card component for displaying content in a contained box with shadow
 * 
 * @example
 * <Card>
 *   <h3>Card Title</h3>
 *   <p>Card content</p>
 * </Card>
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx('rounded-lg bg-white dark:bg-slate-800 shadow-md overflow-hidden p-4'),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card; 