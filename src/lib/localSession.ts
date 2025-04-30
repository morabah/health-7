/**
 * localSession.ts
 * Helpers for persisting minimal user session data in localStorage
 * Used by AuthContext to keep user logged in between page reloads
 */

import { UserType } from '@/types/enums';

// Storage keys for the session
const SESSION_KEY = 'health-session';
const ACTIVE_SESSIONS_KEY = 'health-active-sessions';

// Session data type
export interface SessionData {
  uid: string;
  email?: string;
  role: UserType;
  sessionId: string; // Unique identifier for this session
  lastActive: number; // Timestamp when this session was last active
}

/**
 * Generate a session ID for a user
 */
const generateSessionId = (uid: string): string => {
  return `${uid}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Get all active sessions
 */
export const getActiveSessions = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const data = localStorage.getItem(ACTIVE_SESSIONS_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    
    if (!Array.isArray(parsed)) {
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error('Error loading active sessions:', error);
    return [];
  }
};

/**
 * Add a session ID to active sessions
 */
const addActiveSession = (sessionId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const activeSessions = getActiveSessions();
    
    // Add the new session if it's not already in the list
    if (!activeSessions.includes(sessionId)) {
      activeSessions.push(sessionId);
      localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(activeSessions));
    }
  } catch (error) {
    console.error('Error adding active session:', error);
  }
};

/**
 * Remove a session ID from active sessions
 */
const removeActiveSession = (sessionId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const activeSessions = getActiveSessions();
    const updatedSessions = activeSessions.filter(id => id !== sessionId);
    localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(updatedSessions));
  } catch (error) {
    console.error('Error removing active session:', error);
  }
};

/**
 * Load current session data from localStorage
 * @returns The user session object or null if not found or parsing fails
 */
export const loadSession = (): SessionData | null => {
  if (typeof window === 'undefined') {
    return null; // Return null when running on server
  }

  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    // Validate the parsed data has required fields
    if (!parsed || typeof parsed !== 'object' || !parsed.uid || !parsed.role || !parsed.sessionId) {
      return null;
    }
    
    // Update last active timestamp
    parsed.lastActive = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
    
    return parsed as SessionData;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
};

/**
 * Load a specific session by ID
 */
export const loadSessionById = (sessionId: string): SessionData | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const data = localStorage.getItem(`${SESSION_KEY}-${sessionId}`);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    // Validate the parsed data
    if (!parsed || typeof parsed !== 'object' || !parsed.uid || !parsed.role || !parsed.sessionId) {
      return null;
    }
    
    return parsed as SessionData;
  } catch (error) {
    console.error('Error loading session by ID:', error);
    return null;
  }
};

/**
 * Save session data to localStorage
 * @param payload The session data to save, or null to clear the session
 * @returns The session ID if saved, or null if cleared
 */
export const saveSession = (payload: { uid: string; email?: string; role: UserType } | null): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    if (payload === null) {
      // Get the current session before clearing
      const currentSession = loadSession();
      
      if (currentSession && currentSession.sessionId) {
        // Remove from active sessions
        removeActiveSession(currentSession.sessionId);
        // Remove the specific session
        localStorage.removeItem(`${SESSION_KEY}-${currentSession.sessionId}`);
      }
      
      // Clear the current session
      localStorage.removeItem(SESSION_KEY);
      return null;
    } else {
      // Create a session with a unique ID
      const sessionId = generateSessionId(payload.uid);
      const sessionData: SessionData = {
        ...payload,
        sessionId,
        lastActive: Date.now()
      };
      
      // Save as current session
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      
      // Also save with session-specific key
      localStorage.setItem(`${SESSION_KEY}-${sessionId}`, JSON.stringify(sessionData));
      
      // Add to active sessions
      addActiveSession(sessionId);
      
      return sessionId;
    }
  } catch (error) {
    console.error('Error saving session:', error);
    return null;
  }
};

/**
 * Switch to a different active session
 */
export const switchSession = (sessionId: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  if (!sessionId || typeof sessionId !== 'string') {
    console.error('Invalid session ID provided:', sessionId);
    return false;
  }
  
  try {
    // Check if the sessionId exists in active sessions
    const activeSessions = getActiveSessions();
    if (!activeSessions.includes(sessionId)) {
      console.error('Session not found in active sessions:', sessionId);
      return false;
    }
    
    // Load the session data from storage
    const session = loadSessionById(sessionId);
    if (!session) {
      console.error('Session data not found for ID:', sessionId);
      return false;
    }
    
    // Update session's last active time
    session.lastActive = Date.now();
    
    // Set as current session
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    // Update in session-specific storage
    localStorage.setItem(`${SESSION_KEY}-${sessionId}`, JSON.stringify(session));
    
    console.log('Session switched successfully:', sessionId);
    return true;
  } catch (error) {
    console.error('Error switching session:', error);
    return false;
  }
};

/**
 * Get detailed information for all active sessions
 */
export const getDetailedActiveSessions = (): SessionData[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const sessionIds = getActiveSessions();
    const sessions: SessionData[] = [];
    
    for (const sessionId of sessionIds) {
      const session = loadSessionById(sessionId);
      if (session) {
        sessions.push(session);
      } else {
        // Clean up session IDs that don't have corresponding data
        removeActiveSession(sessionId);
      }
    }
    
    // Sort by most recently active
    sessions.sort((a, b) => b.lastActive - a.lastActive);
    return sessions;
  } catch (error) {
    console.error('Error getting detailed active sessions:', error);
    return [];
  }
};

/**
 * Clear all sessions from localStorage
 */
export const clearAllSessions = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Clear active sessions first
    const activeSessions = getActiveSessions();
    
    // Remove each session-specific entry
    activeSessions.forEach(sessionId => {
      localStorage.removeItem(`${SESSION_KEY}-${sessionId}`);
    });
    
    // Clear active sessions list
    localStorage.removeItem(ACTIVE_SESSIONS_KEY);
    
    // Clear current session
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Error clearing all sessions:', error);
  }
};

/**
 * Clear session data from localStorage
 */
export const clearSession = (): void => {
  saveSession(null);
};
