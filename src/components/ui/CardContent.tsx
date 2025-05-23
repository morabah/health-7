import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * CardContent component for displaying content in a Card
 */
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={twMerge(clsx('px-5 py-4', className))} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export default CardContent;
