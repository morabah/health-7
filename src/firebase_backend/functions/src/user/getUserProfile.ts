/**
 * Get User Profile Functions
 * 
 * Contains the callable Firebase function for fetching user profile data.
 */

import { onCall } from 'firebase-functions/v2/https';
import { logInfo, logError } from '../shared/logger';
import { fetchUserProfileData } from './userProfileManagement';
import { UserType } from '../types/localTypes';

/**
 * Get the current user's profile data (Cloud Function)
 * 
 * Returns the user profile along with role-specific profile data
 * (patient or doctor profile based on userType)
 */
export const getMyUserProfileData = onCall(
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
    logInfo('=== getMyUserProfileData: Function called ===', { 
      hasAuth: !!request.auth,
      uid: request.auth?.uid,
      email: request.auth?.token?.email,
      requestData: request.data
    });

    try {
      // Check if user is authenticated
      if (!request.auth) {
        logError('getMyUserProfileData: User not authenticated');
        throw new Error('Authentication required');
      }

      const uid = request.auth.uid;
      const email = request.auth.token.email;

      logInfo('getMyUserProfileData: Processing authenticated request', { uid, email });

      // Use the fetchUserProfileData function to get all profile data
      logInfo('getMyUserProfileData: Calling fetchUserProfileData...', { uid });
      const profileData = await fetchUserProfileData(uid);
      logInfo('getMyUserProfileData: fetchUserProfileData result:', { 
        profileData: profileData ? 'found' : 'null',
        hasUserProfile: profileData ? !!profileData.userProfile : false
      });
      
      if (!profileData) {
        // User doesn't exist in Firestore, create a basic profile
        logInfo('getMyUserProfileData: User not found in Firestore, creating new profile', { uid, email });
        
        const newUserProfile = {
          id: uid,
          email: email || '',
          firstName: email?.split('@')[0] || 'User',
          lastName: '',
          userType: UserType.PATIENT,
          isActive: true,
          emailVerified: request.auth.token.email_verified || false,
          phoneVerified: false,
          phone: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profilePictureUrl: null
        };
        
        logInfo('getMyUserProfileData: New profile data prepared:', newUserProfile);
        
        // Save to Firestore using the admin SDK
        try {
          const { db } = await import('../config/firebaseAdmin');
          logInfo('getMyUserProfileData: Saving new profile to Firestore...');
          await db.collection('users').doc(uid).set(newUserProfile);
          logInfo('getMyUserProfileData: New user profile saved successfully', { uid });
        } catch (saveError) {
          logError('getMyUserProfileData: Error saving new profile to Firestore', saveError);
          throw new Error(`Failed to create user profile: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
        }
        
        const result = {
          userProfile: newUserProfile,
          patientProfile: null,
          doctorProfile: null
        };
        
        logInfo('getMyUserProfileData: Returning newly created profile', result);
        return result;
      }

      logInfo('getMyUserProfileData: Successfully retrieved user profile', { 
        uid,
        userType: profileData.userProfile.userType,
        hasPatientProfile: !!profileData.patientProfile,
        hasDoctorProfile: !!profileData.doctorProfile
      });

      // Return in the format expected by the frontend
      const result = {
        userProfile: profileData.userProfile,
        patientProfile: profileData.patientProfile || null,
        doctorProfile: profileData.doctorProfile || null
      };
      
      logInfo('getMyUserProfileData: Returning existing profile', result);
      return result;

    } catch (error) {
      logError('getMyUserProfileData: Error processing request', { 
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        uid: request.auth?.uid 
      });
      
      throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
); 