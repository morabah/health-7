import React, { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { Transition } from '@headlessui/react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  autoClose?: number | false;
  className?: string;
}

/**
 * Toast notification component
 * Shows a dismissible message with optional auto-close functionality
 * 
 * @example
 * <Toast 
 *   message="Operation successful" 
 *   variant="success" 
 *   autoClose={5000}
 *   onClose={() => console.log('Toast closed')}
 * />
 */
const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  onClose,
  autoClose = false,
  className
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose && typeof autoClose === 'number') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose && onClose();
        }, 300); // Wait for transition to complete
      }, autoClose);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose && onClose();
    }, 300);
  };

  const variantStyles = {
    success: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
    error: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
    info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
  };

  const IconComponent = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  }[variant];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Transition
        show={isVisible}
        enter="transform transition ease-in-out duration-300"
        enterFrom="translate-y-2 opacity-0"
        enterTo="translate-y-0 opacity-100"
        leave="transform transition ease-in-out duration-300"
        leaveFrom="translate-y-0 opacity-100"
        leaveTo="translate-y-2 opacity-0"
      >
        <div 
          className={twMerge(
            "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-md",
            variantStyles[variant],
            className
          )}
          role="alert"
        >
          <IconComponent className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">{message}</div>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Transition>
    </div>
  );
};

export default Toast; 