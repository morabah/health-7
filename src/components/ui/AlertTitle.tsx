import React from 'react';
import { twMerge } from 'tailwind-merge';

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * AlertTitle component for displaying the title of an Alert
 */
const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h4 ref={ref} className={twMerge('text-sm font-medium mb-1', className)} {...props}>
        {children}
      </h4>
    );
  }
);

AlertTitle.displayName = 'AlertTitle';

export default AlertTitle;
