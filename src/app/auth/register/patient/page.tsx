'use client';

import React, { useState, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { callApi } from '@/lib/apiClient';
import { UserType, Gender, BloodType } from '@/types/enums';
import { z } from 'zod';

// Import the backend schema for validation
const PatientRegisterSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(5, 'Email is too short')
    .max(100, 'Email is too long'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  userType: z.literal(UserType.PATIENT),

  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name is too long'),

  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name is too long'),

  phone: z
    .string()
    .optional()
    .describe("User's phone number (E.164 format preferred)"),

  dateOfBirth: z.string().optional().describe("Patient's date of birth (ISO string)"),
  gender: z.string().optional().describe("Patient's gender"),
  bloodType: z.string().optional().describe("Patient's blood type"),
  medicalHistory: z.string().optional().describe("Patient's medical history"),
  address: z.string().optional().describe("Patient's address"),
});

type PatientRegisterData = z.infer<typeof PatientRegisterSchema>;

/**
 * Patient registration form component
 * Connects to live registerUser Cloud Function for user creation
 */
export default function PatientRegisterPage() {
  const router = useRouter();

  // Form state - all fields from PatientRegisterSchema
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [address, setAddress] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Handle patient registration form submission
   * Calls the live registerUser Cloud Function
   */
  const handlePatientRegister = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const perf = trackPerformance('handlePatientRegisterSubmit_Live');
    logInfo('Patient registration attempt started (Live Cloud)', { email });

    try {
      // Client-side validation - password confirmation
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        setIsLoading(false);
        perf.stop();
        return;
      }

      // Prepare data payload for registration
      const dataObject: PatientRegisterData = {
        email,
        password,
        firstName,
        lastName,
        userType: UserType.PATIENT,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        bloodType: bloodType || undefined,
        medicalHistory: medicalHistory || undefined,
        address: address || undefined,
      };

      // Client-side Zod validation
      const validationResult = PatientRegisterSchema.safeParse(dataObject);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || 'Please check your input and try again.';
        setErrorMsg(errorMessage);
        setIsLoading(false);
        perf.stop();
        return;
      }

      logInfo('Client-side validation passed for patient registration');

      // Call backend via callApi wrapper
      logInfo('Calling registerUser function for PATIENT (Live Cloud)', { 
        email: dataObject.email 
      });

      // Call the live registerUser Cloud Function
      const result = await callApi<{ success: boolean; userId: string }>(
        'registerUser',
        validationResult.data
      );

      logInfo('Patient registration successful (Live Cloud)', { 
        userId: result.userId,
        email: dataObject.email 
      });

      perf.stop();
      
      // Navigate to pending verification page after successful registration
      router.push('/auth/pending-verification');

    } catch (error: any) {
      logError('Patient registration failed (Live Cloud)', error);
      
      // Display user-friendly error message based on error type
      let friendlyMessage = 'Registration failed. Please try again.';
      
      if (error.message) {
        if (error.message.includes('already in use') || error.message.includes('already-exists')) {
          friendlyMessage = 'An account with this email address already exists. Please use a different email or try logging in.';
        } else if (error.message.includes('invalid-argument') || error.message.includes('invalid')) {
          friendlyMessage = error.message; // Use the specific validation message from backend
        } else if (error.message.includes('internal')) {
          friendlyMessage = 'A server error occurred. Please try again in a few moments.';
        } else {
          friendlyMessage = error.message;
        }
      }
      
      setErrorMsg(friendlyMessage);
    } finally {
      setIsLoading(false);
      perf.stop();
    }
  }, [
    email, password, confirmPassword, firstName, lastName, phone, 
    dateOfBirth, gender, bloodType, medicalHistory, address, router
  ]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <Link href="/auth/register">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to options
          </Button>
        </Link>
        <h1 className="text-2xl font-bold mb-2">Create a Patient Account</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Join our platform to easily book appointments and manage your healthcare
        </p>
      </div>

      {errorMsg && (
        <Alert variant="error" className="mb-6" role="alert">
          {errorMsg}
        </Alert>
      )}

      <Card className="p-6">
        <form
          onSubmit={handlePatientRegister}
          className="space-y-4"
          aria-labelledby="registration-form-title"
        >
          <div className="sr-only" id="registration-form-title">
            Patient Registration Form
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="First Name"
                id="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
                disabled={isLoading}
                aria-required="true"
              />
            </div>
            <div>
              <Input
                label="Last Name"
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                autoComplete="family-name"
                required
                disabled={isLoading}
                aria-required="true"
              />
            </div>
          </div>

          {/* Contact Information */}
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={isLoading}
            aria-required="true"
            placeholder="your.email@example.com"
          />

          <Input
            label="Phone Number (optional)"
            id="phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            autoComplete="tel"
            disabled={isLoading}
            placeholder="+1 (123) 456-7890"
            helpText="Include country code for international numbers"
          />

          {/* Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="Password"
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isLoading}
                aria-required="true"
                helpText="Must contain uppercase, lowercase, and number"
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
            <div>
              <Input
                label="Confirm Password"
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isLoading}
                aria-required="true"
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
                onChange={e => setDateOfBirth(e.target.value)}
                autoComplete="bday"
                disabled={isLoading}
                helpText="Must be 18+ years old"
              />
            </div>
            <div>
              <Select
                label="Gender (optional)"
                id="gender"
                value={gender}
                onChange={e => setGender(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select gender</option>
                <option value={Gender.MALE}>Male</option>
                <option value={Gender.FEMALE}>Female</option>
                <option value={Gender.OTHER}>Other / Prefer not to say</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                label="Blood Type (optional)"
                id="bloodType"
                value={bloodType}
                onChange={e => setBloodType(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select blood type</option>
                <option value={BloodType.A_POSITIVE}>A+</option>
                <option value={BloodType.A_NEGATIVE}>A-</option>
                <option value={BloodType.B_POSITIVE}>B+</option>
                <option value={BloodType.B_NEGATIVE}>B-</option>
                <option value={BloodType.AB_POSITIVE}>AB+</option>
                <option value={BloodType.AB_NEGATIVE}>AB-</option>
                <option value={BloodType.O_POSITIVE}>O+</option>
                <option value={BloodType.O_NEGATIVE}>O-</option>
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Medical History (optional)
            </label>
            <textarea
              id="medicalHistory"
              value={medicalHistory}
              onChange={e => setMedicalHistory(e.target.value)}
              disabled={isLoading}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
              placeholder="Any relevant medical conditions, allergies, or notes..."
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {medicalHistory.length}/1000 characters
            </p>
          </div>

          <Input
            label="Address (optional)"
            id="address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            autoComplete="street-address"
            disabled={isLoading}
            placeholder="123 Main St, City, State, ZIP"
            helpText="Your home address for medical records"
          />

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5"
              disabled={isLoading}
              aria-busy={isLoading ? 'true' : 'false'}
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating account...
                </>
              ) : (
                'Create Patient Account'
              )}
            </Button>

            <p className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:text-primary/80 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
