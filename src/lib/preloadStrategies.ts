'use client';

/**
 * Preload Strategies
 * 
 * This module implements optimized preloading strategies for different pages
 * to reduce redundant API calls and improve perceived performance.
 */

import { prefetchApiQuery } from './enhancedApiClient';
import { cacheKeys, cacheManager } from './queryClient';
import { enhancedCache, CacheCategory } from './cacheManager';
import { callApi } from './apiClient';
import { UserType } from '@/types/enums';
import { logInfo, logError } from './logger';

// Type for preload strategies
interface PreloadStrategy {
  // Preload data for a specific page
  execute(): Promise<void>;
  // Name for logging
  name: string;
}

// Common interface for all page preloaders
interface PagePreloader {
  preloadAll(): Promise<void>;
  preloadFallback(): Promise<void>;
}

// Type for batch doctor data response
interface BatchDoctorDataResponse {
  success: boolean;
  doctor?: any;
  availability?: any;
  slots?: any;
  [key: string]: any;
}

/**
 * Preloader for the Book Appointment page
 * Batches multiple API calls that would otherwise be made separately
 */
export class BookAppointmentPreloader implements PagePreloader {
  private doctorId: string;
  private userId: string | null;
  private userRole: UserType;
  private strategicDataFetched = false;

  constructor(doctorId: string, userId?: string, userRole?: UserType) {
    this.doctorId = doctorId;
    this.userId = userId || null;
    this.userRole = userRole || UserType.PATIENT;
  }

  /**
   * Preload all data needed for the booking page in optimized batches
   */
  async preloadAll(): Promise<void> {
    if (!this.doctorId) {
      logError('BookAppointmentPreloader: No doctorId provided');
      return;
    }

    logInfo('BookAppointmentPreloader: Starting preload', { doctorId: this.doctorId });
    
    try {
      // Execute the most strategic preload first
      await this.preloadStrategic();
      
      // Then execute the rest in parallel
      await Promise.allSettled([
        this.preloadDoctorAvailability(),
        this.preloadAppointments()
      ]);

      logInfo('BookAppointmentPreloader: Preload complete', { doctorId: this.doctorId });
    } catch (error) {
      logError('BookAppointmentPreloader: Error during preload', { error, doctorId: this.doctorId });
      // Try fallback approach if the optimized one fails
      await this.preloadFallback();
    }
  }
  
  /**
   * Strategic batch preload for the most critical data
   * This combines doctor profile and public slots into a single API call
   */
  private async preloadStrategic(): Promise<void> {
    if (this.strategicDataFetched) return;
    
    try {
      // Create a batch payload to get multiple resources in one go
      const batchPayload = {
        doctorId: this.doctorId,
        includeProfile: true,
        includeAvailability: true,
        includeAppointments: !!this.userId,
        currentDate: new Date().toISOString().split('T')[0]
      };
      
      // Use optimized batch endpoint if available
      const response = await callApi<BatchDoctorDataResponse>('batchGetDoctorData', 
        this.userId ? { uid: this.userId, role: this.userRole } : undefined, 
        batchPayload
      );
      
      if (response.success) {
        // Cache all returned data appropriately
        if (response.doctor) {
          enhancedCache.set(
            CacheCategory.DOCTORS, 
            enhancedCache.createKey('doctor', this.doctorId), 
            response.doctor
          );
          // Also set in React Query cache
          cacheManager.setDoctorData(this.doctorId, response.doctor);
        }
        
        if (response.availability) {
          enhancedCache.set(
            CacheCategory.APPOINTMENTS, 
            enhancedCache.createKey('availability', this.doctorId), 
            response.availability
          );
        }
        
        if (response.slots) {
          // Cache slots for current date and next few days
          const date = new Date().toISOString().split('T')[0];
          enhancedCache.set(
            CacheCategory.APPOINTMENTS, 
            enhancedCache.createKey('slots', this.doctorId, date), 
            response.slots
          );
        }
        
        this.strategicDataFetched = true;
        logInfo('BookAppointmentPreloader: Strategic preload complete', { doctorId: this.doctorId });
      }
    } catch (error) {
      logError('BookAppointmentPreloader: Strategic preload failed', { error, doctorId: this.doctorId });
      // We'll fall back to individual calls
    }
  }

  /**
   * Preload doctor profile and related data
   */
  private async preloadDoctorProfile(): Promise<void> {
    if (this.strategicDataFetched) return;
    
    await prefetchApiQuery(
      'getDoctorPublicProfile',
      cacheKeys.doctor(this.doctorId),
      [{ doctorId: this.doctorId }]
    );
  }

  /**
   * Preload doctor availability
   */
  private async preloadDoctorAvailability(): Promise<void> {
    if (this.strategicDataFetched) return;
    
    const date = new Date().toISOString().split('T')[0];
    await prefetchApiQuery(
      'getAvailableSlots',
      cacheKeys.availableSlots(this.doctorId, date),
      [{ doctorId: this.doctorId, date }]
    );
    
    // Also prefetch next few days
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await prefetchApiQuery(
      'getAvailableSlots',
      cacheKeys.availableSlots(this.doctorId, tomorrowStr),
      [{ doctorId: this.doctorId, date: tomorrowStr }]
    );
  }

  /**
   * Preload appointments if user is logged in
   */
  private async preloadAppointments(): Promise<void> {
    if (!this.userId || this.strategicDataFetched) return;
    
    await prefetchApiQuery(
      'getMyAppointments',
      cacheKeys.appointments(this.userId),
      [{ uid: this.userId, role: this.userRole }]
    );
  }

  /**
   * Fallback to standard preloading if optimized approach fails
   */
  async preloadFallback(): Promise<void> {
    try {
      // Execute in sequence to avoid overwhelming the API
      await this.preloadDoctorProfile();
      await this.preloadDoctorAvailability();
      if (this.userId) {
        await this.preloadAppointments();
      }
    } catch (error) {
      logError('BookAppointmentPreloader: Fallback preload failed', { error, doctorId: this.doctorId });
    }
  }
}

/**
 * Factory method to create appropriate preloader for a page
 */
export function createPagePreloader(page: string, params: Record<string, string>, user?: { uid: string, role: UserType }): PagePreloader | null {
  switch (page) {
    case 'book-appointment':
      return new BookAppointmentPreloader(
        params.doctorId,
        user?.uid,
        user?.role
      );
    // Add more preloaders for other pages as needed
    default:
      return null;
  }
}

/**
 * Utility function to preload data for a page
 */
export async function preloadPageData(page: string, params: Record<string, string>, user?: { uid: string, role: UserType }): Promise<void> {
  const preloader = createPagePreloader(page, params, user);
  if (preloader) {
    await preloader.preloadAll();
  }
} 