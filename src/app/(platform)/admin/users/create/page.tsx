'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import { ArrowLeft, Save } from 'lucide-react';
import { UserType } from '@/types/enums';
import { useMutation } from '@tanstack/react-query';
import { callApi } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { logInfo, logError } from '@/lib/logger';

// API response interface
interface CreateUserResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

export default function CreateUserPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    userType: UserType.PATIENT,
    isActive: true,
    // Doctor-specific fields
    specialty: '',
    licenseNumber: '',
    yearsOfExperience: '',
    // Patient-specific fields
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    medicalHistory: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields for all user types
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Valid email is required';
    
    // Doctor-specific validations
    if (formData.userType === UserType.DOCTOR) {
      if (!formData.specialty.trim()) newErrors.specialty = 'Specialty is required for doctors';
      if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required for doctors';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      if (!user || user.role !== UserType.ADMIN) {
        throw new Error('Unauthorized access');
      }
      
      return callApi('adminCreateUser', 
        { uid: user.uid, role: UserType.ADMIN },
        userData
      ) as Promise<CreateUserResponse>;
    },
    onSuccess: (data: CreateUserResponse) => {
      if (data.success) {
        setFormSuccess('User created successfully');
        // Redirect to the user details page after a short delay
        setTimeout(() => {
          if (data.userId) {
            router.push(`/admin/users/${data.userId}`);
          } else {
            router.push('/admin/users'); // Fallback if no userId
          }
        }, 1500);
      } else {
        setFormError(data.error || 'Failed to create user');
      }
    },
    onError: (error: any) => {
      logError('Error creating user', error);
      setFormError(error.message || 'An error occurred while creating the user');
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    if (!validateForm()) {
      setFormError('Please fix the errors in the form');
      return;
    }
    
    // Prepare data for API based on user type
    const userData = {
      ...formData,
      yearsOfExperience: formData.yearsOfExperience 
        ? parseInt(formData.yearsOfExperience, 10) 
        : undefined,
    };
    
    // Log attempt
    logInfo('Creating new user', { 
      email: userData.email, 
      userType: userData.userType 
    });
    
    // Submit
    createUserMutation.mutate(userData);
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold dark:text-white">Create New User</h1>
        <Link href="/admin/users">
          <Button variant="outline" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>
      
      <Card className="p-6">
        {formError && (
          <Alert variant="error" className="mb-4">
            {formError}
          </Alert>
        )}
        
        {formSuccess && (
          <Alert variant="success" className="mb-4">
            {formSuccess}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium border-b pb-2">Basic Information</h2>
              
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="userType" className="block text-sm font-medium mb-1">
                  User Type <span className="text-red-500">*</span>
                </label>
                <Select
                  id="userType"
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                >
                  <option value={UserType.PATIENT}>Patient</option>
                  <option value={UserType.DOCTOR}>Doctor</option>
                  <option value={UserType.ADMIN}>Admin</option>
                </Select>
              </div>
              
              <div>
                <label htmlFor="isActive" className="block text-sm font-medium mb-1">
                  Account Status
                </label>
                <Select
                  id="isActive"
                  name="isActive"
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>
            </div>
            
            {/* Role-specific Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium border-b pb-2">
                {formData.userType === UserType.DOCTOR
                  ? 'Doctor Information'
                  : formData.userType === UserType.PATIENT
                  ? 'Patient Information'
                  : 'Admin Information'}
              </h2>
              
              {formData.userType === UserType.DOCTOR && (
                <>
                  <div>
                    <label htmlFor="specialty" className="block text-sm font-medium mb-1">
                      Specialty <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="specialty"
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleChange}
                      className={errors.specialty ? 'border-red-500' : ''}
                    />
                    {errors.specialty && (
                      <p className="mt-1 text-sm text-red-500">{errors.specialty}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="licenseNumber" className="block text-sm font-medium mb-1">
                      License Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="licenseNumber"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className={errors.licenseNumber ? 'border-red-500' : ''}
                    />
                    {errors.licenseNumber && (
                      <p className="mt-1 text-sm text-red-500">{errors.licenseNumber}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="yearsOfExperience" className="block text-sm font-medium mb-1">
                      Years of Experience
                    </label>
                    <Input
                      id="yearsOfExperience"
                      name="yearsOfExperience"
                      type="number"
                      min="0"
                      max="70"
                      value={formData.yearsOfExperience}
                      onChange={handleChange}
                    />
                  </div>
                </>
              )}
              
              {formData.userType === UserType.PATIENT && (
                <>
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
                      onChange={handleChange}
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </div>
                  
                  <div>
                    <label htmlFor="bloodType" className="block text-sm font-medium mb-1">
                      Blood Type
                    </label>
                    <Select
                      id="bloodType"
                      name="bloodType"
                      value={formData.bloodType}
                      onChange={handleChange}
                    >
                      <option value="">Select blood type</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </Select>
                  </div>
                  
                  <div>
                    <label htmlFor="medicalHistory" className="block text-sm font-medium mb-1">
                      Medical History
                    </label>
                    <textarea
                      id="medicalHistory"
                      name="medicalHistory"
                      value={formData.medicalHistory}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </>
              )}
              
              {formData.userType === UserType.ADMIN && (
                <div className="py-4 text-amber-600 dark:text-amber-400">
                  <p>
                    Creating an admin user gives full system access. Please ensure this is necessary.
                  </p>
                  <p className="mt-2">
                    Admin users will be created with active status by default.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t flex justify-end">
            <Button
              type="submit"
              className="flex items-center"
              disabled={createUserMutation.isPending}
              isLoading={createUserMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
} 