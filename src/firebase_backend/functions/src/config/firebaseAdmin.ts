import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions'; // Required for using functions.logger

/**
 * Initializes the Firebase Admin SDK using implicit environment credentials.
 * This setup is suitable for both the Cloud Functions runtime and the local Emulator Suite.
 * Ensures initialization happens only once per function instance (important for warm starts).
 */
try {
  // Check if the default Firebase app is already initialized.
  // This prevents errors if this module is imported multiple times in a single function invocation
  // or across different function cold starts within the same instance.
  if (admin.apps.length === 0) {
    admin.initializeApp();
    functions.logger.info('[Admin SDK] Firebase Admin SDK Initialized successfully via initializeApp().');
  }
} catch (error: any) {
  functions.logger.error('[Admin SDK] Firebase Admin SDK initialization error:', {
    message: error.message,
    stack: error.stack, // Log stack for better debugging
  });
  // Depending on the application's criticality, you might want to re-throw the error
  // or handle it in a way that prevents functions from running without proper admin access.
  // For now, we just log it.
}

/** Firestore Admin instance, correctly configured for the environment (emulator or cloud). */
export const db = admin.firestore();

/** Firebase Auth Admin instance, correctly configured for the environment. */
export const auth = admin.auth();

/** Firestore FieldValue class for server-side operations like serverTimestamp() and increment(). */
export const FieldValue = admin.firestore.FieldValue;

/** Firebase Storage Admin instance (Default Bucket) - Uncomment and use if backend storage operations are needed. */
// export const storageBucket = admin.storage().bucket(); 