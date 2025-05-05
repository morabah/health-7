'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { 
  loadSession, 
  saveSession, 
  getActiveSessions, 
  loadSessionById, 
  switchSession, 
  clearAllSessions,
  getDetailedActiveSessions,
  type SessionData
} from '@/lib/localSession';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { roleToDashboard, APP_ROUTES } from '@/lib/router';
import type { UserProfile, PatientProfile, DoctorProfile } from '@/types/schemas';
import { setCurrentAuthCtx, clearCurrentAuthCtx } from '@/lib/apiAuthCtx';
import { generateId } from '@/lib/localApiCore';

// Constants
const isBrowser = typeof window !== 'undefined';

// Enable multi-login feature - this controls if multiple logins are shown in the UI
const MULTI_LOGIN_ENABLED = true;

// Add TypeScript augmentation for window global state
declare global {
  interface Window {
    __mockLogin: (creds: { email: string; password: string } | string) => Promise<void>;
    __authFetchInFlight: boolean; // Global race condition guard
    __lastProfileFetch: number; // Timestamp of last profile fetch
    __authContext?: AuthContextType; // Reference to auth context for direct access
  }
}

// User data (minimal, with appropriate UID from firebase)
type User = {
  uid: string;
  email: string | null;
  role: UserType;
  sessionId: string;
  emailVerified?: boolean;
};

// Stored session with timestamp
export type StoredSession = {
  sessionId: string;
  uid: string;
  email?: string; // Keep as optional but handle it safely
  role: UserType;
  lastActive: number;
  displayName?: string; // Optional display name to show in the UI
};

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

// Auth context definition
export type AuthContextType = {
  user: User | null;
  profile: UserProfile & { id: string } | null;
  patientProfile: PatientProfile & { id: string } | null;
  doctorProfile: DoctorProfile & { id: string } | null;
  loading: boolean;
  error: string | null;
  activeSessions: StoredSession[];
  multiLoginEnabled: boolean; // Flag to indicate if multi-login feature is enabled
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  registerPatient: (payload: PatientRegistrationPayload) => Promise<boolean>;
  registerDoctor: (payload: DoctorRegistrationPayload) => Promise<boolean>;
  switchToSession: (sessionId: string) => Promise<boolean>;
  logoutAllSessions: () => Promise<void>;
  updateUserVerificationStatus: (verified: boolean) => Promise<void>;
};

// Create context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  patientProfile: null,
  doctorProfile: null,
  loading: false,
  error: null,
  activeSessions: [],
  multiLoginEnabled: MULTI_LOGIN_ENABLED,
  login: async () => false,
  logout: () => {},
  refreshProfile: async () => {},
  clearError: () => {},
  registerPatient: async () => false,
  registerDoctor: async () => false,
  switchToSession: async () => false,
  logoutAllSessions: async () => {},
  updateUserVerificationStatus: async () => {},
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

// Add a global helper for mock login
if (isBrowser) {
  window.__mockLogin = async (creds): Promise<void> => {
    try {
      const authContext = useAuthStore();
      let email;
      let password;
      
      if (typeof creds === 'string') {
        // Handle email-only format (default password)
        email = creds;
        password = 'password123';
      } else {
        // Handle object with email/password
        email = creds.email;
        password = creds.password;
      }
      
      console.log(`[Mock Login] Attempting to log in with: ${email}`);
      const result = await authContext.login(email, password);
      
      if (result) {
        console.log('[Mock Login] Login successful');
      } else {
        console.error('[Mock Login] Login failed, see error in Auth context');
      }
    } catch (error) {
      console.error('[Mock Login] Error:', error);
    }
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile & { id: string } | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile & { id: string } | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile & { id: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<StoredSession[]>([]);
  const loginInProgress = useRef<boolean>(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load active sessions
  const loadActiveSessions = useCallback(async () => {
    if (!isBrowser) return;
    
    try {
      // Use the improved getDetailedActiveSessions function which has better error handling
      // and cleans up orphaned session IDs
      const sessions = getDetailedActiveSessions();
      
      // Add display names for better UI representation
      const enhancedSessions = sessions.map(session => {
        let displayName = session.email || 'Unknown User';
        
        // Try to add the role for better identification
        switch (session.role) {
          case UserType.ADMIN:
            displayName = `Admin: ${session.email || 'Unknown'}`;
            break;
          case UserType.DOCTOR:
            displayName = `Doctor: ${session.email || 'Unknown'}`;
            break;
          case UserType.PATIENT:
            displayName = `Patient: ${session.email || 'Unknown'}`;
            break;
        }
        
        return {
          ...session,
          displayName,
          email: session.email || 'Unknown' // Ensure email is not undefined
        };
      });
      
      // Update the state with the detailed sessions
      setActiveSessions(enhancedSessions);
      
      logInfo('Active sessions loaded', { count: sessions.length });
    } catch (error) {
      logError('Failed to load active sessions', error);
      // Don't clear the sessions array on error to prevent UI flickering
    }
  }, []);

  // Initialize auth state from localStorage - runs once on mount
  useEffect(() => {
    const initAuth = async () => {
      const session = loadSession();
      
      if (session) {
        // Set user from session
        setUser({
          uid: session.uid,
          email: session.email ? session.email : null, // Explicitly convert undefined to null
          role: session.role,
          sessionId: session.sessionId
        });
        
        // Also set the auth context for API calls
        setCurrentAuthCtx({ uid: session.uid, role: session.role });
      } else {
        setLoading(false);
      }
      
      // Load all active sessions
      await loadActiveSessions();
    };
    
    initAuth();
  }, [loadActiveSessions]);

  // Logout function - define this BEFORE it's used in refreshProfile
  const logout = useCallback(() => {
    // Clear React state
    setUser(null);
    setProfile(null);
    setPatientProfile(null);
    setDoctorProfile(null);
    
    // Clear localStorage session
    saveSession(null);
    
    // Clear auth context for API calls
    clearCurrentAuthCtx();
    
    // Update active sessions
    loadActiveSessions();
    
    // Redirect to login page
    if (isBrowser) {
      try {
        router.replace(APP_ROUTES.LOGIN);
      } catch (e) {
        // Fallback to direct navigation if router fails
        window.location.href = APP_ROUTES.LOGIN;
      }
    }
  }, [router, loadActiveSessions]);

  // Define the refreshProfile with race condition guard - now we can use logout safely
  const refreshProfile = useCallback(async () => {
    // Check global flag to prevent duplicate requests
    if (isAuthFetchInFlight()) {
      logInfo('Auth fetch already in flight, skipping duplicate request');
      return;
    }
    
    // Time-based rate limit
    if (!canFetchProfile()) {
      logInfo('Profile refresh rate limited');
      return;
    }
    
    if (!user) {
      logError('refreshProfile called with no user');
      return;
    }

    try {
      setAuthFetchInFlight(true);
      
      interface ProfileResponse {
        success: boolean;
        error?: string;
        userProfile: UserProfile & { id: string };
        roleProfile?: PatientProfile & { id: string } | DoctorProfile & { id: string };
      }
      
      const result = await callApi<ProfileResponse>('getMyUserProfile', {
        uid: user.uid,
        role: user.role
      });
      
      if (!result.success) {
        logError('Failed to load user profile', result.error);
        
        // Check if the error is due to auth issues
        if (result.error?.toLowerCase().includes('auth') || 
            result.error?.toLowerCase().includes('unauthorized') ||
            result.error?.toLowerCase().includes('not found')) {
          
          logWarn('Auth error detected during profile refresh, initiating logout');
          logout();
        }
        
        return;
      }
      
      // Update profile and role-specific data
      setProfile(result.userProfile);
      
      if (user.role === UserType.PATIENT && result.roleProfile) {
        setPatientProfile(result.roleProfile as PatientProfile & { id: string });
      } else if (user.role === UserType.DOCTOR && result.roleProfile) {
        setDoctorProfile(result.roleProfile as DoctorProfile & { id: string });
      }
      
      // Set loading to false once we have profile data
      setLoading(false);
    } catch (error) {
      logError('Error in refreshProfile', error);
      setLoading(false);
    } finally {
      setAuthFetchInFlight(false);
    }
  }, [user, logout]); // Now logout is defined when used as a dependency

  // Refresh profile effect - runs after auth state changes
  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user, refreshProfile]);

  // Logout all sessions function
  const logoutAllSessions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear all sessions in localStorage
      clearAllSessions();
      
      // Clear React state
      setUser(null);
      setProfile(null);
      setPatientProfile(null);
      setDoctorProfile(null);
      setActiveSessions([]);
      
      // Clear auth context for API calls
      clearCurrentAuthCtx();
      
      // Redirect to login page
      router.replace(APP_ROUTES.LOGIN);
    } catch (error) {
      setError('Failed to logout all sessions');
      logError('Error in logoutAllSessions', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Switch to a different user session
  const switchToSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!sessionId) {
      logError('Invalid session ID provided for switching');
      setError('Invalid session ID');
      return false;
    }

    try {
      setLoading(true);
      clearError();
      
      logInfo('Session switch - attempting to switch to session:', { sessionId });
      
      // Try to switch to the session
      const success = switchSession(sessionId);
      
      if (!success) {
        logError('Failed to switch sessions - switchSession returned false');
        setError('Failed to switch to the selected session');
        return false;
      }
      
      // Load the session data
      const session = loadSessionById(sessionId);
      
      if (!session) {
        logError('Failed to load session data after switch');
        setError('Failed to load the session data');
        return false;
      }
      
      logInfo('Session switch - session data loaded successfully', { 
        uid: session.uid,
        role: session.role,
        sessionId: session.sessionId
      });
      
      // Update the user state
      setUser({
        uid: session.uid,
        email: session.email ? session.email : null, // Explicitly convert undefined to null
        role: session.role,
        sessionId: session.sessionId
      });
      
      // Update auth context for API calls
      setCurrentAuthCtx({ uid: session.uid, role: session.role });
      
      // Clear current profile data
      setProfile(null);
      setPatientProfile(null);
      setDoctorProfile(null);
      
      // Force a profile refresh after a short delay to ensure state updates have propagated
      setTimeout(() => {
        refreshProfile().catch(err => {
          logError('Error refreshing profile after session switch', err);
        });
      }, 100);
      
      // Update active sessions list
      await loadActiveSessions();
      
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error switching session';
      logError('Error in switchToSession:', errorMsg);
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearError, refreshProfile, loadActiveSessions]);

  // Login handler
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Don't allow multiple login calls simultaneously
    if (loginInProgress.current) {
      logWarn('Login already in progress, skipping duplicate request');
      return false;
    }
    
    loginInProgress.current = true;
    setLoading(true);
    setError('');

    try {
      logInfo('auth-event', { action: 'login-attempt', email, timestamp: new Date().toISOString() });
      
      // Define the expected response type for login API
      interface LoginResponse {
        success: boolean;
        error?: string;
        user: { id: string; email: string | null };
        userProfile: UserProfile & { id: string };
        roleProfile: PatientProfile | DoctorProfile;
      }
      
      // We'll use the 'login' method which our apiClient will map to signIn
      const result = await callApi<LoginResponse>('login', { email, password });
      
      if (!result.success) {
        setError(result.error || 'Login failed');
        logInfo('Login unsuccessful', { email, reason: result.error || 'Unknown reason' });
        return false;
      }

      // Store session data in localStorage
      const { user, userProfile, roleProfile } = result;
      
      // Create session to store
      const session: StoredSession = {
        sessionId: generateId(),
        uid: user.id,
        email: userProfile.email || '',
        role: userProfile.userType,
        lastActive: Date.now(),
        displayName: `${userProfile.firstName} ${userProfile.lastName} (${userProfile.userType})`
      };

      // Store session in localStorage
      saveSession(session);
      
      // Update state
      setUser({
        uid: user.id,
        email: user.email,
        role: userProfile.userType,
        sessionId: session.sessionId
      });
      
      // Set auth context for API calls
      setCurrentAuthCtx({ uid: user.id, role: userProfile.userType });
      
      // Update the profile state
      setProfile(userProfile);
      
      // Update role-specific profile
      if (userProfile.userType === UserType.PATIENT && roleProfile) {
        setPatientProfile(roleProfile as PatientProfile & {id: string});
      } else if (userProfile.userType === UserType.DOCTOR && roleProfile) {
        setDoctorProfile(roleProfile as DoctorProfile & {id: string});
      }
      
      // Update the active sessions
      await loadActiveSessions();
      
      // Redirect to dashboard page based on user role
      const dashboardPath = roleToDashboard(userProfile.userType);
      if (dashboardPath) {
        router.replace(dashboardPath);
      }
      
      // Log successful login
      logInfo('auth-event', { action: 'login-success', email });
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during login';
      logError('Login error', message);
      setError(message);
      return false;
    } finally {
      setLoading(false);
      loginInProgress.current = false;
    }
  }, [router, loadActiveSessions]);

  // Patient registration handler
  const registerPatient = useCallback(async (payload: PatientRegistrationPayload) => {
    setLoading(true);
    setError('');
    
    try {
      interface RegistrationResponse {
        success: boolean;
        error?: string;
      }
      
      const result = await callApi<RegistrationResponse>('registerPatient', {
        ...payload,
      });
      
      if (!result.success) {
        setError(result.error || 'Registration failed');
        return false;
      }
      
      // Auto-login the new user
      await login(payload.email, payload.password);
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during registration';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [login]);

  // Doctor registration handler
  const registerDoctor = useCallback(async (payload: DoctorRegistrationPayload) => {
    setLoading(true);
    setError('');
    
    try {
      interface RegistrationResponse {
        success: boolean;
        error?: string;
      }
      
      const result = await callApi<RegistrationResponse>('registerDoctor', {
        ...payload,
      });
      
      if (!result.success) {
        setError(result.error || 'Registration failed');
        return false;
      }
      
      // Auto-login the new user
      await login(payload.email, payload.password);
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during registration';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const updateUserVerificationStatus = useCallback(async (verified: boolean) => {
    if (!user) return;
    
    try {
      // Set loading state
      setLoading(true);
      
      // Update user object to include emailVerified status
      setUser(prev => prev ? { ...prev, emailVerified: verified } : null);
      
      // In a real app with Firebase, we would call:
      // await updateEmailVerificationStatus(user.uid, verified);
      
      // For local development, we'll just simulate a successful update
      // by updating the user profile in localStorage
      if (isBrowser) {
        const currentSession = loadSession();
        if (currentSession) {
          // Update session with emailVerified flag
          const updatedSession = {
            ...currentSession,
            emailVerified: verified
          };
          
          // Save updated session
          saveSession(updatedSession);
          
          logInfo('Updated user verification status in local storage', { verified });
        }
      }
      
      // Refresh the profile to get updated data
      await refreshProfile();
      
    } catch (error) {
      setError('Failed to update verification status');
      logError('Error updating verification status', error);
    } finally {
      setLoading(false);
    }
  }, [user, refreshProfile]);

  // Create the context value object
  const contextValue: AuthContextType = {
    user,
    profile,
    patientProfile,
    doctorProfile,
    loading,
    error,
    activeSessions,
    multiLoginEnabled: MULTI_LOGIN_ENABLED,
    login,
    logout,
    refreshProfile,
    clearError,
    registerPatient,
    registerDoctor,
    switchToSession,
    logoutAllSessions,
    updateUserVerificationStatus,
  };
  
  // Update global auth store for mock login helper
  useAuthStore = () => contextValue;
  
  // Store auth context in window for direct access
  if (isBrowser) {
    window.__authContext = contextValue;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
