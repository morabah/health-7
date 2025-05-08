'use client';

/**
 * Enhanced Doctor Search Hook
 * 
 * Uses batch API calls to efficiently search and fetch doctor data
 * with optimized performance and reduced network requests.
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { executeBatchOperations, createBatchOperation } from '@/lib/batchApiUtils';
import { callApi } from '@/lib/apiClient';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { useAuth } from '@/context/AuthContext';
import type { DoctorProfile } from '@/types/schemas';

interface DoctorSearchParams {
  // Search parameters
  specialty?: string;
  location?: string;
  name?: string;
  availableDate?: string;
  limit?: number;
  
  // Configuration options
  includeFetchAvailability?: boolean;
  preloadProfiles?: boolean;
  numAvailabilityDays?: number;
}

interface DoctorSearchResponse {
  success: boolean;
  doctors: Array<{
    id: string;
    userId?: string;
    firstName?: string;
    lastName?: string;
    specialty?: string;
    [key: string]: any;
  }>;
  error?: string;
}

/**
 * Enhanced doctor search hook that uses batch API operations
 * to efficiently fetch doctor data and availability
 */
export function useEnhancedDoctorSearch(params: DoctorSearchParams = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [doctorIds, setDoctorIds] = useState<string[]>([]);
  
  // Fetch search results first
  const searchResults = useQuery({
    queryKey: ['doctors', 'search', params],
    queryFn: async () => {
      const perf = trackPerformance('doctorSearch');
      
      try {
        // First, just get the search results with minimal data
        const results = await callApi('findDoctors', {
          specialty: params.specialty || '',
          location: params.location || '',
          name: params.name || '',
          availableDate: params.availableDate || '',
          limit: params.limit || 10,
          // Only fetch minimal data in the initial search
          minimalData: true
        }) as DoctorSearchResponse;
        
        perf.mark('search-complete');
        
        if (results.success && Array.isArray(results.doctors)) {
          // Extract doctor IDs for batch fetching
          const ids = results.doctors.map(doc => doc.id || doc.userId || '').filter(id => id);
          setDoctorIds(ids);
          
          logInfo('Doctor search completed', {
            count: ids.length,
            searchParams: params
          });
        }
        
        perf.stop();
        return results;
      } catch (error) {
        perf.stop();
        logError('Doctor search failed', { error, params });
        throw error;
      }
    },
    enabled: true,
    staleTime: 30000 // 30 seconds
  });
  
  // Then batch fetch detailed doctor data and availability if needed
  const batchResults = useQuery({
    queryKey: ['doctors', 'batch', doctorIds, params.includeFetchAvailability, params.numAvailabilityDays],
    queryFn: async () => {
      if (!doctorIds.length) return { success: true, doctors: {} };
      
      const perf = trackPerformance('doctorBatchFetch');
      
      try {
        // Create operations array for batch request
        const operations = [];
        
        // Get detailed profiles for all doctors
        operations.push(
          createBatchOperation('batchGetDoctorsData', { doctorIds }, 'doctorProfiles')
        );
        
        // If availability is needed, fetch it for each doctor
        if (params.includeFetchAvailability && params.availableDate) {
          // Get availability for each doctor individually
          doctorIds.forEach(doctorId => {
            operations.push(
              createBatchOperation('batchGetDoctorData', {
                doctorId,
                includeProfile: false, // Already fetching in bulk above
                includeAvailability: true,
                includeAppointments: false,
                currentDate: params.availableDate,
                numDays: params.numAvailabilityDays || 7
              }, `availability-${doctorId}`)
            );
          });
        }
        
        // Execute the batch request
        const result = await executeBatchOperations(operations, user ? { 
          uid: user.uid, 
          role: user.role 
        } : undefined);
        
        perf.stop();
        return result as Record<string, any>;
      } catch (error) {
        perf.stop();
        logError('Doctor batch fetch failed', { error, doctorIds });
        throw error;
      }
    },
    enabled: doctorIds.length > 0 && (params.preloadProfiles || params.includeFetchAvailability),
    staleTime: 60000 // 1 minute
  });
  
  // Merge search results with batch data
  const combinedData = useQuery({
    queryKey: ['doctors', 'combined', searchResults.data, batchResults.data],
    queryFn: () => {
      if (!searchResults.data?.success) {
        return searchResults.data || { success: false, doctors: [] };
      }
      
      const combined = {
        ...searchResults.data,
        doctors: [...(searchResults.data.doctors || [])]
      };
      
      // If we have batch data, enhance the doctor objects
      if (batchResults.data?.doctorProfiles?.success) {
        const doctorProfiles = batchResults.data.doctorProfiles.doctors || {};
        
        // Replace minimal doctor data with full profiles
        combined.doctors = combined.doctors.map((doc: any) => {
          const id = doc.id || doc.userId;
          const fullProfile = doctorProfiles[id];
          
          if (fullProfile) {
            return {
              ...doc,
              ...fullProfile,
              // Add availability data if available
              availability: params.includeFetchAvailability && batchResults.data[`availability-${id}`]
                ? batchResults.data[`availability-${id}`].availability 
                : undefined,
              slots: params.includeFetchAvailability && params.availableDate && batchResults.data[`availability-${id}`]
                ? batchResults.data[`availability-${id}`].slots
                : undefined
            };
          }
          
          return doc;
        });
      }
      
      return combined;
    },
    enabled: searchResults.isSuccess,
    staleTime: 30000 // 30 seconds
  });
  
  // Update cache for individual doctor profiles
  useEffect(() => {
    if (batchResults.data?.doctorProfiles?.success && batchResults.data.doctorProfiles.doctors) {
      const doctors = batchResults.data.doctorProfiles.doctors;
      
      Object.entries(doctors).forEach(([doctorId, profile]) => {
        queryClient.setQueryData(['doctor', doctorId], { 
          success: true, 
          doctor: profile 
        });
      });
      
      logInfo('Updated doctor profile cache', { 
        count: Object.keys(doctors).length 
      });
    }
  }, [batchResults.data, queryClient]);
  
  return {
    data: combinedData.data,
    isLoading: searchResults.isLoading || batchResults.isLoading || combinedData.isLoading,
    isFetching: searchResults.isFetching || batchResults.isFetching || combinedData.isFetching,
    error: combinedData.error || batchResults.error || searchResults.error,
    doctorIds
  };
} 