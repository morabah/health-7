import React from 'react';
import { twMerge } from 'tailwind-merge';

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * AlertDescription component for displaying the description text of an Alert
 */
const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <p ref={ref} className={twMerge('text-sm', className)} {...props}>
        {children}
      </p>
    );
  }
);

AlertDescription.displayName = 'AlertDescription';

export default AlertDescription;
