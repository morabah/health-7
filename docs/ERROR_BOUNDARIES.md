# Error Boundary System

This document explains the error boundary implementation in the Health Appointment System. Error boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of crashing the entire application.

## Overview

The error boundary system consists of several components:

1. **ErrorBoundary Component**: A class component that catches errors in its children and displays fallback UI
2. **withErrorBoundary HOC**: A higher-order component for easily wrapping components with error boundaries
3. **useErrorHandler Hook**: A hook that allows functional components to trigger error boundaries
4. **Error Monitoring Service**: A centralized service for logging and reporting errors

## Using Error Boundaries

### Basic Usage

Wrap any component that might throw errors with the `ErrorBoundary` component:

```tsx
import ErrorBoundary from '@/components/ui/ErrorBoundary';

<ErrorBoundary>
  <ComponentThatMightThrowError />
</ErrorBoundary>
```

### Using with Higher-Order Component

For more convenient usage, you can use the `withErrorBoundary` HOC:

```tsx
import withErrorBoundary from '@/components/ui/withErrorBoundary';

function MyComponent() {
  // Component implementation
}

export default withErrorBoundary(MyComponent, {
  fallback: <CustomErrorUI />, // Optional custom fallback UI
  onError: (error, errorInfo) => {
    // Optional error handling logic
  }
});
```

### Using in Functional Components

In functional components, you can use the `useErrorHandler` hook to trigger the error boundary:

```tsx
import useErrorHandler from '@/hooks/useErrorHandler';

function MyComponent() {
  const [_, handleError] = useErrorHandler();
  
  const fetchData = async () => {
    try {
      const result = await api.getData();
      // Use result
    } catch (error) {
      // This will trigger the closest error boundary
      handleError(error);
    }
  };
  
  // Rest of component
}
```

## Error Monitoring

The application includes a centralized error monitoring service that can be integrated with external services like Sentry in production:

```tsx
import { reportError, errorMonitor } from '@/lib/errorMonitoring';

// Simple error reporting
reportError(error, { 
  component: 'MyComponent', 
  action: 'fetchData' 
});

// Setting user context
errorMonitor.setUser(userId);
```

## Best Practices

1. **Strategic Placement**: Place error boundaries at strategic points in your component tree to isolate failures and prevent the entire app from crashing.

2. **Granular Error Handling**: Use error boundaries at different levels of granularity:
   - App-level for catching unhandled errors
   - Page-level for isolating page failures
   - Feature-level for protecting critical functionality
   - Component-level for complex, error-prone components

3. **Informative Fallbacks**: Create informative fallback UIs that guide users on what to do next.

4. **Proper Error Reporting**: Always ensure errors are properly logged and reported to monitoring services.

5. **Context-Aware**: Include relevant context information in error reports (user ID, action being performed, component name, etc.).

6. **Recovery Options**: Where possible, provide users with options to recover from errors (refresh, go back, try again).

7. **User-Friendly Messages**: Display user-friendly error messages instead of technical details.

## Error Boundary Locations in the Codebase

We have implemented error boundaries in several key locations:

1. **Global Error Boundary**: In `ClientLayout.tsx` to catch all unhandled errors in the application
2. **Book Appointment Page**: In `book-appointment/[doctorId]/page.tsx` to handle errors in the booking flow
3. **Patient Dashboard**: In `patient/dashboard/page.tsx` to handle errors in the dashboard display

## Future Improvements

1. **Sentry Integration**: Add proper Sentry integration in production builds
2. **Retry Mechanisms**: Implement automatic retry mechanisms for transient failures
3. **Enhanced Analytics**: Add more detailed error analytics and tracking
4. **Recovery Strategies**: Develop more sophisticated recovery strategies based on error types
5. **Offline Support**: Add better support for handling errors during network outages 