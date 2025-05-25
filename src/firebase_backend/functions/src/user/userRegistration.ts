/**
 * User Registration Functions
 * 
 * Contains the callable Firebase function for registering new users (Patients and Doctors).
 * Handles Firebase Auth user creation and Firestore profile document creation.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { auth, db } from '../config/firebaseAdmin';
import { logInfo, logError, logWarn } from '../shared/logger';
import { trackPerformance } from '../shared/performance';

// Import Zod schemas for validation
import { z } from 'zod';
import { 
  RegisterSchema, 
  PatientRegisterSchema, 
  DoctorRegisterSchema 
} from '../shared/schemas';

// Import TypeScript types
import { 
  UserProfile, 
  UserType 
} from '../types/localTypes';

// Import internal helper functions
import { createUserProfileInFirestore } from './userProfileManagement';
import { createPatientProfileInFirestore } from '../patient/patientManagement';
import { createDoctorProfileInFirestore } from '../doctor/doctorManagement';

/**
 * Register a new user (Patient or Doctor) - Cloud Function
 * 
 * Creates a new user account in Firebase Auth and corresponding profile documents
 * in Firestore. Handles both Patient and Doctor registration with role-specific
 * profile data and proper validation.
 * 
 * @param data Registration data validated against RegisterSchema
 * @param context Function context (not used for registration - no auth required)
 * @returns Promise resolving to { success: true, userId: string }
 * 
 * @throws HttpsError with appropriate error codes:
 * - 'invalid-argument': Invalid registration data
 * - 'already-exists': Email already in use
 * - 'internal': Server error during registration
 */
export const registerUser = onCall(
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
    const perf = trackPerformance('registerUserCallable');
    logInfo('registerUser function triggered', { 
      hasData: !!request.data,
      dataKeys: request.data ? Object.keys(request.data) : []
    });

    try {
      // Input Validation (Zod)
      const validationResult = RegisterSchema.safeParse(request.data);
      if (!validationResult.success) {
        logWarn('registerUser: Invalid input data.', { 
          error: validationResult.error.format(),
          // Don't log raw data to avoid PII exposure
        });
        perf.stop();
        throw new HttpsError('invalid-argument', 'Invalid registration data. Please check all fields.');
      }
      
      const validatedData = validationResult.data;
      logInfo('registerUser: Input validation successful', { 
        userType: validatedData.userType,
        email: validatedData.email 
      });

      // Check for Existing User (Email)
      try {
        await auth.getUserByEmail(validatedData.email);
        logWarn('registerUser: Email already exists.', { email: validatedData.email });
        perf.stop();
        throw new HttpsError('already-exists', `The email address ${validatedData.email} is already in use.`);
      } catch (error: any) {
        // If it's our HttpsError, re-throw it
        if (error instanceof HttpsError) {
          throw error;
        }
        // If it's not a user-not-found error, it's an unexpected error
        if (error.code !== 'auth/user-not-found') {
          logError('registerUser: Error checking existing user by email.', error);
          perf.stop();
          throw new HttpsError('internal', 'An error occurred while verifying email availability.');
        }
        // Email is available, proceed.
        logInfo('registerUser: Email is available for registration.', { email: validatedData.email });
      }

      // Phone Number Validation & Preparation
      let validPhoneNumber: string | undefined = undefined;
      if (validatedData.phone) {
        if (validatedData.phone.startsWith('+') && validatedData.phone.length >= 11) { // Basic E.164 check
          validPhoneNumber = validatedData.phone;
        } else {
          logWarn('registerUser: Invalid phone number format provided, will not be used for Auth user.', { 
            phone: validatedData.phone 
          });
          // Do not throw, just don't use it for Firebase Auth user creation if invalid.
          // UserProfile will store it as null or as provided based on Zod schema.
        }
      }

      // Create Firebase Auth User
      let uid: string;
      try {
        const userRecord = await auth.createUser({
          email: validatedData.email,
          password: validatedData.password,
          displayName: `${validatedData.firstName} ${validatedData.lastName}`,
          ...(validPhoneNumber && { phoneNumber: validPhoneNumber }),
          emailVerified: false, // Email verification will be handled separately
          disabled: false,
        });
        uid = userRecord.uid;
        logInfo('registerUser: Firebase Auth user created successfully.', { 
          uid, 
          email: validatedData.email 
        });
      } catch (error: any) {
        logError('registerUser: Firebase Auth user creation failed.', error);
        perf.stop();
        throw new HttpsError('internal', 'Could not create your user account. Please try again.');
      }

      // Create Firestore Documents (Transaction Recommended)
      try {
        await db.runTransaction(async (transaction) => {
          // Prepare UserProfile data (excluding id, createdAt, updatedAt from schema)
          const userProfileDataForFirestore: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
            email: validatedData.email,
            phone: validPhoneNumber || validatedData.phone || null, // Save what was validated or provided
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            userType: validatedData.userType,
            isActive: validatedData.userType !== UserType.DOCTOR, // Doctors start inactive
            emailVerified: false,
            phoneVerified: false,
          };
          await createUserProfileInFirestore(uid, userProfileDataForFirestore, transaction);

          if (validatedData.userType === UserType.PATIENT) {
            const patientData = validatedData as z.infer<typeof PatientRegisterSchema>;
            await createPatientProfileInFirestore(uid, {
              dateOfBirth: patientData.dateOfBirth || null,
              gender: patientData.gender || null,
              bloodType: patientData.bloodType || null,
              medicalHistory: patientData.medicalHistory || null,
              address: patientData.address || null,
            }, transaction);
          } else if (validatedData.userType === UserType.DOCTOR) {
            const doctorData = validatedData as z.infer<typeof DoctorRegisterSchema>;
            await createDoctorProfileInFirestore(uid, {
              specialty: doctorData.specialty,
              licenseNumber: doctorData.licenseNumber,
              yearsOfExperience: doctorData.yearsOfExperience || 0,
              profilePictureUrl: doctorData.profilePictureUrl || null,
              licenseDocumentUrl: doctorData.licenseDocumentUrl || null,
              bio: doctorData.bio || null,
              consultationFee: doctorData.consultationFee || null,
              languages: doctorData.languages || [],
              educationHistory: doctorData.educationHistory || [],
              experienceHistory: doctorData.experienceHistory || [],
            }, transaction);
          }
        });
        logInfo('registerUser: Firestore profile documents created successfully.', { 
          uid, 
          userType: validatedData.userType 
        });
      } catch (error: any) {
        logError('registerUser: Firestore profile creation failed. Cleaning up Auth user.', { uid, error });
        await auth.deleteUser(uid).catch(delErr => 
          logError('Failed to clean up Auth user during registration error.', { uid, delErr })
        );
        perf.stop();
        throw new HttpsError('internal', 'Failed to save your profile information. Please try again.');
      }

      // Trigger Email Verification (No Await)
      auth.generateEmailVerificationLink(validatedData.email)
        .then(link => {
          logInfo(`Email verification link generated for ${validatedData.email}. In a real app, send this via email. Link (for dev/emulator testing): ${link}`);
          // TODO: Implement actual email sending in a separate function/trigger
        })
        .catch(err => logError('Failed to generate verification email link', { 
          email: validatedData.email, 
          err 
        }));

      // Log overall success and stop performance tracking
      logInfo('registerUser: User registration completed successfully', { 
        uid, 
        userType: validatedData.userType,
        email: validatedData.email 
      });
      perf.stop();

      // Return success response
      return { success: true, userId: uid };

    } catch (error: any) {
      logError('registerUser: Registration failed', { 
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      perf.stop();
      
      // Re-throw HttpsError instances as-is
      if (error instanceof HttpsError) {
        throw error;
      }
      
      // Convert other errors to HttpsError
      throw new HttpsError('internal', 'An unexpected error occurred during registration.');
    }
  }
); 