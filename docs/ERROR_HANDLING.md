# Error Handling System Documentation

This document provides a comprehensive overview of the error handling architecture in our healthcare application. Understanding and following these patterns will ensure a consistent user experience when errors occur.

## Core Architecture

Our application uses a layered approach to error handling:

1. **Error Boundaries** - React's error boundaries catch rendering errors
2. **Error Monitoring** - Centralized error reporting and classification
3. **Error Hooks** - React hooks for component-level error handling
4. **Error Display** - User-friendly error presentation components

## Error Classification

Errors are categorized to provide appropriate user messages:

| Category | Description | Example |
|----------|-------------|---------|
| `network` | Connection issues | "Unable to connect to the server" |
| `auth` | Authentication problems | "Your session has expired" |
| `validation` | User input validation | "Email format is invalid" |
| `api` | API request failures | "Unable to process your request" |
| `database` | Data access issues | "Could not access patient records" |
| `permission` | Authorization issues | "You don't have permission" |
| `appointment` | Scheduling issues | "This time slot is no longer available" |
| `data` | Data loading problems | "Could not load your information" |
| `server` | Backend server errors | "Server is experiencing issues" |
| `unknown` | Uncategorized errors | "Something went wrong" |

## Error Severity Levels

Errors have different severity levels:

- `fatal` - Application crashes, requires page reload
- `error` - Significant error but application can continue
- `warning` - Issue that doesn't prevent core functionality
- `info` - Informational error message

## Components & Utilities

### 1. ErrorBoundary Component

`ErrorBoundary.tsx` provides a fallback UI when render errors occur.

```tsx
<ErrorBoundary
  fallback={<CustomErrorUI />}
  onError={(error, errorInfo) => logError(error, errorInfo)}
  componentName="PatientProfile"
>
  <YourComponent />
</ErrorBoundary>
```

### 2. withErrorBoundary HOC

For easier error boundary implementation:

```tsx
const SafeComponent = withErrorBoundary(UnsafeComponent, {
  componentName: 'UserProfile',
  fallback: <p>Could not load user profile</p>,
  captureErrors: true
});
```

### 3. ErrorDisplay Component

User-friendly error presentation:

```tsx
<ErrorDisplay
  error={error}
  message="Could not load appointments"
  severity="error"
  category="data"
  onRetry={fetchAppointments}
  onDismiss={clearError}
/>
```

### 4. useErrorHandler Hook

React hook for handling errors at the component level:

```tsx
// Simple mode
const [error, handleError] = useErrorHandler();

// Enhanced mode
const {
  error,
  isErrorVisible,
  handleError,
  clearError,
  tryCatch,
  withErrorHandling,
  ErrorComponent
} = useErrorHandler({
  component: 'AppointmentBooking',
  autoDismiss: true,
  defaultCategory: 'appointment'
});
```

### 5. Error Monitoring

Centralized error reporting for analytics and monitoring:

```tsx
import { reportError } from '@/lib/errorMonitoring';

try {
  // Code that might fail
} catch (error) {
  const { errorId } = reportError(error, {
    component: 'PaymentForm',
    severity: 'error',
    category: 'payment'
  });
  
  // Use errorId for reference in support tickets
}
```

## Best Practices

1. **Use Error Boundaries for UI Components**
   - Wrap independent UI sections in error boundaries
   - Provide helpful fallback UIs for critical components

2. **Handle Async Errors with try/catch**
   - Use try/catch blocks for all async operations
   - Leverage the useErrorHandler hook for consistent handling

3. **Categorize Errors Appropriately**
   - Set the correct category and severity for proper user messages
   - Consider adding custom recovery suggestions where appropriate

4. **Provide Retry Mechanisms**
   - For transient errors (network, etc.), include retry options
   - Clear errors when retrying operations

5. **Log Errors for Debugging**
   - Always log errors for troubleshooting
   - Include relevant context in error reports

## Form Validation

For form validation, we use Zod schemas:

```tsx
// Define validation schema
const FormSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password is too short")
});

// Validate form data
const result = FormSchema.safeParse(formData);
if (!result.success) {
  // Handle validation errors
  const errors = result.error.format();
}
```

## Local Development vs Production

In local development:
- Detailed error messages are displayed
- Manual verification is available for auth flows
- Random error simulation for testing error states

In production:
- User-friendly error messages hide technical details
- Errors are reported to monitoring systems
- Critical errors are logged for investigation

## Registration Flow Error Handling

The registration flow has specialized error handling:
- Form input validation with Zod schemas
- Email verification simulation
- Auth-specific error messages and recovery options

## Implementation Example

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

function PatientList() {
  const { 
    error, 
    handleError, 
    ErrorComponent 
  } = useErrorHandler({
    component: 'PatientList',
    defaultCategory: 'data'
  });

  const fetchPatients = async () => {
    try {
      // Fetch data...
    } catch (err) {
      handleError(err, { 
        message: 'Could not load patient list',
        retryable: true 
      });
    }
  };

  return (
    <div>
      <ErrorComponent />
      {/* Rest of component */}
    </div>
  );
}
``` 