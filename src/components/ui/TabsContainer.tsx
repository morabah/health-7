import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string | React.ReactNode;
  content: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsContainerProps {
  tabs: TabItem[];
  variant?: 'pill' | 'underline' | 'bordered' | 'enclosed';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tabClassName?: string;
  panelClassName?: string;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  ariaLabel?: string;
  vertical?: boolean;
}

/**
 * TabsContainer component for consistent tab navigation across the application
 * Built on top of Headless UI's Tab component
 * 
 * @example
 * <TabsContainer
 *   tabs={[
 *     { id: 'upcoming', label: 'Upcoming', content: <UpcomingAppointments /> },
 *     { id: 'past', label: 'Past', content: <PastAppointments /> },
 *     { id: 'cancelled', label: 'Cancelled', content: <CancelledAppointments />, count: 2 }
 *   ]}
 *   variant="pill"
 * />
 */
const TabsContainer: React.FC<TabsContainerProps> = ({
  tabs,
  variant = 'underline',
  fullWidth = false,
  size = 'md',
  className,
  tabClassName,
  panelClassName,
  defaultIndex = 0,
  onChange,
  ariaLabel = 'Tabs',
  vertical = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

  const handleChange = (index: number) => {
    setSelectedIndex(index);
    if (onChange) {
      onChange(index);
    }
  };

  // Size-based styles
  const sizeStyles = {
    sm: 'text-sm py-1.5 px-2.5',
    md: 'text-sm py-2 px-3',
    lg: 'text-base py-2.5 px-4',
  };

  // Variant-based styles
  const getVariantStyles = (selected: boolean) => {
    switch (variant) {
      case 'pill':
        return selected
          ? 'bg-primary text-white shadow-sm'
          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800';
      case 'underline':
        return clsx(
          'border-b-2',
          selected
            ? 'border-primary text-primary dark:border-primary-400 dark:text-primary-400'
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-700'
        );
      case 'bordered':
        return clsx(
          'border',
          selected
            ? 'border-primary bg-primary/5 text-primary dark:bg-primary-900/20 dark:text-primary-400'
            : 'border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
        );
      case 'enclosed':
        return clsx(
          'border-b border-r first:border-l',
          selected
            ? 'border-slate-300 border-b-transparent bg-white text-slate-900 dark:border-slate-700 dark:border-b-transparent dark:bg-slate-800 dark:text-white'
            : 'border-slate-300 bg-slate-50 text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white'
        );
      default:
        return '';
    }
  };

  return (
    <div 
      className={twMerge(
        clsx(
          "w-full",
          vertical && "flex flex-row space-x-4",
          className
        )
      )}
    >
      <Tab.Group 
        vertical={vertical} 
        selectedIndex={selectedIndex} 
        onChange={handleChange}
      >
        <Tab.List 
          aria-label={ariaLabel}
          className={clsx(
            "flex",
            variant === 'enclosed' && "border-slate-300 dark:border-slate-700 border-b-0 dark:border-b-0",
            vertical 
              ? "flex-col space-y-1"
              : variant === 'underline'
                ? "border-b border-slate-300 dark:border-slate-700 space-x-2"
                : variant === 'enclosed'
                  ? "border-t border-l border-slate-300 dark:border-slate-700 rounded-t-md overflow-hidden space-x-0"
                  : "space-x-2"
          )}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              disabled={tab.disabled}
              className={({ selected }) =>
                twMerge(
                  clsx(
                    "font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
                    variant === 'underline' && "rounded-t-md rounded-b-none",
                    variant === 'enclosed' && "rounded-none border-t-2",
                    getVariantStyles(selected),
                    fullWidth && "flex-1 text-center",
                    sizeStyles[size],
                    tab.disabled && "opacity-50 cursor-not-allowed",
                    tabClassName
                  )
                )
              }
            >
              <span className="flex items-center justify-center gap-1.5">
                {tab.label}
                {tab.count !== undefined && (
                  <span 
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      variant === 'pill' 
                        ? "bg-white/20 text-white" 
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </Tab>
          ))}
        </Tab.List>
        
        <Tab.Panels className={clsx(
          "mt-4",
          variant === 'enclosed' && "border border-slate-300 dark:border-slate-700 rounded-b-md",
          vertical && "flex-1"
        )}>
          {tabs.map((tab) => (
            <Tab.Panel
              key={tab.id}
              className={twMerge(
                clsx(
                  "focus:outline-none",
                  variant === 'enclosed' && "p-4",
                  panelClassName
                )
              )}
            >
              {tab.content}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default TabsContainer; 