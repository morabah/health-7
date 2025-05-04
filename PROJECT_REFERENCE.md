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

---

## Performance Optimization

### React Query Caching

- Enhanced `queryClient` configuration with longer cache times (5-10 minutes)
- Comprehensive `cacheKeys` system for consistent query key management
- `cacheManager` utility with functions for cache manipulation
- Intelligent cache invalidation for related entities

### Lazy Loading Components

- `lazyLoadUtils.tsx` utility with several approaches to component lazy loading
- `lazyLoad` HOC for dynamic imports with configurable loading states
- Support for minimum loading display times to prevent UI flickering
- Component prefetching system for improved user experience

### Optimized Database Access

- Multi-level caching (React Query + in-memory)
- Time-based cache expiration (30s for most data, 15s for frequently changing data)
- Client-side filtering, sorting, and pagination for faster UI responses
- Enhanced data access with proper TypeScript typing

### Enhanced API Client

- React Query integration
- Type-safe hook factories (`useApiQuery`, `useApiMutation`) for common operations
- Automatic cache invalidation on mutations
- Domain-specific hooks for common operations

---

## Offline Mode Support

The application includes comprehensive offline detection and handling to provide a better user experience during connectivity issues.

### Offline Detection

- Browser network status monitoring via `navigator.onLine`
- Event listeners for online/offline status changes
- Network error detection in API calls

### Offline Error Handling

- Standardized offline error format with user-friendly messages
- Visual indicators when offline mode is active
- Automatic retry when connectivity is restored

### Implementation

```ts
// Check if browser is offline
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

// Monitor online/offline status
export function monitorOnlineStatus(
  onlineCallback: () => void,
  offlineCallback: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for SSR
  }

  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);

  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
  };
}
```

### API Error Handling with Offline Awareness

- API calls check for offline status before execution
- Network errors categorized and handled appropriately
- Retry mechanisms with exponential backoff for transient failures
- Custom error class for offline errors with recovery suggestions

---

## Firebase Integration

### Backend & Frontend Integration

- **Data Loader Pattern**: Abstracted loaders handle API calls, loading states, and error handling
- **Firebase Functions Structure**: Cloud Functions organized by domain
- **Emulator Configuration**: Use `127.0.0.1` for emulator hosts

### Standardized Firebase Functions Pattern

- Use `createCallableFunction` / `createAuthenticatedFunction` for type safety, Zod validation, consistent error handling
- Validate inputs with Zod; invalid data triggers `HttpsError('invalid-argument')`
- Log errors with context; throw precise `HttpsError` codes
- Return success as `{ success: true, ...data }`

### FieldValue Usage Pattern (Critical Error Avoidance)

- Import `FieldValue` (and `Timestamp`) from `'firebase-admin/firestore'`, never use `admin.firestore.FieldValue`
- Use `FieldValue.serverTimestamp()` for `createdAt` & `updatedAt`
- Export only the admin instance, `db`, and `auth` from utility modules

### Timestamp Handling Standard

- Backend: All Firestore document creation and updates must use `FieldValue.serverTimestamp()` for `createdAt` and `updatedAt` fields
- Frontend: All components that display Firestore Timestamps import `Timestamp` from `firebase/firestore`
- Frontend: Timestamps are converted to JS Date objects using `.toDate()` before formatting for display

### Enhanced Cache Invalidation Strategy

The application implements a robust cache invalidation strategy to ensure data consistency while maintaining performance.

#### Cache Key Management

- Structured cache key generation through `cacheKeys` in `queryClient.ts`
- Entity-based key organization (users, doctors, appointments, notifications)
- Support for filtered queries with parameter inclusion

```ts
export const cacheKeys = {
  // User related keys
  user: (userId?: string) => ['user', userId],
  users: (filters?: Record<string, unknown>) => ['users', filters],

  // Doctor related keys
  doctor: (doctorId?: string) => ['doctor', doctorId],
  doctors: (filters?: Record<string, unknown>) => ['doctors', filters],

  // Appointment related keys
  appointment: (appointmentId?: string) => ['appointment', appointmentId],
  appointments: (userId?: string, role?: string) => ['appointments', userId, role],

  // Notification related keys
  notifications: (userId?: string) => ['notifications', userId],
};
```

#### Cache Manager

A dedicated `cacheManager` utility provides standardized operations:

1. **Targeted Invalidation**:

   - Entity-specific invalidation (`invalidateUserData`, `invalidateDoctorData`, etc.)
   - Support for specific ID targeting or entity-wide invalidation

2. **Multi-level Cache Management**:

   - React Query data synchronization
   - In-memory cache with configurable TTL (Time-To-Live)
   - Cached data prefetching

3. **Relational Invalidation**:
   - Automatic invalidation of related entities after mutations
   - Configurable invalidation chains

#### Usage in API Mutations

- `useApiMutation` hook handles automatic cache invalidation:
  ```ts
  useApiMutation(
    'updateDoctorProfile',
    [
      { type: 'doctor', id: doctorId },
      { type: 'user', id: userId },
    ],
    {
      onSuccess: () => {
        /* custom logic */
      },
    }
  );
  ```

#### Cache Expiration Strategy

- Stale time: 5 minutes
- Garbage collection time: 10 minutes
- In-memory cache TTL: 30 seconds (configurable per data type)
- Critical entities (appointments, availability): 15 seconds TTL
- Static data: 1 hour TTL

---

## Data Contract Adherence

### Core Principles

1. **Source of Truth**: The Zod schemas defined in src/types/schemas.ts are the single source of truth for data structure and validation rules.
2. **TypeScript Types**: Always use the TypeScript types inferred from these Zod schemas for function parameters, return types, component props, and state variables.
3. **Backend Validation**: All backend Cloud Functions receiving data from the client MUST import and use the corresponding Zod schema to validate input.
4. **Frontend Validation**: When preparing data payloads, components SHOULD import and use the relevant Zod schema to validate the payload.
5. **Data Consistency**: Ensure data passed between frontend and backend strictly conforms to the structure defined by the Zod schemas and TS types.

---

## TypeScript Path Aliases

### Configuration

Path aliases are configured in multiple places to ensure they work across all tools:

1. **tsconfig.json** - The main TypeScript configuration file includes path mappings:

   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

2. **tsconfig.test.json** - A specialized configuration for direct TypeScript checking.
3. **jest.config.js** - Configuration for path alias resolution in tests.
4. **Next.js** - Automatically supports path aliases from tsconfig.json.

### Usage

```typescript
// Instead of this:
import { someFunction } from '../../../utils/helpers';

// Use this:
import { someFunction } from '@/utils/helpers';
```

### Troubleshooting

If you encounter path resolution issues:

1. Verify imports use the `@/` prefix correctly
2. For direct `tsc` commands, always use the project flag: `tsc -p tsconfig.test.json`
3. For ESLint, make sure the TypeScript ESLint plugin is configured properly
4. After adding new files, restart any running watch processes

---

## Environment Configuration

The application manages environment configuration through a centralized approach for consistency across development and production environments.

### Configuration Structure

- **Centralized Module**: `src/config/appConfig.ts` serves as the single source of truth
- **Environment Variables**: Loaded from `.env.local` and Next.js environment
- **Derived Settings**: Computed properties based on environment variables

### Key Configuration Values

```ts
// API Mode (live/mock)
export const API_MODE = process.env.NEXT_PUBLIC_API_MODE || 'mock';

// Logging Level (debug/info/warn/error)
export const LOG_LEVEL = process.env.NEXT_PUBLIC_LOG_LEVEL || 'info';

// Environment Detection
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Feature Flags
export const IS_MOCK_MODE = API_MODE === 'mock';
```

### Environment-Aware Behaviors

- **Error Monitoring**: Different behaviors based on environment

  ```ts
  // Add environment information to error context
  context.environment = process.env.NODE_ENV || 'development';

  // Production-specific error reporting
  if (process.env.NODE_ENV === 'production') {
    // Actual error reporting service integration
  }
  ```

- **Firebase Configuration**: Environment-specific endpoints
  ```ts
  // Toggle to prefer emulator even in production
  export const forceEmulator = process.env.NEXT_PUBLIC_FORCE_EMULATOR === 'true';
  ```

### Environment Variables Guide

The application uses the following environment variables:

| Variable                           | Purpose                 | Example Values                   |
| ---------------------------------- | ----------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_MODE`             | API behavior mode       | `live` or `mock`                 |
| `NEXT_PUBLIC_LOG_LEVEL`            | Logging verbosity       | `debug`, `info`, `warn`, `error` |
| `NEXT_PUBLIC_FORCE_EMULATOR`       | Force Firebase emulator | `true` or `false`                |
| `FIREBASE_AUTH_EMULATOR_HOST`      | Firebase Auth emulator  | `127.0.0.1:9099`                 |
| `FIREBASE_FIRESTORE_EMULATOR_HOST` | Firestore emulator      | `127.0.0.1:8080`                 |

---

## Completed Features & Implementations

### Admin Dashboard Enhancements

1. Enhanced `/admin/doctors` page with URL parameter support for status filtering
2. Added the ability to search doctors by name, email, and specialty
3. Improved data connectivity between admin dashboard and the local database
4. Updated `adminGetAllDoctors` function to join doctor and user data

### Doctor Verification Process

1. Fixed the doctor verification functionality in `adminVerifyDoctor`
2. Improved error messages and validation for the verification status input
3. Fixed schema compliance issues with education field in doctor profile
4. Enhanced notification creation for doctors when their status changes

### TypeScript Type Safety Improvements

1. Fixed error handling in TypeScript with better type narrowing
2. Fixed interface definitions to use more specific types
3. Made function parameters more type-safe with proper interfaces

### Performance Optimizations

1. Enhanced React Query caching with longer cache times
2. Created lazy loading components for better initial load performance
3. Optimized database access with multi-level caching
4. Enhanced the API client with React Query integration

---

## Bug Fixes & Solutions

### API Call Parameter Structure Fixes

- Fixed the `useCompleteAppointment` hook in `doctorLoaders.ts` to properly separate authentication context from payload data
- Fixed the `useCancelAppointment` hook in `patientLoaders.ts` to correctly pass auth context as first parameter
- Fixed the `useAppointmentDetails` hook in `patientLoaders.ts` to include proper auth context
- All hooks now follow this pattern:

```ts
// Correct pattern
return callApi(
  'functionName',
  { uid: user.uid, role: UserType.DOCTOR }, // Auth context as first arg
  { paramName: paramValue } // Payload as second arg
);
```

### Patient Profile Update Fix

- Fixed the `useUpdatePatientProfile` hook in `patientLoaders.ts` to properly pass user context to the API
- The prior implementation incorrectly passed the data object in place of the context
- The fix ensures that profile updates properly reach the backend API and are saved

### SVG viewBox Error Fix

- Created a custom `Divider` component in `src/components/ui/Divider.tsx` that uses CSS borders instead of SVG
- Updated the patient dashboard to use the new Divider component
- This resolves the error: `Error: <svg> attribute viewBox: Expected number, "0 0 100% 4"`
- The new component is more accessible and performs better

### Date Format Handling Improvements

- Added utilities in `dateUtils.ts` for properly formatting dates between HTML inputs and APIs
- Implemented both `formatDateForInput` and `formatDateForApi` functions
- Fixed date format warnings by ensuring ISO date strings are properly converted to the format expected by date inputs

---

## Development Workflow

### Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Firebase Setup

1. **Login**: `firebase login`
2. **List Projects**: `firebase projects:list`
3. **Set Active Project**: `firebase use health-appointment-dev`

### Emulator and Seeding

To ensure Firebase Auth Emulator and test user UIDs are synchronized:

```bash
npm run seed:auth
```

This script will:

1. Transpile the TypeScript seeding script
2. Run the output with Node.js, updating both the Auth Emulator and the UID fields in mock data files

### Deployment

The app can be deployed to Vercel:

```bash
npm run build
npm run start
```

### Testing

Run the test suite with:

```bash
npm test
```

---

## Best Practices Summary

1. **Data Validation**: Always use Zod schemas for data validation, both in frontend and backend
2. **Error Handling**: Use the error handling utilities for consistent error management
3. **Firebase Integration**: Follow the standardized patterns for Firebase integration
4. **Performance Optimization**: Utilize the caching and lazy loading utilities for better performance
5. **Type Safety**: Maintain strict TypeScript typing throughout the application
6. **Component Structure**: Keep UI components atomic and business logic separate
7. **Authentication**: Use the authentication context for user management
8. **API Calls**: Follow the correct pattern for API calls with proper context separation

By following these guidelines and referencing this document, future development can maintain consistency and quality throughout the application.

## Additional Implementations & Features

### Enhanced Todo Component

- Added an enhanced Todo component with advanced task management features to the CMS section
- Features include priorities with color coding, categories, due dates, expandable task view, filtering options
- Added a dedicated page for the enhanced todo list at `/cms/advanced-todo`
- Added links in the CMS dashboard to the new Advanced Task Management page

### Patient Dashboard UI

- Implemented a static patient dashboard UI with placeholder data following the blueprint
- Created a welcome header section with placeholder username
- Added stats grid with four cards showing placeholder statistics
- Implemented a responsive grid layout (1 column on mobile, 2 on tablet, 4 on desktop)
- Used tokenized colors for consistent theming with dark mode support

### Patient Appointments Page

- Implemented a patient appointments page with tabbed interface (Upcoming, Past, Cancelled)
- Created appointment row component with responsive design
- Added status badges with appropriate colors for each status
- Implemented context-aware action buttons based on appointment status
- All appointments have "Details" button, with upcoming appointments having additional "Reschedule" and "Cancel" buttons

### Comprehensive Error Boundary System

- Created specialized error boundaries for different parts of the application:
  - `RootErrorBoundary` for application-wide error handling
  - `AppointmentErrorBoundary` for appointment-related components
  - `DoctorProfileErrorBoundary` for doctor profile components
  - `DataLoadingErrorBoundary` for data fetching operations
  - `PaymentProcessingErrorBoundary` for payment processing errors
  - `AdminDashboardErrorBoundary` for admin dashboard components
  - `AuthErrorBoundary` for authentication flows
  - `BookingWorkflowErrorBoundary` for the appointment booking process
- Applied error boundaries to critical components throughout the application
- Enhanced error documentation with comprehensive usage examples and architecture details

### Booking Error Handling

- Created specialized error boundaries and a custom error hook for the booking workflow
- Implemented `BookingWorkflowErrorBoundary`, `TimeSlotSelectionErrorBoundary`, and `BookingPaymentErrorBoundary`
- Created `useBookingError.ts` custom hook for standardized booking error handling
- Added `BookingErrorCode` type with specialized error codes for different booking scenarios
- Fixed TypeScript errors and improved error handling in the appointment booking process
- Added explicit type annotations and fixed parameter passing to booking mutations
- Enhanced error boundary implementation with proper integration in the booking workflow

These additional features enhance the application's functionality, user experience, and error handling capabilities, providing a more robust and maintainable codebase.

## Firebase Migration Guide

### Architecture Overview

The application has been structured to make migration to Firebase as seamless as possible:

1. **API Layer Abstraction**: All API calls are made through `apiClient.ts`, which can route requests to either local implementation or Firebase.
2. **Function Signature Consistency**: All functions follow the same parameter pattern for easy switching.
3. **Authentication Context**: Auth information is managed consistently and can be sourced from local storage or Firebase Auth.

### Migration Steps

1. **Firebase Project Setup**

   - Create a new Firebase project in the Firebase Console
   - Enable required services: Authentication, Firestore, Cloud Functions, Storage
   - Set up security rules and authentication providers

2. **Update Firebase Configuration**

   - Replace placeholder values in `src/lib/firebaseConfig.ts`
   - Initialize Firebase services

3. **Implement Backend Functions**

   - Create Firebase Cloud Functions matching the signatures in `src/lib/api/*.ts`
   - Follow the same parameter pattern (context and data)

4. **Test Each Function Incrementally**

   - Start with `isFirebaseEnabled = false`
   - Test each function individually before enabling all

5. **Enable Firebase Authentication**

   - Update auth context provider to use Firebase Authentication
   - Ensure user roles are properly handled

6. **Data Migration**
   - Create migration scripts from local JSON to Firestore
   - Test in development first
   - Schedule production migration during low-traffic periods

### Function Mapping Reference

| Local API Function  | Firebase Function   | Description              |
| ------------------- | ------------------- | ------------------------ |
| signIn              | login               | User authentication      |
| registerUser        | registerUser        | Create new user account  |
| getMyUserProfile    | getMyUserProfile    | Get current user profile |
| updateMyUserProfile | updateMyUserProfile | Update user profile      |
| findDoctors         | findDoctors         | Search for doctors       |

### Rollback Plan

If issues arise during migration:

1. Set `isFirebaseEnabled = false` to revert to local implementation
2. Debug Firebase implementation without affecting users
3. Fix issues and try again when ready

## Error Handling Checklist

### Components and Utilities

- ✅ `ErrorDisplay.tsx` component for user-friendly error messages
- ✅ Enhanced `errorMonitoring.ts` with better error categorization and reporting
- ✅ Consolidated `useErrorHandler` hook
- ✅ `apiErrorHandling.ts` with retry logic and better error extraction
- ✅ Global error page at `src/app/error/page.tsx`
- ✅ Updated `apiClient.ts` to use enhanced error handling

### Features Implemented

- ✅ Error categorization (network, auth, validation, api, etc.)
- ✅ Error severity levels (fatal, error, warning, info)
- ✅ User-friendly error messages based on error type
- ✅ Recovery suggestions based on error category
- ✅ Technical details for developers (expandable)
- ✅ Automatic retry with exponential backoff for transient errors
- ✅ Error fingerprinting to group similar errors
- ✅ Performance tracing with spans/transactions
- ✅ Browser and OS detection for better context
- ✅ Error statistics tracking

### UI Components

- ✅ Retry buttons for retryable errors
- ✅ Dismiss controls for temporary errors
- ✅ Loading indicators during retries
- ✅ Visual indicators for different error severities
- ✅ Expandable technical details for developers
- ✅ Alert styling appropriate to error severity

### Future Improvements

- Add more error categories as needed
- Implement error analytics to track common errors
- Create a developer dashboard for error monitoring
- Add more comprehensive recovery suggestions
- Implement error frequency limiting
- Add offline detection and handling
- Create guided recovery flows for complex errors

## Test Fixes & Testing Reference

### Key Test Fixes Implemented

- Fixed failing test in `src/__tests__/lib/dataValidationUtils.test.ts`:
  - Added missing `logWarn` call in the `validateCollectionData` function when an invalid document is found
  - Improved type safety with better type narrowing

### Testing Best Practices

1. **Unit Testing Approach**

   - Use Jest for unit tests
   - Test components with React Testing Library
   - Isolate tests with proper mocking

2. **API Testing**

   - Mock API calls in tests
   - Test error cases along with success cases
   - Use test fixtures for consistent data

3. **Integration Testing**
   - Test critical user flows end-to-end
   - Focus on key business functionality

By following these guidelines and referencing this document, future development can maintain consistency and quality throughout the application.
