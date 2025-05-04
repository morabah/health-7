'use client';

import React from 'react';
import { UserType } from '@/types/enums';

interface DoctorItemProps {
  doctor: {
    userId: string;
    firstName?: string;
    lastName?: string;
    specialty?: string;
    yearsOfExperience?: number;
    verificationStatus?: string;
    rating?: number;
    profilePictureUrl?: string | null;
  };
}

/**
 * Displays a single doctor card with information
 */
export default function DoctorItem({ doctor }: DoctorItemProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
          {doctor.profilePictureUrl ? (
            <img 
              src={doctor.profilePictureUrl} 
              alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg text-gray-500 dark:text-gray-300">
              {doctor.firstName?.charAt(0) || ''}
              {doctor.lastName?.charAt(0) || ''}
            </span>
          )}
        </div>
        
        <div className="ml-4 flex-1">
          <h3 className="font-semibold text-lg">
            Dr. {doctor.firstName} {doctor.lastName}
          </h3>
          
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {doctor.specialty}
            {doctor.yearsOfExperience && (
              <span className="ml-2">
                • {doctor.yearsOfExperience} {doctor.yearsOfExperience === 1 ? 'year' : 'years'} experience
              </span>
            )}
          </div>
          
          {doctor.rating && (
            <div className="flex items-center mt-1">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg 
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(doctor.rating || 0) 
                        ? 'text-yellow-400' 
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1 text-sm text-gray-600 dark:text-gray-300">
                  {doctor.rating.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {doctor.verificationStatus && (
          <div className={`text-xs px-2 py-1 rounded-full ${
            doctor.verificationStatus === 'VERIFIED' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : doctor.verificationStatus === 'PENDING' 
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {doctor.verificationStatus.charAt(0) + doctor.verificationStatus.slice(1).toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
} 