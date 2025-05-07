import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  actionsClassName?: string;
  centered?: boolean;
  backButton?: React.ReactNode;
}

/**
 * PageHeader component for consistent page headers across the application
 * Supports title, subtitle, and optional action buttons
 * 
 * @example
 * <PageHeader 
 *   title="Find Doctors" 
 *   subtitle="Discover and book appointments with qualified healthcare professionals"
 * >
 *   <Button>Filter Results</Button>
 * </PageHeader>
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  children,
  className,
  titleClassName,
  subtitleClassName,
  actionsClassName,
  centered = false,
  backButton
}) => {
  return (
    <div 
      className={twMerge(
        clsx(
          "mb-6 md:mb-8",
          centered && "text-center",
          className
        )
      )}
    >
      <div className={clsx(
        "flex items-center",
        centered && "justify-center",
        backButton && "space-x-3"
      )}>
        {backButton}
        <h1 
          className={twMerge(
            clsx(
              "text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white",
              titleClassName
            )
          )}
        >
          {title}
        </h1>
      </div>
      
      {subtitle && (
        <p 
          className={twMerge(
            clsx(
              "mt-2 text-base text-slate-600 dark:text-slate-400 max-w-3xl",
              centered && "mx-auto",
              subtitleClassName
            )
          )}
        >
          {subtitle}
        </p>
      )}
      
      {children && (
        <div 
          className={twMerge(
            clsx(
              "mt-4 md:mt-6 flex flex-wrap gap-3",
              centered ? "justify-center" : "justify-start",
              actionsClassName
            )
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader; 