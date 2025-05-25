/**
 * Real Firebase Configuration
 * 
 * This file contains the actual Firebase configuration for connecting to the live Firebase project.
 * Used when testing cloud functions deployment.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { logInfo, logError } from './logger';
import { IS_DEVELOPMENT } from '@/config/appConfig';

// Firebase configuration for health7-c378f project (Official from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAQ5B6mIjUw-Zc6VwG7J-jkMUXDadSOzkA",
  authDomain: "health7-c378f.firebaseapp.com",
  projectId: "health7-c378f",
  storageBucket: "health7-c378f.firebasestorage.app",
  messagingSenderId: "776487659386",
  appId: "1:776487659386:web:ee5636a3c3fc4ef94dd8c3",
  measurementId: "G-HNJRSQEBLD"
};

// Initialize Firebase app (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Configure Firebase services for development
if (IS_DEVELOPMENT) {
  try {
    logInfo('Running in development mode with real Firebase services');
    
    // In development, we'll use the real Firebase services
    // This ensures we're testing against the actual authentication service
    logInfo('Using real Firebase Authentication service');
    
    // If you want to use Firestore emulator in development, uncomment this:
    // connectFirestoreEmulator(firestore, 'localhost', 8080);
    // logInfo('Connected to Firestore Emulator');
  } catch (error) {
    logError('Failed to configure Firebase for development', error);
  }
}

// For testing cloud functions, ensure we're NOT connected to emulators
// The functions instance will connect to the live Firebase project

/**
 * Create a callable function reference
 * @param name - Function name
 * @returns Callable function
 */
export function createCallable<T = any, R = any>(name: string) {
  return httpsCallable<T, R>(functions, name);
}

/**
 * Call a Firebase Cloud Function
 * @param name - Function name
 * @param data - Data to send to the function
 * @returns Promise with function result
 */
export async function callCloudFunction<T = any, R = any>(name: string, data?: T): Promise<R> {
  const callable = createCallable<T, R>(name);
  const result = await callable(data);
  return result.data;
}

export default {
  app,
  auth,
  firestore,
  functions,
  storage,
  createCallable,
  callCloudFunction
}; 