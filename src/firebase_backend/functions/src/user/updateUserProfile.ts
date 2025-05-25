/**
 * Update User Profile Cloud Function
 * Allows authenticated users to update their own profile information
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebaseAdmin';
import { logInfo, logError } from '../shared/logger';
import { trackPerformance } from '../shared/performance';
import { UserType } from '../types/enums';
import { 
  UpdatableUserCoreFieldsSchema,
  UpdatablePatientSpecificFieldsSchema,
  UpdatableDoctorSpecificFieldsSchema,
  UpdateUserProfileSchema
} from '../shared/schemas';
import { updateUserDocumentsInFirestore } from './userProfileManagement';

/**
 * HTTPS Callable Function: updateUserProfile
 * 
 * Allows authenticated users to update their own permissible profile information.
 * Validates input using Zod schemas and performs atomic updates to Firestore.
 * 
 * @param request - Firebase Functions request with auth and data
 * @returns Promise<{ success: boolean }>
 */
export const updateUserProfile = onCall(
  { 
    region: 'us-central1',
    cors: [
      'http://localhost:3000',
      'https://localhost:3000',
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/
    ]
  },
  async (request) => {
  const perf = trackPerformance('updateUserProfileCallable');
  
  try {
    logInfo('updateUserProfile function called', { 
      hasAuth: !!request.auth,
      dataKeys: request.data ? Object.keys(request.data) : []
    });

    // Authentication check
    if (!request.auth) {
      logError('updateUserProfile called without authentication');
      throw new HttpsError(
        'unauthenticated', 
        'Authentication required to update profile'
      );
    }

    const uid = request.auth.uid;
    logInfo('Processing profile update request', { uid });

    // Validate input structure
    const inputValidation = UpdateUserProfileSchema.safeParse(request.data);
    if (!inputValidation.success) {
      logError('Invalid input structure for updateUserProfile', {
        uid,
        errors: inputValidation.error.errors
      });
      throw new HttpsError(
        'invalid-argument',
        'Invalid input structure: ' + inputValidation.error.errors.map(e => e.message).join(', ')
      );
    }

    const { updates } = inputValidation.data;

    // Fetch user type from Firestore
    const userDocSnap = await db.collection('users').doc(uid).get();
    if (!userDocSnap.exists) {
      logError('User profile not found for updateUserProfile', { uid });
      throw new HttpsError(
        'not-found', 
        'User profile not found'
      );
    }

    const userData = userDocSnap.data();
    const userType = userData?.userType as UserType;
    
    if (!userType || !Object.values(UserType).includes(userType)) {
      logError('Invalid or missing userType for updateUserProfile', { uid, userType });
      throw new HttpsError(
        'failed-precondition',
        'Invalid user type in profile'
      );
    }

    logInfo('User type determined for profile update', { uid, userType });

    // Create combined validation schema based on user type
    let combinedSchema;
    if (userType === UserType.PATIENT) {
      combinedSchema = UpdatableUserCoreFieldsSchema.merge(UpdatablePatientSpecificFieldsSchema);
    } else if (userType === UserType.DOCTOR) {
      combinedSchema = UpdatableUserCoreFieldsSchema.merge(UpdatableDoctorSpecificFieldsSchema);
    } else {
      // Admin users can only update core user fields
      combinedSchema = UpdatableUserCoreFieldsSchema;
    }

    // Validate updates against the combined schema
    const validationResult = combinedSchema.safeParse(updates);
    if (!validationResult.success) {
      logError('Validation failed for profile updates', {
        uid,
        userType,
        errors: validationResult.error.errors,
        // Log field names only for PHI safety
        attemptedFields: Object.keys(updates)
      });
      throw new HttpsError(
        'invalid-argument',
        'Invalid update data: ' + validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const validatedUpdates = validationResult.data;
    
    // Filter out undefined values (Zod may include them)
    const cleanedUpdates = Object.fromEntries(
      Object.entries(validatedUpdates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(cleanedUpdates).length === 0) {
      logInfo('No valid updates provided', { uid });
      return { success: true, message: 'No updates to apply' };
    }

    logInfo('Validated updates for profile', { 
      uid, 
      userType,
      updateFields: Object.keys(cleanedUpdates) // Log field names only
    });

    // Call internal update logic
    await updateUserDocumentsInFirestore(uid, userType, cleanedUpdates);

    logInfo('Profile update completed successfully', { uid, userType });
    
    return { success: true };

  } catch (error) {
    // Re-throw HttpsError instances as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    // Log and wrap unexpected errors
    logError('Unexpected error in updateUserProfile', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    throw new HttpsError(
      'internal',
      'An unexpected error occurred while updating profile'
    );
  } finally {
    perf.stop();
  }
}); 