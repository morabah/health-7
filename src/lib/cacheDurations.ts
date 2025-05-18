/**
 * Standardized cache durations for React Query
 * 
 * This file defines consistent cache duration values to be used
 * across all React Query hooks in the application.
 */

/**
 * Cache duration constants (in milliseconds)
 */
export const CACHE_DURATIONS = {
  // Very volatile data (refresh frequently)
  NOTIFICATIONS: 60 * 1000, // 1 minute for notifications
  AVAILABLE_SLOTS: 60 * 1000, // 1 minute for available time slots
  APPOINTMENTS_TODAY: 60 * 1000, // 1 minute for today's appointments
  
  // Medium volatility data (regular refresh)
  DOCTOR_AVAILABILITY: 2 * 60 * 1000, // 2 minutes for doctor availability
  APPOINTMENTS_UPCOMING: 5 * 60 * 1000, // 5 minutes for upcoming appointments
  DASHBOARD: 5 * 60 * 1000, // 5 minutes for dashboard data
  
  // Low volatility data (less frequent refresh)
  DOCTOR_PROFILE: 5 * 60 * 1000, // 5 minutes for doctor profiles
  PATIENT_PROFILE: 5 * 60 * 1000, // 5 minutes for patient profiles
  SEARCH_RESULTS: 5 * 60 * 1000, // 5 minutes for search results
  
  // Very stable data (infrequent refresh)
  USER_PROFILE: 30 * 60 * 1000, // 30 minutes for user profiles
  STATS: 15 * 60 * 1000, // 15 minutes for stats data
  
  // Default durations
  DEFAULT: 3 * 60 * 1000, // 3 minutes default staleTime
  DEFAULT_GC: 5 * 60 * 1000, // 5 minutes default garbage collection time
};

export default CACHE_DURATIONS;
