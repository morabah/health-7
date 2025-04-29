'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logInfo, logError } from '@/lib/logger';
import { loadSession, saveSession } from '@/lib/localSession';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import { roleToDashboard } from '@/lib/router';
import type { UserProfile, PatientProfile, DoctorProfile } from '@/types/schemas';
import { setCurrentAuthCtx, clearCurrentAuthCtx } from '@/lib/apiAuthCtx';

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
}

// Define the Auth Context type
interface AuthContextType {
  user: User | null;
  profile: (UserProfile & { id: string }) | null;
  patientProfile: (PatientProfile & { id: string }) | null;
  doctorProfile: (DoctorProfile & { id: string }) | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  registerPatient: (payload: PatientRegistrationPayload) => Promise<unknown>;
  registerDoctor: (payload: DoctorRegistrationPayload) => Promise<unknown>;
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
  const loginInProgress = useRef<boolean>(false);

  const clearError = useCallback(() => {
    setError(null);
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
          role: session.role
        });
        
        // Also set the auth context for API calls
        setCurrentAuthCtx({ uid: session.uid, role: session.role });
      } else {
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);

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
        
        // Check if we need to redirect to dashboard
        if (profile && pathname) {
          const dashPath = roleToDashboard(profile.userType);
          
          // Only redirect if not already on dashboard to avoid loops
          if (pathname !== dashPath && !pathname.includes('/auth/')) {
            router.replace(dashPath);
          }
        }
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
  }, [user, profile, pathname, router]);

  // Fetch user profile when user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user, refreshProfile]);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Prevent double execution
    if (loginInProgress.current) {
      logInfo('Login already in progress, skipping duplicate request');
      return false;
    }
    
    try {
    loginInProgress.current = true;
      setLoading(true);
      clearError();
      
      // Use callApi for login
      const res = await callApi('login', { email, password });
      
      if (res.success) {
        // Create a strict User object with fields from the correct response structure
        const userData: User = {
          uid: res.user.id,
          email: res.user.email,
          role: res.userProfile.userType as UserType
        };
        
        // Save session to localStorage
        saveSession(userData);
        
        // Update React state
        setUser(userData);
        
        // Set auth context for API calls
        setCurrentAuthCtx({ uid: userData.uid, role: userData.role });
        
        // Redirect to dashboard page based on user role
        const dashboardPath = roleToDashboard(res.userProfile.userType);
        if (dashboardPath) {
          router.replace(dashboardPath);
        }
        
        return true;
      } else {
        setError(res.error || 'Login failed');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during login');
      return false;
    } finally {
      setLoading(false);
        loginInProgress.current = false;
    }
  }, [clearError, router]);

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
    
    // Redirect to login page
  if (isBrowser) {
      try {
        router.replace('/auth/login');
      } catch (e) {
        // Fallback to direct navigation if router fails
        window.location.href = '/auth/login';
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
        login,
        logout,
    clearError,
        refreshProfile,
        registerPatient,
    registerDoctor
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
