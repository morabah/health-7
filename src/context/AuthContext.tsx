'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { roleToDashboard, APP_ROUTES } from '@/lib/router';
import type { UserProfile, PatientProfile, DoctorProfile } from '@/types/schemas';
import { generateId } from '@/lib/localApiCore';

// Firebase imports for live auth
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, functions } from '@/lib/realFirebaseConfig';

// Constants
const isBrowser = typeof window !== 'undefined';

// Add TypeScript augmentation for window global state
declare global {
  interface Window {
    __mockLogin: (creds: { email: string; password: string } | string) => Promise<void>;
    __authFetchInFlight: boolean; // Global race condition guard
    __lastProfileFetch: number; // Timestamp of last profile fetch
    __authContext?: AuthContextType; // Reference to auth context for direct access
  }
}

/**
 * Types for registration payloads
 */
export type PatientRegistrationPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  userType: UserType.PATIENT;
};

export type DoctorRegistrationPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  userType: UserType.DOCTOR;
};

// Enhanced AuthContext state interface
export interface AuthContextState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

// Auth context definition
export type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  patientProfile: PatientProfile | null;
  doctorProfile: DoctorProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
  registerPatient: (payload: PatientRegistrationPayload) => Promise<boolean>;
  registerDoctor: (payload: DoctorRegistrationPayload) => Promise<boolean>;
};

// Create context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  patientProfile: null,
  doctorProfile: null,
  loading: false,
  error: null,
  login: async () => false,
  logout: async () => {},
  refreshUserProfile: async () => {},
  clearError: () => {},
  registerPatient: async () => false,
  registerDoctor: async () => false,
});

// Store the auth context hook result for direct access (used for mock login helper)
let useAuthStore = () => useContext(AuthContext);

// Utility to check if an auth API request is in progress
const isAuthFetchInFlight = (): boolean => {
  if (!isBrowser) return false;
  return Boolean(window.__authFetchInFlight);
};

// Set global auth fetch in flight flag
const setAuthFetchInFlight = (value: boolean): void => {
  if (!isBrowser) return;
  window.__authFetchInFlight = value;
};

// Check if profile can be fetched within rate limit
const canFetchProfile = (): boolean => {
  if (!isBrowser) return true;

  const now = Date.now();
  const lastFetch = window.__lastProfileFetch || 0;

  // Rate limit to one fetch per 2 seconds
  const canFetch = now - lastFetch > 2000;

  if (canFetch) {
    window.__lastProfileFetch = now;
  }

  return canFetch;
};

// Clear the last fetch timestamp to force a refresh next time
const clearProfileFetchTimestamp = (): void => {
  if (!isBrowser) return;
  window.__lastProfileFetch = 0;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch profile for the current user using the live getMyUserProfileData function
  const fetchProfileForUser = useCallback(async (currentUser: User | null) => {
    // Check global flag to prevent duplicate requests
    if (isAuthFetchInFlight()) {
      logInfo('[AuthContext] Profile fetch already in flight, skipping duplicate request');
      return;
    }

    // Time-based rate limit
    if (!canFetchProfile()) {
      logInfo('[AuthContext] Profile refresh rate limited');
      return;
    }

    if (!currentUser || !functions) {
      logInfo('[AuthContext] No user or functions client, clearing profile');
      setUserProfile(null);
      setPatientProfile(null);
      setDoctorProfile(null);
      return;
    }

    const perf = trackPerformance('fetchProfileForUserContext_Live');
    logInfo('[AuthContext] Starting live profile fetch for user', { uid: currentUser.uid });

    try {
      setAuthFetchInFlight(true);

      // Call the deployed getMyUserProfileData cloud function using callApi wrapper
      const result = await callApi<{
        userProfile: UserProfile & { id: string };
        patientProfile?: PatientProfile & { id: string };
        doctorProfile?: DoctorProfile & { id: string };
      } | null>('getMyUserProfileData', {});

      if (result && result.userProfile) {
        // Set the user profile
        setUserProfile(result.userProfile);

        // Set role-specific profiles based on userType
        if (result.userProfile.userType === UserType.PATIENT && result.patientProfile) {
          setPatientProfile(result.patientProfile);
          setDoctorProfile(null);
        } else if (result.userProfile.userType === UserType.DOCTOR && result.doctorProfile) {
          setDoctorProfile(result.doctorProfile);
          setPatientProfile(null);
        } else {
          // Admin or no role-specific profile
          setPatientProfile(null);
          setDoctorProfile(null);
        }

        logInfo('[AuthContext] Live User profile fetched successfully', { 
          uid: currentUser.uid,
          userType: result.userProfile.userType 
        });
      } else {
        logWarn('[AuthContext] Live User profile data not found or unexpected format from getMyUserProfileData', { 
          uid: currentUser.uid, 
          result 
        });
        setUserProfile(null);
        setPatientProfile(null);
        setDoctorProfile(null);
      }

    } catch (error: any) {
      logError('[AuthContext] Error fetching live user profile', { 
        uid: currentUser.uid, 
        error: error.message || error 
      });
      setUserProfile(null);
      setPatientProfile(null);
      setDoctorProfile(null);
    } finally {
      setAuthFetchInFlight(false);
      perf.stop();
    }
  }, []);

  // Real logout function using Firebase Auth
  const logout = useCallback(async () => {
    const perf = trackPerformance('logout_Live');
    logInfo('[AuthContext] Initiating logout');

    try {
      // Sign out from Firebase Auth
      await signOut(auth);
      
      // Clear all state
      setUser(null);
      setUserProfile(null);
      setPatientProfile(null);
      setDoctorProfile(null);
      setError(null);

      // Clear profile fetch timestamp
      clearProfileFetchTimestamp();

      logInfo('[AuthContext] Logout successful');

      // Redirect to login page
      if (isBrowser) {
        try {
          router.replace(APP_ROUTES.LOGIN);
        } catch (e) {
          // Fallback to direct navigation if router fails
          window.location.href = APP_ROUTES.LOGIN;
        }
      }
    } catch (error: any) {
      logError('[AuthContext] Error during logout', error);
      setError('Failed to logout');
    } finally {
      perf.stop();
    }
  }, [router]);

  // Real refresh function
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      setLoading(true);
      await fetchProfileForUser(user);
      setLoading(false);
    }
  }, [user, fetchProfileForUser]);

  // Set up Firebase Auth state listener
  useEffect(() => {
    const perf = trackPerformance('authStateChangeListener_Setup');
    logInfo('[AuthContext] Setting up Firebase Auth state listener');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const userPerf = trackPerformance('onAuthStateChanged_Live');
      
      if (firebaseUser) {
        logInfo('[AuthContext] Firebase user authenticated', { 
          uid: firebaseUser.uid, 
          email: firebaseUser.email 
        });
        
        setUser(firebaseUser);
        
        // Fetch profile for authenticated user
        await fetchProfileForUser(firebaseUser);
      } else {
        logInfo('[AuthContext] No Firebase user authenticated');
        setUser(null);
        setUserProfile(null);
        setPatientProfile(null);
        setDoctorProfile(null);
      }
      
      setLoading(false);
      userPerf.stop();
    });

    perf.stop();

    // Cleanup function
    return () => {
      logInfo('[AuthContext] Cleaning up Firebase Auth listener');
      unsubscribe();
    };
  }, [fetchProfileForUser]);

  // Mock login function for testing (simplified)
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // This will be properly implemented when we connect the login UI to Firebase Auth
    // For now, this is just a placeholder that follows the existing interface
    logWarn('[AuthContext] Mock login called - real Firebase Auth login will be implemented in next prompt');
    setError('Login not yet implemented - use Firebase Auth directly');
    return false;
  }, []);

  // Registration functions (placeholders for now)
  const registerPatient = useCallback(async (payload: PatientRegistrationPayload): Promise<boolean> => {
    logWarn('[AuthContext] Patient registration not yet implemented');
    setError('Registration not yet implemented');
    return false;
  }, []);

  const registerDoctor = useCallback(async (payload: DoctorRegistrationPayload): Promise<boolean> => {
    logWarn('[AuthContext] Doctor registration not yet implemented');
    setError('Registration not yet implemented');
    return false;
  }, []);

  // Create the context value object
  const contextValue: AuthContextType = {
    user,
    userProfile,
    patientProfile,
    doctorProfile,
    loading,
    error,
    login,
    logout,
    refreshUserProfile,
    clearError,
    registerPatient,
    registerDoctor,
  };

  // Update global auth store for mock login helper
  useAuthStore = () => contextValue;

  // Store auth context in window for direct access
  if (isBrowser) {
    window.__authContext = contextValue;
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
