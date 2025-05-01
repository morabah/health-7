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
  type SessionData,
  getDetailedActiveSessions
} from '@/lib/localSession';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { roleToDashboard, APP_ROUTES } from '@/lib/router';
import type { UserProfile, PatientProfile, DoctorProfile } from '@/types/schemas';
import { setCurrentAuthCtx, clearCurrentAuthCtx } from '@/lib/apiAuthCtx';
import { generateId } from '@/lib/localApiCore';

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

// Initialize global state if in browser
if (isBrowser) {
  window.__authFetchInFlight = false;
  window.__lastProfileFetch = 0;
  
  // Dev helper for mock login
  window.__mockLogin = async (credsOrRole) => {
    // Handle both string role shortcuts and credential objects
    if (typeof credsOrRole === 'string') {
      // For role-based testing, use preset test accounts
      let email, password;
      const role = credsOrRole;
      
      switch (role) {
        case 'PATIENT':
        case UserType.PATIENT:
          email = 'test-patient@example.com';
          password = 'password123';
          break;
        case 'DOCTOR':
        case UserType.DOCTOR:
          email = 'test-doctor@example.com';
          password = 'password123';
          break;
        case 'ADMIN':
        case UserType.ADMIN:
          email = 'test-admin@example.com';
          password = 'password123';
          break;
        default:
          console.error('Invalid role for mock login');
          return;
      }
      
      // Get the auth context through the global accessor
      const auth = useAuthStore();
      if (auth) {
        auth.login(email, password);
      }
    } else if (credsOrRole && typeof credsOrRole === 'object') {
      // Handle credential object with email/password
      const creds = credsOrRole;
      const auth = useAuthStore();
      if (auth && creds.email && creds.password) {
        auth.login(creds.email, creds.password);
      }
    }
  };
}

// Type definitions for registration payloads
export interface PatientRegistrationPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodType?: string;
  medicalHistory?: string;
  userType: UserType;
}

export interface DoctorRegistrationPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber: string;
  yearsOfExperience: number;
  userType: UserType;
}

// Type for the User object
interface User {
  uid: string;
  email?: string;
  role: UserType;
  sessionId?: string;
}

// Type for a stored session
export interface StoredSession {
  sessionId: string;
  uid: string;
  email?: string;
  role: UserType;
  userProfile?: UserProfile;
  lastActive: number;
}

// Define the Auth Context type
interface AuthContextType {
  user: User | null;
  profile: (UserProfile & { id: string }) | null;
  patientProfile: (PatientProfile & { id: string }) | null;
  doctorProfile: (DoctorProfile & { id: string }) | null;
  loading: boolean;
  error: string | null;
  activeSessions: StoredSession[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  registerPatient: (payload: PatientRegistrationPayload) => Promise<unknown>;
  registerDoctor: (payload: DoctorRegistrationPayload) => Promise<unknown>;
  switchToSession: (sessionId: string) => Promise<boolean>;
  logoutAllSessions: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Global auth store for mock login helper
let useAuthStore: () => AuthContextType | undefined = () => undefined;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Safe check for race condition guard
const isAuthFetchInFlight = () => isBrowser && window.__authFetchInFlight;
const setAuthFetchInFlight = (value: boolean) => {
  if (isBrowser) window.__authFetchInFlight = value;
};
const getLastProfileFetch = () => isBrowser ? window.__lastProfileFetch : 0;
const setLastProfileFetch = (value: number) => {
  if (isBrowser) window.__lastProfileFetch = value;
};

// Checks if enough time has passed since last profile fetch
const canFetchProfile = () => {
  const now = Date.now();
  const last = getLastProfileFetch();
  return (now - last) > 10000; // 10 seconds minimum between fetches
};

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
      
      // Update the state with the detailed sessions
      setActiveSessions(sessions.map(session => ({
        sessionId: session.sessionId,
        uid: session.uid,
        email: session.email,
        role: session.role,
        lastActive: session.lastActive
      })));
      
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
          email: session.email,
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

  // Define refreshProfile with race condition guard
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
      // Set global flag
      setAuthFetchInFlight(true);
      setLastProfileFetch(Date.now());
      setLoading(true);
      
      const response = await callApi('getMyUserProfile', { uid: user.uid, role: user.role });
      
      if (response.success && response.userProfile) {
        // Set the user profile
        setProfile(response.userProfile);
        
        // Set role-specific profile if available
        if (response.roleProfile) {
          if (user.role === UserType.PATIENT) {
            setPatientProfile(response.roleProfile as PatientProfile & {id: string});
          } else if (user.role === UserType.DOCTOR) {
            setDoctorProfile(response.roleProfile as DoctorProfile & {id: string});
          }
        }
        
        // Only redirect to dashboard if the user is on the login page or root
        if (profile && pathname) {
          const isLoginPage = pathname === '/login' || pathname === '/' || pathname === '/auth/login';
          
          if (isLoginPage) {
            const dashPath = roleToDashboard(profile.userType);
            router.replace(dashPath);
          }
        }
        
        // Update the active sessions list after successful profile refresh
        await loadActiveSessions();
      } else {
        const errorMsg = response.error || 'Failed to load profile';
        setError(errorMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error loading profile');
    } finally {
      setLoading(false);
      setAuthFetchInFlight(false);
    }
  }, [user, profile, pathname, router, loadActiveSessions]);

  // Fetch user profile when user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user, refreshProfile]);

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
        email: session.email,
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
    setLoading(true);
    setError('');

    try {
      logInfo('auth-event', { action: 'login-attempt', email, timestamp: new Date().toISOString() });
      
      // We'll use the 'login' method which our apiClient will map to signIn
      const result = await callApi('login', email, password);
      
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
        lastActive: Date.now()
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
    }
  }, [router, loadActiveSessions]);

  // Logout function
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

  // Logout from all sessions
  const logoutAllSessions = useCallback(() => {
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
    if (isBrowser) {
      try {
        router.replace(APP_ROUTES.LOGIN);
      } catch (e) {
        // Fallback to direct navigation if router fails
        window.location.href = APP_ROUTES.LOGIN;
      }
    }
  }, [router]);

  // Register patient function
  const registerPatient = useCallback(async (payload: PatientRegistrationPayload) => {
    try {
      setLoading(true);
      clearError();
      
      const res = await callApi('registerPatient', payload);
      
      if (res.success) {
        // Auto-login after successful registration
        return login(payload.email, payload.password);
      } else {
        setError(res.error || 'Registration failed');
        return res;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during registration');
      return { success: false, error: error };
    } finally {
      setLoading(false);
    }
  }, [login, clearError, error]);
      
  // Register doctor function
  const registerDoctor = useCallback(async (payload: DoctorRegistrationPayload) => {
    try {
      setLoading(true);
      clearError();
      
      const res = await callApi('registerDoctor', payload);
      
      if (res.success) {
        // Auto-login after successful registration
        return login(payload.email, payload.password);
      } else {
        setError(res.error || 'Registration failed');
        return res;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during registration');
      return { success: false, error: error };
    } finally {
      setLoading(false);
      }
  }, [login, clearError, error]);

  // Create the context value object
  const contextValue: AuthContextType = {
    user,
    profile,
    patientProfile,
    doctorProfile,
    loading,
    error,
    activeSessions,
    login,
    logout,
    clearError,
    refreshProfile,
    registerPatient,
    registerDoctor,
    switchToSession,
    logoutAllSessions
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
