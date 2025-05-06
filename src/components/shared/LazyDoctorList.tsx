'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { lazyLoad } from '@/lib/lazyLoadUtils';
import { useBatchDoctorData } from '@/data/doctorLoaders';
import { useApiQuery } from '@/lib/enhancedApiClient';
import { cacheKeys } from '@/lib/queryClient';
import { trackPerformance } from '@/lib/performance';

// Custom loading component for doctor list
const DoctorListLoading = () => (
  <div className="space-y-4 p-4">
    <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse w-1/4 mb-6"></div>
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse w-1/3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-1/4"></div>
          </div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-full"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/4"></div>
      </div>
    ))}
  </div>
);

// Lazy loaded DoctorItem component
const DoctorItem = lazyLoad(
  () => import('./DoctorItem'),
  { loadingComponent: <div className="border rounded-lg p-4 animate-pulse h-32"></div> }
);

// Lazy loaded filter component 
const DoctorFilters = lazyLoad(
  () => import('./DoctorFilters'),
  { loadingComponent: <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-4"></div> }
);

// Define response type for findDoctors API
interface FindDoctorsResponse {
  success: boolean;
  doctors: Array<{
    userId: string;
    firstName?: string;
    lastName?: string;
    specialty?: string;
    yearsOfExperience?: number;
    verificationStatus?: string;
    rating?: number;
    profilePictureUrl?: string | null;
  }>;
}

/**
 * Lazy loaded doctor list component that optimizes data loading using batch fetch
 */
export default function LazyDoctorList() {
  const perfTracker = trackPerformance('LazyDoctorList');
  const [filters, setFilters] = useState({
    specialty: '',
    name: '',
    status: ''
  });
  
  // Use traditional API for filtered results
  const { 
    data: filteredData, 
    isLoading: isFilteredLoading, 
    error: filteredError 
  } = useApiQuery<FindDoctorsResponse, Error>(
    'findDoctors',
    cacheKeys.doctors(filters),
    [filters],
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      placeholderData: prevData => prevData, // Use previous data while loading
      enabled: Object.values(filters).some(value => !!value) // Only run query if filters are applied
    }
  );
  
  // Get all doctors if no filters are applied
  const { 
    data: allDoctorsData, 
    isLoading: isAllDoctorsLoading,
    error: allDoctorsError
  } = useApiQuery<FindDoctorsResponse, Error>(
    'findDoctors',
    cacheKeys.doctors({}),
    [{}],
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !Object.values(filters).some(value => !!value) // Only run if no filters are applied
    }
  );
  
  // Determine which data source to use based on filters
  const data = Object.values(filters).some(value => !!value) ? filteredData : allDoctorsData;
  const isLoading = Object.values(filters).some(value => !!value) ? isFilteredLoading : isAllDoctorsLoading;
  const error = Object.values(filters).some(value => !!value) ? filteredError : allDoctorsError;
  
  // Extract doctor IDs for batch loading
  const doctorIds = useMemo(() => {
    if (!data?.success || !data.doctors) return [];
    return data.doctors.map(doctor => doctor.userId);
  }, [data]);
  
  // Use batch doctor data loading for additional details
  const { 
    data: batchData,
    isLoading: isBatchLoading
  } = useBatchDoctorData(doctorIds, { 
    enabled: doctorIds.length > 0 
  });
  
  // Prepare enhanced doctor data with batch details
  const enhancedDoctors = useMemo(() => {
    if (!data?.success || !data.doctors) return [];
    
    return data.doctors.map(doctor => {
      // Lookup additional data from batch results if available
      const batchDoctor = batchData?.success && batchData.doctors[doctor.userId];
      
      // Merge the data, preferring batch data when available
      return {
        ...doctor,
        ...(batchDoctor || {})
      };
    });
  }, [data, batchData]);
  
  // Track component performance
  useEffect(() => {
    // Stop performance tracking when component unmounts
    return () => {
      perfTracker.stop();
    };
  }, []);
  
  // Prefetch individual doctor details when hovering
  const prefetchDoctorDetails = (doctorId: string) => {
    // Already prefetched via batch loading
    console.log(`Doctor ${doctorId} data already batch loaded`);
  };
  
  if ((isLoading && !data) || (doctorIds.length > 0 && isBatchLoading && !batchData)) {
    return <DoctorListLoading />;
  }
  
  if (error) {
    return <div className="text-red-500 p-4">Error loading doctors: {error.message}</div>;
  }
  
  const doctors = enhancedDoctors || [];
  
  return (
    <div className="space-y-4">
      <DoctorFilters filters={filters} onFilterChange={setFilters} />
      
      <h2 className="text-xl font-semibold mb-4">Available Doctors</h2>
      
      {doctors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No doctors found matching your criteria
        </div>
      ) : (
        <div className="space-y-4">
          {doctors.map((doctor) => (
            <div 
              key={doctor.userId}
              onMouseEnter={() => prefetchDoctorDetails(doctor.userId)}
            >
              <DoctorItem doctor={doctor} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 