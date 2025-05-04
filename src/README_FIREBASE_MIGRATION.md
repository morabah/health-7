# Firebase Migration Guide

This document provides guidance for migrating the Health Appointment System from the local API implementation to Firebase services.

## Migration Overview

The migration will follow these key steps:

1. Set up Firebase project and enable required services
2. Configure Firebase locally for development
3. Deploy Firestore security rules and indexes
4. Deploy Firebase Cloud Functions
5. Update environment variables
6. Toggle the migration flag
7. Test and validate the migration

## 1. Firebase Setup

### 1.1 Create Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Make note of your Project ID for later use

### 1.2 Enable Required Services

Enable the following services:

- **Authentication**: Enable Email/Password sign-in
- **Firestore**: Create database in production mode
- **Cloud Functions**: Enable and select a pricing plan
- **Storage**: Enable for file uploads

## 2. Local Development Setup

### 2.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2.2 Login and Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project (run from project root)
firebase init

# Select the following features when prompted:
# - Firestore
# - Functions
# - Storage
# - Emulators
```

### 2.3 Configure Firebase Emulators

```bash
# Start emulators
firebase emulators:start
```

Update `.env.local` with emulator configuration:

```
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Emulator Config
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001
NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

## 3. Function Migration Reference

Below is a mapping between local API functions and their Firebase Cloud Function equivalents:

| Local API Function | Firebase Function | Description |
|-------------------|-------------------|-------------|
| `signIn` | `login` | User authentication |
| `registerUser` | `registerUser` | User registration |
| `getMyUserProfile` | `getMyUserProfile` | Get current user profile |
| `updateMyUserProfile` | `updateMyUserProfile` | Update user profile |
| `findDoctors` | `findDoctors` | Search for doctors |
| `getDoctorPublicProfile` | `getDoctorPublicProfile` | Get doctor's public profile |
| `getDoctorAvailability` | `getDoctorAvailability` | Get doctor's availability |
| `setDoctorAvailability` | `setDoctorAvailability` | Set doctor's availability |
| `getMyAppointments` | `getMyAppointments` | Get user's appointments |
| `getAppointmentDetails` | `getAppointmentDetails` | Get appointment details |
| `bookAppointment` | `bookAppointment` | Book a new appointment |
| `cancelAppointment` | `cancelAppointment` | Cancel an appointment |
| `completeAppointment` | `completeAppointment` | Complete an appointment |
| `getAvailableSlots` | `getAvailableSlots` | Get available appointment slots |
| `getMyNotifications` | `getMyNotifications` | Get user's notifications |
| `markNotificationRead` | `markNotificationRead` | Mark notification as read |
| `sendDirectMessage` | `sendDirectMessage` | Send a direct message |
| `adminGetAllUsers` | `adminGetAllUsers` | Admin: Get all users |
| `adminGetAllDoctors` | `adminGetAllDoctors` | Admin: Get all doctors |
| `adminGetAllAppointments` | `adminGetAllAppointments` | Admin: Get all appointments |
| `adminGetUserDetail` | `adminGetUserDetail` | Admin: Get user details |
| `adminUpdateUserStatus` | `adminUpdateUserStatus` | Admin: Update user status |
| `adminUpdateUserProfile` | `adminUpdateUserProfile` | Admin: Update user profile |
| `adminCreateUser` | `adminCreateUser` | Admin: Create a new user |
| `adminVerifyDoctor` | `adminVerifyDoctor` | Admin: Verify doctor registration |
| `getMyDashboardStats` | `getMyDashboardStats` | Get dashboard statistics |

## 4. Migrating to Production

To switch the application to use Firebase instead of the local API implementation:

1. Update `.env.local` to connect to production Firebase (not emulators):

```
# Firebase Config (keep the same)
...

# Disable emulators for production
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=false

# Enable Firebase
NEXT_PUBLIC_FIREBASE_ENABLED=true
```

2. Deploy Firebase Cloud Functions:

```bash
firebase deploy --only functions
```

3. Deploy Firestore rules and indexes:

```bash
firebase deploy --only firestore
```

## 5. Verifying Migration

After migration, verify the following:

1. User authentication works (registration and login)
2. Data is being stored in Firestore
3. Cloud Functions are being called correctly
4. Error handling works as expected
5. All application features work end-to-end

## 6. Rollback Plan

If issues are encountered, you can roll back to the local API implementation:

1. Set `NEXT_PUBLIC_FIREBASE_ENABLED=false` in `.env.local`
2. Restart the application

## 7. Architecture Notes

### API Structure

- The application uses `callApi()` as a single entry point for all API calls
- This function routes requests to either local implementations or Firebase Functions
- The routing is controlled by the `isFirebaseEnabled` flag
- All Firebase Function signatures match their local counterparts

### Authentication Context

- Auth context is handled by `apiAuthCtx.ts`
- When using Firebase, auth context is derived from `auth.currentUser`
- User role information is stored in Firebase Auth custom claims

### Error Handling

- Firebase errors are mapped to standardized errors using `firebaseErrorMapping.ts`
- Network and connectivity issues are detected and handled appropriately
- Retryable operations use exponential backoff with jitter

## 8. Common Issues & Solutions

- **CORS Issues**: Make sure the Firebase project has your domains whitelisted
- **Auth Emulator**: When using emulators, auth persistence doesn't work across browser sessions
- **Function Timeouts**: Cloud Functions have a 60-second execution limit in the Blaze plan
- **Cold Starts**: First invocations of Cloud Functions may be slower due to cold starts
- **Timestamp Handling**: Firestore timestamps must be converted to Date objects for display

## 9. Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions) 