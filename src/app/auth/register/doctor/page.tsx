'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Stethoscope, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { logInfo } from '@/lib/logger';
import { UserType } from '@/types/enums';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';

/**
 * Doctor Registration Page
 * Allows healthcare providers to register as a doctor
 * 
 * @returns Doctor registration form component
 */
export default function DoctorRegistrationPage() {
  const router = useRouter();
  const { registerDoctor, error: authError, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    licenseNumber: '',
    yearsOfExperience: '',
    location: '',
    languages: '',
    fee: '',
    bio: ''
  });
  
  // Form validation state
  const [isValid, setIsValid] = useState(false);
  
  // Validate form on input change
  useEffect(() => {
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(formData.email);
    const isValidPassword = formData.password.length >= 6;
    const passwordsMatch = formData.password === formData.confirmPassword;
    
    // Check that all required fields have values
    const hasRequiredFields = 
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.specialty.trim() !== '' &&
      formData.licenseNumber.trim() !== '' &&
      formData.yearsOfExperience.trim() !== '' &&
      formData.location.trim() !== '';
    
    setIsValid(isValidEmail && isValidPassword && passwordsMatch && hasRequiredFields);
  }, [formData]);
  
  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (error || authError) {
      const timer = setTimeout(() => {
        setError('');
        clearError();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, authError, clearError]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isValid) return;
    
    setError('');
    setIsLoading(true);
    
    try {
      // Convert languages to array and prepare payload
      const languagesArray = formData.languages.split(',').map(lang => lang.trim());
      
      const payload = {
      email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        userType: UserType.DOCTOR,
      specialty: formData.specialty,
        licenseNumber: formData.licenseNumber,
        yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
        location: formData.location,
        languages: languagesArray,
        consultationFee: parseInt(formData.fee) || 0,
        bio: formData.bio
      };
    
      // Call the API directly
      const res = await callApi('registerDoctor', payload);
      
      setIsLoading(false);
      
      if (res.success) {
        // On success, use auth context for login and redirection
        await registerDoctor(payload);
      router.push('/auth/pending-verification');
      } else {
        setError(res.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope size={20} /> Doctor Registration
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Create your healthcare provider account</p>
        </div>
        
        <Alert variant="warning" className="flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span>Your account will require admin verification before activation.</span>
        </Alert>
        
        {(error || authError) && (
          <Alert variant="error">
            {error || authError}
          </Alert>
        )}
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="firstName"
              name="firstName"
              label="First Name"
              required
              placeholder="Enter your first name"
              value={formData.firstName}
              onChange={handleChange}
            />
            
            <Input
              id="lastName"
              name="lastName"
              label="Last Name"
              required
              placeholder="Enter your last name"
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>
          
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            required
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
          />
          {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
            <p className="text-xs text-danger mt-1">Please enter a valid email address</p>
          )}
          
          <Input
            id="phone"
            name="phone"
            type="tel"
            label="Phone Number"
            required
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleChange}
          />
          
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            required
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
          />
          {formData.password && formData.password.length < 6 && (
            <p className="text-xs text-danger mt-1">Password must be at least 6 characters</p>
          )}
          
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            required
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : ''}
          />
          
          <Select
            id="specialty"
            name="specialty"
            label="Medical Specialty"
            required
            value={formData.specialty}
            onChange={handleChange}
          >
            <option value="">Select specialty</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Dermatology">Dermatology</option>
            <option value="Endocrinology">Endocrinology</option>
            <option value="Family Medicine">Family Medicine</option>
            <option value="Gastroenterology">Gastroenterology</option>
            <option value="Neurology">Neurology</option>
            <option value="Obstetrics and Gynecology">Obstetrics and Gynecology</option>
            <option value="Oncology">Oncology</option>
            <option value="Ophthalmology">Ophthalmology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Psychiatry">Psychiatry</option>
            <option value="Radiology">Radiology</option>
            <option value="Urology">Urology</option>
          </Select>
          
          <Input
            id="licenseNumber"
            name="licenseNumber"
            label="License Number"
            required
            placeholder="Enter your medical license number"
            value={formData.licenseNumber}
            onChange={handleChange}
          />
          
          <Input
            id="yearsOfExperience"
            name="yearsOfExperience"
            type="number"
            min="0"
            label="Years of Experience"
            required
            placeholder="Enter years of professional experience"
            value={formData.yearsOfExperience}
            onChange={handleChange}
          />
          
          <Input
            id="location"
            name="location"
            label="Location"
            required
            placeholder="City, State/Province"
            value={formData.location}
            onChange={handleChange}
          />
          
          <Input
            id="languages"
            name="languages"
            label="Languages Spoken"
            required
            placeholder="e.g., English, Spanish, etc."
            value={formData.languages}
            onChange={handleChange}
          />
          
          <Input
            id="fee"
            name="fee"
            type="number"
            min="0"
            label="Consultation Fee ($)"
            required
            placeholder="Enter your consultation fee"
            value={formData.fee}
            onChange={handleChange}
          />
          
          <Textarea
            id="bio"
            name="bio"
            label="Professional Bio"
            rows={4}
            required
            placeholder="Brief description of your professional background and approach"
            value={formData.bio}
            onChange={handleChange}
          />
          
          <Button 
            type="submit" 
            className="w-full" 
            isLoading={isLoading}
            disabled={!isValid || isLoading}
          >
            Register as Doctor
          </Button>
        
          <div className="text-center mt-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
        </form>
      </Card>
    </div>
  );
} 