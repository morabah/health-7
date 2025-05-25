'use client';

/**
 * Direct Firebase Implementation for User Login
 * 
 * This file provides a simulated login implementation for development mode
 * to avoid CORS issues with Firebase Authentication.
 */

import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from './realFirebaseConfig';
import { logInfo, logError } from './logger';

type LoginResponse = {
  success: boolean;
  userId?: string;
  userType?: string;
  isNewUser?: boolean;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Logs in a user using Firebase Authentication
 * This function handles email/password authentication and fetches user profile data
 */
export const directLoginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const startTime = performance.now();
  logInfo(`Attempting login for: ${email}`);

  try {
    // Sign in with email and password using Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (!user) {
      throw new Error('No user returned from authentication');
    }

    // Get additional user data from Firestore
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    
    if (!userDoc.exists()) {
      logError('User document not found', { userId: user.uid });
      throw new Error('User profile not found');
    }
    
    const userData = userDoc.data();
    
    logInfo(`Login successful for user: ${user.uid}`, {
      userId: user.uid,
      userType: userData.userType || 'patient',
      email: user.email,
      duration: performance.now() - startTime
    });
    
    return {
      success: true,
      userId: user.uid,
      userType: userData.userType || 'patient',
      isNewUser: false,
      email: user.email || '',
      displayName: userData.displayName || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || ''
    };
      
  } catch (error: any) {
    const errorCode = error.code || 'unknown';
    const errorMessage = error.message || 'An unknown error occurred';
    
    // Map Firebase Auth error codes to user-friendly messages
    let userFriendlyMessage = 'Failed to log in. Please check your email and password.';
    
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        userFriendlyMessage = 'Invalid email or password';
        break;
      case 'auth/too-many-requests':
        userFriendlyMessage = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/user-disabled':
        userFriendlyMessage = 'This account has been disabled. Please contact support.';
        break;
    }
    
    logError('Login error', { 
      errorCode, 
      errorMessage,
      email,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      errorCode,
      errorMessage: userFriendlyMessage
    };
  }
};
