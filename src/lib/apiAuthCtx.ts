/**
 * API Authentication Context
 * 
 * Provides utilities for getting the current authentication context synchronously.
 * Used by apiClient.ts to attach auth context to local API calls.
 */

import { UserType } from '@/types/enums';
import { loadSession, saveSession, clearSession } from './localSession';
import { logInfo } from './logger';

// Auth context type definition
export interface AuthContext {
  uid: string;
  role: UserType;
}

// Store the current auth context in memory
let currentAuthCtx: AuthContext | null = null;

// Initialize auth context from session storage if available
if (typeof window !== 'undefined') {
  try {
    const session = loadSession<AuthContext>('api_auth_ctx');
    if (session && session.uid && session.role) {
      currentAuthCtx = session;
      logInfo('API Auth context initialized from session', { uid: session.uid, role: session.role });
    }
  } catch (error) {
    console.error('Error loading auth context from session:', error);
  }
}

/**
 * Set the current authentication context
 * This should be called when a user logs in or their state changes
 * 
 * @param ctx Authentication context with user ID and role, or null to clear
 */
export function setCurrentAuthCtx(ctx: AuthContext | null): void {
  currentAuthCtx = ctx;
  
  // Persist to localStorage for page reloads
  if (typeof window !== 'undefined') {
    if (ctx) {
      saveSession(ctx, 'api_auth_ctx');
    } else {
      clearSession('api_auth_ctx');
    }
  }
  
  logInfo('API Auth context updated', ctx || { status: 'cleared' });
}

/**
 * Get the current authentication context
 * Returns the stored context or null if not set
 * 
 * @returns The current auth context or null
 */
export function getCurrentAuthCtx(): AuthContext | null {
  return currentAuthCtx;
}

/**
 * Clear the current authentication context
 * This should be called when a user logs out
 */
export function clearCurrentAuthCtx(): void {
  currentAuthCtx = null;
  
  // Clear from localStorage
  if (typeof window !== 'undefined') {
    clearSession('api_auth_ctx');
  }
  
  logInfo('API Auth context cleared');
}

export default {
  setCurrentAuthCtx,
  getCurrentAuthCtx,
  clearCurrentAuthCtx,
}; 