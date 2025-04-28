/**
 * localSession.ts
 * Helpers for persisting minimal user session data in localStorage
 * Used by AuthContext to keep user logged in between page reloads
 */

type SessionData = { uid: string; email?: string; role?: string } | null;

/**
 * Load session data from localStorage
 */
export function loadSession(): SessionData {
  if (typeof localStorage === 'undefined') {
    console.warn('[localSession] localStorage is undefined');
    return null;
  }
  try {
    const data = localStorage.getItem('healthAppSession');
    console.log('[localSession] loadSession: loaded', data);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.error('[localSession] Failed to load session:', e);
    return null;
  }
}

/**
 * Save session data to localStorage
 */
export function saveSession(data: SessionData): void {
  if (typeof localStorage === 'undefined') {
    console.warn('[localSession] localStorage is undefined');
    return;
  }
  try {
    if (data === null) {
      localStorage.removeItem('healthAppSession');
      console.log('[localSession] saveSession: removed session');
    } else {
      localStorage.setItem('healthAppSession', JSON.stringify(data));
      console.log('[localSession] saveSession: saved', data);
    }
  } catch (e) {
    console.error('[localSession] Failed to save session:', e);
  }
}
