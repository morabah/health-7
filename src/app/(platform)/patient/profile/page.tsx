'use client';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { User, Save } from 'lucide-react';
import { logInfo } from '@/lib/logger';
import { usePatientProfile } from '@/data/patientLoaders';
import { Gender, BloodType } from '@/types/enums';

/**
 * Patient Profile Page
 * Allows patients to view and edit their profile information
 * 
 * @returns Patient profile component
 */
export default function PatientProfile() {
  const { data: profileData, isLoading: profileLoading, mutate } = usePatientProfile();
  
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
    medicalHistory: ''
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Populate form data when profile data loads
  useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        dateOfBirth: profileData.dateOfBirth || '',
        gender: profileData.gender || '',
        bloodType: profileData.bloodType || '',
        allergies: profileData.allergies || '',
        medicalHistory: profileData.medicalHistory || ''
      });
    }
  }, [profileData]);

  useEffect(() => {
    logInfo('Patient profile page rendered');
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      // This would call an API to update the profile
      // const result = await callApi('updatePatientProfile', formData);
      
      // For now, we'll simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await mutate(); // Refresh profile data
      setSaveStatus({
        type: 'success',
        message: 'Profile updated successfully'
      });
      setIsEditing(false);
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: 'Failed to update profile'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold dark:text-white">My Profile</h1>
        {!isEditing && (
          <Button 
            onClick={() => setIsEditing(true)}
            variant="secondary"
          >
            Edit Profile
          </Button>
        )}
      </div>

      {saveStatus && (
        <Alert 
          type={saveStatus.type} 
          message={saveStatus.message}
          onClose={() => setSaveStatus(null)}
        />
      )}

      {profileLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
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
                <label htmlFor="firstName" className="block text-sm font-medium mb-1">First Name</label>
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
                <label htmlFor="lastName" className="block text-sm font-medium mb-1">Last Name</label>
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
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email Address</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  required
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number</label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-1">Date of Birth</label>
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
                <label htmlFor="gender" className="block text-sm font-medium mb-1">Gender</label>
                <Select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                >
                  <option value="">Select Gender</option>
                  {Object.values(Gender).map(gender => (
                    <option key={gender} value={gender}>{gender}</option>
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
                <label htmlFor="bloodType" className="block text-sm font-medium mb-1">Blood Type</label>
                <Select
                  id="bloodType"
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                >
                  <option value="">Select Blood Type</option>
                  {Object.values(BloodType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="allergies" className="block text-sm font-medium mb-1">Allergies</label>
                <textarea
                  id="allergies"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="medicalHistory" className="block text-sm font-medium mb-1">Medical History</label>
                <textarea
                  id="medicalHistory"
                  name="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  rows={4}
                />
              </div>
            </div>
          </Card>

          {isEditing && (
            <div className="mt-6 flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  // Reset form data to original data
                  if (profileData) {
                    setFormData({
                      firstName: profileData.firstName || '',
                      lastName: profileData.lastName || '',
                      email: profileData.email || '',
                      phone: profileData.phone || '',
                      address: profileData.address || '',
                      dateOfBirth: profileData.dateOfBirth || '',
                      gender: profileData.gender || '',
                      bloodType: profileData.bloodType || '',
                      allergies: profileData.allergies || '',
                      medicalHistory: profileData.medicalHistory || ''
                    });
                  }
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
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