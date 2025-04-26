import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import Card from './Card';

/**
 * StatsCard component props
 * @interface StatsCardProps
 * @property {string} title - Card title/label
 * @property {string | number} value - Metric value to display
 * @property {LucideIcon} icon - Lucide icon component to display
 * @property {string} [className] - Additional CSS classes
 */
interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
}

/**
 * StatsCard component for displaying metrics with an icon
 * 
 * @example
 * <StatsCard 
 *   title="Total Users" 
 *   value={3852} 
 *   icon={Users} 
 * />
 */
const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ title, value, icon: Icon, className, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={twMerge(
          clsx('flex items-center p-6', className)
        )}
        {...props}
      >
        <div className="flex-shrink-0 mr-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </Card>
    );
  }
);

StatsCard.displayName = 'StatsCard';

export default StatsCard; 