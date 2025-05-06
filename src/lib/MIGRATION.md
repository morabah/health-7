# Error System Migration Guide

This document outlines the steps to migrate from the old error handling system to the new unified error system.

## Overview

The application has transitioned to a new, unified error handling system that provides better organization, consistency, and integration. This migration guide will help you update your code to use the new system.

## Key Changes

1. **New Import Paths**:
   - Old: `import { SomeError } from '@/lib/errors'`
   - New: `import { SomeError } from '@/lib/errors/errorClasses'`

2. **New Error System Hook**:
   - Old: `useErrorHandler` or `useAppErrorHandler`
   - New: `useErrorSystem`

3. **Centralized Initialization**:
   - Old: No centralized initialization
   - New: `setupErrorHandling()` in application root

## Migration Steps

### Step 1: Update Imports

Replace imports from the old path with the new modular structure:

```diff
- import { AuthError, ValidationError } from '@/lib/errors';
+ import { AuthError, ValidationError } from '@/lib/errors/errorClasses';
```

For utility functions:

```diff
- import { enhanceError } from '@/lib/errors';
+ import { normalizeError } from '@/lib/errors/errorUtils';
```

### Step 2: Replace Error Handling Hooks

Replace direct usage of the error handling hooks with the unified `useErrorSystem` hook:

```diff
- import useErrorHandler from '@/hooks/useErrorHandler';
+ import { useErrorSystem } from '@/hooks/useErrorSystem';

  function MyComponent() {
-   const { handleError, clearError } = useErrorHandler();
+   const { handleError, clearError } = useErrorSystem();
    
    // Rest of the component
  }
```

### Step 3: Add Error Boundaries

Wrap key components with the `AppErrorBoundary` component:

```tsx
import AppErrorBoundary from '@/components/error/AppErrorBoundary';

function MyPage() {
  return (
    <AppErrorBoundary componentName="MyPage">
      <MyPageContent />
    </AppErrorBoundary>
  );
}
```

### Step 4: Network-Aware Error Handling

For operations that should be aware of network state:

```tsx
import { executeWhenOnline, isOnline } from '@/hooks/useErrorSystem';

async function fetchData() {
  // Will wait for online status before executing
  return executeWhenOnline(async () => {
    // Your fetch code here
  });
}

// Or check network status directly
if (!isOnline()) {
  // Show offline message
}
```

### Step 5: Persisting Errors for Offline Analysis

For important operations that should persist errors:

```tsx
import { persistError, sendPersistedErrors } from '@/hooks/useErrorSystem';

try {
  // Critical operation
} catch (error) {
  // Store the error for later analysis/reporting
  persistError(error);
  
  // Show user-friendly message
}

// When back online, send persisted errors
if (isOnline()) {
  sendPersistedErrors(async (error) => {
    // Send to server
    return true; // Return true if successfully sent
  });
}
```

## Files To Be Removed After Migration

Once all code has been migrated to the new system, the following files can be safely removed:

- `src/lib/errors.ts` (replaced by modular files in `src/lib/errors/`)

## Benefits of the New System

- **Better organization**: Error-related code is now properly modularized
- **Enhanced functionality**: Network awareness, error persistence, standardized handling
- **Improved developer experience**: Consistent API, better documentation
- **Type safety**: Improved TypeScript types throughout the error system
- **Performance**: Better memory management and more targeted imports 