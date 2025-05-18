'use client';

import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { logInfo } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';

/**
 * A virtualized list component that only renders visible items for better performance
 * with large datasets. Uses react-window for efficient rendering.
 */
export const VirtualizedList = ({
  items,
  itemSize,
  height,
  overscanCount = 5,
  onItemsRendered,
  renderItem,
  itemKey,
  className,
}: {
  items: any[];
  itemSize: number;
  height: number;
  overscanCount?: number;
  onItemsRendered?: (info: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => void;
  renderItem: (item: any, index: number, style: React.CSSProperties) => React.ReactNode;
  itemKey: (index: number) => string | number;
  className?: string;
}) => {
  // Performance tracking
  const perfRef = React.useRef(trackPerformance('VirtualizedList'));
  
  // Handle items rendered event with performance tracking
  const handleItemsRendered = React.useCallback((info: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    // Call the provided callback if it exists
    if (onItemsRendered) {
      onItemsRendered(info);
    }
    
    // Log performance metrics for large lists
    if (items.length > 50) {
      const visibleCount = info.visibleStopIndex - info.visibleStartIndex + 1;
      logInfo('Performance:VirtualizedList', {
        visibleItems: visibleCount,
        totalItems: items.length,
        visibleRatio: `${Math.round((visibleCount / items.length) * 100)}%`,
        overscanCount
      });
    }
  }, [items.length, onItemsRendered, overscanCount]);
  
  // Clean up performance tracking on unmount
  React.useEffect(() => {
    return () => {
      perfRef.current.stop();
    };
  }, []);
  
  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemSize}
      width="100%"
      overscanCount={overscanCount}
      onItemsRendered={handleItemsRendered}
      itemKey={itemKey}
      className={className}
    >
      {({ index, style }) => renderItem(items[index], index, style)}
    </List>
  );
};

export default VirtualizedList;
