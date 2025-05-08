# Batch API Pattern Documentation

## Overview
The Batch API pattern allows multiple API operations to be combined into a single request, reducing network overhead and improving application performance. This document outlines how to use the Batch API in our Health Appointment App.

## Key Benefits
- **Performance Improvement**: Reduces the number of API calls and network round-trips
- **Lower Bandwidth Usage**: Consolidates multiple requests into a single payload
- **Reduced Latency**: Fewer HTTP requests means less overall latency
- **Better User Experience**: Faster page loads and more responsive UI
- **Simplified Error Handling**: Process all related operations as a unit

## Core Components

### 1. `batchApiUtils.ts`
The main utility providing batch API functionality:
- `executeBatchOperations`: Executes multiple API operations in a single request
- `createBatchOperation`: Helper function to create properly formatted batch operations

### 2. `batchApiFallback.ts`
Fallback mechanisms for handling batch operation failures:
- `executeBatchWithFallback`: Automatic retry and fallback to individual calls
- `withBatchFallback`: HOC for wrapping batch functions with fallback capability

### 3. `dashboardLoaders.ts`
Hooks for loading dashboard data efficiently:
- `useDashboardBatch`: Fetches all dashboard data in a single batch request
- `useBatchResultsCache`: Updates React Query cache with batch response data

### 4. `useBatchData.ts`
Utility hook for processing data from batch responses:
- Extracts and formats data from specific keys in batch responses
- Updates React Query cache with processed data

## Usage Examples

### Basic Batch Operation
```typescript
import { executeBatchOperations, createBatchOperation } from '@/lib/batchApiUtils';

async function fetchDashboardData(userId, userRole) {
  // Create operations array
  const operations = [
    createBatchOperation('getMyUserProfile', {}, 'userProfile'),
    createBatchOperation('getMyNotifications', { limit: 5 }, 'notifications'),
    createBatchOperation('getMyAppointments', { status: 'upcoming' }, 'appointments')
  ];
  
  // Execute batch request
  const results = await executeBatchOperations(operations, { 
    uid: userId, 
    role: userRole 
  });
  
  return results;
}
```

### Using the Dashboard Batch Hook
```tsx
import { useDashboardBatch } from '@/data/dashboardLoaders';
import { useBatchData } from '@/hooks/useBatchData';

function DashboardComponent() {
  // Fetch all dashboard data
  const batchResult = useDashboardBatch();
  
  // Extract specific data from the batch response
  const { data, isLoading, error } = useBatchData(
    batchResult, 
    ['userProfile', 'notifications', 'appointments', 'stats']
  );
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      <ProfileCard data={data.userProfile} />
      <NotificationsList notifications={data.notifications?.notifications || []} />
      <AppointmentsList appointments={data.appointments?.appointments || []} />
    </div>
  );
}
```

### Using Batch API with Fallback
```typescript
import { executeBatchWithFallback } from '@/lib/batchApiFallback';

async function fetchDashboardDataWithFallback(userId, userRole) {
  const operations = [
    createBatchOperation('getMyUserProfile', {}, 'userProfile'),
    createBatchOperation('getMyNotifications', { limit: 5 }, 'notifications')
  ];
  
  // Execute with automatic fallback
  const results = await executeBatchWithFallback(
    operations, 
    { uid: userId, role: userRole },
    { retryCount: 2, timeoutMs: 5000 }
  );
  
  return results;
}
```

### Enhanced Doctor Search with Batching
```typescript
import { useEnhancedDoctorSearch } from '@/hooks/useEnhancedDoctorSearch';

function DoctorSearchComponent() {
  const { data, isLoading } = useEnhancedDoctorSearch({
    specialty: 'Cardiology',
    location: 'New York',
    includeFetchAvailability: true,
    availableDate: '2023-07-15',
    numAvailabilityDays: 7
  });
  
  return (
    <div>
      {isLoading ? <Spinner /> : (
        <DoctorList doctors={data?.doctors || []} />
      )}
    </div>
  );
}
```

## Best Practices

1. **Group Related Operations**: Batch operations that are logically related (e.g., all dashboard data)
2. **Consider Caching**: Update React Query cache with batch results to prevent redundant fetching
3. **Use Fallback Mechanisms**: Implement retry and fallback strategies for production reliability
4. **Monitor Performance**: Track batch operation performance to identify bottlenecks 
5. **Optimize Payload Size**: Only request necessary data to keep batch payloads manageable
6. **Handle Partial Failures**: Gracefully handle cases where some operations in a batch fail
7. **Test Thoroughly**: Write unit tests for batch operations to ensure they work as expected

## Advanced Topics

### Deduplication
The batch API automatically deduplicates identical operations to improve efficiency. For example, if two different components request the same data:

```typescript
// These will be automatically deduplicated in the batch request
const operations = [
  createBatchOperation('getDoctorProfile', { doctorId: '123' }, 'profile1'),
  createBatchOperation('getDoctorProfile', { doctorId: '123' }, 'profile2')
];
```

### Parallel Processing
Operations in a batch are processed in parallel on the server, which provides significant performance benefits over sequential API calls.

### Error Handling
If individual operations in a batch fail, others can still succeed. The response includes success/error status for each operation.

## Performance Considerations

- **Batch Size**: Keep batches to a reasonable size (generally under 20 operations)
- **Response Size**: Be aware of potentially large response payloads when batching
- **Request Timing**: Consider using different batches for critical vs. non-critical data

## Related Files

- `src/lib/batchApiUtils.ts`: Core batch operation utilities
- `src/lib/batchApiFallback.ts`: Fallback mechanisms
- `src/data/dashboardLoaders.ts`: Dashboard batch hooks
- `src/hooks/useBatchData.ts`: Data extraction utilities
- `src/hooks/useEnhancedDoctorSearch.ts`: Doctor search with batching
- `src/lib/localApiFunctions.ts`: Server-side batch handling 