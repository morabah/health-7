/**
 * localSession.ts
 * Helpers for persisting minimal user session data in localStorage
 * Used by AuthContext to keep user logged in between page reloads
 */

import { UserType } from '@/types/enums';

// Storage key for the session
const SESSION_KEY = 'health-session';

/**
 * Load session data from localStorage
 * @returns The user session object or null if not found or parsing fails
 */
export const loadSession = (): { uid: string; email?: string; role: UserType } | null => {
  if (typeof window === 'undefined') {
    return null; // Return null when running on server
  }

  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    // Validate the parsed data has required fields
    if (!parsed || typeof parsed !== 'object' || !parsed.uid || !parsed.role) {
      return null;
    }
    
    return {
      uid: parsed.uid,
      email: parsed.email,
      role: parsed.role as UserType
    };
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
};

/**
 * Save session data to localStorage
 * @param payload The session data to save, or null to clear the session
 */
export const saveSession = (payload: { uid: string; email?: string; role: UserType } | null): void => {
  if (typeof window === 'undefined') {
    return; // Do nothing when running on server
  }

  try {
    if (payload === null) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    }
  } catch (error) {
    console.error('Error saving session:', error);
  }
};

/**
 * Clear session data from localStorage
 */
export const clearSession = (): void => {
  saveSession(null);
};
