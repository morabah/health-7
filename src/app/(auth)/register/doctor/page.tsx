'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Stethoscope } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { logInfo, logWarn } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { UserType } from '@/types/enums';

/**
 * Doctor Registration Page
 * Allows healthcare providers to register as a doctor
 *
 * @returns Doctor registration form component
 */
export default function DoctorRegistrationPage() {
  const router = useRouter();
  const { registerDoctor, loading, error } = useAuth();
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
    bio: '',
    profilePicFile: null as File | null,
    licenseFile: null as File | null,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      return; // Input component should show validation error
    }

    // Log registration attempt
    logInfo('auth-event', {
      action: 'doctor-register-attempt',
      email: formData.email,
      specialty: formData.specialty,
      timestamp: new Date().toISOString(),
    });

    // For files, we're using placeholder URLs in Phase-4
    if (formData.profilePicFile || formData.licenseFile) {
      logWarn('Doctor registration', {
        message:
          'Using placeholder URLs for files in Phase-4. Real uploads will be implemented later.',
        email: formData.email,
      });
    }

    // Prepare registration payload
    const registrationPayload = {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      userType: UserType.DOCTOR,
      specialty: formData.specialty,
      licenseNumber: formData.licenseNumber,
      yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
      // Use placeholder URLs for files
      profilePictureUrl: formData.profilePicFile ? 'local://placeholder/pic.jpg' : null,
      licenseDocumentUrl: formData.licenseFile ? 'local://placeholder/lic.pdf' : null,
    } as const;

    // Attempt registration
    const result = await registerDoctor(registrationPayload);

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
              <Stethoscope size={20} /> Doctor Registration
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Create your healthcare provider account
          </p>
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

          <div>
            <label
              htmlFor="profilePicFile"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Profile Picture
            </label>
            <input
              id="profilePicFile"
              name="profilePicFile"
              type="file"
              accept="image/*"
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white dark:border-slate-600"
              onChange={handleFileChange}
            />
            <p className="text-xs text-slate-500 mt-1">
              Upload a professional photo for your profile.
            </p>
          </div>

          <div>
            <label
              htmlFor="licenseFile"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              License Document
            </label>
            <input
              id="licenseFile"
              name="licenseFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white dark:border-slate-600"
              onChange={handleFileChange}
            />
            <p className="text-xs text-slate-500 mt-1">
              Upload your medical license or certification for verification (PDF or image).
            </p>
          </div>

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
