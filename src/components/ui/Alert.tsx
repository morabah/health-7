import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { Transition } from '@headlessui/react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Alert component props
 * @interface AlertProps
 * @property {React.ReactNode} children - The content of the alert
 * @property {'success' | 'error' | 'warning' | 'info'} [variant] - Alert type
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [show] - Whether the alert is visible (for transition)
 * @property {string} [title] - Optional title for the alert
 * @property {boolean} [dismissible] - Whether the alert can be dismissed
 * @property {() => void} [onDismiss] - Callback when the alert is dismissed
 * @property {boolean} [bordered] - Whether to show a distinct border
 * @property {boolean} [elevated] - Whether to add a shadow for emphasis
 */
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  className?: string;
  show?: boolean;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  bordered?: boolean;
  elevated?: boolean;
}

/**
 * Alert component for displaying status messages with appropriate styling
 * Uses Headless UI Transition for smooth fade effects
 * 
 * @example
 * <Alert 
 *   variant="success"
 *   title="Success"
 *   dismissible
 *   onDismiss={() => console.log('Alert dismissed')}
 * >
 *   Your request was successful!
 * </Alert>
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ 
    children, 
    variant = 'info', 
    className, 
    show: externalShow = true, 
    title, 
    dismissible = false,
    onDismiss,
    bordered = true,
    elevated = false,
    ...props 
  }, ref) => {
    const [internalShow, setInternalShow] = useState(true);
    const show = externalShow && internalShow;

    const variantStyles = {
      success: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800/30',
        icon: 'text-green-500 dark:text-green-400'
      },
      error: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-800 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800/30',
        icon: 'text-red-500 dark:text-red-400'
      },
      warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-800 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/30',
        icon: 'text-amber-500 dark:text-amber-400'
      },
      info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-800 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800/30',
        icon: 'text-blue-500 dark:text-blue-400'
      }
    };
    
    const IconComponent = {
      success: CheckCircle,
      error: XCircle,
      warning: AlertTriangle,
      info: Info
    }[variant];

    const handleDismiss = () => {
      setInternalShow(false);
      if (onDismiss) onDismiss();
    };
    
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
            'flex items-start gap-3 p-4 rounded-lg',
            variantStyles[variant].bg,
            variantStyles[variant].text,
            bordered && `border ${variantStyles[variant].border}`,
            elevated && 'shadow-md',
            className
          )
        )}
        {...props}
      >
        <IconComponent className={clsx("w-5 h-5 mt-0.5 flex-shrink-0", variantStyles[variant].icon)} aria-hidden="true" />
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        
        {dismissible && (
          <button
            type="button"
            className={clsx(
              "p-1 rounded-md -mt-1 -mr-1",
              "opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2",
              `focus:ring-${variant}-500`
            )}
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </Transition>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert; 