/**
 * Date utility functions for consistent date formatting across the application
 */

import { format, parseISO, isValid } from 'date-fns';

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
      console.warn(`Invalid date provided to formatDate: ${dateString}`);
      return '';
    }
    
    return format(date, formatStr);
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
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