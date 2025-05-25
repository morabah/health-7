/**
 * User Profile Management Functions
 * 
 * Contains functions for fetching and managing user profile data from Firestore,
 * including combined profile retrieval for UserProfile + PatientProfile/DoctorProfile.
 */

import { db, FieldValue } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import { logInfo, logError, logWarn } from '../shared/logger';
import { trackPerformance } from '../shared/performance';
import { UserType } from '../types/enums';

// Import types from local simplified types to avoid complex Zod compilation issues
import { UserProfile, PatientProfile, DoctorProfile } from '../types/localTypes';

/**
 * Fetches the core UserProfile and role-specific profile (Patient or Doctor)
 * for a given userId from Firestore.
 * 
 * @param userId The UID of the user whose profile data to fetch.
 * @returns A promise resolving to an object containing userProfile and optionally patientProfile or doctorProfile, or null if user not found.
 */
export async function fetchUserProfileData(userId: string): Promise<{
  userProfile: UserProfile;
  patientProfile?: PatientProfile;
  doctorProfile?: DoctorProfile;
} | null> {
  const perf = trackPerformance('fetchUserProfileData_internal');
  logInfo(`[fetchUserProfileData] Attempting to fetch profile for userId: ${userId}`);

  try {
    const userDocRef = db.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      logWarn(`[fetchUserProfileData] UserProfile document not found for userId: ${userId}`);
      perf.stop();
      return null;
    }

    const userProfile = { id: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
    logInfo(`[fetchUserProfileData] UserProfile found for userId: ${userId}`, { userType: userProfile.userType });

    let patientProfile: PatientProfile | undefined = undefined;
    let doctorProfile: DoctorProfile | undefined = undefined;

    if (userProfile.userType === UserType.PATIENT) {
      try {
        const patientDocRef = db.collection('patients').doc(userId);
        const patientDocSnap = await patientDocRef.get();
        if (patientDocSnap.exists) {
          patientProfile = { userId: patientDocSnap.id, ...patientDocSnap.data() } as PatientProfile;
          logInfo(`[fetchUserProfileData] PatientProfile found for userId: ${userId}`);
        } else {
          logWarn(`[fetchUserProfileData] PatientProfile document not found for userId: ${userId}`);
        }
      } catch (patientError: any) {
        if (patientError.code === 5) {
          logWarn(`[fetchUserProfileData] PatientProfile document not found (NOT_FOUND) for userId: ${userId}`);
        } else {
          logError(`[fetchUserProfileData] Error fetching PatientProfile for userId: ${userId}`, patientError);
        }
      }
    } else if (userProfile.userType === UserType.DOCTOR) {
      try {
        const doctorDocRef = db.collection('doctors').doc(userId);
        const doctorDocSnap = await doctorDocRef.get();
        if (doctorDocSnap.exists) {
          doctorProfile = { userId: doctorDocSnap.id, ...doctorDocSnap.data() } as DoctorProfile;
          logInfo(`[fetchUserProfileData] DoctorProfile found for userId: ${userId}`);
        } else {
          logWarn(`[fetchUserProfileData] DoctorProfile document not found for userId: ${userId}`);
        }
      } catch (doctorError: any) {
        if (doctorError.code === 5) {
          logWarn(`[fetchUserProfileData] DoctorProfile document not found (NOT_FOUND) for userId: ${userId}`);
        } else {
          logError(`[fetchUserProfileData] Error fetching DoctorProfile for userId: ${userId}`, doctorError);
        }
      }
    }
    
    perf.stop();
    return { userProfile, patientProfile, doctorProfile };

  } catch (error: any) {
    logError(`[fetchUserProfileData] Error fetching profile data for userId: ${userId}`, error);
    perf.stop();
    
    // Handle Firestore NOT_FOUND errors gracefully
    if (error.code === 5) {
      logInfo(`[fetchUserProfileData] User document not found (NOT_FOUND) for userId: ${userId} - returning null`);
      return null;
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Creates a new UserProfile document in Firestore.
 * 
 * This function creates the base user profile document that all users have,
 * regardless of their role (Patient, Doctor, or Admin).
 * 
 * @param uid The Firebase Auth UID to use as the document ID
 * @param data The user profile data (excluding id, createdAt, updatedAt)
 * @param transaction Optional Firestore transaction to use for atomic operations
 * @returns Promise that resolves when the document is created
 * 
 * @example
 * ```typescript
 * await createUserProfileInFirestore(uid, {
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   userType: UserType.PATIENT,
 *   phone: '+1234567890',
 *   isActive: true,
 *   emailVerified: false,
 *   phoneVerified: false
 * });
 * ```
 */
export async function createUserProfileInFirestore(
  uid: string, 
  data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>, 
  transaction?: FirebaseFirestore.Transaction
): Promise<void> {
  const perf = trackPerformance('createUserProfileInFirestore');
  logInfo(`[createUserProfileInFirestore] Creating UserProfile for uid: ${uid}`, { 
    userType: data.userType,
    email: data.email,
    // Mask PII
    firstName: data.firstName.substring(0, 1) + '***',
    lastName: data.lastName.substring(0, 1) + '***'
  });

  try {
    const userDocRef = db.collection('users').doc(uid);
    
    // Prepare the complete user profile data with metadata
    const userProfileData = {
      ...data,
      id: uid,
      isActive: data.userType !== UserType.DOCTOR, // Doctors start inactive until verified
      emailVerified: false,
      phoneVerified: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // Use transaction if provided, otherwise write directly
    if (transaction) {
      transaction.set(userDocRef, userProfileData);
      logInfo(`[createUserProfileInFirestore] UserProfile set in transaction for uid: ${uid}`);
    } else {
      await userDocRef.set(userProfileData);
      logInfo(`[createUserProfileInFirestore] UserProfile created successfully for uid: ${uid}`);
    }

    perf.stop();
    
  } catch (error) {
    logError(`[createUserProfileInFirestore] Error creating UserProfile for uid: ${uid}`, error);
    perf.stop();
    throw error; // Re-throw to be caught by the caller
  }
}

/**
 * User Profile Management Functions
 * Internal functions for managing user profile updates in Firestore
 */

/**
 * Internal function to update user documents in Firestore
 * Handles both UserProfile (users collection) and role-specific profiles (patients/doctors collections)
 * 
 * @param uid - Firebase Auth UID of the user
 * @param userType - Type of user (PATIENT, DOCTOR, ADMIN)
 * @param updates - Object containing the fields to update
 * @throws Error if update fails
 */
export async function updateUserDocumentsInFirestore(
  uid: string, 
  userType: UserType, 
  updates: Record<string, any>
): Promise<void> {
  const perf = trackPerformance(`updateUserDocs:${uid}`);
  
  try {
    logInfo('Starting user profile update', { 
      uid, 
      userType, 
      updateFields: Object.keys(updates) // Log field names only, not values (PHI safety)
    });

    // Separate updates into core user fields and role-specific fields
    const userCoreUpdates: Record<string, any> = {};
    const roleSpecificUpdates: Record<string, any> = {};

    // Define which fields belong to UserProfile (core user fields)
    const userCoreFields = ['firstName', 'lastName', 'phone', 'profilePictureUrl'];
    
    // Define which fields belong to role-specific profiles
    const patientFields = ['dateOfBirth', 'gender', 'bloodType', 'medicalHistory', 'address'];
    const doctorFields = [
      'specialty', 'yearsOfExperience', 'location', 'languages', 'consultationFee', 
      'bio', 'education', 'servicesOffered', 'profilePictureUrl', 'timezone'
    ];

    // Categorize updates
    for (const [key, value] of Object.entries(updates)) {
      if (userCoreFields.includes(key)) {
        userCoreUpdates[key] = value;
      } else if (userType === UserType.PATIENT && patientFields.includes(key)) {
        roleSpecificUpdates[key] = value;
      } else if (userType === UserType.DOCTOR && doctorFields.includes(key)) {
        roleSpecificUpdates[key] = value;
      }
      // Ignore fields that don't belong to any category (security measure)
    }

    // Convert dateOfBirth string to Firestore Timestamp if present
    if (roleSpecificUpdates.dateOfBirth && typeof roleSpecificUpdates.dateOfBirth === 'string') {
      try {
        roleSpecificUpdates.dateOfBirth = admin.firestore.Timestamp.fromDate(new Date(roleSpecificUpdates.dateOfBirth));
      } catch (error) {
        logError('Failed to convert dateOfBirth to Timestamp', { 
          uid, 
          dateOfBirth: roleSpecificUpdates.dateOfBirth,
          error: error instanceof Error ? error.message : String(error)
        });
        throw new Error('Invalid date format for dateOfBirth');
      }
    }

    // Add updatedAt timestamp to both update objects if they have fields
    if (Object.keys(userCoreUpdates).length > 0) {
      userCoreUpdates.updatedAt = FieldValue.serverTimestamp();
    }
    if (Object.keys(roleSpecificUpdates).length > 0) {
      roleSpecificUpdates.updatedAt = FieldValue.serverTimestamp();
    }

    // Use Firestore batch write for atomic updates
    const batch = db.batch();
    
    // Update users collection if there are core user fields to update
    if (Object.keys(userCoreUpdates).length > 0) {
      const userRef = db.collection('users').doc(uid);
      batch.update(userRef, userCoreUpdates);
      logInfo('Added user core updates to batch', { 
        uid, 
        fields: Object.keys(userCoreUpdates).filter(k => k !== 'updatedAt')
      });
    }

    // Update role-specific collection if there are role-specific fields to update
    if (Object.keys(roleSpecificUpdates).length > 0) {
      const profileCollection = userType === UserType.PATIENT ? 'patients' : 'doctors';
      const profileRef = db.collection(profileCollection).doc(uid);
      batch.update(profileRef, roleSpecificUpdates);
      logInfo('Added role-specific updates to batch', { 
        uid, 
        userType,
        collection: profileCollection,
        fields: Object.keys(roleSpecificUpdates).filter(k => k !== 'updatedAt')
      });
    }

    // Commit the batch
    await batch.commit();
    
    logInfo('User profile update completed successfully', { 
      uid, 
      userType,
      userCoreFieldsUpdated: Object.keys(userCoreUpdates).length > 0,
      roleSpecificFieldsUpdated: Object.keys(roleSpecificUpdates).length > 0
    });

  } catch (error) {
    logError('Failed to update user profile', { 
      uid, 
      userType, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    perf.stop();
  }
} 