'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Edit, AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ProfileSummaryProps } from '@/types/dashboard/dashboard.types';

/**
 * ProfileSummary Component
 * 
 * Displays user profile information including name, email, phone, and profile picture.
 * Provides quick edit access and handles loading/error states.
 * Extracted from the monolithic PatientDashboardPage for better maintainability.
 */
export default function ProfileSummary({
  profile,
  isLoading,
  error
}: ProfileSummaryProps) {
  if (error) {
    return (
      <Card className="p-4 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700">
        <div className="flex items-center">
          <AlertCircle className="text-yellow-500 mr-2" size={20} />
          <p className="text-yellow-700 dark:text-yellow-300">
            Your profile information could not be loaded. Please try refreshing or contact support.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </Card>
    );
  }

  if (isLoading || !profile) {
    return (
      <Card className="p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center animate-pulse">
          <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="ml-4 flex-1">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          </div>
          <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header gradient */}
      <div className="h-12 bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/20 dark:to-slate-700"></div>
      
      <div className="p-6 -mt-6 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {/* Profile Picture */}
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                {profile.profilePictureUrl ? (
                  <Image
                    src={profile.profilePictureUrl}
                    alt={`${profile.firstName} ${profile.lastName}`}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    priority
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <User className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                  </div>
                )}
              </div>
              
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
            </div>

            {/* Profile Info */}
            <div className="ml-4 flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                {profile.firstName} {profile.lastName}
              </h2>
              
              <div className="space-y-1">
                {profile.email && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {profile.email}
                  </p>
                )}
                
                {profile.phone && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {profile.phone}
                  </p>
                )}
                
                {!profile.email && !profile.phone && (
                  <p className="text-sm text-slate-500 dark:text-slate-500 italic">
                    Complete your profile for better experience
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="flex flex-col items-end gap-2">
            <Link href="/patient/profile">
              <Button
                variant="outline"
                size="sm"
                className="border-primary/20 text-primary hover:bg-primary/5 dark:border-primary/30 dark:text-primary"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit Profile
              </Button>
            </Link>
            
            {/* Profile completion indicator */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex space-x-1">
                <div className={`h-1.5 w-1.5 rounded-full ${profile.firstName ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                <div className={`h-1.5 w-1.5 rounded-full ${profile.email ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                <div className={`h-1.5 w-1.5 rounded-full ${profile.phone ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                <div className={`h-1.5 w-1.5 rounded-full ${profile.profilePictureUrl ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              </div>
              <span className="text-slate-500 dark:text-slate-400">
                {[profile.firstName, profile.email, profile.phone, profile.profilePictureUrl]
                  .filter(Boolean).length}/4 Complete
              </span>
            </div>
          </div>
        </div>

        {/* Welcome message */}
        <div className="mt-4 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/10">
          <p className="text-sm text-primary dark:text-primary-300">
            Welcome back, {profile.firstName}! Ready to manage your health today?
          </p>
        </div>
      </div>
    </Card>
  );
} 