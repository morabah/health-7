'use client';

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

/**
 * Tooltip component to display additional information on hover
 */
export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 300
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Determine the position of the tooltip
  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 5;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + 5;
        break;
      case 'bottom':
        top = triggerRect.bottom + 5;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.left - tooltipRect.width - 5;
        break;
    }
    
    // Keep tooltip within viewport
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    // Adjust for scrolling
    top += window.scrollY;
    left += window.scrollX;
    
    setCoords({ top, left });
  };
  
  // Handle mouse enter
  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      // Give the tooltip time to render before calculating position
      setTimeout(updatePosition, 0);
    }, delay);
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  
  // Update position on window resize
  useEffect(() => {
    if (isVisible) {
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isVisible]);

  // Get tooltip class for different positions
  const getTooltipClass = () => {
    switch (position) {
      case 'top': return 'after:bottom-[-5px] after:left-1/2 after:ml-[-5px] after:border-t-slate-800 after:border-t-slate-900';
      case 'right': return 'after:left-[-5px] after:top-1/2 after:mt-[-5px] after:border-r-slate-800 after:border-r-slate-900';
      case 'bottom': return 'after:top-[-5px] after:left-1/2 after:ml-[-5px] after:border-b-slate-800 after:border-b-slate-900';
      case 'left': return 'after:right-[-5px] after:top-1/2 after:mt-[-5px] after:border-l-slate-800 after:border-l-slate-900';
      default: return '';
    }
  };
  
  return (
    <>
      <div 
        ref={triggerRef}
        className="inline-block cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={`fixed z-50 max-w-xs bg-slate-800 dark:bg-slate-900 text-white text-sm rounded px-2 py-1 shadow-md
            after:absolute after:content-[''] after:border-[5px] after:border-transparent ${getTooltipClass()}`}
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px` 
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
        </div>
      )}
    </>
  );
} 