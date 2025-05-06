import React from 'react';
import { twMerge } from 'tailwind-merge';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * PageTitle component for consistent page headers throughout the application
 * 
 * @example
 * <PageTitle 
 *   title="Appointment Details" 
 *   subtitle="Manage your upcoming appointments"
 * />
 */
const PageTitle: React.FC<PageTitleProps> = ({ 
  title, 
  subtitle, 
  className 
}) => {
  return (
    <div className={twMerge("mb-6", className)}>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default PageTitle; 