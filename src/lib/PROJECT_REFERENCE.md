# Health App Project Reference

## Network Request Optimization

Implemented efficient caching and request deduplication to optimize network requests with the following improvements:

1. Enhanced LRU Cache:
   - Reduced default TTL from 30s to 20s for fresher data
   - Increased cache size from 10MB to 15MB
   - Increased max entries from 500 to 750

2. Improved Deduplication:
   - Added more methods for deduplication (getAllDoctors, getAllUsers, etc.)
   - Decreased TTL values for high-frequency API calls
   - Special handling for notifications to reduce redundant requests
   - Added debouncing mechanism to prevent duplicate requests within a short time window

3. Enhanced React Query Configuration:
   - Adjusted staleTime from 5 minutes to 3 minutes
   - Reduced GC time from 10 minutes to 5 minutes 
   - Disabled refetchOnMount and refetchOnReconnect to reduce unnecessary fetches
   - Added cross-cache synchronization between React Query and LRU cache

4. Request Batching:
   - Implemented a batching mechanism for rapid API requests
   - Configured method-specific batching queues (notifications, doctors, appointments, users)
   - Special handling for notification requests to merge multiple requests
   - Added small delays between batch executions to prevent server overload

These optimizations significantly reduce redundant API calls, especially for high-frequency endpoints like notifications, doctor listings, and user data, resulting in improved application performance and reduced server load.

Key files modified:
- src/lib/queryClient.ts
- src/lib/apiDeduplication.ts 
- src/lib/lruCache.ts
- src/lib/enhancedApiClient.ts
- src/lib/apiClient.ts 