/**
 * API Authentication Context Management
 * 
 * Manages the current user authentication context for API calls.
 * This will be used to automatically provide context to API calls.
 * The implementation is designed to work with both local dev and Firebase Auth.
 */

import { UserType } from '@/types/enums';
import { isFirebaseEnabled, auth } from './firebaseConfig';
import { logError, logInfo } from './logger';

// Auth context interface - used across the application
export interface AuthContext {
  uid: string;
  role: UserType;
  isAuthenticated?: boolean;
  email?: string;
  displayName?: string;
}

// Firebase User interface (simplified)
interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  photoURL?: string | null;
  customClaims?: {
    role?: string;
    [key: string]: any;
  };
}

// Global state to store the current auth context
let currentAuthContext: AuthContext | null = null;

// Cache for Firebase user role mapping
let roleCache: Record<string, UserType> = {};

/**
 * Set the current auth context for subsequent API calls
 */
export function setCurrentAuthCtx(context: AuthContext): void {
  if (!context.uid || !context.role) {
    logError('Invalid auth context provided', context);
    return;
  }
  
  logInfo('Auth context updated', { 
    uid: context.uid, 
    role: context.role,
    email: context.email 
  });
  
  currentAuthContext = context;
  
  // Cache the role for this user
  if (context.uid && context.role) {
    roleCache[context.uid] = context.role;
  }
}

/**
 * Clear the current auth context (logout)
 */
export function clearCurrentAuthCtx(): void {
  logInfo('Auth context cleared');
  currentAuthContext = null;
}

/**
 * Map Firebase user to role (UserType)
 * This would typically come from custom claims in Firebase Auth
 */
export function mapFirebaseUserToRole(user: FirebaseUser): UserType {
  // Check if we've cached the role
  if (roleCache[user.uid]) {
    return roleCache[user.uid];
  }
  
  // Try to get from custom claims
  if (user.customClaims?.role) {
    if (user.customClaims.role === 'doctor') {
      return UserType.DOCTOR;
    } else if (user.customClaims.role === 'admin') {
      return UserType.ADMIN;
    }
  }
  
  // Default to PATIENT
  return UserType.PATIENT;
}

/**
 * Get the current auth context
 * Automatically resolves from Firebase Auth if enabled
 * 
 * @param forceRefresh Force refresh from Firebase
 * @returns Current auth context
 * @throws Error if not authenticated
 */
export function getCurrentAuthCtx(forceRefresh = false): AuthContext {
  // If Firebase is enabled, try to get the current user from Firebase Auth
  if (isFirebaseEnabled && auth.currentUser) {
    // Cast to the expected type
    const firebaseUser = auth.currentUser as unknown as FirebaseUser;
    
    if (forceRefresh || !currentAuthContext || currentAuthContext.uid !== firebaseUser.uid) {
      // Map Firebase user to our AuthContext format
      const role = mapFirebaseUserToRole(firebaseUser);
      
      // Update the current context
      currentAuthContext = {
        uid: firebaseUser.uid,
        role,
        isAuthenticated: true,
        email: firebaseUser.email || undefined,
        displayName: firebaseUser.displayName || undefined
      };
      
      logInfo('Auth context resolved from Firebase', { 
        uid: currentAuthContext.uid, 
        role: currentAuthContext.role 
      });
}

    return currentAuthContext;
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

/**
 * Get the current user's role
 * 
 * @returns User role or null if not authenticated
 */
export function getCurrentUserRole(): UserType | null {
  try {
    const ctx = getCurrentAuthCtx();
    return ctx.role;
  } catch (error) {
    return null;
  }
}

export default {
  setCurrentAuthCtx,
  clearCurrentAuthCtx,
  getCurrentAuthCtx,
  isAuthenticated,
  getCurrentUserRole,
  mapFirebaseUserToRole
}; 