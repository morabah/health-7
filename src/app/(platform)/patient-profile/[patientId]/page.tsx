'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { usePatientProfile } from '@/data/patientLoaders';
import { useAuth } from '@/context/AuthContext';
import { UserType } from '@/types/enums';
import { logInfo } from '@/lib/logger';

export default function PatientProfilePage({ params }: { params: { patientId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { patientId } = params;
  const { data, isLoading, error } = usePatientProfile(patientId);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  
  // Only doctors and admins can access this page
  if (user && user.role !== UserType.DOCTOR && user.role !== UserType.ADMIN) {
    return (
      <Alert variant="error">
        You don't have permission to view this page.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <Alert variant="error">
        {error instanceof Error ? error.message : 'Failed to load patient profile'}
      </Alert>
    );
  }

  const { userProfile, roleProfile } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Patient Profile</h1>
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      <Card>
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar 
            src={userProfile.profilePictureUrl || undefined}
            initials={`${userProfile.firstName?.charAt(0) || ''}${userProfile.lastName?.charAt(0) || ''}`}
            size={80}
            className="flex-shrink-0"
          />
          <div>
            <h2 className="text-xl font-semibold">{userProfile.firstName} {userProfile.lastName}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Patient ID: {patientId}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                Patient
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'info'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('info')}
            >
              Basic Information
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'history'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('history')}
            >
              Medical History
            </button>
          </div>
        </div>

        {activeTab === 'info' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Information</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p>{userProfile.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                  <p>{userProfile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                  <p>{roleProfile?.address || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Personal Details</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</p>
                  <p>{roleProfile?.dateOfBirth || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</p>
                  <p>{roleProfile?.gender || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Blood Type</p>
                  <p>{roleProfile?.bloodType || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Medical History</h3>
            
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Allergies</p>
              <p className="mt-1">{roleProfile?.allergies ? roleProfile.allergies.join(', ') : 'None reported'}</p>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Chronic Conditions</p>
              <p className="mt-1">{roleProfile?.chronicConditions ? roleProfile.chronicConditions.join(', ') : 'None reported'}</p>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Medications</p>
              <p className="mt-1">{roleProfile?.currentMedications ? roleProfile.currentMedications.join(', ') : 'None reported'}</p>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Past Surgeries</p>
              <p className="mt-1">{roleProfile?.pastSurgeries ? roleProfile.pastSurgeries.join(', ') : 'None reported'}</p>
            </div>
            
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Family Medical History</p>
              <p className="mt-1">{roleProfile?.familyMedicalHistory || 'None reported'}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 