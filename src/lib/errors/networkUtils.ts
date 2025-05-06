/**
 * Network Utilities
 * 
 * This file contains network-related utilities for handling network state
 * and integrating with our error system.
 */

import { NetworkError } from './errorClasses';
import { addBreadcrumb } from './errorMonitoring';

/**
 * Checks if the user is online
 */
export function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  
  // If navigator.onLine is not available, assume online
  return true;
}

/**
 * A promise that resolves when the user is back online
 */
export function whenOnline(): Promise<void> {
  if (isOnline()) {
    return Promise.resolve();
  }
  
  return new Promise(resolve => {
    const listener = () => {
      if (isOnline()) {
        window.removeEventListener('online', listener);
        resolve();
      }
    };
    
    window.addEventListener('online', listener);
  });
}

/**
 * A function to execute when the user is online
 */
export async function executeWhenOnline<T>(
  fn: () => Promise<T>,
  options: {
    maxWaitTime?: number;
    waitMessage?: string;
    throwOnTimeout?: boolean;
  } = {}
): Promise<T> {
  const {
    maxWaitTime = 30000, // 30 seconds
    waitMessage = 'Waiting for network connection...',
    throwOnTimeout = true,
  } = options;
  
  // Record a breadcrumb for the network state
  addBreadcrumb(
    isOnline() ? 'Network is online' : 'Network is offline',
    'network'
  );
  
  // If online, execute immediately
  if (isOnline()) {
    return fn();
  }
  
  // Add a breadcrumb that we're waiting for a connection
  addBreadcrumb(waitMessage, 'network', { maxWaitTime });
  
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new NetworkError('Network connection timeout exceeded', {
          retryable: true,
          context: { maxWaitTime },
        })
      );
    }, maxWaitTime);
  });
  
  // Race between network connection and timeout
  if (throwOnTimeout) {
    await Promise.race([whenOnline(), timeoutPromise]);
  } else {
    try {
      await Promise.race([whenOnline(), timeoutPromise]);
    } catch (error) {
      addBreadcrumb('Network timeout occurred, but continuing', 'network', { error });
    }
  }
  
  // Now we're online (or we're ignoring the timeout)
  addBreadcrumb('Network is now available', 'network');
  
  // Execute the function
  return fn();
}

/**
 * Adds network state event listeners to enhance error context
 */
export function initNetworkStateMonitoring(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Initial state
  addBreadcrumb(
    isOnline() ? 'Initial network state: online' : 'Initial network state: offline',
    'network'
  );
  
  // Listen for online events
  window.addEventListener('online', () => {
    addBreadcrumb('Network connection restored', 'network');
  });
  
  // Listen for offline events
  window.addEventListener('offline', () => {
    addBreadcrumb('Network connection lost', 'network');
  });
}

/**
 * A hook to detect network connectivity
 */
export function useNetworkState() {
  if (typeof window === 'undefined') {
    // Server-side rendering - assume online
    return { online: true, offline: false };
  }
  
  const [online, setOnline] = useState(isOnline());
  
  useEffect(() => {
    // Update network status
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { online, offline: !online };
}

// Make sure to add the missing import if used
import { useState, useEffect } from 'react'; 