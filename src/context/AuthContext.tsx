'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { logInfo, logError } from '@/lib/logger';
import { loadSession, saveSession } from '@/lib/localSession';
import { callApi } from '@/lib/apiClient';
import type { UserProfile, PatientProfile, DoctorProfile } from '@/types/schemas';
import type { UserType } from '@/types/enums';
import { roleToDashboard } from '@/lib/router';

// Add TypeScript augmentation for the window.__mockLogin helper
declare global {
  interface Window {
    __mockLogin: (role?: string) => Promise<boolean> | undefined;
    __authFetching: boolean; // Global state to prevent duplicate requests
    __lastProfileFetch: number; // Timestamp of last profile fetch
  }
}

// Initialize global state if in browser
if (typeof window !== 'undefined') {
  window.__authFetching = false;
  window.__lastProfileFetch = 0;
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

// Context value type
interface AuthContextType {
  user: User | null;
  profile: UserProfile & { id: string } | null;
  patientProfile: PatientProfile & { id: string } | null;
  doctorProfile: DoctorProfile & { id: string } | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, skipMock?: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  registerPatient: (payload: PatientRegistrationPayload) => Promise<unknown>;
  registerDoctor: (payload: DoctorRegistrationPayload) => Promise<unknown>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Safe check for browser environment
const isBrowser = typeof window !== 'undefined';

// Safe global state access functions
const isAuthFetching = () => isBrowser && window.__authFetching;
const setAuthFetching = (value: boolean) => {
  if (isBrowser) window.__authFetching = value;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile & { id: string } | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile & { id: string } | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile & { id: string } | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Request tracking
  const profileFetched = useRef(false);
  const loginInProgress = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize auth state from localStorage - runs once on mount
  useEffect(() => {
    const initAuth = () => {
      const session = loadSession();
      console.log('[AuthContext] Loaded session from localStorage:', session);
      
      if (session) {
        // Ensure the session object conforms to the User type
        if (session.uid && session.role) {
          setUser({
            uid: session.uid,
            email: session.email,
            role: session.role as UserType
          });
          console.log('[AuthContext] Session valid, setting user:', session);
        } else {
          console.warn('[AuthContext] Session missing uid or role:', session);
        }
      } else {
        console.log('[AuthContext] No session found in localStorage.');
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);

  // Define refreshProfile with strong rate limiting
  const refreshProfile = useCallback(async () => {
    // Check global state flags to prevent duplicate requests
    if (isAuthFetching()) {
      console.log('[AuthContext] Auth fetching already in progress, skipping');
      return;
    }
    
    // Enforce time-based rate limit
    if (!canFetchProfile()) {
      console.log('[AuthContext] Profile refresh rate limited');
      return;
    }
    
    // Skip if profile already fetched
    if (profileFetched.current) {
      console.log('[AuthContext] Profile already fetched, skipping');
      return;
    }
    
    if (!user) {
      console.warn('[AuthContext] refreshProfile called with no user.');
      return;
    }

    try {
      // Set global fetch flag
      setAuthFetching(true);
      setLastProfileFetch(Date.now());
      setLoading(true);
      
      console.log('[AuthContext] Refreshing profile for user:', user);
      
      const response = await callApi('getMyUserProfile', { uid: user.uid, role: user.role });
      console.log('[AuthContext] getMyUserProfile response:', response);
      
      if (response) {
        setProfile(response);
        profileFetched.current = true;
      } else {
        logError('Failed to load user profile', { uid: user.uid });
      }
    } catch (err) {
      logError('Error refreshing profile', err);
    } finally {
      setLoading(false);
      setAuthFetching(false);
    }
  }, [user]);

  // Call refreshProfile only when user is first set
  useEffect(() => {
    if (user && !profileFetched.current) {
      refreshProfile();
    }
  }, [user, refreshProfile]);

  const logout = () => {
    console.log('[AuthContext] Logging out, clearing session and state.');
    
    // Ensure we're not in the middle of any auth operations
    if (isAuthFetching()) return;
    
    setUser(null);
    setProfile(null);
    setPatientProfile(null);
    setDoctorProfile(null);
    saveSession(null);
    
    // Reset tracking flags
    profileFetched.current = false;
    loginInProgress.current = false;
    
    // Use direct navigation to break any potential loops
    if (isBrowser) {
      window.location.href = '/auth/login';
    } else {
      router.push('/auth/login');
    }
  };

  const login = async (email: string, password: string, skipMock?: string) => {
    // Prevent concurrent login attempts
    if (loginInProgress.current || isAuthFetching()) {
      console.log('[AuthContext] Login already in progress, skipping');
      return false;
    }
    
    loginInProgress.current = true;
    setAuthFetching(true);
    setLoading(true);
    
    console.log('[AuthContext] login called:', { email, password: !!password, skipMock });
    
    try {
      if (typeof email !== 'string' || !email) {
        throw new Error('Invalid email format');
      }
      
      const result = await callApi('login', { email, password });
      console.log('[AuthContext] login result:', result);
      
      if (result.success) {
        const { user: u, userProfile } = result;
        const mappedUser: User = {
          uid: u.id,
          email: u.email || undefined,
          role: userProfile.userType as UserType
        };
        
        // Set state first
        setUser(mappedUser);
        saveSession(mappedUser);
        setProfile(userProfile);
        profileFetched.current = true;
        
        console.log('[AuthContext] Login success, user set and session saved:', mappedUser);
        logInfo('Auth login success', {
          uid: u.id,
          email: u.email,
          userType: userProfile.userType,
        });
        
        // Only try to redirect if userProfile and userType exist
        if (userProfile && userProfile.userType) {
          try {
            console.log('[AuthContext] Getting dashboard path for role:', userProfile.userType);
            const dashboardPath = roleToDashboard(userProfile.userType as UserType);
            console.log('[AuthContext] Redirecting to dashboard:', dashboardPath);
            
            // Use direct browser navigation to break any potential loops
            if (isBrowser) {
              // Delay navigation to ensure state is saved
              setTimeout(() => {
                window.location.href = dashboardPath;
              }, 500);
            } else {
              router.push(dashboardPath);
            }
          } catch (routeErr) {
            console.error('[AuthContext] Navigation error:', routeErr);
            logError('Navigation error after login', routeErr);
          }
        } else {
          console.warn('[AuthContext] No userProfile or userType available for redirection');
        }
        
        return true;
      } else {
        setError(result.error || 'Invalid credentials');
        logError('Auth login failed', { error: result.error });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during login';
      setError(errorMessage);
      logError('Auth login error:', err);
      return false;
    } finally {
      setLoading(false);
      setAuthFetching(false);
      
      // Reset login flag after a delay to prevent rapid re-attempts
      setTimeout(() => {
        loginInProgress.current = false;
      }, 2000);
    }
  };

  // Add global helper for mock login, bypassed if real login is in progress
  if (isBrowser) {
    window.__mockLogin = (mockType?: string) => {
      console.log('Mock login called with:', mockType, typeof mockType);
      
      // Skip mock login if an actual login is in progress
      if (mockType === 'ACTUAL_LOGIN_IN_PROGRESS') {
        console.log('Skipping mock login because real login is in progress');
        return;
      }
      
      const typeMap: Record<string, { email: string; password: string }> = {
        PATIENT: { email: 'test-patient@example.com', password: 'password' },
        DOCTOR: { email: 'test-doctor@example.com', password: 'password' },
        ADMIN: { email: 'admin@example.com', password: 'password' },
        // Add lowercase options for better compatibility
        patient: { email: 'test-patient@example.com', password: 'password' },
        doctor: { email: 'test-doctor@example.com', password: 'password' },
        admin: { email: 'admin@example.com', password: 'password' },
      };
      
      // Handle the case when mockType is an email address
      if (mockType && typeof mockType === 'string' && mockType.includes('@')) {
        console.log('Using provided email as mock login credential:', mockType);
        return login(mockType, 'password');
      }
      
      const loginData = mockType && typeof mockType === 'string' && typeMap[mockType]
        ? typeMap[mockType]
        : typeMap.PATIENT;
      
      if (!loginData || !loginData.email) {
        console.error('Invalid mock login data');
        return Promise.resolve(false);
      }
      
      console.log('Using mock credentials:', loginData);
      return login(loginData.email, loginData.password);
    };
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        patientProfile,
        doctorProfile,
        isLoading,
        error,
        login,
        logout,
        refreshProfile,
        clearError,
        registerPatient: async (payload: PatientRegistrationPayload) => {
          try {
            const result = await callApi('registerPatient', payload);
            return result.success;
          } catch (err) {
            logError('Error registering patient', err);
            return false;
          }
        },
        registerDoctor: async (payload: DoctorRegistrationPayload) => {
          try {
            const result = await callApi('registerDoctor', payload);
            return result.success;
          } catch (err) {
            logError('Error registering doctor', err);
            return false;
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
