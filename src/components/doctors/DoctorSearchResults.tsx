import React, { useMemo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { MapPin, Globe, DollarSign, Stethoscope, Calendar, Star } from 'lucide-react';
import { useApiQuery, prefetchApiQuery } from '@/lib/enhancedApiClient';
import { cacheKeys } from '@/lib/queryClient';
import { useBatchDoctorData } from '@/data/doctorLoaders';
import { trackPerformance } from '@/lib/performance';
import { logInfo, logError } from '@/lib/logger';
import { getCachedDoctorSearchResults, cacheDoctorSearchResults, prefetchDoctorProfiles } from '@/lib/doctorCacheUtils';

// Dynamically import the VirtualizedList component to reduce initial load time
const VirtualizedList = dynamic(() => import('@/components/ui/VirtualizedList'), {
  ssr: false,
  loading: () => <div className="py-4"><Spinner /></div>
});

// Define interface for doctor data
interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  location?: string;
  languages?: string[];
  yearsOfExperience?: number;
  consultationFee?: number;
  rating?: number;
  profilePictureUrl?: string;
}

// Define interface for doctor profile data
interface DoctorProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  education?: string[];
  experience?: string[];
  bio?: string;
  services?: string[];
  languages?: string[];
  consultationFee?: number;
}

// Define interface for available slots data
interface AvailableSlot {
  id: string;
  doctorId: string;
  date: string;
  time: string;
  isAvailable: boolean;
}

// Define response type for API calls
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Define response type for findDoctors API
interface FindDoctorsResponse {
  success: boolean;
  doctors: Doctor[];
  error?: string;
}

// Define search parameters interface
interface DoctorSearchParams extends Record<string, unknown> {
  specialty?: string;
  location?: string;
  name?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

interface DoctorSearchResultsProps {
  searchParams: DoctorSearchParams;
  className?: string;
}

// Doctor Card Component with memo to prevent unnecessary re-renders
const DoctorCard = React.memo(({ doctor }: { doctor: Doctor }) => {
  // Prefetch doctor profile data on hover to improve perceived speed
  const handleMouseEnter = () => {
    prefetchApiQuery<ApiResponse<DoctorProfile>>(
      'getDoctorPublicProfile',
      cacheKeys.doctor(doctor.id),
      [{ doctorId: doctor.id }]
    );

    // Also prefetch first page of available slots for current date
    const currentDate = new Date().toISOString().split('T')[0];
    prefetchApiQuery<ApiResponse<AvailableSlot[]>>(
      'getAvailableSlots',
      cacheKeys.availableSlots(doctor.id, currentDate),
      [{ doctorId: doctor.id, date: currentDate }]
    );
  };

  if (!doctor) {
    return <Card className="p-6 text-center">Doctor data not found</Card>;
  }

  const {
    id,
    firstName,
    lastName,
    specialty,
    location,
    languages = [],
    yearsOfExperience = 0,
    consultationFee = 100,
    rating = 4.5,
    profilePictureUrl,
  } = doctor;

  return (
    <Card className="overflow-hidden" hoverable onMouseEnter={handleMouseEnter}>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Doctor Image */}
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mx-auto sm:mx-0">
              {profilePictureUrl ? (
                <Image
                  src={profilePictureUrl}
                  alt={`Dr. ${firstName} ${lastName}`}
                  className="w-full h-full object-cover"
                  width={80}
                  height={80}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <Stethoscope className="h-8 w-8" />
                </div>
              )}
            </div>
          </div>

          {/* Doctor Info */}
          <div className="flex-grow space-y-2 text-center sm:text-left">
            <h3 className="font-semibold text-lg">
              Dr. {firstName} {lastName}
            </h3>

            <p className="text-slate-600 dark:text-slate-300 flex items-center justify-center sm:justify-start">
              <Stethoscope className="h-4 w-4 mr-1" />
              <span>{specialty || 'Specialist'}</span>
            </p>

            <div className="flex items-center space-x-2 justify-center sm:justify-start">
              <Badge variant="success" className="flex items-center">
                <Star className="h-3 w-3 mr-1" />
                {rating}
              </Badge>
              <Badge variant="info">{yearsOfExperience} yrs exp</Badge>
            </div>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {location && (
                <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  {location}
                </span>
              )}
              {languages && languages.length > 0 && (
                <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center">
                  <Globe className="h-3.5 w-3.5 mr-1" />
                  {languages.join(', ')}
                </span>
              )}
              <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center">
                <DollarSign className="h-3.5 w-3.5 mr-1" />${consultationFee} /session
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Link href={`/doctor-profile/${id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Stethoscope className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </Link>
          <Link href={`/book-appointment/${id}`} className="flex-1">
            <Button variant="primary" className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
});

DoctorCard.displayName = 'DoctorCard';

const DoctorSearchResults: React.FC<DoctorSearchResultsProps> = ({
  searchParams,
  className = '',
}) => {
  const perfTracker = useMemo(() => trackPerformance('DoctorSearchResults'), []);
  const hasLoggedPerformance = useRef(false);

  // Check for cached search results first for immediate display
  const cachedResults = useMemo(() => {
    return getCachedDoctorSearchResults(searchParams);
  }, [searchParams]);

  // Use enhanced API client with React Query integration
  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
  } = useApiQuery<FindDoctorsResponse, Error>(
    'findDoctors',
    cacheKeys.doctors(searchParams),
    [searchParams],
    {
      staleTime: 5 * 60 * 1000, // 5 minutes - longer stale time for search results
      retry: 1, // Only retry once for faster feedback
      retryDelay: 1000, // 1 second between retries
      // Use cached data if available for immediate rendering
      initialData: cachedResults ? { 
        success: true, 
        doctors: cachedResults.doctors 
      } : undefined
    }
  );

  // Extract doctor IDs for batch loading
  const doctorIds = useMemo(() => {
    if (!searchData?.success || !searchData.doctors) return [];
    return searchData.doctors.map(doctor => doctor.id);
  }, [searchData]);

  // Batch load additional doctor details
  const { data: batchData, isLoading: isBatchLoading } = useBatchDoctorData(doctorIds, {
    enabled: doctorIds.length > 0,
    // Note: staleTime would be useful here but is not supported in the current interface
  });

  // Create enhanced doctor data by merging search results with batch data
  const doctors = useMemo(() => {
    if (!searchData?.success || !searchData.doctors) return [];

    // Early exit if no search data to avoid unnecessary processing
    if (searchData.doctors.length === 0) return [];

    // Extract batch doctor data once outside the map function
    const batchDoctors = batchData?.success ? batchData.doctors : {};

    return searchData.doctors.map(doctor => {
      // Find additional data from batch results if available
      const batchDoctor = batchDoctors[doctor.id];

      // Merge the data, preferring search result data when there's a conflict
      return {
        ...(batchDoctor || {}),
        ...doctor, // Ensure original doctor data takes precedence
      };
    });
  }, [searchData, batchData]);

  // Determine overall loading state - memoize to prevent recalculation on every render
  const isLoading = useMemo(() => {
    return isSearchLoading || (doctorIds.length > 0 && isBatchLoading && !batchData);
  }, [isSearchLoading, doctorIds.length, isBatchLoading, batchData]);

  const error = searchError;

  // Memoized Results Count Message
  const resultsCountMessage = useMemo(() => {
    if (!isLoading && !error && doctors) {
      return (
        <div className="mb-4">
          <h2 className="text-lg font-medium">
            {doctors.length} {doctors.length === 1 ? 'Doctor' : 'Doctors'} Available
          </h2>
          <p className="text-slate-500 text-sm">Showing doctors that match your criteria</p>
        </div>
      );
    }
    return null;
  }, [isLoading, error, doctors?.length]);

  // Track if we should use virtualization (for larger datasets)
  const shouldUseVirtualization = useMemo(() => {
    return doctors.length > 10; // Use virtualization for more than 10 doctors
  }, [doctors.length]);
  
  // Log performance metrics for large datasets
  useEffect(() => {
    if (doctors.length > 20) {
      logInfo('DoctorSearchResults performance', {
        totalDoctors: doctors.length,
        isVirtualized: shouldUseVirtualization,
        renderTime: perfTracker.getElapsedTime()
      });
    }
  }, [doctors.length, shouldUseVirtualization, perfTracker]);
  
  // Memoized Doctor Cards (used when not virtualizing)
  const doctorCards = useMemo(() => {
    if (shouldUseVirtualization) return null;
    return doctors.map(doctor => (
      <DoctorCard key={doctor.id} doctor={doctor} />
    ));
  }, [doctors, shouldUseVirtualization]);

  // Memoized No Doctors Message
  const noDoctorsMessage = useMemo(() => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center">
      <Stethoscope className="h-12 w-12 mx-auto mb-4 text-slate-400" />
      <h3 className="text-lg font-medium mb-2">No Doctors Found</h3>
      <p className="text-slate-500 mb-4">
        Try adjusting your search filters to find more results.
      </p>
      <Button variant="outline">Clear Filters</Button>
    </div>
  ), []);

  // Cache search results for future use
  useEffect(() => {
    if (searchData?.success && searchData?.doctors?.length > 0) {
      cacheDoctorSearchResults(searchParams, searchData.doctors, searchData.doctors.length);
      // Prefetch doctor profiles for better UX
      prefetchDoctorProfiles(searchData.doctors);
    }
  }, [searchData, searchParams]);

  // Optimize performance tracking to avoid unnecessary effect runs
  React.useEffect(() => {
    if (doctors.length > 0 && !hasLoggedPerformance.current) {
      perfTracker.stop();
      hasLoggedPerformance.current = true;
    }
  }, [doctors.length, perfTracker]);

  return (
    <div className={className}>
      {/* Results Count and Message */}
      {resultsCountMessage}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center h-60">
          <Spinner className="w-8 h-8 mb-4" />
          <p className="text-slate-500">Searching for doctors...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="error" className="my-4">
          Error loading doctors: {error instanceof Error ? error.message : String(error)}
        </Alert>
      )}

      {/* Doctor Cards */}
      {!isLoading && !error && doctors && doctors.length > 0 ? (
        shouldUseVirtualization ? (
          // Virtualized list for better performance with many doctors
          <div style={{ height: doctors.length > 10 ? '800px' : 'auto' }}>
            <VirtualizedList
              items={doctors}
              itemSize={220} // Height of each doctor card in pixels
              height={doctors.length > 10 ? 800 : doctors.length * 220}
              renderItem={(item, index, style) => {
                const doctor = item as Doctor;
                return (
                  <div style={style} className="px-2 py-2">
                    <DoctorCard key={doctor.id} doctor={doctor} />
                  </div>
                );
              }}
              overscanCount={3}
              onItemsRendered={({ visibleStartIndex, visibleStopIndex }) => {
                logInfo('DoctorSearchVirtualized performance', {
                  visibleItems: visibleStopIndex - visibleStartIndex + 1,
                  totalItems: doctors.length
                });
              }}
            />
          </div>
        ) : (
          // Regular grid for smaller lists
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctorCards}
          </div>
        )
      ) : (
        !isLoading &&
        !error && noDoctorsMessage
      )}
    </div>
  );
};

export default DoctorSearchResults;
