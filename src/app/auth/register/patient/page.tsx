'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { logInfo, logError } from '@/lib/logger';
import { UserType } from '@/types/enums';
import { PatientRegistrationSchema, type PatientRegistrationPayload } from '@/types/schemas';
import type { z } from 'zod';
import { formatDateForApi } from '@/lib/dateUtils';

/**
 * Patient registration form component
 */
export default function PatientRegisterPage() {
  const router = useRouter();
  const { registerPatient } = useAuth();
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
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

    // Create the registration payload
    const registrationData: Partial<PatientRegistrationPayload> = {
      email,
      password,
      userType: UserType.PATIENT,
      firstName,
      lastName,
      dateOfBirth,
      // Convert the gender string to the correct type
      gender: gender as any, // Using any as a temporary workaround
    };
    
    // Validate using Zod schema
    const result = PatientRegistrationSchema.safeParse(registrationData);
    
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
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const { dateOfBirth, allergiesText, medicalHistoryText, ...restFormData } = {
        dateOfBirth,
        allergiesText,
        medicalHistoryText,
        email,
        password,
        userType: UserType.PATIENT,
        firstName,
        lastName,
        gender,
        phone,
      };
      
      // Format allergies into an array
      const allergies = allergiesText ? allergiesText.split(',').map(item => item.trim()) : [];
      
      try {
        logInfo('patient_registration', { email });
        
        // Format the date properly for API
        const formattedDateOfBirth = formatDateForApi(dateOfBirth);
        
        // Right before calling registerPatient
        if (dateOfBirth && !dateOfBirth.includes('T')) {
          // Convert YYYY-MM-DD to ISO format
          dateOfBirth = `${dateOfBirth}T00:00:00.000Z`;
        }
        
        // Register patient via auth context
        const result = await registerPatient({
          ...restFormData,
          dateOfBirth,
          gender,
          // Optional fields
          bloodType: undefined, // We're not collecting this in the form
          medicalHistory: undefined, // We're not collecting this in the form
        });
        
        if (result && typeof result === 'object' && 'success' in result && result.success) {
          // Registration successful, redirect to success page
          router.push(`/auth/registration-success?type=${UserType.PATIENT}&email=${encodeURIComponent(email)}`);
        } else {
          // Handle unsuccessful registration
          const errorMessage = result && typeof result === 'object' && 'error' in result 
            ? result.error 
            : 'Registration failed';
          setError(errorMessage as string);
        }
      } catch (err) {
        logError('Error during patient registration', err);
        setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      }
    } catch (err) {
      logError('Error during patient registration', err);
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <Link href="/auth/register">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to options
          </Button>
        </Link>
        <h1 className="text-2xl font-bold mb-2">Create a Patient Account</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Join our platform to easily book appointments and manage your healthcare
        </p>
      </div>
      
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}
      
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
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
          
          {/* Contact Information */}
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
            label="Phone Number (optional)"
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={validationErrors.phone}
            autoComplete="tel"
            placeholder="+1 (123) 456-7890"
          />
          
          {/* Password */}
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
          
          {/* Medical Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Date of Birth"
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                error={validationErrors.dateOfBirth}
                autoComplete="bday"
                required
              />
            </div>
            <div>
              <Select
                label="Gender"
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                error={validationErrors.gender}
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </Select>
            </div>
          </div>
          
          {/* Terms & Privacy */}
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
          
          {/* Submit Button */}
          <div className="mt-6">
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Create Account
            </Button>
          </div>
          
          {/* Sign In Link */}
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