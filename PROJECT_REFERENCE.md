# Health Appointment System: Comprehensive Reference

This reference document compiles all key learnings, implementation details, and best practices from the Health Appointment System project. Use this as a guide for future development, troubleshooting, and feature implementation.

## Table of Contents

1. [Project Structure & Architecture](#project-structure--architecture)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Authentication Implementation](#authentication-implementation)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)
7. [Offline Mode Support](#offline-mode-support)
8. [Firebase Integration](#firebase-integration)
9. [Data Contract Adherence](#data-contract-adherence)
10. [TypeScript Path Aliases](#typescript-path-aliases)
11. [Environment Configuration](#environment-configuration)
12. [Completed Features & Implementations](#completed-features--implementations)
13. [Bug Fixes & Solutions](#bug-fixes--solutions)
14. [Development Workflow](#development-workflow)
15. [Additional Implementations & Features](#additional-implementations--features)
16. [Firebase Migration Guide](#firebase-migration-guide)
17. [Error Handling Checklist](#error-handling-checklist)
18. [Test Fixes & Testing Reference](#test-fixes--testing-reference)

---

## Project Structure & Architecture

### Core Directory Structure

- `/` (project root) - Package.json, Next config, .env.\*, local_db/ JSON store, scripts/ (seeders, migrations)
- `/local_db` - Flat-file "database" — seeded JSON collections (users.json, patients.json, …)
- `/scripts` - All Node/TS CLI helpers (e.g. seedLocalDb.ts, migration tools)
- `/src` - All application TS/TSX source code
- `/src/app` - Next-js App-Router tree with route groups for marketing, auth, platform, and dev areas
- `/src/components/ui` - Atomic, theme-aware primitives only (no business logic)
- `/src/components/layout` - Structural components used site-wide (Navbar, Footer, Layout wrapper)
- `/src/components/auth` - Auth helpers visible to UI
- `/src/context` - React context providers only
- `/src/hooks` - Reusable client hooks (no UI markup)
- `/src/lib` - Pure logic / node-safe utilities
- `/src/data` - High-level data-loader modules
- `/src/types` - Project-wide types only
- `/src/styles` - Tailwind base files
- `/public/` - Static assets (favicons, images)
- `/docs/` - Long-form design docs, ADRs

### Core User Roles

- **Patient**: End-user seeking medical care
- **Doctor**: Verified healthcare provider offering services
- **Administrator**: System manager with verification and oversight capabilities

### Core Tech Stack

- Next.js App Router
- React 18 with TypeScript
- Tailwind CSS
- Firebase (Authentication, Firestore, Functions)
- Local file-based database for development
- React Query for data fetching and caching

---

## Backend Implementation

### Local Database Implementation

The system uses a flat-file JSON database for development and testing. Core points:

- All database operations go through the `localDb.ts` utilities
- Collections are stored as JSON files in `/local_db/`
- CRUD operations simulate real database operations
- All writes are performed safely to avoid file corruption
- The local API functions in `localApiFunctions.ts` provide the interface between the database and the client

### Authentication

- Authentication is handled by Firebase Authentication
- Users can register as Patients or Doctors
- Sessions are managed through React Context
- Role-based access control (RBAC) is implemented throughout the application

### Data Validation

- All data is validated using Zod schemas defined in `src/types/schemas.ts`
- Backend validation happens in API functions before performing operations
- Frontend validation is implemented in forms for immediate feedback
- TypeScript types are derived from Zod schemas for consistent typing

---

## Frontend Implementation

### UI Components

The system uses a set of reusable UI components in `src/components/ui/`:

- Button, Card, Input, Select, Textarea, etc.
- All components use Tailwind CSS for styling
- Components are atomic and theme-aware
- Subtle animations are implemented using CSS transitions

### Forms & Validation

- Forms use React Hook Form for state management
- Validation is handled with Zod schemas
- Error messages are displayed inline
- Forms handle both client and server-side errors gracefully

### Navigation & Routing

- Next.js App Router is used for routing
- Route groups separate public, auth, and platform areas
- Conditional rendering based on user role
- Protected routes redirect to login

---

## Authentication Implementation

The application uses a flexible authentication system designed to work both with the local development environment and Firebase Authentication when deployed.

### Authentication Context

- **AuthContext Interface**: Manages user identity across the application

  ```ts
  interface AuthContext {
    uid: string;
    role: UserType;
    isAuthenticated?: boolean;
    email?: string;
    displayName?: string;
  }
  ```

- **Context Management**: Centralized in `apiAuthCtx.ts` with functions to get/set the current auth context
- **Role Caching**: Maintains a cache of user roles for better performance
- **Firebase Integration**: Automatically resolves from Firebase Auth when enabled

### Authentication Flows

1. **Local Authentication Flow**:

   - User credentials verified against local database
   - Session managed through React Context
   - AuthContext stored in memory for the session duration

2. **Firebase Authentication Flow**:
   - Leverages Firebase Auth for identity verification
   - User tokens and sessions managed by Firebase
   - Role information stored in custom claims

### Error Handling

- Comprehensive error mapping for authentication errors
- User-friendly error messages based on error type
- Standardized error categories for auth failures:
  - `auth/email-already-in-use`
  - `auth/invalid-email`
  - `auth/user-disabled`
  - `auth/user-not-found`
  - `auth/wrong-password`

---

## Error Handling

### Core Architecture

The application uses a layered approach to error handling:

1. **Error Boundaries** - React's error boundaries catch rendering errors
2. **Error Monitoring** - Centralized error reporting and classification
3. **Error Hooks** - React hooks for component-level error handling
4. **Error Display** - User-friendly error presentation components

### Unified Error Handling System

The application implements a comprehensive, consistent error handling system throughout the codebase:

1. **Specialized Error Classes**
   - Base `AppError` class - Common properties (category, severity, retryable, context)
   - Specialized subclasses - `AuthError`, `NetworkError`, `ValidationError`, `ApiError`, etc.
   - Specific domain error classes - `AppointmentError`, `SlotUnavailableError`, etc.

2. **Error Utilities**
   - `withErrorHandling` and `withErrorHandlingSync` - Standardized try/catch patterns
   - `normalizeError` - Converts any error to standardized AppError format
   - `getUserFriendlyMessage` - Extracts user-presentable message from errors
   - `getStatusCodeFromError` - Gets HTTP status code from error objects

3. **Specific Domain Error Handling**
   - API error handling in `apiErrorHandling.ts` - Comprehensive error mapping for API and network errors  
   - Firebase error mapping in `firebaseErrorMapping.ts` - Maps Firebase error codes to user-friendly messages

4. **Implementation Consistency**
   - Data loaders use specific error classes (AuthError, ValidationError, etc.) instead of generic errors
   - API client uses ApiError with detailed context and status codes
   - Firebase configuration uses AuthError for authentication-related failures
   - UI components have access to rich error information for better user experience

This unified approach ensures that errors are consistently handled, properly categorized, and clearly presented to users across all parts of the application.

### Specialized Error Boundaries

The application implements specialized error boundaries for different parts of the system:

1. **Core Error Boundaries**

   - **RootErrorBoundary**: Application-wide error boundary used in ClientLayout
   - **AppointmentErrorBoundary**: For appointment-related components and pages
   - **DoctorProfileErrorBoundary**: For doctor profile components
   - **DataLoadingErrorBoundary**: General-purpose data loading/API error boundary

2. **Additional Specialized Error Boundaries**

   - **AuthErrorBoundary**: For authentication-related components
   - **AdminDashboardErrorBoundary**: For admin dashboard pages and components
   - **PaymentProcessingErrorBoundary**: For payment-related components
   - **BookingWorkflowErrorBoundary**: For appointment booking process components

3. **Booking Workflow Specialized Error Boundaries**
   - **TimeSlotSelectionErrorBoundary**: For time slot selection components
   - **BookingPaymentErrorBoundary**: For payment processing during booking

### Error Boundary Usage Patterns

```tsx
// Basic Usage
import { AppointmentErrorBoundary } from '@/components/error-boundaries';

export default function AppointmentsPage() {
  return (
    <AppointmentErrorBoundary>
      <YourAppointmentComponent />
    </AppointmentErrorBoundary>
  );
}

// Wrapper Pattern
export default function BookAppointmentPage() {
  return (
    <BookingWorkflowErrorBoundary componentName="BookAppointmentPage">
      <BookAppointmentPageContent />
    </BookingWorkflowErrorBoundary>
  );
}

// With Custom Component Name
<AuthErrorBoundary componentName="RegistrationForm">
  <RegistrationFormComponent />
</AuthErrorBoundary>;
```

### Error Classification

Errors are categorized to provide appropriate user messages:

| Category      | Description             | Example                                 |
| ------------- | ----------------------- | --------------------------------------- |
| `network`     | Connection issues       | "Unable to connect to the server"       |
| `auth`        | Authentication problems | "Your session has expired"              |
| `validation`  | User input validation   | "Email format is invalid"               |
| `api`         | API request failures    | "Unable to process your request"        |
| `database`    | Data access issues      | "Could not access patient records"      |
| `permission`  | Authorization issues    | "You don't have permission"             |
| `appointment` | Scheduling issues       | "This time slot is no longer available" |
| `data`        | Data loading problems   | "Could not load your information"       |
| `server`      | Backend server errors   | "Server is experiencing issues"         |
| `unknown`     | Uncategorized errors    | "Something went wrong"                  |

### Error Components & Utilities

1. **ErrorBoundary Component** - Provides fallback UI when render errors occur
2. **withErrorBoundary HOC** - For easier error boundary implementation
3. **ErrorDisplay Component** - User-friendly error presentation
4. **useErrorHandler Hook** - React hook for handling errors at the component level
5. **Error Monitoring** - Centralized error reporting for analytics and monitoring

### Best Practices

1. Use Error Boundaries for UI Components
2. Handle Async Errors with try/catch
3. Categorize Errors Appropriately
4. Provide Retry Mechanisms
5. Log Errors for Debugging

### Enhanced Error Handling System

- Added comprehensive custom error classes in `src/lib/errors.ts`:
  - Created a base `AppError` class that extends the standard Error
  - Implemented specialized error subclasses for different error types:
    - Network errors: `NetworkError`, `TimeoutError`
    - Auth errors: `AuthError`, `UnauthorizedError`, `SessionExpiredError`
    - API errors: `ApiError`, `ApiResponseError`
    - Validation errors: `ValidationError`
    - Appointment errors: `AppointmentError`, `SlotUnavailableError`, `AppointmentConflictError`
    - Data errors: `DataError`, `NotFoundError`
    - Permission errors: `PermissionError`
    - Cache errors: `CacheError`
  - Added helper utilities for error creation and handling
  - Implemented HTTP error mapping with `throwHttpError` function

- Created a unified error handling utility in `src/lib/errorUtils.ts`:
  - Implemented `withErrorHandling` for async error standardization
  - Added `withErrorHandlingSync` for synchronous error handling
  - Created `normalizeError` function to convert any error to a standardized AppError
  - Added helper utilities to extract error information consistently

- Enhanced the API error handling in `src/lib/apiErrorHandling.ts`:
  - Updated `callApiWithErrorHandling` to use custom error classes
  - Improved error categorization and type refinement
  - Added better context preservation for debugging

- Improved booking error handling in `src/hooks/useBookingError.ts`:
  - Updated `BookingError` to extend our `AppointmentError` class
  - Added helper functions for determining error severity and retryability
  - Enhanced error thrower methods to use specialized error classes
  - Added more detailed context information in errors

## Enhanced Error Handling

- Added comprehensive error types with specific error classes (AuthError, ValidationError, DataError, etc.)
- Implemented client-side error handling with proper error boundaries
- Added server-side error logging with contextual information
- Created centralized logger with consistent error formatting
- Added proper type guards for API responses
- Enhanced error recovery mechanisms for common booking issues
- Improved logging with context-specific error information
- Added clearer user feedback for different error conditions
- Standardized error handling across all data loaders and utility functions
  - Replaced generic Error objects with specialized error classes (AuthError, DataError, etc.)
  - Added consistent error context for better debugging and user feedback
  - Unified error patterns in authentication, database access, and API calls
  - Ensured consistent error message formatting for improved user experience

These changes further improve the application's type safety, enhance the user experience with appropriate routing for notifications, and make the codebase more maintainable through proper TypeScript typing.

## Error Handling Checklist

### Core Error Handling Infrastructure ✅
- [x] Base error class system created (`AppError` and specialized subclasses)
- [x] Error utilities for standardized handling (`withErrorHandling`, etc.)
- [x] UI components for error display (`ErrorDisplay.tsx`, etc.)
- [x] Error boundaries for UI component failures
- [x] Error monitoring and reporting system

### API Error Handling ✅
- [x] API error handling in `apiErrorHandling.ts`
- [x] Firebase error mapping in `firebaseErrorMapping.ts`
- [x] HTTP error handling with appropriate status codes
- [x] Request retry mechanisms with exponential backoff
- [x] Network/offline detection and handling

### Error Handler Implementation Progress ✅
- [x] Core library files updated to use specialized error classes
  - [x] `apiClient.ts` - Now uses `ApiError` instead of generic Error
  - [x] `firebaseConfig.ts` - Now uses `AuthError` for auth operations
  - [x] `apiErrorHandling.ts` - Now uses `SessionExpiredError` for auth failures
  - [x] `localDb.ts` - Now uses `DataError` for database operations
- [x] Data loaders migrated to specialized error classes
  - [x] `adminLoaders.ts`, `doctorLoaders.ts`, `patientLoaders.ts`, `sharedLoaders.ts`
  - [x] All now use `AuthError`, `ValidationError`, etc. consistently
- [x] Authentication error handling updated
  - [x] `apiAuthCtx.ts` - Uses `AuthError` for authentication failures
  - [x] Login and verification pages updated to use specific error classes
- [x] Page component error handling updated
  - [x] `login/page.tsx` - Now uses `ValidationError` for form validation
  - [x] `pending-verification/page.tsx` - Now uses `NetworkError` for service unavailability
  - [x] `admin/users/[userId]/page.tsx` - Now uses `ApiError` for API failures
  - [x] `doctor/appointments/[appointmentId]/page.tsx` - Now uses `AppointmentError` and `ApiError`
  - [x] `admin/doctor-verification/[doctorId]/page.tsx` - Now uses `ValidationError` and `ApiError`
  - [x] `book-appointment/[doctorId]/page.tsx` - Now uses specialized errors for booking workflow

### Key Error Classes and Their Uses
- `AppError` - Base class with common error properties (category, severity, context)
- `AuthError` - Authentication and authorization failures (login, permissions)
- `ApiError` - API communication failures with status codes
- `ValidationError` - Input validation failures with detailed validation issues
- `NetworkError` - Network connectivity issues
- `DataError` - Data retrieval or storage failures
- `AppointmentError` - Appointment-specific failures
- `SlotUnavailableError` - Specific booking slot availability failures

### Benefits of Unified Error Handling
- **Better Type Safety** - Type-checked error handling throughout the codebase
- **Improved User Experience** - More specific and helpful error messages
- **Enhanced Debugging** - Consistent error format with detailed context information
- **Easier Maintenance** - Standard patterns for handling errors make code more maintainable
- **Centralized Error Reporting** - All errors follow the same structure for better logging and monitoring

### Next Steps for Error Handling
- Add error telemetry for production monitoring
- Enhance error recovery strategies for common error cases
- Complete validation error handling in remaining form components
- Add translation support for error messages

## Development Workflow

### Getting Started

## Bug Fixes & Solutions

### API and Backend Fixes

- Fixed missing adminGetDashboardData API implementation:
  - Created a new adminGetDashboardData function in src/lib/api/dashboardFunctions.ts
  - Added the function to the localApi object in src/lib/localApiFunctions.ts
  - Added the function to firebaseApi in src/lib/firebaseFunctions.ts
  - Fixed a TypeScript type error in the getCallable function

- Fixed TypeScript errors in the BookingError constructor in book-appointment/[doctorId]/page.tsx:
  - Updated the order of arguments to match the class definition
  - Ensured consistent error handling across the booking workflow
  - Used proper error types throughout the application

### Authentication Related Fixes

- Fixed an issue where the Auth context was not being properly initialized
- Resolved user role not being correctly assigned after registration
- Fixed email verification link handling for new users
- Corrected login flow to properly redirect based on user role

### Form Related Fixes

- Fixed form validation issues in the doctor registration form
- Corrected date picker component rendering and validation
- Resolved multi-select dropdown issues in the patient profile form
- Fixed address input field validation and formatting

### Appointment System Fixes

- Corrected time slot availability calculation
- Fixed appointment cancellation workflow and notifications
- Resolved issue with doctor availability not refreshing after updates
- Fixed appointment status update triggers and webhooks

### Code Cleanup

- Removed obsolete Todo functionality that was not part of the core application
  - Removed Todo schemas from src/types/schemas.ts
  - Removed Todo-related menu items from CMS page
  - Deleted empty Todo directories and placeholder files
  - This Todo system appeared to be a demo/sample feature not related to the core health appointment functionality

- Removed empty and unused directories in the development section
  - Deleted empty src/app/(dev)/auth-debug directory
  - Deleted empty src/app/(dev)/unauthorized directory
  - These directories were not referenced in the sitemap or anywhere in the codebase
  - Kept the empty src/app/(dev) directory itself as it's referenced in the sitemap.txt
