'use client';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { User, Save } from 'lucide-react';
import { usePatientProfile, useUpdatePatientProfile } from '@/data/patientLoaders';
import { Gender, BloodType } from '@/types/enums';
import DataLoadingErrorBoundary from '@/components/error-boundaries/DataLoadingErrorBoundary';
import { formatDateForInput, formatDateForApi } from '@/lib/dateUtils';

/**
 * Patient Profile Page
 * Allows patients to view and edit their profile information
 *
 * @returns Patient profile component
 */
export default function PatientProfile() {
  return (
    <DataLoadingErrorBoundary
      componentName="PatientProfilePage"
      title="Profile Loading Error"
      description="We encountered an issue while loading your profile information."
    >
      <PatientProfileContent />
    </DataLoadingErrorBoundary>
  );
}

// Interface for the patient profile data structure returned by the API
interface PatientProfileData {
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
    address: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    bloodType: string | null;
    allergies: string[] | null;
    medicalHistory: string | null;
  };
}

// Interface for profile update payload
interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  // Add additional fields allowed in the API
  [key: string]: any;
}

/**
 * Patient Profile Content Component
 * Separated to allow error boundary to work properly
 */
function PatientProfileContent() {
  const { data: profileData, isLoading: profileLoading, error: profileError } = usePatientProfile();
  const updateProfileMutation = useUpdatePatientProfile();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    allergies: '',
    medicalHistory: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Populate form data when profile data loads
  useEffect(() => {
    if (
      profileData &&
      typeof profileData === 'object' &&
      'success' in profileData &&
      profileData.success
    ) {
      // Type guard to ensure profileData conforms to expected structure
      const typedProfileData = profileData as PatientProfileData;
      const { userProfile, roleProfile } = typedProfileData;

      setFormData({
        firstName: userProfile?.firstName || '',
        lastName: userProfile?.lastName || '',
        email: userProfile?.email || '',
        phone: userProfile?.phone || '',
        address: roleProfile?.address || '',
        dateOfBirth: formatDateForInput(roleProfile?.dateOfBirth),
        gender: roleProfile?.gender || '',
        bloodType: roleProfile?.bloodType || '',
        allergies: roleProfile?.allergies?.join(', ') || '',
        medicalHistory: roleProfile?.medicalHistory || '',
      });
    }
  }, [profileData]);

  // Handle errors from data fetching by throwing them to the error boundary
  useEffect(() => {
    if (profileError) {
      throw profileError;
    }
  }, [profileError]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);

    try {
      const allergiesArray = formData.allergies
        ? formData.allergies.split(',').map(item => item.trim())
        : [];

      const result = await updateProfileMutation.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        dateOfBirth: formatDateForApi(formData.dateOfBirth),
        gender: formData.gender as Gender,
        bloodType: formData.bloodType as BloodType,
        allergies: allergiesArray,
        medicalHistory: formData.medicalHistory,
      } as UpdateProfilePayload);

      if (result && typeof result === 'object' && 'success' in result && result.success) {
        setSaveStatus({
          type: 'success',
          message: 'Profile updated successfully',
        });
        setIsEditing(false);
      } else {
        setSaveStatus({
          type: 'error',
          message:
            result &&
            typeof result === 'object' &&
            'error' in result &&
            typeof result.error === 'string'
              ? result.error
              : 'Failed to update profile',
        });
      }
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
  };

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

      {saveStatus && <Alert variant={saveStatus.type}>{saveStatus.message}</Alert>}

      {profileError && (
        <Alert variant="error">
          {profileError instanceof Error ? profileError.message : 'Error loading profile'}
        </Alert>
      )}

      {profileLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="w-8 h-8" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
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
                  First Name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
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
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={true} // Email cannot be changed
                  required
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium mb-1">
                  Address
                </label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
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
                  onChange={handleInputChange}
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
                  value={formData.gender}
                  onChange={handleInputChange}
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
            </div>
          </Card>

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
                  value={formData.bloodType}
                  onChange={handleInputChange}
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
              <div>
                <label htmlFor="allergies" className="block text-sm font-medium mb-1">
                  Allergies
                </label>
                <Input
                  id="allergies"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Enter allergies, separated by commas"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="medicalHistory" className="block text-sm font-medium mb-1">
                  Medical History
                </label>
                <textarea
                  id="medicalHistory"
                  name="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px]"
                />
              </div>
            </div>
          </Card>

          {isEditing && (
            <div className="mt-6 flex justify-end space-x-3">
              <Button onClick={() => setIsEditing(false)} variant="ghost" type="button">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
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
      )}
    </div>
  );
}
