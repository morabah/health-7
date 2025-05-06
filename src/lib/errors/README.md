# Error Handling System

This directory contains the core modules for the application's error handling system. The system provides a consistent way to handle, categorize, and report errors throughout the application.

## Core Modules

### 1. Error Classes (`errorClasses.ts`)

Specialized error classes for different types of errors:

- `AppError` - Base class for all application errors
- `AuthError` - Authentication and authorization errors
- `NetworkError` - Network-related errors
- `ValidationError` - Data validation errors
- `ApiError` - API communication errors
- `AppointmentError` - Appointment-specific errors
- And more...

### 2. Error Utilities (`errorUtils.ts`)

Helper functions for error handling:

- `normalizeError` - Converts any error to a standardized format
- `getUserFriendlyMessage` - Extracts user-friendly messages from errors
- `withErrorHandling` - Wraps async functions with standardized error handling
- `withErrorHandlingSync` - Wraps synchronous functions with error handling

### 3. Network Utilities (`networkUtils.ts`)

Network-aware error handling utilities:

- `isOnline` - Checks if the application is online
- `executeWhenOnline` - Executes a function only when online
- `useNetworkState` - React hook for network state

### 4. Error Persistence (`errorPersistence.ts`)

Error storage for offline analysis:

- `persistError` - Saves errors for later analysis
- `getPersistedErrors` - Retrieves stored errors
- `sendPersistedErrors` - Sends stored errors when back online

### 5. API Error Handling (`apiErrorHandling.ts`)

API-specific error handling:

- `callApiWithErrorHandling` - Enhanced API caller with retry logic
- `parseApiError` - Standardizes API response errors

### 6. Error Monitoring (`errorMonitoring.ts`)

Error reporting and analysis:

- `reportError` - Reports errors to monitoring systems
- `ErrorMonitor` - Singleton for centralized error monitoring

## How to Use

### Basic Error Handling

```tsx
import { handleError } from '@/hooks/useErrorSystem';

try {
  // Potentially error-prone code
} catch (error) {
  handleError(error, {
    category: 'data',
    message: 'Failed to load data'
  });
}
```

### Network-Aware Operations

```tsx
import { executeWhenOnline, isOnline } from '@/hooks/useErrorSystem';

// Check network status
if (!isOnline()) {
  showOfflineMessage();
  return;
}

// Execute only when online
const result = await executeWhenOnline(async () => {
  return await fetchCriticalData();
});
```

### Error Persistence

```tsx
import { persistError, normalizeError } from '@/hooks/useErrorSystem';

try {
  // Critical operation
} catch (error) {
  // Save for later analysis
  persistError(normalizeError(error));
  showErrorMessage('Operation failed');
}
```

### Component Error Handling

```tsx
import { useErrorSystem } from '@/hooks/useErrorSystem';

function MyComponent() {
  const { 
    handleError, 
    clearError, 
    error, 
    isRetryable 
  } = useErrorSystem({
    component: 'MyComponent',
    defaultCategory: 'data',
    autoDismiss: true
  });
  
  // Use the error handling system
  // ...
}
```

### Using Error Boundaries

```tsx
import AppErrorBoundary from '@/components/error/AppErrorBoundary';
// or
import { withErrorBoundary } from '@/hooks/withErrorBoundary';

// Method 1: Wrap directly
function MyPage() {
  return (
    <AppErrorBoundary componentName="MyPage">
      <MyPageContent />
    </AppErrorBoundary>
  );
}

// Method 2: Use HOC
const SafeComponent = withErrorBoundary(UnsafeComponent, {
  componentName: 'UnsafeComponent'
});
```

## Best Practices

1. **Use Specialized Error Classes**: Choose the appropriate error class based on the error type for better categorization.

2. **Network Awareness**: Always check network status before operations that require connectivity.

3. **Error Persistence**: Save critical errors for later analysis, especially for operations that might be performed offline.

4. **Consistent Error Messages**: Use standardized error messages for better user experience.

5. **Error Boundaries**: Use error boundaries to prevent UI crashes by catching render errors.

6. **Component-Level Error Handling**: Use `useErrorSystem` hook for component-level error management.

7. **Error Context**: Always provide meaningful context when handling errors for better debugging.

## Migration from Legacy System

If you're migrating from the legacy error system, see the `MIGRATION.md` file for detailed instructions. 