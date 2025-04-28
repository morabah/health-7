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
  if (typeof localStorage === 'undefined') return null;
  
  try {
    const data = localStorage.getItem('healthSession');
    if (!data) return null;
    
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load session:', e);
    return null;
  }
}

/**
 * Save session data to localStorage
 */
export function saveSession(data: SessionData): void {
  if (typeof localStorage === 'undefined') return;
  
  try {
    if (data === null) {
      localStorage.removeItem('healthSession');
    } else {
      localStorage.setItem('healthSession', JSON.stringify(data));
    }
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}
