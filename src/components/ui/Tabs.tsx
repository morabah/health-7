'use client';

import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
}

/**
 * Tabs component for navigating between different sections of content.
 */
export default function Tabs({ 
  tabs, 
  activeTab, 
  onChange, 
  variant = 'default' 
}: TabsProps) {
  const getTabStyles = (tabId: string) => {
    const isActive = tabId === activeTab;
    
    switch (variant) {
      case 'pills':
        return isActive
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400';
      
      case 'underline':
        return isActive
          ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-b-2 border-transparent';
      
      default:
        return isActive
          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 rounded-t-lg'
          : 'border-transparent text-slate-500 hover:text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:text-slate-300 rounded-t-lg';
    }
  };
  
  return (
    <div className="mb-6">
      <div className={`flex ${variant === 'default' ? 'border-b border-slate-200 dark:border-slate-700' : ''}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`${getTabStyles(tab.id)} ${
                variant === 'default' 
                  ? 'py-2 px-4 text-sm font-medium border-t border-l border-r' 
                  : variant === 'pills'
                    ? 'py-2 px-4 text-sm font-medium rounded-full m-1'
                    : 'py-2 px-4 text-sm font-medium'
              } flex items-center`}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {Icon && <Icon className="h-4 w-4 mr-2" />}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
} 