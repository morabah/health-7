/**
 * Local session management utilities
 * Handles storing and retrieving auth session from localStorage
 */

const KEY = 'HAS_localAuth';

/**
 * Load auth session from localStorage
 * @returns The stored auth session or null if none exists
 */
export const loadSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as { uid: string } | null;
  } catch (e) {
    console.error('Failed to parse stored auth session:', e);
    return null;
  }
};

/**
 * Save auth session to localStorage
 * @param obj The auth session to save, or null to clear
 */
export const saveSession = (obj: { uid: string } | null) => {
  if (typeof window === 'undefined') return;

  if (obj) {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } else {
    localStorage.removeItem(KEY);
  }
};
