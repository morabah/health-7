'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { logInfo } from '@/lib/logger';
import { useAdminGetPendingDoctors } from '@/data/adminLoaders';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import type { DoctorProfile, UserProfile } from '@/types/schemas';
import { useAllUsers } from '@/data/adminLoaders';

/**
 * Doctor Verification Queue Page
 * Allows admins to view and process doctor verification requests
 * 
 * @returns Doctor Verification Queue component
 */
export default function DoctorVerificationPage() {
  // Use real data from API
  const { data, isLoading, error } = useAdminGetPendingDoctors();
  const { data: usersData, isLoading: usersLoading } = useAllUsers();
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  useEffect(() => {
    // Log when component mounts
    logInfo('Doctor Verification page mounted');
  }, []);

  // Extract doctors from response
  const pendingDoctors = data?.success ? data.doctors : [];
  const users = usersData?.success ? usersData.users : [];
  
  // Find the corresponding user for each doctor to get name and other user info
  const doctorsWithUserInfo = pendingDoctors.map((doctor: DoctorProfile) => {
    const user = users.find((u: UserProfile) => u.id === doctor.userId);
    return {
      ...doctor,
      firstName: user?.firstName || 'Unknown',
      lastName: user?.lastName || 'Unknown',
      email: user?.email || 'No email'
    };
  });
  
  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-4">Doctor Verification Queue</h1>
          <Link href="/cms" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            Back to CMS
          </Link>
        </div>
        <p className="text-gray-600">
          Review and process verification requests from healthcare providers
        </p>
      </header>
      
      {isLoading || usersLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      ) : error ? (
        <Alert variant="error" className="my-4">
          Error loading verification queue: {error instanceof Error ? error.message : String(error)}
        </Alert>
      ) : (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="font-semibold">Pending Verifications ({doctorsWithUserInfo.length})</h2>
          <span className="text-sm text-gray-500">Newest first</span>
        </div>
        
          {doctorsWithUserInfo.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No pending verification requests
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
              {doctorsWithUserInfo.map((doctor: DoctorProfile & { firstName: string; lastName: string; email: string }) => (
                <li key={doctor.userId} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <p>{doctor.specialty} • License: {doctor.licenseNumber}</p>
                      <p className="mt-1">Email: {doctor.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                        Submitted: {formatDate(doctor.createdAt)}
                    </div>
                    <Link 
                        href={`/cms/doctor-verification/${doctor.userId}`}
                      className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </div>
  );
} 