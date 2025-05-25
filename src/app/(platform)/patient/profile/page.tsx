'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { User, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { Gender, BloodType, UserType } from '@/types/enums';
// Import Zod for local schema definition
import { z } from 'zod';

// Local schema definition as workaround for import issue
const UpdatablePatientProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').optional(),
  lastName: z.string().min(1, 'Last name is required.').optional(),
  phone: z.string().nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.nativeEnum(Gender).optional(),
  bloodType: z.nativeEnum(BloodType).nullable().optional(),
  medicalHistory: z.string().max(4000, 'Medical history is too long (max 4000 characters)').nullable().optional(),
  address: z.string().max(500, 'Address is too long').nullable().optional(),
});

/**
 * Patient Profile Page
 * Allows patients to view and edit their profile information
 * Connected to live updateUserProfile Cloud Function
 */
export default function PatientProfile() {
  const router = useRouter();
  const { user, userProfile, patientProfile, loading: authLoading, refreshUserProfile } = useAuth();

  // Form state for all editable fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '', // Store as YYYY-MM-DD string for input type="date"
    gender: null as Gender | null,
    bloodType: null as BloodType | null,
    medicalHistory: '',
    address: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form data from AuthContext
  useEffect(() => {
    if (userProfile) {
      logInfo('Populating profile edit form with data from AuthContext', {
        userType: userProfile.userType,
        hasPatientProfile: !!patientProfile
      });

      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phone: userProfile.phone || '',
        dateOfBirth: patientProfile?.dateOfBirth 
          ? (typeof patientProfile.dateOfBirth === 'string' 
              ? new Date(patientProfile.dateOfBirth).toISOString().split('T')[0]
              : (patientProfile.dateOfBirth as any)?.toDate?.() 
                ? (patientProfile.dateOfBirth as any).toDate().toISOString().split('T')[0]
                : '')
          : '',
        gender: patientProfile?.gender || null,
        bloodType: patientProfile?.bloodType || null,
        medicalHistory: patientProfile?.medicalHistory || '',
        address: patientProfile?.address || '',
      });
    }
  }, [userProfile, patientProfile]);

  // Handle input changes
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? (name === 'gender' || name === 'bloodType' ? null : '') : value,
    }));
  }, []);

  // Handle profile update submission
  const handleProfileUpdate = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const perf = trackPerformance('handleProfileUpdateSubmit_Live');
    
    try {
      logInfo('Starting patient profile update', { uid: user?.uid });

      // Construct profileUpdates object with only changed fields
      const profileUpdates: Record<string, any> = {};

      // Check core user fields
      if (formData.firstName !== (userProfile?.firstName || '')) {
        profileUpdates.firstName = formData.firstName;
      }
      if (formData.lastName !== (userProfile?.lastName || '')) {
        profileUpdates.lastName = formData.lastName;
      }
      if (formData.phone !== (userProfile?.phone || '')) {
        profileUpdates.phone = formData.phone || null;
      }

      // Check patient-specific fields
      const currentDateOfBirth = patientProfile?.dateOfBirth 
        ? (typeof patientProfile.dateOfBirth === 'string' 
            ? new Date(patientProfile.dateOfBirth).toISOString().split('T')[0]
            : (patientProfile.dateOfBirth as any)?.toDate?.() 
              ? (patientProfile.dateOfBirth as any).toDate().toISOString().split('T')[0]
              : '')
        : '';
      
      if (formData.dateOfBirth !== currentDateOfBirth) {
        profileUpdates.dateOfBirth = formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null;
      }
      if (formData.gender !== (patientProfile?.gender || null)) {
        profileUpdates.gender = formData.gender;
      }
      if (formData.bloodType !== (patientProfile?.bloodType || null)) {
        profileUpdates.bloodType = formData.bloodType;
      }
      if (formData.medicalHistory !== (patientProfile?.medicalHistory || '')) {
        profileUpdates.medicalHistory = formData.medicalHistory || null;
      }
      if (formData.address !== (patientProfile?.address || '')) {
        profileUpdates.address = formData.address || null;
      }

      // Check if there are any changes
      if (Object.keys(profileUpdates).length === 0) {
        setSuccessMsg('No changes to save.');
        setIsSubmitting(false);
        perf.stop();
        return;
      }

      // Optional client-side validation
      const validationResult = UpdatablePatientProfileSchema.safeParse(profileUpdates);
      if (!validationResult.success) {
        setErrorMsg("Validation failed: " + validationResult.error.issues.map(i => i.message).join(', '));
        setIsSubmitting(false);
        perf.stop();
        return;
      }

      logInfo('Calling updateUserProfile (Live Cloud) with updates:', { 
        updateFields: Object.keys(profileUpdates) // Log field names only for PHI safety
      });

      // Call backend via callApi
      await callApi('updateUserProfile', { updates: profileUpdates });
      
      logInfo('Profile update successful (Live Cloud)');
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      
      // Trigger AuthContext to re-fetch profile
      await refreshUserProfile();

    } catch (error: any) {
      logError('Profile update failed (Live Cloud)', error);
      setErrorMsg(error.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
      perf.stop();
    }
  }, [userProfile, patientProfile, formData, refreshUserProfile, user?.uid]);

  // Redirect if not a patient
  useEffect(() => {
    if (!authLoading && userProfile && userProfile.userType !== UserType.PATIENT) {
      router.push('/dashboard');
    }
  }, [authLoading, userProfile, router]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!userProfile || userProfile.userType !== UserType.PATIENT) {
    return (
      <Alert variant="error">
        Access denied. This page is only available to patients.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold dark:text-white">My Profile</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="secondary">
            Edit Profile
          </Button>
        )}
      </div>

      {/* Status Messages */}
      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      <form onSubmit={handleProfileUpdate}>
        {/* Personal Information Card */}
        <Card className="overflow-hidden">
          <div className="p-6 bg-primary/5 border-b flex items-center gap-4">
            <div className="bg-primary/10 rounded-full p-3">
              <User size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Personal Information</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                First Name *
              </label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                Last Name *
              </label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={userProfile.email || ''}
                disabled={true} // Email cannot be changed
                className="bg-gray-50 dark:bg-gray-800"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="+1234567890"
              />
            </div>
            
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-1">
                Date of Birth
              </label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>
            
            <div>
              <label htmlFor="gender" className="block text-sm font-medium mb-1">
                Gender
              </label>
              <Select
                id="gender"
                name="gender"
                value={formData.gender || ''}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="">Select Gender</option>
                {Object.values(Gender).map(gender => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium mb-1">
                Address
              </label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>
          </div>
        </Card>

        {/* Medical Information Card */}
        <Card className="mt-6 overflow-hidden">
          <div className="p-6 bg-primary/5 border-b">
            <h2 className="text-xl font-semibold">Medical Information</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="bloodType" className="block text-sm font-medium mb-1">
                Blood Type
              </label>
              <Select
                id="bloodType"
                name="bloodType"
                value={formData.bloodType || ''}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="">Select Blood Type</option>
                {Object.values(BloodType).map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="medicalHistory" className="block text-sm font-medium mb-1">
                Medical History
              </label>
              <Textarea
                id="medicalHistory"
                name="medicalHistory"
                value={formData.medicalHistory}
                onChange={handleChange}
                disabled={!isEditing}
                rows={4}
                placeholder="Enter your medical history, allergies, current medications, etc."
                maxLength={4000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.medicalHistory.length}/4000 characters
              </p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        {isEditing && (
          <div className="mt-6 flex justify-end space-x-3">
            <Button 
              onClick={() => {
                setIsEditing(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }} 
              variant="ghost" 
              type="button"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
