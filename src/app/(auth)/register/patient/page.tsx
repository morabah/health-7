'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { logInfo } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { UserType } from '@/types/enums';

/**
 * Patient Registration Page
 * Allows users to register as a patient
 *
 * @returns Patient registration form component
 */
export default function PatientRegistrationPage() {
  const router = useRouter();
  const { registerPatient, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    medicalHistory: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      return; // Input component should show validation error
    }

    // Log registration attempt
    logInfo('auth-event', {
      action: 'patient-register-attempt',
      email: formData.email,
      timestamp: new Date().toISOString(),
    });

    // Prepare registration payload
    const registrationPayload = {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      userType: UserType.PATIENT,
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender || undefined,
      bloodType: formData.bloodType || undefined,
      medicalHistory: formData.medicalHistory || undefined,
    } as const;

    // Attempt registration
    const result = await registerPatient(registrationPayload);

    if (result.success) {
      // Registration successful, redirect to pending verification
      router.push('/auth/pending-verification');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus size={20} /> Patient Registration
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Create your patient account</p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

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

          <Input
            id="phone"
            name="phone"
            type="tel"
            label="Phone Number (optional)"
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

          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            required
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={
              formData.confirmPassword && formData.password !== formData.confirmPassword
                ? 'Passwords do not match'
                : ''
            }
          />

          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            label="Date of Birth"
            required
            value={formData.dateOfBirth}
            onChange={handleChange}
          />

          <Select
            id="gender"
            name="gender"
            label="Gender"
            required
            value={formData.gender}
            onChange={handleChange}
          >
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </Select>

          <Select
            id="bloodType"
            name="bloodType"
            label="Blood Type (optional)"
            value={formData.bloodType}
            onChange={handleChange}
          >
            <option value="">Select blood type</option>
            <option value="A_POSITIVE">A+</option>
            <option value="A_NEGATIVE">A-</option>
            <option value="B_POSITIVE">B+</option>
            <option value="B_NEGATIVE">B-</option>
            <option value="AB_POSITIVE">AB+</option>
            <option value="AB_NEGATIVE">AB-</option>
            <option value="O_POSITIVE">O+</option>
            <option value="O_NEGATIVE">O-</option>
          </Select>

          <Input
            id="medicalHistory"
            name="medicalHistory"
            label="Medical History (optional)"
            placeholder="Brief medical history, allergies, etc."
            value={formData.medicalHistory}
            onChange={handleChange}
          />

          <Button type="submit" className="w-full" isLoading={loading}>
            Register
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
