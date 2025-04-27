import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Input component props
 * @interface InputProps
 * @property {string} [id] - Input element ID
 * @property {string} [label] - Label text
 * @property {string} [error] - Error message
 * @property {string} [className] - Additional CSS classes
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id?: string;
  label?: string;
  error?: string;
  className?: string;
}

/**
 * Input component with optional label and error state
 * 
 * @example
 * <Input
 *   id="email"
 *   type="email"
 *   label="Email Address"
 *   placeholder="Enter your email"
 *   error={errors.email?.message}
 * />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, className, ...props }, ref) => {
    const inputId = id || props.name;
    
    return (
      <div className="w-full space-y-2">
        {label && inputId && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {label}
          </label>
        )}
        
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/60 ring-offset-2 transition-colors duration-200 ease-in-out',
              error 
                ? 'border-danger focus:border-danger' 
                : 'border-gray-300 focus:border-primary',
              'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
              className
            )
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
        
        {error && (
          <p 
            id={inputId ? `${inputId}-error` : undefined}
            className="mt-1 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 