# Error Handling Guide

This guide explains how to use the standardized error handling system in the Health Appointment application. The system provides consistent error handling and user feedback across the application, ensuring a better user experience and easier debugging.

## Table of Contents

1. [Overview](#overview)
2. [Error Boundaries](#error-boundaries)
3. [Error Handling Hooks](#error-handling-hooks)
4. [Best Practices](#best-practices)
5. [Examples](#examples)

## Overview

The error handling system consists of several key components:

- **Global Error Boundary**: Catches errors at the application level
- **Specialized Error Boundaries**: Tailored for specific contexts (API, Forms, etc.)
- **Error Handling Hooks**: For component-level error handling
- **Error Classes**: Standardized error types with consistent properties
- **Error Monitoring**: Centralized error reporting and logging

## Error Boundaries

### GlobalErrorBoundary

The base error boundary that all other boundaries extend. Use this for custom error handling scenarios.

```tsx
import { GlobalErrorBoundary } from '@/components/error-boundaries';

<GlobalErrorBoundary
  componentName="MyComponent"
  fallback={customFallbackComponent}
  onError={(error, errorInfo) => {
    // Custom error handling
  }}
>
  <MyComponent />
</GlobalErrorBoundary>
```

### ApiErrorBoundary

Specialized for API-related errors. Automatically handles authentication errors and provides appropriate UI.

```tsx
import { ApiErrorBoundary } from '@/components/error-boundaries';

<ApiErrorBoundary componentName="DataFetchingComponent">
  <DataFetchingComponent />
</ApiErrorBoundary>
```

### FormErrorBoundary

Specialized for form validation errors. Displays validation errors in a user-friendly format.

```tsx
import { FormErrorBoundary } from '@/components/error-boundaries';

<FormErrorBoundary componentName="UserRegistrationForm">
  <UserRegistrationForm />
</FormErrorBoundary>
```

### ErrorBoundaryProvider

Provides a context for creating standardized error boundaries throughout the application.

```tsx
import { ErrorBoundaryProvider } from '@/components/error-boundaries';

<ErrorBoundaryProvider
  defaultResetOnRouteChange={true}
  onGlobalError={(error, errorInfo) => {
    // Global error handler
  }}
>
  <App />
</ErrorBoundaryProvider>
```

### useErrorBoundary Hook

Create error boundaries programmatically within components.

```tsx
import { useErrorBoundary } from '@/components/error-boundaries';

function MyComponent() {
  const { createBoundary } = useErrorBoundary();
  
  const CustomBoundary = createBoundary({
    componentName: 'CustomSection',
    errorCategory: 'data',
    errorSeverity: 'warning',
  });
  
  return (
    <div>
      <CustomBoundary>
        <SomeRiskyComponent />
      </CustomBoundary>
    </div>
  );
}
```

## Error Handling Hooks

### useStandardErrorHandling

The primary hook for component-level error handling. It provides consistent error categorization, reporting, and user feedback.

```tsx
import useStandardErrorHandling from '@/hooks/useStandardErrorHandling';

function MyComponent() {
  const { handleError, withErrorHandling } = useStandardErrorHandling({
    componentName: 'MyComponent',
    defaultCategory: 'data',
    defaultSeverity: 'warning',
    defaultMessage: 'An error occurred while processing data',
    context: { /* additional context */ }
  });
  
  // Handle errors directly
  const handleClick = () => {
    try {
      // Risky operation
    } catch (error) {
      handleError(error, {
        message: 'Custom error message',
        category: 'ui',
        severity: 'error'
      });
    }
  };
  
  // Wrap functions with error handling
  const processData = withErrorHandling(async (data) => {
    // Process data with automatic error handling
    if (!data) {
      throw new Error('Data is required');
    }
    return transformData(data);
  }, {
    message: 'Failed to process data',
    category: 'data'
  });
  
  // Rest of component
}
```

### useStandardErrorHandling

The main hook for component-level error handling.

```tsx
import useStandardErrorHandling from '@/hooks/useStandardErrorHandling';

function MyComponent() {
  const { 
    error,
    handleError,
    clearError,
    withErrorHandling,
    hasError
  } = useStandardErrorHandling({
    componentName: 'MyComponent',
    defaultCategory: 'data',
    defaultSeverity: 'warning',
    defaultMessage: 'An error occurred while processing your request',
  });
  
  // Wrap async functions with error handling
  const fetchData = withErrorHandling(async () => {
    // Your async code here
  }, {
    message: 'Failed to fetch data',
    category: 'api',
  });
  
  // Handle errors directly
  const handleClick = () => {
    try {
      // Risky operation
    } catch (error) {
      handleError(error, {
        message: 'Operation failed',
        category: 'ui',
      });
    }
  };
  
  return (
    <div>
      {hasError && <div className="error">{error.message}</div>}
      <button onClick={fetchData}>Fetch Data</button>
      <button onClick={handleClick}>Perform Action</button>
      {hasError && <button onClick={clearError}>Clear Error</button>}
    </div>
  );
}
```

## Integration with Specialized Workflows

### Booking Workflow Error Handling

The application includes specialized error boundaries for critical workflows:

```tsx
import { BookingWorkflowErrorBoundary } from '@/components/error-boundaries';

<BookingWorkflowErrorBoundary componentName="AppointmentBooking">
  <AppointmentBookingForm />
</BookingWorkflowErrorBoundary>
```

### Payment Processing Error Handling

```tsx
import { BookingPaymentErrorBoundary } from '@/components/error-boundaries';

<BookingPaymentErrorBoundary componentName="PaymentProcessor">
  <PaymentForm />
</BookingPaymentErrorBoundary>
```

## Async Operations and Error Handling

When working with async operations, ensure proper error handling:

```tsx
async function MyAsyncComponent() {
  const { handleError, withErrorHandling } = useStandardErrorHandling({
    componentName: 'MyAsyncComponent'
  });
  
  // Process data with error handling
  let processedData;
  try {
    // Use a self-invoking async function to handle the async operation
    processedData = await (async () => {
      try {
        return await fetchAndProcessData();
      } catch (error) {
        handleError(error, {
          message: 'Failed to fetch and process data',
          category: 'data',
          severity: 'error'
        });
        throw error;
      }
    })();
  } catch (error) {
    // This will be caught by the error boundary
    throw error;
  }
  
  // Rest of component using processedData
}
```

## Best Practices

1. **Use the Right Boundary for the Right Context**
   - Use `ApiErrorBoundary` for API calls
   - Use `FormErrorBoundary` for form submissions
   - Use `GlobalErrorBoundary` for custom scenarios

2. **Component-Level Error Handling**
   - Use `useStandardErrorHandling` for local error handling
   - Use `withErrorHandling` for async operations
   - Always provide meaningful error messages

3. **Error Categorization**
   - Categorize errors appropriately (`api`, `validation`, `auth`, `data`, `ui`, `network`, `unknown`)
   - Set appropriate severity levels (`info`, `warning`, `error`, `fatal`)

4. **Error Recovery**
   - Provide clear retry mechanisms when appropriate
   - Redirect to safe states when recovery isn't possible

5. **Consistent User Experience**
   - Use standard error UI components
   - Provide actionable feedback to users
   - Avoid technical jargon in user-facing messages

## Examples

### Dashboard Page with Error Handling

```tsx
import { ApiErrorBoundary } from '@/components/error-boundaries';
import useStandardErrorHandling from '@/hooks/useStandardErrorHandling';

// Wrapper component with error boundary
export default function DashboardPageWithErrorHandling() {
  return (
    <ApiErrorBoundary componentName="Dashboard">
      <DashboardPage />
    </ApiErrorBoundary>
  );
}

// Main component with error handling
async function DashboardPage() {
  const { handleError, withErrorHandling } = useStandardErrorHandling({
    componentName: 'DashboardPage',
    defaultCategory: 'data',
    defaultSeverity: 'warning',
    defaultMessage: 'Failed to load dashboard data'
  });
  
  // Fetch data
  const { data, isLoading, error } = useDashboardData();
  
  // Handle fetch errors
  if (error) {
    handleError(error);
    throw error; // Let the error boundary handle it
  }
  
  // Process data safely
  const processDashboardData = withErrorHandling(async () => {
    if (!data) {
      throw new Error('Dashboard data is not available');
    }
    return {
      // Transform data safely
      profile: data.profile,
      stats: data.stats,
      // etc.
    };
  });
  
  // Use the processed data
  const dashboardData = await processDashboardData();
  
  return (
    <div>
      {/* Dashboard UI */}
    </div>
  );
}
```

### Form with Error Handling

```tsx
import { FormErrorBoundary } from '@/components/error-boundaries';
import useStandardErrorHandling from '@/hooks/useStandardErrorHandling';

export default function ContactFormWithErrorHandling() {
  return (
    <FormErrorBoundary componentName="ContactForm">
      <ContactForm />
    </FormErrorBoundary>
  );
}

function ContactForm() {
  const { handleError, withErrorHandling } = useStandardErrorHandling({
    componentName: 'ContactForm',
    defaultCategory: 'validation',
    defaultSeverity: 'warning'
  });
  
  const handleSubmit = withErrorHandling(async (formData) => {
    // Validate form data
    if (!formData.email) {
      throw new ValidationError('Email is required');
    }
    
    // Submit form data
    await submitContactForm(formData);
    
    // Show success message
    toast.success('Form submitted successfully');
  }, {
    message: 'Failed to submit form',
    category: 'form'
  });
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### API Data Fetching Component

```tsx
import { ApiErrorBoundary } from '@/components/error-boundaries';
import useStandardErrorHandling from '@/hooks/useStandardErrorHandling';
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }) {
  const { handleError, withErrorHandling } = useStandardErrorHandling({
    componentName: 'UserProfile',
    defaultCategory: 'data',
  });

  const { data, isLoading, error } = useQuery(
    ['user', userId],
    () => fetchUserData(userId),
    {
      onError: (error) => {
        handleError(error, {
          message: 'Failed to load user profile',
          category: 'api',
        });
      },
    }
  );

  // Process data with error handling
  const processUserData = withErrorHandling(() => {
    if (!data) throw new Error('No user data available');
    return {
      name: data.name,
      email: data.email,
      // Additional processing...
    };
  }, {
    message: 'Failed to process user data',
    category: 'data',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) throw error; // Let the boundary handle it

  // This will be caught by the boundary if it fails
  const userData = processUserData();

  return (
    <div>
      <h1>{userData.name}</h1>
      <p>{userData.email}</p>
    </div>
  );
}

// Wrap with error boundary
export default function UserProfileWithErrorHandling(props) {
  return (
    <ApiErrorBoundary componentName="UserProfile">
      <UserProfile {...props} />
    </ApiErrorBoundary>
  );
}
```

### Form Submission Component

```tsx
import { FormErrorBoundary } from '@/components/error-boundaries';
import useStandardErrorHandling from '@/hooks/useStandardErrorHandling';
import { useState } from 'react';

function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const { handleError, withErrorHandling, error, hasError, clearError } = useStandardErrorHandling({
    componentName: 'ContactForm',
    defaultCategory: 'validation',
  });

  const handleSubmit = withErrorHandling(async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name) throw new Error('Name is required');
    if (!formData.email) throw new Error('Email is required');
    if (!formData.message) throw new Error('Message is required');
    
    // Submit form data
    await submitFormData(formData);
    
    // Reset form on success
    setFormData({ name: '', email: '', message: '' });
  }, {
    message: 'Failed to submit form',
    category: 'validation',
  });

  return (
    <form onSubmit={handleSubmit}>
      {hasError && (
        <div className="error-message">
          {error.message}
          <button onClick={clearError}>×</button>
        </div>
      )}
      
      <div>
        <label>Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      
      <div>
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      
      <div>
        <label>Message</label>
        <textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
      </div>
      
      <button type="submit">Submit</button>
    </form>
  );
}

// Wrap with error boundary
export default function ContactFormWithErrorHandling() {
  return (
    <FormErrorBoundary componentName="ContactForm">
      <ContactForm />
    </FormErrorBoundary>
  );
}
```

By following these guidelines and using the provided error handling components and hooks, you can ensure a consistent error handling experience throughout the application.
