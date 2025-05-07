'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { ChevronLeft, Eye, EyeOff, Upload } from 'lucide-react';
import { logInfo, logError } from '@/lib/logger';
import { UserType } from '@/types/enums';
import { DoctorRegistrationSchema, type DoctorRegistrationPayload } from '@/types/schemas';
import type { z } from 'zod';

/**
 * Doctor registration form component
 */
export default function DoctorRegisterPage() {
  const router = useRouter();
  const { registerDoctor } = useAuth();
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [languages, setLanguages] = useState('');
  const [about, setAbout] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  /**
   * Validate form data using Zod schema
   */
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Basic confirmation password check
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Parse experience as a number for validation
    const experienceNum = parseInt(experience || '0', 10);
    
    // Create the registration payload
    const registrationData: Partial<DoctorRegistrationPayload> = {
      email,
      password,
      userType: UserType.DOCTOR,
      firstName,
      lastName,
      specialty,
      licenseNumber,
      yearsOfExperience: isNaN(experienceNum) ? 0 : experienceNum,
    };
    
    // Validate using Zod schema
    const result = DoctorRegistrationSchema.safeParse(registrationData);
    
    if (!result.success) {
      // Extract and format Zod validation errors
      const formattedErrors = result.error.format();
      
      // Convert Zod errors to our format
      Object.entries(formattedErrors).forEach(([key, value]) => {
        // Safely access _errors with proper type checking
        const fieldErrors = value as z.ZodFormattedError<any>;
        if (key !== '_errors' && fieldErrors._errors.length > 0) {
          errors[key] = fieldErrors._errors[0];
        }
      });
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate the form
    if (!validateForm()) {
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      logInfo('doctor_registration', { email, specialty });
      
      // Register doctor via auth context
      const result = await registerDoctor({
        email,
        password,
        userType: UserType.DOCTOR,
        firstName,
        lastName,
        specialty,
        licenseNumber,
        yearsOfExperience: parseInt(experience, 10)
        // Note: Additional fields like education, languages, and about
        // will be updated later through the doctor profile
      });
      
      if (result && typeof result === 'object' && 'success' in result && result.success) {
        // Registration successful, redirect to success page
        router.push(`/auth/registration-success?type=${UserType.DOCTOR}&email=${encodeURIComponent(email)}`);
      } else {
        // Handle unsuccessful registration
        const errorMessage = result && typeof result === 'object' && 'error' in result 
          ? result.error 
          : 'Registration failed';
        setError(errorMessage as string);
      }
    } catch (err) {
      logError('Error during doctor registration', err);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Specialty options
  const specialties = [
    'Cardiology',
    'Dermatology',
    'Endocrinology',
    'Family Medicine',
    'Gastroenterology',
    'Gynecology',
    'Internal Medicine',
    'Neurology',
    'Oncology',
    'Ophthalmology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Radiology',
    'Urology'
  ];
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <Link href="/auth/register">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to options
          </Button>
        </Link>
        <h1 className="text-2xl font-bold mb-2">Create a Doctor Account</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Join our platform to connect with patients and grow your practice
        </p>
      </div>
      
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}
      
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-medium mb-4">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="First Name"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={validationErrors.firstName}
                autoComplete="given-name"
                required
              />
            </div>
            <div>
              <Input
                label="Last Name"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={validationErrors.lastName}
                autoComplete="family-name"
                required
              />
            </div>
          </div>
          
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={validationErrors.email}
            autoComplete="email"
            required
          />
          
          <Input
            label="Phone Number"
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={validationErrors.phone}
            autoComplete="tel"
            placeholder="+1 (123) 456-7890"
            required
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="Password"
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={validationErrors.password}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div>
              <Input
                label="Confirm Password"
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={validationErrors.confirmPassword}
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
            <h2 className="text-lg font-medium mb-4">Professional Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Specialty"
                  id="specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  error={validationErrors.specialty}
                  required
                >
                  <option value="">Select specialty</option>
                  {specialties.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Input
                  label="License Number"
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  error={validationErrors.licenseNumber}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Input
                  label="Years of Experience"
                  id="experience"
                  type="number"
                  min="1"
                  max="70"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  error={validationErrors.experience}
                  required
                />
              </div>
              <div>
                <Input
                  label="Education (Optional)"
                  id="education"
                  placeholder="E.g., Harvard Medical School"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Input
                label="Languages (Optional, comma-separated)"
                id="languages"
                placeholder="E.g., English, Spanish, French"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
              />
            </div>
            
            <div className="mt-4">
              <Textarea
                label="About (Optional)"
                id="about"
                placeholder="Brief description of your practice and approach"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="mt-6">
              <label htmlFor="verification-docs" className="block mb-2 text-sm font-medium">Verification Documents</label>
              <div id="verification-docs" className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600 dark:text-slate-300 mb-2">
                  Upload your medical license and credentials
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Note: Documents will be required for final verification.
                  <br />Document upload functionality will be available soon.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          
          <div className="mt-6">
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Create Account
            </Button>
          </div>
          
          <p className="text-center text-sm mt-4">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
} 