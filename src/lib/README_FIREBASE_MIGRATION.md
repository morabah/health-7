# Firebase Migration Guide

This document provides instructions for migrating the application from using local API functions to Firebase.

## Architecture Overview

The application has been structured to make migration to Firebase as seamless as possible:

1. **API Layer Abstraction**: All API calls are made through `apiClient.ts`, which can route requests to either local implementation or Firebase.
2. **Function Signature Consistency**: All functions follow the same parameter pattern for easy switching.
3. **Authentication Context**: Auth information is managed consistently and can be sourced from local storage or Firebase Auth.

## Migration Steps

### 1. Firebase Project Setup

1. Create a new Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable the following services:
   - Firebase Authentication
   - Firestore Database
   - Cloud Functions
   - Storage (for file uploads)
3. Set up Firestore security rules
4. Configure Firebase Authentication providers (Email/Password at minimum)

### 2. Update Firebase Configuration

1. Replace the placeholder values in `src/lib/firebaseConfig.ts` with your actual Firebase project configuration:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

2. Initialize Firebase services in `firebaseConfig.ts` by uncommenting and implementing the actual Firebase service initialization.

### 3. Implement Backend Functions

1. Create Firebase Cloud Functions that match the function signatures in `src/lib/api/*.ts`
2. Ensure that each Cloud Function follows the same parameter pattern:
   - For functions needing auth context: `context` and `data` parameters
   - For user authentication: separate email/password parameters

### 4. Test Each Function Incrementally

1. Start by setting `isFirebaseEnabled = false` to use local implementations
2. Test each Firebase function individually by temporarily enabling it:

```typescript
// In apiClient.ts, you can temporarily override for testing:
const api = method === 'specificMethodToTest' 
  ? firebaseApi 
  : (isFirebaseEnabled ? firebaseApi : localAPI.localApi);
```

3. Once all functions are working, set `isFirebaseEnabled = true` to use Firebase for all functions

### 5. Enable Firebase Authentication

1. Update the auth context provider to use Firebase Authentication
2. Ensure that user roles are properly stored and retrieved (e.g., using custom claims)

### 6. Data Migration

1. Create a script to migrate data from local JSON files to Firestore
2. Test the migration in a development environment first
3. Schedule migration during low-traffic hours

## Function Mapping Reference

| Local API Function | Firebase Function | Description |
|-------------------|-------------------|-------------|
| signIn | login | User authentication |
| registerUser | registerUser | Create new user account |
| getMyUserProfile | getMyUserProfile | Get current user profile |
| updateMyUserProfile | updateMyUserProfile | Update user profile |
| findDoctors | findDoctors | Search for doctors |
| ... | ... | ... |

## Troubleshooting

- **API Calls Failing**: Check that Cloud Functions are deployed and accessible
- **Authentication Issues**: Verify Firebase Auth is correctly set up and token claims include role information
- **Data Format Mismatches**: Ensure that data returned from Cloud Functions matches the expected format in the frontend
- **CORS Errors**: Configure CORS for Cloud Functions to allow requests from your domain

## Rollback Plan

If issues arise during migration:

1. Set `isFirebaseEnabled = false` in `firebaseConfig.ts` to revert to local implementation
2. Debug Firebase implementation without affecting users
3. Fix issues and try again when ready

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth) 