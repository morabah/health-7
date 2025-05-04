'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { User, Save, GraduationCap, Stethoscope } from 'lucide-react';
import { useDoctorProfile, useUpdateDoctorProfile } from '@/data/doctorLoaders';
import { VerificationStatus } from '@/types/enums';
import { logValidation } from '@/lib/logger';
import { DoctorProfileErrorBoundary } from '@/components/error-boundaries';

/**
 * Doctor Profile Page
 * Allows doctors to view and edit their profile information
 * 
 * @returns Doctor profile component
 */
export default function DoctorProfilePage() {
  return (
    <DoctorProfileErrorBoundary>
      <DoctorProfileContent />
    </DoctorProfileErrorBoundary>
  );
}

// Interface for the doctor profile data structure returned by the API
interface DoctorProfileData {
  success: boolean;
  error?: string;
  userProfile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    role: string;
  };
  roleProfile: {
    id: string;
    userId: string;
    specialty: string;
    licenseNumber: string;
    yearsOfExperience: number;
    location: string | null;
    languages: string[];
    consultationFee: number | null;
    bio: string | null;
    servicesOffered: string | null;
    verificationStatus: string;
    education?: Array<{ institution: string; degree: string; year: string }>;
  };
}

/**
 * Doctor Profile Content Component
 * Separated to allow error boundary to work properly
 */
function DoctorProfileContent() {
  const { data: profileData, isLoading, error, refetch } = useDoctorProfile();
  const updateProfileMutation = useUpdateDoctorProfile();
  
  const [profile, setProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialty: string;
    licenseNumber: string;
    yearsOfExperience: string;
    location: string;
    languages: string[] | string;
    consultationFee: string;
    bio: string;
    services: string;
    verificationStatus: string;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
    yearsOfExperience: '',
    location: '',
    languages: [] as string[],
    consultationFee: '',
    bio: '',
    services: '',
    verificationStatus: VerificationStatus.PENDING,
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Handle errors from data fetching by throwing them to the error boundary
  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  // Load profile data when available
  useEffect(() => {
    if (profileData && typeof profileData === 'object' && 'success' in profileData && profileData.success) {
      // Type guard to ensure profileData conforms to expected structure
      const typedProfileData = profileData as DoctorProfileData;
      const { userProfile, roleProfile } = typedProfileData;
      
      setProfile({
        firstName: userProfile?.firstName || '',
        lastName: userProfile?.lastName || '',
        email: userProfile?.email || '',
        phone: userProfile?.phone || '',
        specialty: roleProfile?.specialty || '',
        licenseNumber: roleProfile?.licenseNumber || '',
        yearsOfExperience: roleProfile?.yearsOfExperience?.toString() || '',
        location: roleProfile?.location || '',
        languages: roleProfile?.languages || [],
        consultationFee: roleProfile?.consultationFee?.toString() || '',
        bio: roleProfile?.bio || '',
        services: roleProfile?.servicesOffered || '',
        verificationStatus: roleProfile?.verificationStatus || VerificationStatus.PENDING,
      });

      logValidation('4.10', 'success', 'Doctor profile page connected to real data via local API');
    }
  }, [profileData]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    
    try {
      // Prepare languages array from comma-separated string if needed
      let languagesArray: string[] = [];
      if (Array.isArray(profile.languages)) {
        languagesArray = profile.languages;
      } else if (typeof profile.languages === 'string') {
        languagesArray = profile.languages.split(',').map((lang: string) => lang.trim()).filter(Boolean);
      }
      
      // Type the update payload
      const updatePayload = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        specialty: profile.specialty,
        licenseNumber: profile.licenseNumber,
        yearsOfExperience: parseInt(profile.yearsOfExperience) || 0,
        location: profile.location,
        languages: languagesArray,
        consultationFee: parseInt(profile.consultationFee) || null,
        bio: profile.bio,
        servicesOffered: profile.services,
      };
      
      // Define the expected response type
      interface UpdateProfileResponse {
        success: boolean;
        error?: string;
      }
      
      const result = await updateProfileMutation.mutateAsync(updatePayload) as UpdateProfileResponse;
      
      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Profile updated successfully'
        });
        setIsEditing(false);
        
        // Explicitly refetch to ensure we have the latest data
        refetch();
        
        logValidation('4.10', 'success', 'Doctor profile update fully functional');
      } else {
        setStatusMessage({
          type: 'error',
          message: result.error || 'Failed to update profile'
        });
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred while updating profile'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {profile.firstName && profile.lastName 
              ? `Dr. ${profile.firstName} ${profile.lastName}` 
              : "Doctor Profile"}
          </h1>
          {profile.specialty && (
            <p className="text-slate-500">{profile.specialty}</p>
          )}
        </div>
        <Button
          variant={isEditing ? "secondary" : "primary"}
          onClick={() => setIsEditing(!isEditing)}
          disabled={isLoading || updateProfileMutation.isPending}
        >
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      {statusMessage && (
        <Alert variant={statusMessage.type}>
          {statusMessage.message}
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          {error instanceof Error ? error.message : 'Error loading profile'}
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="w-8 h-8" />
        </div>
      ) : (
        <>
          {profile.verificationStatus === VerificationStatus.PENDING && (
            <Alert variant="warning" className="mb-4">
          <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
            <span>
              Your profile is pending verification. Our team will review your credentials shortly.
            </span>
          </div>
            </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
              <User className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Personal Information</h2>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="firstName"
                name="firstName"
                label="First Name"
                value={profile.firstName}
                onChange={handleChange}
                required
                disabled={!isEditing}
              />
              <Input
                id="lastName"
                name="lastName"
                label="Last Name"
                value={profile.lastName}
                onChange={handleChange}
                required
                disabled={!isEditing}
              />
                <Input
                  id="email"
                  name="email"
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={handleChange}
                  required
                    disabled={true} // Email cannot be changed
                />
                <Input
                  id="phone"
                  name="phone"
                  label="Phone Number"
                  value={profile.phone}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                />
            </div>
          </Card>

          {/* Professional Information */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
              <Stethoscope className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Professional Information</h2>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="specialty"
                name="specialty"
                label="Specialty"
                value={profile.specialty}
                onChange={handleChange}
                disabled={!isEditing}
                    required
              />
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  label="License Number"
                  value={profile.licenseNumber}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                />
                <Input
                  id="yearsOfExperience"
                  name="yearsOfExperience"
                  label="Years of Experience"
                  type="number"
                  value={profile.yearsOfExperience}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                    min="0"
                />
                <Input
                  id="location"
                  name="location"
                  label="Practice Location"
                  value={profile.location}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                />
              <Input
                id="languages"
                name="languages"
                label="Languages Spoken"
                    value={Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages}
                onChange={handleChange}
                disabled={!isEditing}
                    placeholder="English, Spanish, French, etc."
              />
                <Input
                  id="consultationFee"
                  name="consultationFee"
                  label="Consultation Fee ($)"
                  type="number"
                  value={profile.consultationFee}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                    min="0"
                />
            </div>
          </Card>

          {/* Biography & Services */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Biography & Services</h2>
            </div>
            <div className="p-4 space-y-4">
              <Textarea
                id="bio"
                name="bio"
                label="Professional Biography"
                value={profile.bio}
                onChange={handleChange}
                rows={4}
                disabled={!isEditing}
                    placeholder="Tell patients about your background, education, and expertise"
              />
              <Textarea
                id="services"
                name="services"
                label="Services Offered"
                value={profile.services}
                onChange={handleChange}
                rows={3}
                disabled={!isEditing}
                    placeholder="List the medical services you provide (e.g., annual checkups, vaccinations, etc.)"
              />
            </div>
          </Card>

              {isEditing && (
                <div className="mt-6 flex justify-end space-x-4">
                  <Button 
                    type="button"
                    variant="secondary" 
                    onClick={() => setIsEditing(false)}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    isLoading={updateProfileMutation.isPending}
                  >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </form>
        </>
      )}
    </div>
  );
}
