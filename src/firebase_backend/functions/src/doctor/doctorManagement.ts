/**
 * Doctor Profile Management Functions
 * 
 * Contains functions for managing doctor-specific profile data in Firestore.
 */

import { db, FieldValue } from '../config/firebaseAdmin';
import { logInfo, logError } from '../shared/logger';
import { trackPerformance } from '../shared/performance';

// Import types from local simplified types to avoid complex Zod compilation issues
import { DoctorProfile, VerificationStatus } from '../types/localTypes';

/**
 * Creates a new DoctorProfile document in Firestore.
 * 
 * This function creates the doctor-specific profile document that contains
 * professional credentials, verification status, and practice information.
 * 
 * @param uid The Firebase Auth UID to use as the document ID (links to UserProfile)
 * @param data The doctor profile data (excluding userId, verificationStatus, createdAt, updatedAt)
 * @param transaction Optional Firestore transaction to use for atomic operations
 * @returns Promise that resolves when the document is created
 * 
 * @example
 * ```typescript
 * await createDoctorProfileInFirestore(uid, {
 *   specialty: 'Cardiology',
 *   licenseNumber: 'MD123456',
 *   yearsOfExperience: 10,
 *   profilePictureUrl: null,
 *   licenseDocumentUrl: null
 * });
 * ```
 */
export async function createDoctorProfileInFirestore(
  uid: string, 
  data: Omit<DoctorProfile, 'userId' | 'verificationStatus' | 'createdAt' | 'updatedAt'>, 
  transaction?: FirebaseFirestore.Transaction
): Promise<void> {
  const perf = trackPerformance('createDoctorProfileInFirestore');
  logInfo(`[createDoctorProfileInFirestore] Creating DoctorProfile for uid: ${uid}`, {
    // Log non-sensitive professional information
    specialty: data.specialty,
    yearsOfExperience: data.yearsOfExperience,
    hasLicenseNumber: !!data.licenseNumber,
    hasProfilePicture: !!data.profilePictureUrl,
    hasLicenseDocument: !!data.licenseDocumentUrl
  });

  try {
    const doctorDocRef = db.collection('doctors').doc(uid);
    
    // Prepare the complete doctor profile data with defaults
    const doctorProfileData = {
      userId: uid,
      verificationStatus: VerificationStatus.PENDING, // All doctors start with pending verification
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    // Use transaction if provided, otherwise write directly
    if (transaction) {
      transaction.set(doctorDocRef, doctorProfileData);
      logInfo(`[createDoctorProfileInFirestore] DoctorProfile set in transaction for uid: ${uid}`);
    } else {
      await doctorDocRef.set(doctorProfileData);
      logInfo(`[createDoctorProfileInFirestore] DoctorProfile created successfully for uid: ${uid}`);
    }

    perf.stop();
    
  } catch (error) {
    logError(`[createDoctorProfileInFirestore] Error creating DoctorProfile for uid: ${uid}`, error);
    perf.stop();
    throw error; // Re-throw to be caught by the caller
  }
} 