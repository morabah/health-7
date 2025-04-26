import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Select component props
 * @interface SelectProps
 * @property {string} [id] - Select element ID
 * @property {string} [label] - Label text
 * @property {string} [error] - Error message
 * @property {React.ReactNode} [children] - Option elements
 * @property {string} [className] - Additional CSS classes
 */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id?: string;
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Select component with label and error state
 * 
 * @example
 * <Select
 *   id="country"
 *   label="Country"
 *   error={errors.country?.message}
 * >
 *   <option value="">Select a country</option>
 *   <option value="us">United States</option>
 *   <option value="ca">Canada</option>
 * </Select>
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, error, children, className, ...props }, ref) => {
    const selectId = id || props.name;
    
    return (
      <div className="w-full space-y-2">
        {label && selectId && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {label}
          </label>
        )}
        
        <select
          id={selectId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/60 ring-offset-2 transition-colors',
              error 
                ? 'border-danger focus:border-danger' 
                : 'border-gray-300 focus:border-primary',
              'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
              className
            )
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error && selectId ? `${selectId}-error` : undefined}
          {...props}
        >
          {children}
        </select>
        
        {error && (
          <p 
            id={selectId ? `${selectId}-error` : undefined}
            className="mt-1 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select; 