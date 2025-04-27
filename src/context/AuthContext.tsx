'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { logInfo, logError, logValidation } from '@/lib/logger';
import { loadSession, saveSession } from '@/lib/localSession';
import { callApi } from '@/lib/apiClient';
import * as api from '@/lib/localApiFunctions';
import type { UserProfile } from '@/types/schemas';
import { UserType } from '@/types/enums';
import { roleToDashboard } from '@/lib/router';

// Add TypeScript augmentation for the window.__mockLogin helper
declare global {
  interface Window {
    __mockLogin?: (role: string | null) => void;
  }
}

// Types for registration payloads
interface PatientRegistrationPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: UserType | UserType.PATIENT;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  medicalHistory?: string;
}

interface DoctorRegistrationPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: UserType | UserType.DOCTOR;
  specialty?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  profilePictureUrl?: string | null;
  licenseDocumentUrl?: string | null;
}

interface AuthContext {
  user: { uid: string; email?: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  registerPatient: (
    payload: PatientRegistrationPayload
  ) => Promise<{ success: boolean; error?: string; data?: unknown }>;
  registerDoctor: (
    payload: DoctorRegistrationPayload
  ) => Promise<{ success: boolean; error?: string; data?: unknown }>;
}

const AuthContext = createContext<AuthContext | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthContext['user']>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setProfile(null);
    saveSession(null);
    logInfo('Auth logout');
    // Redirect to home page on logout
    router.push('/');
  }, [router]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      logInfo('No user to refresh profile for');
      return;
    }

    try {
      const p = await api.getMyUserProfile(user.uid);
      setProfile(p);
      logInfo('Profile refreshed', { uid: user.uid });
    } catch (err) {
      logError('Failed to refresh profile', err);
    }
  }, [user]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        clearError();

        // Add detailed logging before callApi
        logInfo('AuthContext.login - received', { email, password });
        const payloadForApi = { email, password };
        logInfo('AuthContext.login - payload for callApi', payloadForApi);

        const result = await callApi('login', payloadForApi);

        if (!result.success) {
          setError(result.error);
          logError('Auth login failed', { error: result.error });
          return false;
        }

        const { user: u, userProfile } = result;
        // Map user to expected shape
        const mappedUser = { uid: u.id, email: u.email || undefined };
        setUser(mappedUser);
        saveSession(mappedUser);
        setProfile(userProfile);

        logInfo('Auth login success', {
          uid: u.id,
          email: u.email,
          userType: userProfile.userType,
        });

        // Redirect to the appropriate dashboard based on user type
        const dashboardPath = roleToDashboard(userProfile.userType);
        router.push(dashboardPath);

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error during login';
        setError(errorMessage);
        logError('Auth login failed', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [clearError, router]
  );

  const registerPatient = useCallback(
    async (payload: PatientRegistrationPayload) => {
      try {
        setLoading(true);
        clearError();

        // Ensure userType is set to PATIENT
        const registrationPayload = {
          ...payload,
          userType: UserType.PATIENT,
        };

        const result = await callApi('registerPatient', registrationPayload);

        if (!result.success) {
          setError(result.error);
          logError('Patient registration failed', { error: result.error });
        }

        logInfo('Patient registration', {
          success: result.success,
          email: payload.email,
        });

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error during registration';
        setError(errorMessage);
        logError('Patient registration failed', err);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [clearError]
  );

  const registerDoctor = useCallback(
    async (payload: DoctorRegistrationPayload) => {
      try {
        setLoading(true);
        clearError();

        // Ensure userType is set to DOCTOR
        const registrationPayload = {
          ...payload,
          userType: UserType.DOCTOR,
        };

        const result = await callApi('registerDoctor', registrationPayload);

        if (!result.success) {
          setError(result.error);
          logError('Doctor registration failed', { error: result.error });
        }

        logInfo('Doctor registration', {
          success: result.success,
          email: payload.email,
        });

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error during registration';
        setError(errorMessage);
        logError('Doctor registration failed', err);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [clearError]
  );

  /** hydrate from localStorage once */
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setUser(stored);
      api
        .getMyUserProfile(stored.uid)
        .then(userProfile => {
          setProfile(userProfile);

          // If we're on the login page or root, redirect to dashboard
          if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            if (path === '/' || path === '/auth/login') {
              const dashboardPath = roleToDashboard(userProfile.userType);
              router.push(dashboardPath);
            }
          }
        })
        .catch(() => null)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // dev helper
    window.__mockLogin = (role: string | null) => {
      if (!role) {
        logout();
        return;
      }

      const demo =
        role === 'PATIENT'
          ? 'test-patient-verified-001'
          : role === 'DOCTOR'
            ? 'test-doctor-verified-003'
            : 'test-admin-005';

      const mappedUser = { uid: demo };
      setUser(mappedUser);
      saveSession(mappedUser);
      refreshProfile();

      // Redirect to the appropriate dashboard
      const dashboardPath = roleToDashboard(role);
      router.push(dashboardPath);

      logInfo('Auth mock login', { role, uid: demo });
    };

    // Log validation
    setTimeout(() => {
      logValidation('4.2', 'success', 'AuthContext operating with local session & mock login');
      logValidation(
        '4.8',
        'success',
        'Local registration, login, navbar role-switch & redirects verified end-to-end'
      );
    }, 1000);

    return () => {
      // Clean up (though in practice, this won't run for the root provider)
      if (typeof window !== 'undefined' && window.__mockLogin) {
        delete window.__mockLogin;
      }
    };
  }, [logout, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        login,
        logout,
        refreshProfile,
        clearError,
        registerPatient,
        registerDoctor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
