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
 *   value={1234}
 *   icon={<User className="w-6 h-6" />}
 *   change={{ value: 12.5, type: 'increase', text: 'vs. last month' }}
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
  variant = 'default'
}) => {
  // Process variant styling
  const getCardVariant = () => {
    switch (variant) {
      case 'outline':
        return 'flat';
      case 'filled':
        return 'elevated';
      case 'gradient':
        return 'gradient';
      case 'neomorphic':
        return 'neomorphic';
      case 'health':
        return 'health';
      default:
        return 'default';
    }
  };

  // Determine card styling
  const cardClasses = clsx(
    'transition-all',
    onClick && 'cursor-pointer hover:-translate-y-1 hover:shadow-md',
    cardClassName
  );

  // Icon container styling
  const getIconContainerClasses = () => {
    const baseClasses = 'flex items-center justify-center rounded-lg';
    
    switch (variant) {
      case 'outline':
        return clsx(baseClasses, 'bg-white border border-slate-200 p-3 dark:bg-slate-800 dark:border-slate-700');
      case 'filled':
        return clsx(baseClasses, 'bg-primary/10 p-3 dark:bg-primary/20');
      case 'gradient':
        return clsx(baseClasses, 'bg-gradient-to-br from-primary/20 to-primary/10 p-3 dark:from-primary/30 dark:to-primary/20');
      case 'neomorphic':
        return clsx(baseClasses, 'bg-slate-100 dark:bg-slate-800 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-2px_-2px_5px_rgba(30,41,59,0.5)] p-3');
      case 'health':
        return clsx(baseClasses, 'bg-primary text-white p-3 rounded-full shadow-md');
      default:
        return clsx(baseClasses, 'bg-slate-100 p-3 dark:bg-slate-800');
    }
  };

  // Icon styling
  const getIconClasses = () => {
    const baseClasses = 'w-6 h-6';
    
    switch (variant) {
      case 'outline':
      case 'default':
        return clsx(baseClasses, 'text-primary', iconClassName);
      case 'filled':
      case 'gradient':
        return clsx(baseClasses, 'text-primary', iconClassName);
      case 'neomorphic':
        return clsx(baseClasses, 'text-primary', iconClassName);
      case 'health':
        return clsx(baseClasses, 'text-white', iconClassName);
      default:
        return clsx(baseClasses, 'text-primary', iconClassName);
    }
  };

  // Title styling
  const getTitleClasses = () => {
    switch (variant) {
      case 'health':
        return clsx('text-sm font-medium text-slate-500 mt-3 dark:text-slate-400', titleClassName);
      default:
        return clsx('text-sm font-medium text-slate-500 dark:text-slate-400', titleClassName);
    }
  };

  // Value styling
  const getValueClasses = () => {
    switch (variant) {
      case 'health':
        return clsx('text-2xl font-bold mt-0.5 text-primary', valueClassName);
      default:
        return clsx('text-2xl font-bold mt-0.5', valueClassName);
    }
  };

  // Change styling based on type
  const getChangeClasses = () => {
    if (!change) return '';

    const baseClasses = 'text-xs font-medium flex items-center mt-1';
    
    switch (change.type) {
      case 'increase':
        return clsx(baseClasses, 'text-emerald-600 dark:text-emerald-500', changeClassName);
      case 'decrease':
        return clsx(baseClasses, 'text-rose-600 dark:text-rose-500', changeClassName);
      default:
        return clsx(baseClasses, 'text-slate-500 dark:text-slate-400', changeClassName);
    }
  };

  // Change indicator
  const getChangeIndicator = () => {
    if (!change) return null;

    switch (change.type) {
      case 'increase':
        return (
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      case 'decrease':
        return (
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  return (
    <Card 
      className={twMerge(clsx('p-4', variant === 'health' ? 'px-5 py-5' : '', className))} 
      onClick={onClick}
      variant={getCardVariant()}
    >
      <div className={clsx(
        'flex',
        variant === 'health' ? 'flex-col items-center text-center' : 'items-start'
      )}>
        {icon && (
          <div className={getIconContainerClasses()}>
            <div className={getIconClasses()}>{icon}</div>
          </div>
        )}
        <div className={clsx(variant === 'health' ? 'mt-2' : 'ml-3')}>
          <div className={getTitleClasses()}>{title}</div>
          <div className={getValueClasses()}>{value}</div>
          {change && (
            <div className={getChangeClasses()}>
              {getChangeIndicator()}
              <span>{Math.abs(change.value)}%</span>
              {change.text && <span className="ml-1 text-slate-500 dark:text-slate-400">{change.text}</span>}
            </div>
          )}
        </div>
      </div>
      {footer && (
        <div className={clsx(
          'mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400',
          variant === 'health' ? 'text-center' : ''
        )}>
          {footer}
        </div>
      )}
    </Card>
  );
};

export default StatsCard; 