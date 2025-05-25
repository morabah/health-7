'use client';

import React from 'react';
import Image from 'next/image';
import { Star, MapPin, Clock, Heart, Award } from 'lucide-react';
import Card from '@/components/ui/Card';
import { DoctorProfileHeaderProps } from '@/types/booking/booking.types';

/**
 * DoctorProfileHeader Component
 * 
 * Displays doctor information including photo, name, specialty, ratings, and experience.
 * Extracted from the monolithic BookAppointmentPage for better maintainability.
 */
export default function DoctorProfileHeader({
  doctor,
  isLoading,
  error
}: DoctorProfileHeaderProps) {
  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      </Card>
    );
  }

  if (isLoading || !doctor) {
    return (
      <Card className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
        {/* Header gradient skeleton */}
        <div className="h-16 bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/20 dark:to-slate-700 animate-pulse"></div>
        
        <div className="p-6 flex flex-col md:flex-row gap-6">
          {/* Profile picture skeleton */}
          <div className="w-32 h-32 md:w-48 md:h-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
          
          {/* Doctor info skeleton */}
          <div className="flex-1 space-y-4">
            <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : i < rating
            ? 'fill-yellow-400/50 text-yellow-400'
            : 'text-slate-300 dark:text-slate-600'
        }`}
      />
    ));
  };

  return (
    <Card className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
      {/* Header with gradient */}
      <div className="h-16 bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/20 dark:to-slate-700 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-white/30 dark:via-slate-800/10 dark:to-slate-800/30"></div>
      </div>

      <div className="p-6 -mt-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <div className="relative">
              <Image
                src={doctor.profilePictureUrl || '/images/default-doctor.jpg'}
                alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                width={192}
                height={192}
                className="w-32 h-32 md:w-48 md:h-48 rounded-xl object-cover border-4 border-white dark:border-slate-800 shadow-lg"
                priority
              />
              {/* Verification badge */}
              <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg">
                <Award className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Doctor Information */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Dr. {doctor.firstName} {doctor.lastName}
              </h1>
              
              {doctor.specialty && (
                <p className="text-lg text-primary font-medium mb-2">
                  {doctor.specialty}
                </p>
              )}

              {/* Rating */}
              {doctor.rating && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {renderStars(doctor.rating)}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {doctor.rating}
                  </span>
                  {doctor.reviewCount && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      ({doctor.reviewCount} reviews)
                    </span>
                  )}
                </div>
              )}

              {/* Location */}
              {doctor.location && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-3">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{doctor.location}</span>
                </div>
              )}
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {doctor.experience && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                  <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {doctor.experience.length}+ Years
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Experience
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                <Heart className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {doctor.reviewCount || 0}+
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Patients
                </div>
              </div>

              {doctor.consultationFee && (
                <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-3 text-center">
                  <div className="text-sm font-semibold text-primary">
                    ${doctor.consultationFee}
                  </div>
                  <div className="text-xs text-primary/80">
                    Consultation
                  </div>
                </div>
              )}
            </div>

            {/* Services offered */}
            {doctor.servicesOffered && doctor.servicesOffered.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Services Offered:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {doctor.servicesOffered.slice(0, 4).map((service, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {service}
                    </span>
                  ))}
                  {doctor.servicesOffered.length > 4 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                      +{doctor.servicesOffered.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Education highlights */}
            {doctor.educationHistory && doctor.educationHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Education:
                </h3>
                <div className="space-y-1">
                  {doctor.educationHistory.slice(0, 2).map((education, index) => (
                    <div key={index} className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium">{education.degree}</span>
                      <span className="text-slate-500 dark:text-slate-500">
                        , {education.institution} ({education.year})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
} 