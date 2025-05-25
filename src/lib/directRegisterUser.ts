'use client';

/**
 * Direct Firebase Implementation for User Registration
 * 
 * This file provides a direct Firebase SDK implementation for user registration
 * that works in both development and production environments.
 */

import { getAuth, createUserWithEmailAndPassword, updateProfile, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { logInfo, logError } from './logger';
import { UserType, Gender } from '@/types/enums';
import { trackPerformance } from './performance';

/**
 * Type for the registration data
 */
export type RegistrationData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  dateOfBirth?: string;
  gender?: Gender | string;
  phone?: string;
  bloodType?: string;
  medicalHistory?: string;
  [key: string]: any; // For any additional fields
};

/**
 * Type for the registration result
 */
export type RegistrationResult = {
  success: boolean;
  userId?: string;
  error?: string;
};

/**
 * Register a user directly using Firebase SDK
 * 
 * @param userData Registration data including email, password, and user details
 * @returns Promise with registration result
 */
export async function directRegisterUser(userData: RegistrationData): Promise<RegistrationResult> {
  const perf = trackPerformance('directRegisterUser');
  
  try {
    logInfo('Starting direct registration process', { 
      email: userData.email,
      userType: userData.userType 
    });
    
    // Get Firebase services
    const auth = getAuth();
    const db = getFirestore();
    
    // 1. Create the user account
    logInfo('Creating Firebase Auth user', { email: userData.email });
    
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );
    
    const user = userCredential.user;
    const uid = user.uid;
    
    if (!uid) {
      throw new Error('Failed to create user: No UID returned from Firebase Auth');
    }
    
    logInfo('Firebase Auth user created successfully', { uid });
    
    // 2. Set display name if provided
    try {
      const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      if (displayName) {
        logInfo('Updating user profile with display name', { uid, displayName });
        await updateProfile(user, { displayName });
      }
    } catch (profileError) {
      logError('Failed to update user profile', { uid, error: profileError });
      // Continue even if profile update fails
    }
    
    // 3. Create user profile in Firestore
    const timestamp = serverTimestamp() as Timestamp;
    const now = new Date();
    
    // Base user profile
    const userProfile = {
      id: uid,
      email: userData.email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      userType: userData.userType,
      isActive: userData.userType === UserType.PATIENT, // Patients are active by default
      emailVerified: false,
      phoneVerified: false,
      phone: userData.phone || null,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLoginAt: timestamp,
      profilePictureUrl: null,
      // Add metadata
      _metadata: {
        createdBy: 'direct-registration',
        createdAt: now.toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    logInfo('Creating user profile in Firestore', { uid, userType: userData.userType });
    await setDoc(doc(db, 'users', uid), userProfile);
    logInfo('User profile created in Firestore', { uid });
    
    // 4. Create type-specific profile
    try {
      if (userData.userType === UserType.PATIENT) {
        const patientProfile = {
          userId: uid,
          dateOfBirth: userData.dateOfBirth || null,
          gender: (userData.gender as Gender) || Gender.OTHER,
          bloodType: userData.bloodType || null,
          medicalHistory: userData.medicalHistory || null,
          address: null, // Will be set later in profile
          allergies: [],
          medications: [],
          emergencyContact: null,
          insurance: null,
          primaryCarePhysician: null,
          preferredPharmacy: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          _metadata: {
            createdBy: 'direct-registration',
            createdAt: now.toISOString()
          }
        };
        
        logInfo('Creating patient profile in Firestore', { uid });
        await setDoc(doc(db, 'patients', uid), patientProfile);
        logInfo('Patient profile created in Firestore', { uid });
        
      } else if (userData.userType === UserType.DOCTOR) {
        const doctorProfile = {
          userId: uid,
          specialty: userData.specialty || 'General Practitioner',
          licenseNumber: userData.licenseNumber || '',
          yearsOfExperience: 0,
          verificationStatus: 'PENDING',
          bio: null,
          languages: ['English'],
          education: [],
          experience: [],
          consultationFee: null,
          location: null,
          rating: 0,
          reviewCount: 0,
          isAvailable: false,
          availability: {},
          services: [],
          createdAt: timestamp,
          updatedAt: timestamp,
          _metadata: {
            createdBy: 'direct-registration',
            createdAt: now.toISOString()
          }
        };
        
        logInfo('Creating doctor profile in Firestore', { uid });
        await setDoc(doc(db, 'doctors', uid), doctorProfile);
        logInfo('Doctor profile created in Firestore', { uid });
      }
    } catch (profileError) {
      logError('Failed to create type-specific profile', { 
        uid, 
        userType: userData.userType, 
        error: profileError 
      });
      // Don't fail the entire registration if profile creation fails
      // The user can update their profile later
    }
    
    // 5. Log successful registration
    const duration = perf.stop();
    logInfo('Registration completed successfully', { 
      uid, 
      userType: userData.userType,
      duration: `${duration}ms`
    });
    
    return { 
      success: true, 
      userId: uid
    };
    
  } catch (error: any) {
    const duration = perf.stop();
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || 'Unknown error occurred';
    
    logError('Registration failed', { 
      errorCode, 
      errorMessage,
      email: userData.email,
      userType: userData.userType,
      duration: `${duration}ms`
    });
    
    // Map Firebase Auth error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered. Please use a different email or try signing in.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    };
    
    return {
      success: false,
      error: errorMessages[errorCode] || 'Registration failed. Please try again.'
    };
  }
}
