'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
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
import { logInfo, logError } from '@/lib/logger';

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

interface FindDoctorsResult {
  success: boolean;
  doctors?: Doctor[];
  error?: string;
}

export default function FindDoctorsPage() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    specialty: '',
    location: '',
    name: ''
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const findDoctorsMutation = useFindDoctors();
  
  // Handle search form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setSearchParams((prev: SearchParams) => ({
      ...prev,
      [id]: value
    }));
  };
  
  // Handle search submission
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const result = await findDoctorsMutation.mutateAsync({
        specialty: searchParams.specialty || undefined,
        location: searchParams.location || undefined,
        name: searchParams.name || undefined
      }) as FindDoctorsResult;
      
      if (result.success && result.doctors) {
        setDoctors(result.doctors);
        logInfo('Doctors found', { count: result.doctors.length });
      } else {
        setDoctors([]);
        logError('Failed to find doctors', { error: result.error });
      }
    } catch (error) {
      logError('Error searching for doctors', error);
      setDoctors([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Load all doctors once on initial mount
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      setIsSearching(true);
      try {
        const result = await findDoctorsMutation.mutateAsync({}) as FindDoctorsResult;
        if (result.success && result.doctors) {
          setDoctors(result.doctors);
          logInfo('Initial doctors loaded', { count: result.doctors.length });
        }
      } catch (error) {
        logError('Error loading initial doctors', error);
      } finally {
        setIsSearching(false);
      }
    })();
  }, []);
  
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
              className="w-full"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </Card>
          
          {/* Search Tips */}
          <Card className="p-4">
            <h3 className="font-medium mb-2">Search Tips</h3>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <li>• Use precise specialty names for better results</li>
              <li>• Filter by location for nearby doctors</li>
              <li>• Search by doctor name if you know who you&apos;re looking for</li>
              <li>• Check doctor profiles for detailed information</li>
            </ul>
          </Card>
        </div>
        
        {/* Search Results */}
        <div className="lg:col-span-3 space-y-4">
          {isSearching ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="animate-spin h-8 w-8 text-primary mr-2" />
              <span className="text-slate-600 dark:text-slate-300">Searching for doctors...</span>
            </div>
          ) : doctors.length > 0 ? (
            <>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing {doctors.length} {doctors.length === 1 ? 'doctor' : 'doctors'}
              </div>
              
              <div className="space-y-4">
                {doctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            </>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-slate-600 dark:text-slate-300 mb-2">No doctors found matching your search criteria.</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">We&apos;ll never share your information.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 