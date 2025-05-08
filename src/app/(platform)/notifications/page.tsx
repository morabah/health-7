'use client';

import { useEffect } from 'react';
import { LazyNotificationList } from '@/components/LazyComponents';
import { logInfo } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { prefetchLazyComponents } from '@/components/LazyComponents';

/**
 * Enhanced Notifications Page
 * Uses lazy-loaded, optimized components with memory caching
 */
export default function NotificationsPage() {
  const { user } = useAuth();

  // Prefetch other components that might be needed soon
  useEffect(() => {
    if (user?.uid) {
      // Log page view for analytics
      logInfo('page_view', { page: 'notifications', userId: user.uid });

      // Prefetch related components
      prefetchLazyComponents('all');
    }
  }, [user?.uid]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <LazyNotificationList />
    </div>
  );
}
