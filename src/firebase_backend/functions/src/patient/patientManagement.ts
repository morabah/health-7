/**
 * Patient Profile Management Functions
 * 
 * Contains functions for managing patient-specific profile data in Firestore.
 */

import { db } from '../config/firebaseAdmin';
import { logInfo, logError } from '../shared/logger';
import { trackPerformance } from '../shared/performance';

// Import types from local simplified types to avoid complex Zod compilation issues
import { PatientProfile } from '../types/localTypes';

/**
 * Creates a new PatientProfile document in Firestore.
 * 
 * This function creates the patient-specific profile document that contains
 * medical and personal information for patient users.
 * 
 * @param uid The Firebase Auth UID to use as the document ID (links to UserProfile)
 * @param data The patient profile data (excluding userId which is set automatically)
 * @param transaction Optional Firestore transaction to use for atomic operations
 * @returns Promise that resolves when the document is created
 * 
 * @example
 * ```typescript
 * await createPatientProfileInFirestore(uid, {
 *   dateOfBirth: Timestamp.fromDate(new Date('1990-01-01')),
 *   gender: Gender.MALE,
 *   bloodType: BloodType.A_POSITIVE,
 *   medicalHistory: 'No known allergies'
 * });
 * ```
 */
export async function createPatientProfileInFirestore(
  uid: string, 
  data: Omit<PatientProfile, 'userId'>, 
  transaction?: FirebaseFirestore.Transaction
): Promise<void> {
  const perf = trackPerformance('createPatientProfileInFirestore');
  logInfo(`[createPatientProfileInFirestore] Creating PatientProfile for uid: ${uid}`, {
    // Log non-PHI metadata only
    hasDateOfBirth: !!data.dateOfBirth,
    hasGender: !!data.gender,
    hasBloodType: !!data.bloodType,
    hasMedicalHistory: !!data.medicalHistory
  });

  try {
    const patientDocRef = db.collection('patients').doc(uid);
    
    // Prepare the complete patient profile data
    const patientProfileData = {
      userId: uid,
      ...data
    };

    // Use transaction if provided, otherwise write directly
    if (transaction) {
      transaction.set(patientDocRef, patientProfileData);
      logInfo(`[createPatientProfileInFirestore] PatientProfile set in transaction for uid: ${uid}`);
    } else {
      await patientDocRef.set(patientProfileData);
      logInfo(`[createPatientProfileInFirestore] PatientProfile created successfully for uid: ${uid}`);
    }

    perf.stop();
    
  } catch (error) {
    logError(`[createPatientProfileInFirestore] Error creating PatientProfile for uid: ${uid}`, error);
    perf.stop();
    throw error; // Re-throw to be caught by the caller
  }
} 