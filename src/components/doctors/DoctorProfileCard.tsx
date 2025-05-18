'use client';

import React, { useState, useEffect } from 'react';
import { trackPerformance } from '@/lib/performance';
import { logInfo } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  availability: string[];
  imageUrl?: string;
  bio?: string;
  location?: string;
  education?: string[];
  languages?: string[];
}

interface DoctorProfileCardProps {
  doctorId: string;
  isDetailed?: boolean;
}

const DoctorProfileCard: React.FC<DoctorProfileCardProps> = ({ 
  doctorId,
  isDetailed = false
}) => {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const perfTracker = trackPerformance('DoctorProfileCard_Load');
    
    setLoading(true);
    setError(null);
    
    // Simulate fetching doctor data
    // In a real implementation, this would be a call to your API
    setTimeout(() => {
      try {
        // Mock data for demonstration
        setDoctor({
          id: doctorId,
          name: 'Dr. Jane Smith',
          specialty: 'Cardiologist',
          rating: 4.8,
          reviewCount: 124,
          availability: ['Mon', 'Wed', 'Fri'],
          imageUrl: 'https://randomuser.me/api/portraits/women/76.jpg',
          bio: 'Board-certified cardiologist with over 15 years of experience in treating heart conditions.',
          location: 'Medical Center, Floor 3, Room 302',
          education: ['Harvard Medical School', 'Johns Hopkins Residency'],
          languages: ['English', 'Spanish']
        });
        setLoading(false);
        perfTracker.stop();
        logInfo('Doctor profile loaded', { doctorId });
      } catch (err) {
        setError('Failed to load doctor profile');
        setLoading(false);
        perfTracker.stop();
        logInfo('Error loading doctor profile', { doctorId, error: err });
      }
    }, 500);
  }, [doctorId]);

  const handleBookAppointment = () => {
    router.push(`/book-appointment/${doctorId}`);
  };

  const handleViewProfile = () => {
    router.push(`/doctor/${doctorId}`);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="rounded-lg border border-red-200 p-4 shadow-sm bg-red-50">
        <p className="text-red-500">{error || 'Doctor not found'}</p>
      </div>
    );
  }

  // Basic card for search results
  if (!isDetailed) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          <div className="relative h-16 w-16 flex-shrink-0">
            {doctor.imageUrl ? (
              <Image
                src={doctor.imageUrl}
                alt={doctor.name}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 text-xl">{doctor.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">{doctor.name}</h3>
            <p className="text-sm text-gray-500">{doctor.specialty}</p>
            <div className="flex items-center mt-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg 
                    key={i} 
                    className={`h-4 w-4 ${i < Math.floor(doctor.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1 text-sm text-gray-500">{doctor.rating} ({doctor.reviewCount})</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleViewProfile}
            className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            View Profile
          </button>
        </div>
      </div>
    );
  }

  // Detailed card for doctor profile page
  return (
    <div className="rounded-lg border border-gray-200 p-6 shadow-md">
      <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
        <div className="relative h-32 w-32 flex-shrink-0 mx-auto md:mx-0 mb-4 md:mb-0">
          {doctor.imageUrl ? (
            <Image
              src={doctor.imageUrl}
              alt={doctor.name}
              fill
              className="rounded-full object-cover"
            />
          ) : (
            <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-3xl">{doctor.name.charAt(0)}</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-gray-900">{doctor.name}</h2>
          <p className="text-lg text-gray-600 mb-2">{doctor.specialty}</p>
          
          <div className="flex items-center justify-center md:justify-start mb-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg 
                  key={i} 
                  className={`h-5 w-5 ${i < Math.floor(doctor.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-2 text-gray-600">{doctor.rating} ({doctor.reviewCount} reviews)</span>
            </div>
          </div>
          
          {doctor.bio && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">About</h3>
              <p className="text-gray-700">{doctor.bio}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {doctor.location && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Location</h3>
                <p className="mt-1 text-gray-700">{doctor.location}</p>
              </div>
            )}
            
            {doctor.languages && doctor.languages.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Languages</h3>
                <p className="mt-1 text-gray-700">{doctor.languages.join(', ')}</p>
              </div>
            )}
            
            {doctor.education && doctor.education.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500">Education</h3>
                <ul className="mt-1 list-disc list-inside text-gray-700">
                  {doctor.education.map((edu, index) => (
                    <li key={index}>{edu}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-start space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleBookAppointment}
              className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Book Appointment
            </button>
            <button
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileCard;
