import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import Card from '@/components/ui/Card';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    text?: string;
  };
  className?: string;
  cardClassName?: string;
  iconClassName?: string;
  titleClassName?: string;
  valueClassName?: string;
  changeClassName?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
  variant?: 'default' | 'outline' | 'filled' | 'gradient' | 'neomorphic' | 'health';
}

/**
 * StatsCard component for displaying statistics in a visual way
 * 
 * @example
 * <StatsCard
 *   title="Total Patients"
 *   value={1240}
 *   icon={<Users className="h-6 w-6" />}
 *   change={{ value: 12.5, type: 'increase', text: 'since last month' }}
 * />
 */
const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  change,
  className,
  cardClassName,
  iconClassName,
  titleClassName,
  valueClassName,
  changeClassName,
  onClick,
  footer,
  variant = 'default',
}) => {
  // Style variations for the card
  const cardVariants = {
    default: 'bg-white dark:bg-slate-800',
    outline: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
    filled: 'bg-slate-50 dark:bg-slate-800/60',
    gradient: 'bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900',
    neomorphic: 'bg-slate-100 dark:bg-slate-800 shadow-[5px_5px_10px_0px_rgba(0,0,0,0.1),-5px_-5px_10px_0px_rgba(255,255,255,0.8)] dark:shadow-[5px_5px_10px_0px_rgba(0,0,0,0.3),-5px_-5px_10px_0px_rgba(30,41,59,0.5)]',
    health: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 border-b-2 border-primary-400'
  };
  
  // Style variations for the icon container
  const iconVariants = {
    default: 'bg-primary/10 text-primary dark:bg-primary-900/20 dark:text-primary-400',
    outline: 'bg-white text-primary dark:bg-slate-800 dark:text-primary-400 border border-primary/30 dark:border-primary-900/30',
    filled: 'bg-primary text-white dark:bg-primary-600',
    gradient: 'bg-gradient-to-r from-primary to-primary-600/90 text-white',
    neomorphic: 'bg-slate-100 dark:bg-slate-800 text-primary dark:text-primary-400 shadow-[inset_3px_3px_6px_0px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_0px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_6px_0px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_0px_rgba(30,41,59,0.5)]',
    health: 'bg-white dark:bg-slate-700 text-primary dark:text-primary-400 shadow-lg rounded-full p-3'
  };
  
  // Style variations for change indicators
  const changeStyles = {
    increase: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    decrease: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    neutral: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
  };

  // Health variant has a different layout
  if (variant === 'health') {
    return (
      <Card
        className={twMerge(
          clsx(
            cardVariants[variant],
            'p-5 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-visible',
            onClick && 'cursor-pointer',
            cardClassName
          )
        )}
        onClick={onClick}
      >
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className={twMerge(
              clsx(
                'text-sm font-medium text-slate-500 dark:text-slate-400',
                titleClassName
              )
            )}>
              {title}
            </h3>
            
            {icon && (
              <div className={twMerge(
                clsx(
                  'rounded-full',
                  iconVariants[variant],
                  iconClassName
                )
              )}>
                {icon}
              </div>
            )}
          </div>
          
          <div className={twMerge(
            clsx(
              'mt-1 text-3xl font-bold text-slate-900 dark:text-white',
              valueClassName
            )
          )}>
            {value}
          </div>
          
          {change && (
            <div className="mt-3">
              <div className={twMerge(
                clsx(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  changeStyles[change.type],
                  changeClassName
                )
              )}>
                {change.type === 'increase' && '↑ '}
                {change.type === 'decrease' && '↓ '}
                {change.value}%
                {change.text && <span className="ml-1 opacity-75">{change.text}</span>}
              </div>
            </div>
          )}
          
          {footer && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              {footer}
            </div>
          )}
        </div>
      </Card>
    );
  }
  
  return (
    <Card
      className={twMerge(
        clsx(
          cardVariants[variant],
          'p-5 shadow-sm hover:shadow-md transition-shadow duration-200',
          onClick && 'cursor-pointer',
          cardClassName
        )
      )}
      onClick={onClick}
    >
      <div className={twMerge(
        clsx(
          'flex items-start',
          className
        )
      )}>
        {icon && (
          <div className={twMerge(
            clsx(
              'rounded-lg p-3 mr-4',
              iconVariants[variant],
              iconClassName
            )
          )}>
            {icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className={twMerge(
            clsx(
              'text-sm font-medium text-slate-500 dark:text-slate-400',
              titleClassName
            )
          )}>
            {title}
          </h3>
          
          <div className={twMerge(
            clsx(
              'mt-1 text-2xl font-bold text-slate-900 dark:text-white',
              valueClassName
            )
          )}>
            {value}
          </div>
          
          {change && (
            <div className={twMerge(
              clsx(
                'mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                changeStyles[change.type],
                changeClassName
              )
            )}>
              {change.type === 'increase' && '↑ '}
              {change.type === 'decrease' && '↓ '}
              {change.value}%
              {change.text && <span className="ml-1 opacity-75">{change.text}</span>}
            </div>
          )}
        </div>
      </div>
      
      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          {footer}
        </div>
      )}
    </Card>
  );
};

export default StatsCard; 