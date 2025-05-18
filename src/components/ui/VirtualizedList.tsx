'use client';

import React from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
// Import the logger functions
import { logInfo } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';

interface VirtualizedListProps<T> {
  items: T[];
  height?: number;
  itemSize: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  className?: string;
  itemKey?: (index: number, data: any) => string;
  overscanCount?: number;
  onItemsRendered?: (info: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => void;
}

/**
 * A reusable virtualized list component that efficiently renders only the visible items
 * to improve performance for long lists.
 */
export default function VirtualizedList<T>({
  items,
  height,
  itemSize,
  renderItem,
  className = '',
  itemKey,
  overscanCount = 5,
  onItemsRendered,
}: VirtualizedListProps<T>) {
  // Track render performance
  const perfRef = React.useRef(trackPerformance('VirtualizedList'));
  const itemCount = items.length;

  // Log performance metrics when component mounts with large lists
  React.useEffect(() => {
    if (items.length > 100) {
      logInfo('VirtualizedList performance', {
        itemCount: items.length,
        renderedHeight: height,
        itemSize,
      });
    }
    
    return () => {
      perfRef.current.stop();
    };
  }, [items.length, height, itemSize]);

  // Row renderer function for react-window
  const Row = React.useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = items[index];
      return renderItem(item, index, style);
    },
    [items, renderItem]
  );

  // Generate a key for each item if not provided
  const getItemKey = React.useCallback(
    (index: number, data: any) => {
      if (itemKey) {
        return itemKey(index, data);
      }
      // Default key generation using index and optional id
      const item = items[index];
      return (item as any).id ? `item-${(item as any).id}` : `item-${index}`;
    },
    [items, itemKey]
  );

  return (
    <div className={`w-full ${className}`} data-testid="virtualized-list">
      {height ? (
        <List
          height={height}
          width="100%"
          itemCount={itemCount}
          itemSize={itemSize}
          overscanCount={overscanCount}
          onItemsRendered={onItemsRendered}
          itemKey={getItemKey}
        >
          {Row}
        </List>
      ) : (
        <AutoSizer>
          {({ height: autoHeight, width }) => (
            <List
              height={autoHeight}
              width={width}
              itemCount={itemCount}
              itemSize={itemSize}
              overscanCount={overscanCount}
              onItemsRendered={onItemsRendered}
              itemKey={getItemKey}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      )}
    </div>
  );
}
