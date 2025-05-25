'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { User, Save, GraduationCap, Stethoscope, FileText, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { UserType, VerificationStatus } from '@/types/enums';
import { 
  UpdatableDoctorProfileSchema,
  UpdatableUserCoreFieldsSchema,
  UpdatableDoctorSpecificFieldsSchema 
} from '@/types/schemas';
import DoctorProfileErrorBoundary from '@/components/error-boundaries/DoctorProfileErrorBoundary';

/**
 * Doctor Profile Page
 * Allows doctors to view and edit their profile information
 * Connected to live updateUserProfile Cloud Function
 */
export default function DoctorProfilePage() {
  const router = useRouter();
  const { user, userProfile, doctorProfile, loading: authLoading, refreshUserProfile } = useAuth();

  // Form state for all editable fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    specialty: '',
    yearsOfExperience: 0,
    location: '',
    languages: [] as string[],
    consultationFee: null as number | null,
    bio: '',
    servicesOffered: '',
    timezone: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form data from AuthContext
  useEffect(() => {
    if (userProfile && doctorProfile) {
      logInfo('Populating doctor profile edit form with data from AuthContext', {
        userType: userProfile.userType,
        hasDoctorProfile: !!doctorProfile
      });

      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phone: userProfile.phone || '',
        specialty: doctorProfile.specialty || '',
        yearsOfExperience: doctorProfile.yearsOfExperience || 0,
        location: doctorProfile.location || '',
        languages: doctorProfile.languages || [],
        consultationFee: doctorProfile.consultationFee || null,
        bio: doctorProfile.bio || '',
        servicesOffered: doctorProfile.servicesOffered || '',
        timezone: doctorProfile.timezone || '',
      });
    }
  }, [userProfile, doctorProfile]);

  // Handle input changes
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'languages') {
      // Handle languages as comma-separated string
      const languagesArray = value.split(',').map(lang => lang.trim()).filter(Boolean);
      setFormData(prev => ({
        ...prev,
        [name]: languagesArray,
      }));
    } else if (name === 'yearsOfExperience' || name === 'consultationFee') {
      // Handle numeric fields
      const numValue = value === '' ? (name === 'consultationFee' ? null : 0) : Number(value);
      setFormData(prev => ({
        ...prev,
        [name]: numValue,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value || '',
      }));
    }
  }, []);

  // Handle profile update submission
  const handleProfileUpdate = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const perf = trackPerformance('handleDoctorProfileUpdateSubmit_Live');
    
    try {
      logInfo('Starting doctor profile update', { uid: user?.uid });

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

      // Check doctor-specific fields
      if (formData.specialty !== (doctorProfile?.specialty || '')) {
        profileUpdates.specialty = formData.specialty;
      }
      if (formData.yearsOfExperience !== (doctorProfile?.yearsOfExperience || 0)) {
        profileUpdates.yearsOfExperience = formData.yearsOfExperience;
      }
      if (formData.location !== (doctorProfile?.location || '')) {
        profileUpdates.location = formData.location || null;
      }
      
      // Compare languages arrays
      const currentLanguages = doctorProfile?.languages || [];
      const formLanguages = formData.languages || [];
      if (JSON.stringify(currentLanguages.sort()) !== JSON.stringify(formLanguages.sort())) {
        profileUpdates.languages = formLanguages.length > 0 ? formLanguages : null;
      }
      
      if (formData.consultationFee !== (doctorProfile?.consultationFee || null)) {
        profileUpdates.consultationFee = formData.consultationFee;
      }
      if (formData.bio !== (doctorProfile?.bio || '')) {
        profileUpdates.bio = formData.bio || null;
      }
      if (formData.servicesOffered !== (doctorProfile?.servicesOffered || '')) {
        profileUpdates.servicesOffered = formData.servicesOffered || null;
      }
      if (formData.timezone !== (doctorProfile?.timezone || '')) {
        profileUpdates.timezone = formData.timezone || null;
      }

      // Check if there are any changes
      if (Object.keys(profileUpdates).length === 0) {
        setSuccessMsg('No changes to save.');
        setIsSubmitting(false);
        perf.stop();
        return;
      }

      // Optional client-side validation
      const validationResult = UpdatableDoctorProfileSchema.safeParse(profileUpdates);
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
      
      logInfo('Doctor profile update successful (Live Cloud)');
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
      
      // Trigger AuthContext to re-fetch profile
      await refreshUserProfile();

    } catch (error: any) {
      logError('Doctor profile update failed (Live Cloud)', error);
      setErrorMsg(error.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
      perf.stop();
    }
  }, [userProfile, doctorProfile, formData, refreshUserProfile, user?.uid]);

  // Redirect if not a doctor
  useEffect(() => {
    if (!authLoading && userProfile && userProfile.userType !== UserType.DOCTOR) {
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

  if (!userProfile || userProfile.userType !== UserType.DOCTOR) {
    return (
      <Alert variant="error">
        Access denied. This page is only available to doctors.
      </Alert>
    );
  }

  return (
    <DoctorProfileErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {formData.firstName && formData.lastName 
                ? `Dr. ${formData.firstName} ${formData.lastName}` 
                : "Doctor Profile"}
            </h1>
            {formData.specialty && (
              <p className="text-slate-500">{formData.specialty}</p>
            )}
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="secondary">
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Verification Status Alert */}
        {doctorProfile?.verificationStatus === VerificationStatus.PENDING && (
          <Alert variant="warning">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              <span>
                Your profile is pending verification. Our team will review your credentials shortly.
              </span>
            </div>
          </Alert>
        )}

        {/* Status Messages */}
        {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
        {successMsg && <Alert variant="success">{successMsg}</Alert>}

        <form onSubmit={handleProfileUpdate}>
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
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
              </div>
            </Card>

            {/* Professional Information */}
            <Card>
              <div className="p-6 bg-primary/5 border-b flex items-center gap-4">
                <div className="bg-primary/10 rounded-full p-3">
                  <Stethoscope size={24} className="text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Professional Information</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="specialty" className="block text-sm font-medium mb-1">
                    Specialty *
                  </label>
                  <Input
                    id="specialty"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    disabled={!isEditing}
                    required
                    placeholder="e.g., Cardiology, Pediatrics"
                  />
                </div>
                
                <div>
                  <label htmlFor="yearsOfExperience" className="block text-sm font-medium mb-1">
                    Years of Experience
                  </label>
                  <Input
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    type="number"
                    value={formData.yearsOfExperience.toString()}
                    onChange={handleChange}
                    disabled={!isEditing}
                    min="0"
                    max="70"
                  />
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-sm font-medium mb-1">
                    Practice Location
                  </label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="City, State or Hospital Name"
                  />
                </div>
                
                <div>
                  <label htmlFor="consultationFee" className="block text-sm font-medium mb-1">
                    Consultation Fee ($)
                  </label>
                  <Input
                    id="consultationFee"
                    name="consultationFee"
                    type="number"
                    value={formData.consultationFee?.toString() || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    min="0"
                    placeholder="150"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="languages" className="block text-sm font-medium mb-1">
                    Languages Spoken
                  </label>
                  <Input
                    id="languages"
                    name="languages"
                    value={formData.languages.join(', ')}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="English, Spanish, French, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple languages with commas</p>
                </div>
                
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium mb-1">
                    Timezone
                  </label>
                  <Input
                    id="timezone"
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="America/New_York"
                  />
                </div>
              </div>
            </Card>

            {/* Biography & Services */}
            <Card>
              <div className="p-6 bg-primary/5 border-b flex items-center gap-4">
                <div className="bg-primary/10 rounded-full p-3">
                  <GraduationCap size={24} className="text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Biography & Services</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium mb-1">
                    Professional Biography
                  </label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    disabled={!isEditing}
                    rows={4}
                    placeholder="Tell patients about your background, education, and expertise"
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.bio.length}/2000 characters
                  </p>
                </div>
                
                <div>
                  <label htmlFor="servicesOffered" className="block text-sm font-medium mb-1">
                    Services Offered
                  </label>
                  <Textarea
                    id="servicesOffered"
                    name="servicesOffered"
                    value={formData.servicesOffered}
                    onChange={handleChange}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="List the medical services you provide (e.g., annual checkups, vaccinations, etc.)"
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.servicesOffered.length}/2000 characters
                  </p>
                </div>
              </div>
            </Card>

            {/* Verification Documents Section (Placeholder) */}
            <Card>
              <div className="p-6 bg-primary/5 border-b flex items-center gap-4">
                <div className="bg-primary/10 rounded-full p-3">
                  <FileText size={24} className="text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Verification Documents</h2>
              </div>
              <div className="p-6">
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Document Management
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Upload and manage your professional verification documents
                  </p>
                  <Button variant="secondary" disabled>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Document
                  </Button>
                  <p className="text-xs text-gray-400 mt-2">
                    Document upload functionality will be available in a future update
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
          </div>
        </form>
      </div>
    </DoctorProfileErrorBoundary>
  );
}
