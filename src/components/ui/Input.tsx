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
 * @property {React.ReactNode} [icon] - Icon to display in the input
 * @property {React.ReactNode} [rightIcon] - Icon to display on the right side
 * @property {boolean} [fullWidth] - Whether the input should take the full width
 * @property {string} [inputSize] - Size of the input: 'sm', 'md', 'lg'
 * @property {string} [helpText] - Optional helper text
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id?: string;
  label?: string;
  error?: string;
  className?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  helpText?: string;
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
 *   icon={<MailIcon />}
 *   error={errors.email?.message}
 * />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, className, icon, rightIcon, fullWidth = true, inputSize = 'md', helpText, ...props }, ref) => {
    const inputId = id || props.name;
    
    // Size variants
    const sizeStyles = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2',
      lg: 'px-4 py-3 text-lg',
    };
    
    return (
      <div className={clsx("space-y-1.5", fullWidth ? 'w-full' : 'w-auto')}>
        {label && inputId && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
              {icon}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 transition-colors duration-200 ease-in-out',
                sizeStyles[inputSize],
                icon && 'pl-10',
                rightIcon && 'pr-10',
                error 
                  ? 'border-danger focus:border-danger text-danger' 
                  : 'border-slate-300 dark:border-slate-600 focus:border-primary',
                'bg-white dark:bg-slate-800 dark:text-white',
                props.disabled && 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900',
                className
              )
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error && inputId ? `${inputId}-error` : helpText && inputId ? `${inputId}-help` : undefined}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {helpText && !error && (
          <p 
            id={inputId ? `${inputId}-help` : undefined}
            className="text-xs text-slate-500 dark:text-slate-400"
          >
            {helpText}
          </p>
        )}
        
        {error && (
          <p 
            id={inputId ? `${inputId}-error` : undefined}
            className="text-xs text-danger"
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