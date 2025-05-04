/**
 * API Authentication Context Management
 * 
 * Manages the current user authentication context for API calls.
 * This will be used to automatically provide context to API calls.
 * The implementation is designed to work with both local dev and Firebase Auth.
 */

import { UserType } from '@/types/enums';
import { isFirebaseEnabled, auth } from './firebaseConfig';

// Auth context interface - used across the application
export interface AuthContext {
  uid: string;
  role: UserType;
  isAuthenticated?: boolean;
}

// Firebase User interface (simplified)
interface FirebaseUser {
  uid: string;
  email: string | null;
}

// Global state to store the current auth context
let currentAuthContext: AuthContext | null = null;

/**
 * Set the current auth context for subsequent API calls
 */
export function setCurrentAuthCtx(context: AuthContext): void {
  if (!context.uid || !context.role) {
    console.error('Invalid auth context provided', context);
    return;
  }
  currentAuthContext = context;
}

/**
 * Clear the current auth context (logout)
 */
export function clearCurrentAuthCtx(): void {
  currentAuthContext = null;
}

/**
 * Get the current auth context, automatically resolving from Firebase Auth if enabled
 */
export function getCurrentAuthCtx(): AuthContext {
  // If Firebase is enabled, try to get the current user from Firebase Auth
  if (isFirebaseEnabled && auth.currentUser) {
    // Cast to the expected type
    const firebaseUser = auth.currentUser as FirebaseUser;
    
    // This is a simplification - in a real implementation, you would 
    // retrieve the user's role from Firestore or claims
    return {
      uid: firebaseUser.uid,
      role: UserType.PATIENT, // Default role - in real app, get from Firebase user claims
      isAuthenticated: true
    };
  }
  
  // Otherwise, use the stored context
  if (!currentAuthContext) {
    throw new Error('No authentication context available. User must be logged in.');
  }
  
  return {
    ...currentAuthContext,
    isAuthenticated: true
  };
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  if (isFirebaseEnabled) {
    return !!auth.currentUser;
  }
  
  return !!currentAuthContext;
}

export default {
  setCurrentAuthCtx,
  clearCurrentAuthCtx,
  getCurrentAuthCtx,
  isAuthenticated
}; 