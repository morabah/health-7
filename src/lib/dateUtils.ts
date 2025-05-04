/**
 * Date utility functions for consistent date formatting across the application
 */

import { format, parseISO, isValid } from 'date-fns';
import { logError, logWarn } from './logger';

/**
 * Formats a date string into a localized, human-readable format
 * @param dateString - ISO date string or any valid date string
 * @param formatStr - Optional custom format string (defaults to 'MMM d, yyyy')
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(dateString: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    
    if (!isValid(date)) {
      logWarn(`Invalid date provided to formatDate`, { dateString });
      return '';
    }
    
    return format(date, formatStr);
  } catch (error) {
    logError(`Error formatting date`, { dateString, error });
    return '';
  }
}

/**
 * Formats a timestamp (for display in logs or system messages)
 * @param date - Date object or string
 * @returns Formatted timestamp string with date and time
 */
export function formatTimestamp(date: Date | string = new Date()): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Gets a relative time string (e.g., "2 hours ago", "yesterday")
 * This is a placeholder - in a real implementation, use a library like date-fns/formatDistanceToNow
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function getRelativeTime(dateString: string): string {
  // In a real implementation, use date-fns formatDistanceToNow
  return `${formatDate(dateString)} (placeholder for relative time)`;
}

/**
 * Format a date string or Date object to a datetime string
 * Format: YYYY-MM-DD HH:MM:SS
 */
export function formatDateTime(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return '';
  }
}

// Add these utility functions to properly format dates for HTML inputs

/**
 * Format a date string to the yyyy-MM-dd format required by HTML date inputs
 * @param dateString ISO date string or other date format
 * @returns A date string in yyyy-MM-dd format, or empty string if invalid
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    // Handle ISO strings by splitting at T
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    
    // For other formats, parse with Date and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return ''; // Invalid date
    
    return date.toISOString().split('T')[0];
  } catch (err) {
    logError('Error formatting date for input', { dateString, error: err });
    return '';
  }
}

/**
 * Format a date for API submission (add time component)
 * @param dateString Date in yyyy-MM-dd format
 * @returns ISO date string with time component
 */
export function formatDateForApi(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    // If it already has a time component, return as is
    if (dateString.includes('T')) {
      return dateString;
    }
    
    // Add time component
    return `${dateString}T00:00:00.000Z`;
  } catch (err) {
    logError('Error formatting date for API', { dateString, error: err });
    return '';
  }
} 