'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { 
  Search, 
  MapPin, 
  Globe, 
  DollarSign, 
  Stethoscope, 
  Calendar, 
  Star,
  Loader2
} from 'lucide-react';
import { useFindDoctors } from '@/data/sharedLoaders';
import { useDebounce } from '@/lib/useDebounce';
import { logInfo, logError } from '@/lib/logger';
import { reportError } from '@/lib/errorMonitoring';

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

// Doctor Card Component
function DoctorCard({ doctor }: { doctor: Doctor }) {
  if (!doctor) {
    return <Card className="p-6 text-center">Doctor data not found</Card>
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
    profilePictureUrl
  } = doctor;
  
  return (
    <Card className="overflow-hidden" hoverable>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Doctor Image */}
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mx-auto sm:mx-0">
              {profilePictureUrl ? (
                <Image src={profilePictureUrl} alt={`Dr. ${firstName} ${lastName}`} className="w-full h-full object-cover" width={80} height={80} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <Stethoscope className="h-8 w-8" />
                </div>
              )}
            </div>
          </div>
          
          {/* Doctor Info */}
          <div className="flex-grow space-y-2 text-center sm:text-left">
            <h3 className="font-semibold text-lg">Dr. {firstName} {lastName}</h3>
            
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
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                ${consultationFee} /session
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
}

interface SearchParams {
  specialty: string;
  location: string;
  name: string;
}

export default function FindDoctorsPage() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    specialty: '',
    location: '',
    name: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync, error: apiError } = useFindDoctors();
  const hasInitialSearch = useRef(false);

  // Debounced search params
  const debouncedSearchParams = useDebounce(searchParams, 300);

  // Trigger search on initial load and whenever debounced search params change
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        console.log('Dynamic search effect fired', { specialty: debouncedSearchParams.specialty, location: debouncedSearchParams.location, name: debouncedSearchParams.name });
        // Only call the API if at least one search field is filled, or on initial load
        if (debouncedSearchParams.specialty || debouncedSearchParams.location || debouncedSearchParams.name || !hasInitialSearch.current) {
          setIsLoading(true);
          // Set flag to indicate we've done at least one search
          hasInitialSearch.current = true;
          
          const result = await mutateAsync({
            specialty: debouncedSearchParams.specialty || undefined,
            location: debouncedSearchParams.location || undefined,
            name: debouncedSearchParams.name || undefined
          });
          
          if (result?.success) {
            setDoctors(result.doctors || []);
            setError(null);
          } else {
            setDoctors([]);
            setError(result?.error || 'Failed to find doctors');
          }
        }
      } catch (err: unknown) {
        // Handle errors without triggering the infinite loop
        const errorMessage = typeof err === 'object' && err !== null && 'message' in err 
          ? String(err.message) 
          : String(err);
        
        setDoctors([]);
        setError(`Error searching for doctors: ${errorMessage}`);
        
        // Log but don't throw
        console.log('Error in doctor search:', errorMessage);
        reportError(err);
      } finally {
        setIsLoading(false);
      }
    };

    // Use a debounced function to prevent excessive API calls
    const handler = setTimeout(() => {
      fetchDoctors();
    }, 250); // Reduced from 500ms for more responsive search

    return () => {
      clearTimeout(handler);
    };
  }, [debouncedSearchParams, mutateAsync]);

  // Handle search form input changes (no direct search call)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setSearchParams(prev => {
      const updated = { ...prev, [id]: value };
      console.log('Input changed:', updated);
      return updated;
    });
  };

  const handleClear = () => {
    setSearchParams({ specialty: '', location: '', name: '' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold dark:text-white">Find Doctors</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search Filters */}
          <Card className="p-4 space-y-4">
            <h2 className="font-medium text-lg">Filter Options</h2>
            
            <div>
              <label htmlFor="specialty" className="text-sm font-medium mb-1 block">Specialty</label>
              <Input 
                id="specialty" 
                placeholder="E.g. Cardiology, Neurology..." 
                value={searchParams.specialty}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label htmlFor="location" className="text-sm font-medium mb-1 block">Location</label>
              <Input 
                id="location" 
                placeholder="City, State, or Zip Code"
                value={searchParams.location}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label htmlFor="name" className="text-sm font-medium mb-1 block">Doctor Name</label>
              <Input 
                id="name" 
                placeholder="Search by doctor name"
                value={searchParams.name}
                onChange={handleInputChange}
              />
            </div>
            
            <Button
              variant="primary"
              className="w-full flex items-center justify-center"
              onClick={() => {}}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Doctors
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              className="w-full mt-2"
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear Filters
            </Button>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Results Count and Message */}
          {!isLoading && !error && doctors && (
            <div className="mb-4">
              <h2 className="text-lg font-medium">
                {doctors.length} {doctors.length === 1 ? 'Doctor' : 'Doctors'} Available
              </h2>
              <p className="text-slate-500 text-sm">
                Showing doctors that match your criteria
              </p>
            </div>
          )}
          
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doctor: Doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
          ) : (!isLoading && !error && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center">
              <Stethoscope className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-medium mb-2">No Doctors Found</h3>
              <p className="text-slate-500 mb-4">
                Try adjusting your search filters to find more results.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 