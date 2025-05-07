import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import Card from '@/components/ui/Card';

interface PageSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  id?: string;
  asCard?: boolean;
  cardProps?: React.ComponentProps<typeof Card>;
  actions?: React.ReactNode;
  noPadding?: boolean;
  fullWidth?: boolean;
}

/**
 * PageSection component for consistent section layouts across the application
 * 
 * @example
 * <PageSection 
 *   title="Featured Doctors" 
 *   subtitle="Top-rated healthcare professionals in your area"
 *   asCard
 * >
 *   <DoctorList doctors={doctors} />
 * </PageSection>
 */
const PageSection: React.FC<PageSectionProps> = ({
  title,
  subtitle,
  children,
  className,
  contentClassName,
  headerClassName,
  titleClassName,
  subtitleClassName,
  id,
  asCard = false,
  cardProps,
  actions,
  noPadding = false,
  fullWidth = false,
}) => {
  const content = (
    <>
      {(title || subtitle || actions) && (
        <div className={twMerge(
          clsx(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6",
            headerClassName
          )
        )}>
          <div>
            {title && (
              <h2 
                className={twMerge(
                  clsx(
                    "text-xl font-bold text-slate-900 dark:text-white",
                    titleClassName
                  )
                )}
              >
                {title}
              </h2>
            )}
            
            {subtitle && (
              <p 
                className={twMerge(
                  clsx(
                    "mt-1 text-sm text-slate-500 dark:text-slate-400",
                    subtitleClassName
                  )
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      
      <div 
        className={twMerge(
          clsx(
            contentClassName
          )
        )}
      >
        {children}
      </div>
    </>
  );

  if (asCard) {
    return (
      <Card
        {...cardProps}
        bordered
        className={twMerge(
          clsx(
            "mb-6 md:mb-8",
            !noPadding && "p-4 md:p-6",
            className
          )
        )}
        id={id}
      >
        {content}
      </Card>
    );
  }

  return (
    <section 
      className={twMerge(
        clsx(
          "mb-6 md:mb-8",
          !fullWidth && "max-w-full",
          !noPadding && "p-1",
          className
        )
      )}
      id={id}
    >
      {content}
    </section>
  );
};

export default PageSection; 