# Error Boundaries

This directory contains specialized error boundary components for different parts of the application. These components provide context-specific error messages and recovery options when errors occur.

## Available Error Boundaries

### New Unified Error Boundary (Recommended)

- **CustomizableErrorBoundary**: A flexible, configurable error boundary that can be customized for any context. This is the recommended approach for new components.

### Core Error Boundaries

- **GlobalErrorBoundary**: Application-wide error boundary that provides standardized error handling (now uses CustomizableErrorBoundary internally)
- **AppointmentErrorBoundary**: For appointment-related components and pages (now uses CustomizableErrorBoundary internally)
- **DoctorProfileErrorBoundary**: For doctor profile components (now uses CustomizableErrorBoundary internally)
- **DataLoadingErrorBoundary**: General-purpose data loading/API error boundary (now uses CustomizableErrorBoundary internally)

### Additional Specialized Error Boundaries

- **AuthErrorBoundary**: For authentication-related components (login, register, etc.)
- **AdminDashboardErrorBoundary**: For admin dashboard pages and components (now uses CustomizableErrorBoundary internally)
- **PaymentProcessingErrorBoundary**: For payment-related components
- **BookingWorkflowErrorBoundary**: For appointment booking process components (now uses CustomizableErrorBoundary internally)

### Booking Workflow Specialized Error Boundaries

- **TimeSlotSelectionErrorBoundary**: Specifically for time slot selection components, handling errors like unavailable slots (now uses CustomizableErrorBoundary internally)
- **BookingPaymentErrorBoundary**: For payment processing during the booking workflow with detailed payment error handling (now uses CustomizableErrorBoundary internally)

## Usage

### Using the CustomizableErrorBoundary (Recommended)

The new CustomizableErrorBoundary provides a flexible, unified approach to error handling. It accepts props to customize the title, message, icon, and actions:

```tsx
import { CustomizableErrorBoundary } from '@/components/error-boundaries';
import { Calendar, RefreshCw, ArrowLeft } from 'lucide-react';

export default function AppointmentsPage() {
  return (
    <CustomizableErrorBoundary
      title="Unable to load appointments"
      message="We encountered an issue while loading your appointment information."
      icon={Calendar}
      category="appointment"
      actions={[
        {
          label: 'Retry',
          icon: RefreshCw,
          onClick: () => window.location.reload(),
          variant: 'primary'
        },
        {
          label: 'Back to Dashboard',
          icon: ArrowLeft,
          href: '/dashboard',
          variant: 'outline'
        }
      ]}
    >
      <YourAppointmentComponent />
    </CustomizableErrorBoundary>
  );
}
```

### Using Specialized Error Boundaries

Wrap any component that might throw errors with the appropriate error boundary:

```tsx
import { AppointmentErrorBoundary } from '@/components/error-boundaries';

export default function AppointmentsPage() {
  return (
    <AppointmentErrorBoundary>
      <YourAppointmentComponent />
    </AppointmentErrorBoundary>
  );
}
```

### Wrapper Pattern

For pages with complex content, use a wrapper pattern to separate the error boundary from the component implementation:

```tsx
export default function BookAppointmentPage() {
  return (
    <BookingWorkflowErrorBoundary componentName="BookAppointmentPage">
      <BookAppointmentPageContent />
    </BookingWorkflowErrorBoundary>
  );
}

function BookAppointmentPageContent() {
  // Component implementation
}
```

### With Custom Component Name

You can specify a custom component name for better error reporting:

```tsx
<AuthErrorBoundary componentName="RegistrationForm">
  <RegistrationFormComponent />
</AuthErrorBoundary>
```

### Specialized Error Handling for Booking Workflow

For booking-related components, use the specialized error boundaries with the `useBookingError` hook:

```tsx
import { TimeSlotSelectionErrorBoundary } from '@/components/error-boundaries';
import useBookingError from '@/hooks/useBookingError';

function TimeSlotSelector({ doctorId, date }) {
  const { throwTimeSlotError } = useBookingError();
  
  const handleLoadSlots = async () => {
    try {
      const response = await fetchTimeSlots(doctorId, date);
      if (response.slots.length === 0) {
        throwTimeSlotError(
          'NO_SLOTS_AVAILABLE',
          'No available time slots found for the selected date',
          { doctorId, date }
        );
      }
      return response.slots;
    } catch (error) {
      throwTimeSlotError(
        'LOADING_FAILED',
        'Failed to load available time slots',
        { doctorId, date, error }
      );
    }
  };
  
  return (
    // Component implementation
  );
}

// Wrap with error boundary in parent component
function DoctorBookingPage() {
  return (
    <TimeSlotSelectionErrorBoundary componentName="DoctorTimeSlots">
      <TimeSlotSelector doctorId="123" date={new Date()} />
    </TimeSlotSelectionErrorBoundary>
  );
}
```

## Implementation Guidelines

1. Use the most specific error boundary for the component's functionality
2. Provide meaningful component names for better error tracking
3. Consider nesting error boundaries for complex workflows (e.g., a page-level boundary with component-level boundaries inside)
4. Use the `useBookingError` hook to throw standardized errors that will be properly handled by the specialized boundaries

## CustomizableErrorBoundary API

The CustomizableErrorBoundary component provides a flexible API for creating error boundaries with customized UI and behavior.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | string | The title displayed in the error UI |
| `message` | string | The message displayed in the error UI |
| `icon` | LucideIcon | The icon component to display (from lucide-react) |
| `category` | ErrorCategory | The category of the error (e.g., 'api', 'data', 'validation') |
| `actions` | ErrorAction[] | Array of action buttons to display (see below) |
| `showErrorDetails` | boolean | Whether to show the raw error message (default: true) |
| `componentName` | string | Name of the component for error reporting |
| `additionalContext` | object | Additional context data for error reporting |
| `onError` | function | Optional callback when an error occurs |

### ErrorAction Interface

```typescript
interface ErrorAction {
  label: string;              // Button text
  icon?: LucideIcon;          // Optional icon component
  onClick?: () => void;       // Click handler (for buttons)
  href?: string;              // URL (for links)
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'; // Button style
}
```

### Example: Dynamic Error Handling

```tsx
import { CustomizableErrorBoundary } from '@/components/error-boundaries';
import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

function DynamicErrorHandler({ children }) {
  const [actions, setActions] = useState([]);
  
  useEffect(() => {
    // You can dynamically update actions based on error context
    setActions([
      {
        label: 'Retry',
        icon: RefreshCw,
        onClick: () => window.location.reload(),
        variant: 'primary'
      },
      {
        label: 'Home',
        icon: Home,
        href: '/',
        variant: 'outline'
      }
    ]);
  }, []);
  
  return (
    <CustomizableErrorBoundary
      title="Dynamic Error Handler"
      message="This error boundary adapts based on the error context."
      icon={AlertTriangle}
      actions={actions}
    >
      {children}
    </CustomizableErrorBoundary>
  );
}
```

## Choosing the Right Error Boundary

- **CustomizableErrorBoundary**: Use for new components where you want full control over the error UI
- **RootErrorBoundary**: Use for application-wide error handling or as a last-resort fallback
- **DataLoadingErrorBoundary**: Use for components that primarily fetch data
- **AuthErrorBoundary**: Use for login, registration, and user authentication flows
- **AppointmentErrorBoundary**: Use for appointment lists, details, and management
- **DoctorProfileErrorBoundary**: Use for doctor profile viewing and editing
- **AdminDashboardErrorBoundary**: Use for admin pages and administrative features
- **PaymentProcessingErrorBoundary**: Use for payment forms and checkout processes
- **BookingWorkflowErrorBoundary**: Use for the appointment booking workflow

## Example: Adding Error Boundaries to a New Feature

When implementing a new feature, consider errors that might occur and choose the appropriate error boundary:

```tsx
// For a payment component
function PaymentProcessor() {
  return (
    <PaymentProcessingErrorBoundary>
      <CreditCardForm />
    </PaymentProcessingErrorBoundary>
  );
}

// For an admin feature
function AdminUsersPage() {
  return (
    <AdminDashboardErrorBoundary>
      <UserManagementContent />
    </AdminDashboardErrorBoundary>
  );
}
```

Remember that error boundaries only catch errors in the React component tree, not in event handlers or asynchronous code. For these cases, use try/catch and the `useErrorHandler` hook.

## Best Practices

1. **Isolate Components**
   - Use error boundaries to isolate independent parts of the UI
   - Wrap complex components with error boundaries to prevent error cascades

2. **Custom Fallback UIs**
   - Use specialized error boundaries for better user experience
   - Provide context-specific recovery options

3. **Error Monitoring**
   - All errors are automatically reported to the error monitoring system
   - Use the `componentName` prop to identify the source of errors

4. **Recovery Options**
   - Provide clear retry options when appropriate
   - Consider navigation alternatives when retry isn't applicable

## GlobalErrorBoundary

The GlobalErrorBoundary has been refactored to use the CustomizableErrorBoundary internally while maintaining backward compatibility with existing code. This provides several benefits:

1. **Consistent Error Handling**: All error boundaries now use the same underlying component
2. **Improved Maintainability**: Changes to error handling can be made in one place
3. **Backward Compatibility**: Existing code using GlobalErrorBoundary will continue to work

### Usage

```tsx
import { GlobalErrorBoundary } from '@/components/error-boundaries';

export default function AppLayout({ children }) {
  return (
    <GlobalErrorBoundary
      componentName="AppLayout"
      resetOnRouteChange={true}
      errorContext={{ layout: 'main' }}
    >
      {children}
    </GlobalErrorBoundary>
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | ReactNode | The components to render |
| `fallback` | ReactNode or Function | Optional custom fallback UI |
| `componentName` | string | Name for error reporting |
| `onError` | function | Optional callback when error occurs |
| `resetOnRouteChange` | boolean | Whether to reset on route changes |
| `errorContext` | object | Additional context for error reporting |

## Architecture

```
├── error-boundaries/
│   ├── CustomizableErrorBoundary.tsx # New unified error boundary component
│   ├── AppointmentErrorBoundary.tsx  # Appointment-specific error handling (uses CustomizableErrorBoundary)
│   ├── DataLoadingErrorBoundary.tsx  # Data fetching error handling (uses CustomizableErrorBoundary)
│   ├── DoctorProfileErrorBoundary.tsx # Doctor profile error handling (uses CustomizableErrorBoundary)
│   ├── ApiErrorBoundary.tsx          # API error handling (uses CustomizableErrorBoundary)
│   ├── FormErrorBoundary.tsx         # Form validation error handling (uses CustomizableErrorBoundary)
│   ├── TimeSlotSelectionErrorBoundary.tsx # Time slot selection error handling (uses CustomizableErrorBoundary)
│   ├── AdminDashboardErrorBoundary.tsx # Admin dashboard error handling (uses CustomizableErrorBoundary)
│   └── index.ts                      # Re-exports all error boundaries
├── layout/
│   └── RootErrorBoundary.tsx         # Application-wide error boundary
└── ui/
    ├── ErrorBoundary.tsx             # Base error boundary component
    └── withErrorBoundary.tsx         # HOC for wrapping components
```

## Integration with Error Monitoring

All error boundaries capture errors to the application's error monitoring system. Error reports include:

- Component name
- Error details (message, stack trace)
- Error severity and category
- User context (if available)

This information helps with debugging and improving error handling over time. 