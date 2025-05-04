# Error Boundaries

This directory contains specialized error boundary components for different parts of the application. These components provide context-specific error messages and recovery options when errors occur.

## Available Error Boundaries

### Core Error Boundaries

- **RootErrorBoundary**: Application-wide error boundary used in ClientLayout
- **AppointmentErrorBoundary**: For appointment-related components and pages
- **DoctorProfileErrorBoundary**: For doctor profile components
- **DataLoadingErrorBoundary**: General-purpose data loading/API error boundary

### Additional Specialized Error Boundaries

- **AuthErrorBoundary**: For authentication-related components (login, register, etc.)
- **AdminDashboardErrorBoundary**: For admin dashboard pages and components
- **PaymentProcessingErrorBoundary**: For payment-related components
- **BookingWorkflowErrorBoundary**: For appointment booking process components

### Booking Workflow Specialized Error Boundaries

- **TimeSlotSelectionErrorBoundary**: Specifically for time slot selection components, handling errors like unavailable slots
- **BookingPaymentErrorBoundary**: For payment processing during the booking workflow with detailed payment error handling

## Usage

### Basic Usage

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

## Choosing the Right Error Boundary

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

## Architecture

```
├── error-boundaries/
│   ├── AppointmentErrorBoundary.tsx  # Appointment-specific error handling
│   ├── DataLoadingErrorBoundary.tsx  # Data fetching error handling
│   ├── DoctorProfileErrorBoundary.tsx  # Doctor profile error handling
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