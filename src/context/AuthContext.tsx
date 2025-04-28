'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { logInfo, logError, logValidation } from '@/lib/logger';
import { loadSession, saveSession } from '@/lib/localSession';
import { callApi } from '@/lib/apiClient';
import localApi from '@/lib/localApiFunctions';
import type { UserProfile, PatientProfile, DoctorProfile } from '@/types/schemas';
import { UserType } from '@/types/enums';
import { roleToDashboard } from '@/lib/router';
import { mockUserData } from '@/lib/mockData';
import { z } from 'zod';

// Add TypeScript augmentation for the window.__mockLogin helper
declare global {
  interface Window {
    __mockLogin: (role?: string) => Promise<boolean> | undefined;
  }
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
  registerPatient: (payload: PatientRegistrationPayload) => Promise<any>;
  registerDoctor: (payload: DoctorRegistrationPayload) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_KEY = 'healthAppSession';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile & { id: string } | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile & { id: string } | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile & { id: string } | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
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
        // Do NOT call refreshProfile here!
      } else {
        console.warn('[AuthContext] Session missing uid or role:', session);
      }
    } else {
      console.log('[AuthContext] No session found in localStorage.');
    }
    setLoading(false);
    setInitialized(true);
  }, []);

  // Call refreshProfile only after user is set
  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user]);

  const logout = () => {
    console.log('[AuthContext] Logging out, clearing session and state.');
    setUser(null);
    setProfile(null);
    setPatientProfile(null);
    setDoctorProfile(null);
    saveSession(null);
    router.push('/auth/login');
  };

  const refreshProfile = async () => {
    if (!user) {
      console.warn('[AuthContext] refreshProfile called with no user.');
      return;
    }
    try {
      setLoading(true);
      console.log('[AuthContext] Refreshing profile for user:', user);
      const response = await callApi('getMyUserProfile', { uid: user.uid, role: user.role });
      console.log('[AuthContext] getMyUserProfile response:', response);
      if (response) {
        setProfile(response);
      } else {
        logError('Failed to load user profile', { uid: user.uid });
      }
    } catch (err) {
      logError('Error refreshing profile', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, skipMock?: string) => {
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
        setUser(mappedUser);
        saveSession(mappedUser);
        setProfile(userProfile);
        console.log('[AuthContext] Login success, user set and session saved:', mappedUser);
        logInfo('Auth login success', {
          uid: u.id,
          email: u.email,
          userType: userProfile.userType,
        });
        const dashboardPath = roleToDashboard(userProfile.userType as UserType);
        router.push(dashboardPath);
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
    }
  };

  // Add global helper for mock login, bypassed if real login is in progress
  if (typeof window !== 'undefined') {
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
        registerPatient: async (payload) => {
          try {
            const result = await callApi('registerPatient', payload);
            return result.success;
          } catch (err) {
            logError('Error registering patient', err);
            return false;
          }
        },
        registerDoctor: async (payload) => {
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
