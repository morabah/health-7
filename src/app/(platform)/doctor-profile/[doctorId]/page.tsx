'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { 
  Stethoscope, 
  MapPin, 
  Calendar, 
  Globe, 
  DollarSign, 
  Star,
  MessageSquare
} from 'lucide-react';
import { logInfo, logValidation } from '@/lib/logger';
import { useDoctorProfile } from '@/data/sharedLoaders';
import Image from 'next/image';
import type { DoctorProfile } from '@/types/schemas';

// Define the merged doctor profile type based on API response
interface DoctorPublicProfile extends Omit<DoctorProfile, 'servicesOffered' | 'educationHistory' | 'experience' | 'education'> {
  id: string;
  firstName: string;
  lastName: string;
  rating?: number;
  reviewCount?: number;
  services?: string[];
  education?: { institution: string; degree: string; year: string }[];
  reviews?: { patientName: string; date: string; rating: number; comment: string }[];
}

// API response interface
interface DoctorProfileResponse {
  success: boolean;
  doctor: DoctorPublicProfile;
}

// Sidebar doctor info card
function DoctorSidebar({ doctor, doctorId }: { doctor: DoctorPublicProfile; doctorId: string }) {
  return (
    <Card className="h-fit sticky top-4">
      <div className="p-4 flex flex-col items-center">
        {/* Doctor Image */}
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mb-4">
          {doctor.profilePictureUrl ? (
            <Image
              src={doctor.profilePictureUrl}
              alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
              fill
              className="object-cover"
              sizes="128px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500">
              <Stethoscope className="h-12 w-12" />
            </div>
          )}
        </div>
        
        {/* Doctor Basic Info */}
        <h2 className="text-xl font-semibold text-center mb-1">Dr. {doctor.firstName} {doctor.lastName}</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4 flex items-center justify-center">
          <Stethoscope className="h-4 w-4 mr-1" />
          <span>{doctor.specialty}</span>
        </p>
        
        <div className="w-full space-y-2 mb-4">
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{doctor.location || "Location not provided"}</span>
          </div>
          
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
            <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{doctor.languages ? doctor.languages.join(', ') : "Not specified"}</span>
          </div>
          
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
            <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>${doctor.consultationFee || "—"} per consultation</span>
          </div>
          
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
            <Star className="h-4 w-4 mr-2 flex-shrink-0 text-yellow-500" />
            <span>{doctor.rating || "—"} ({doctor.reviewCount || 0} reviews)</span>
          </div>
        </div>
        
        {/* Book Appointment Button */}
        <Link href={`/book-appointment/${doctorId}`} className="w-full">
          <Button variant="primary" className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default function DoctorProfilePage() {
  const params = useParams();
  const doctorId = params?.doctorId as string;
  const { data, isLoading, error } = useDoctorProfile(doctorId) as {
    data: DoctorProfileResponse | undefined;
    isLoading: boolean;
    error: unknown;
  };
  const doctor = data?.success ? data.doctor as DoctorPublicProfile : null;
  
  useEffect(() => {
    logInfo('doctor-profile rendered (with real data)', { doctorId });
    
    if (doctor) {
      // Log validation that we're successfully loading data
      try {
        logValidation('4.10', 'success', 'Doctor profile connected to real data via local API.');
      } catch (e) {
        console.error('Could not log validation', e);
      }
    }
  }, [doctorId, doctor]);
  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Spinner className="h-8 w-8 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading doctor profile...</p>
      </div>
    );
  }
  
  if (error || !data?.success) {
    const errorMessage = error instanceof Error ? error.message : 'Error loading doctor profile';
    return (
      <div className="text-center py-12">
        <p className="text-danger">{errorMessage}</p>
      </div>
    );
  }
  
  if (!doctor) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Doctor not found</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold dark:text-white">Doctor Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <DoctorSidebar doctor={doctor} doctorId={doctorId} />
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <Tab.Group>
              <Tab.List className="flex border-b border-slate-200 dark:border-slate-700">
                <Tab className={({ selected }) => 
                  `py-3 px-4 text-sm font-medium outline-none transition-colors duration-200 ease-in-out ${
                    selected 
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`
                }>
                  Biography
                </Tab>
                <Tab className={({ selected }) => 
                  `py-3 px-4 text-sm font-medium outline-none transition-colors duration-200 ease-in-out ${
                    selected 
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`
                }>
                  Education
                </Tab>
                <Tab className={({ selected }) => 
                  `py-3 px-4 text-sm font-medium outline-none transition-colors duration-200 ease-in-out ${
                    selected 
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`
                }>
                  Services
                </Tab>
              </Tab.List>
              
              <Tab.Panels className="p-4">
                <Tab.Panel>
                  <div className="prose dark:prose-invert max-w-none">
                    {doctor.bio ? (
                      <p>{doctor.bio}</p>
                    ) : (
                      <p className="text-slate-500">No biography information provided.</p>
                    )}
                  </div>
                </Tab.Panel>
                <Tab.Panel>
                  <div className="space-y-4">
                    {doctor.education && Array.isArray(doctor.education) && doctor.education.length > 0 ? (
                      doctor.education.map((edu, index: number) => (
                        <div key={index} className="border-b border-slate-200 dark:border-slate-700 pb-3 last:border-0">
                          <h3 className="font-medium">{edu.degree}</h3>
                          <p className="text-sm text-slate-500">{edu.institution}, {edu.year}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500">No education history provided.</p>
                    )}
                  </div>
                </Tab.Panel>
                <Tab.Panel>
                  <div className="space-y-2">
                    {doctor.services && doctor.services.length > 0 ? (
                      doctor.services.map((service: string, index: number) => (
                        <div key={index} className="p-2 border rounded-md border-slate-200 dark:border-slate-700">
                          {service}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500">No services information provided.</p>
                    )}
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </Card>
          
          {/* Reviews Section */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                <h2 className="text-lg font-medium">Patient Reviews</h2>
              </div>
              <Badge variant="success" className="flex items-center">
                <Star className="h-3.5 w-3.5 mr-1 text-yellow-500" />
                {doctor.rating || "—"}
              </Badge>
            </div>
            {doctor.reviews && doctor.reviews.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {doctor.reviews.map((review, index: number) => (
                  <div key={index} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{review.patientName}</p>
                        <p className="text-xs text-slate-500">{review.date}</p>
                      </div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-600'
                            }`}
                            fill={i < review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                No reviews yet
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 