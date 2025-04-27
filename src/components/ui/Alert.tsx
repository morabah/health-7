import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { Transition } from '@headlessui/react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Alert component props
 * @interface AlertProps
 * @property {React.ReactNode} children - The content of the alert
 * @property {'success' | 'error' | 'warning' | 'info'} [variant] - Alert type
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [show] - Whether the alert is visible (for transition)
 */
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  className?: string;
  show?: boolean;
}

/**
 * Alert component for displaying status messages with appropriate styling
 * Uses Headless UI Transition for smooth fade effects
 * 
 * @example
 * <Alert variant="success">
 *   Your request was successful!
 * </Alert>
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ children, variant = 'info', className, show = true, ...props }, ref) => {
    const variantStyles = {
      success: 'bg-success/10 text-success border-success/20',
      error: 'bg-danger/10 text-danger border-danger/20',
      warning: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-500',
      info: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400'
    };
    
    const IconComponent = {
      success: CheckCircle,
      error: XCircle,
      warning: AlertTriangle,
      info: Info
    }[variant];
    
    return (
      <Transition
        show={show}
        enter="transition-opacity ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        as="div"
        ref={ref}
        role="alert"
        className={twMerge(
          clsx(
            'flex items-start gap-3 p-4 border rounded-md',
            variantStyles[variant],
            className
          )
        )}
        {...props}
      >
        <IconComponent className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div>{children}</div>
      </Transition>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert; 