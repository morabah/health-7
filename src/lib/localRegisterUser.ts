'use client';

/**
 * Local Implementation of registerUser for Development Mode
 * 
 * This file provides a direct workaround for CORS issues when registering users
 * during local development. It implements the registration flow locally with
 * Firebase SDK calls that don't require CORS.
 */

import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from './realFirebaseConfig';
import { logInfo, logError } from './logger';
import { UserType } from '@/types/enums';

/**
 * Register a user with email/password and create necessary profile documents
 * 
 * @param email User's email
 * @param password User's password
 * @param userType Type of user (patient, doctor)
 * @param userData Additional user data
 * @returns Created user ID
 */
export async function localRegisterUser(
  email: string,
  password: string,
  userType: UserType,
  userData: Record<string, any>
): Promise<string> {
  try {
    logInfo(`Local registration process started for ${userType}`, { email, userType });
    
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const uid = user.uid;
    
    logInfo(`Firebase Auth user created`, { uid, email });
    
    // 2. Set display name if provided
    if (userData.firstName || userData.lastName) {
      const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      await updateProfile(user, { displayName });
      logInfo(`Display name updated`, { displayName });
    }
    
    // 3. Create user profile document
    const userProfileData = {
      email,
      userType,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phoneNumber: userData.phoneNumber || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active',
    };
    
    await setDoc(doc(firestore, 'users', uid), userProfileData);
    logInfo(`User profile document created`, { uid });
    
    // 4. Create specific profile type document (patient/doctor)
    if (userType === UserType.PATIENT) {
      const patientData = {
        userId: uid,
        dateOfBirth: userData.dateOfBirth || null,
        gender: userData.gender || '',
        address: userData.address || '',
        emergencyContact: userData.emergencyContact || '',
        medicalHistory: userData.medicalHistory || '',
        insurance: userData.insurance || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(doc(firestore, 'patients', uid), patientData);
      logInfo(`Patient profile document created`, { uid });
    } else if (userType === UserType.DOCTOR) {
      const doctorData = {
        userId: uid,
        specialization: userData.specialization || '',
        qualifications: userData.qualifications || '',
        experience: userData.experience || '',
        licenseNumber: userData.licenseNumber || '',
        availableDays: userData.availableDays || [],
        workingHours: userData.workingHours || {},
        isVerified: false,
        rating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(doc(firestore, 'doctors', uid), doctorData);
      logInfo(`Doctor profile document created`, { uid });
    }
    
    logInfo(`User registration completed successfully`, { uid, userType });
    return uid;
  } catch (error) {
    logError(`Local registration failed:`, error);
    throw error;
  }
}
