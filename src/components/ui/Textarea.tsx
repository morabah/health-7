import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Textarea component props
 * @interface TextareaProps
 * @property {string} [id] - Textarea element ID
 * @property {string} [label] - Label text
 * @property {string} [error] - Error message
 * @property {string} [className] - Additional CSS classes
 */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id?: string;
  label?: string;
  error?: string;
  className?: string;
}

/**
 * Textarea component with optional label and error state
 * 
 * @example
 * <Textarea
 *   id="message"
 *   label="Message"
 *   placeholder="Enter your message"
 *   rows={4}
 *   error={errors.message?.message}
 * />
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, error, className, ...props }, ref) => {
    const textareaId = id || props.name;
    
    return (
      <div className="w-full space-y-2">
        {label && textareaId && (
          <label 
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {label}
          </label>
        )}
        
        <textarea
          id={textareaId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/60 ring-offset-2 transition-colors',
              error 
                ? 'border-danger focus:border-danger' 
                : 'border-gray-300 focus:border-primary',
              'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
              className
            )
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error && textareaId ? `${textareaId}-error` : undefined}
          {...props}
        />
        
        {error && (
          <p 
            id={textareaId ? `${textareaId}-error` : undefined}
            className="mt-1 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea; 