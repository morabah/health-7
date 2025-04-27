'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { User, Save, Upload, GraduationCap, Stethoscope } from 'lucide-react';

// Sample initial profile data
const initialProfile = {
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'dr.sarah@example.com',
  phone: '+1 (555) 123-4567',
  specialty: 'cardiology',
  licenseNumber: 'MD12345678',
  yearsOfExperience: '8',
  location: '123 Medical Center, Suite 101, New York, NY',
  languages: ['english', 'spanish'],
  consultationFee: '150',
  bio: 'Board-certified cardiologist with 8 years of experience specializing in preventive cardiology and heart disease management.',
  education: [
    { institution: 'Johns Hopkins School of Medicine', degree: 'MD', year: '2010' },
    { institution: 'University of Michigan', degree: 'BS in Biology', year: '2006' },
  ],
  services:
    'Cardiac consultation, ECG, stress tests, heart disease management, preventive cardiology',
  verificationStatus: 'pending',
};

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Updated profile:', profile);
    setIsEditing(false);
    // In a real app, this would save to backend
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doctor Profile</h1>
        <Button
          variant={isEditing ? 'secondary' : 'primary'}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      {profile.verificationStatus === 'pending' && (
        <div className="flex items-center justify-between p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
          <div className="flex items-center">
            <User className="h-5 w-5 mr-2 text-warning" />
            <span>
              Your profile is pending verification. Our team will review your credentials shortly.
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
              <User className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Personal Information</h2>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="firstName"
                name="firstName"
                label="First Name"
                value={profile.firstName}
                onChange={handleChange}
                required
                disabled={!isEditing}
              />
              <Input
                id="lastName"
                name="lastName"
                label="Last Name"
                value={profile.lastName}
                onChange={handleChange}
                required
                disabled={!isEditing}
              />
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Input
                  id="phone"
                  name="phone"
                  label="Phone Number"
                  value={profile.phone}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>
          </Card>

          {/* Professional Information */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
              <Stethoscope className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Professional Information</h2>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="specialty"
                name="specialty"
                label="Specialty"
                value={profile.specialty}
                onChange={handleChange}
                disabled={!isEditing}
              />
              <div className="relative">
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  label="License Number"
                  value={profile.licenseNumber}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Input
                  id="yearsOfExperience"
                  name="yearsOfExperience"
                  label="Years of Experience"
                  type="number"
                  value={profile.yearsOfExperience}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Input
                  id="location"
                  name="location"
                  label="Practice Location"
                  value={profile.location}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
              <Input
                id="languages"
                name="languages"
                label="Languages Spoken"
                value={profile.languages.join(', ')}
                onChange={handleChange}
                disabled={!isEditing}
              />
              <div className="relative">
                <Input
                  id="consultationFee"
                  name="consultationFee"
                  label="Consultation Fee ($)"
                  type="number"
                  value={profile.consultationFee}
                  onChange={handleChange}
                  required
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>
          </Card>

          {/* Biography & Services */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Biography & Services</h2>
            </div>
            <div className="p-4 space-y-4">
              <Textarea
                id="bio"
                name="bio"
                label="Professional Biography"
                value={profile.bio}
                onChange={handleChange}
                rows={4}
                disabled={!isEditing}
              />
              <Textarea
                id="services"
                name="services"
                label="Services Offered"
                value={profile.services}
                onChange={handleChange}
                rows={3}
                disabled={!isEditing}
                placeholder="List the medical services you provide (comma-separated)"
              />
            </div>
          </Card>

          {/* Verification Documents */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
              <Upload className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Verification Documents</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 flex flex-col items-center justify-center">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-3 mb-2">
                    <Upload className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="font-medium">Medical License</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    license_scan.pdf
                  </p>
                  <Button variant="outline" size="sm" disabled={!isEditing}>
                    <Upload className="h-4 w-4 mr-2" />
                    Replace Document
                  </Button>
                </div>

                <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 flex flex-col items-center justify-center">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-3 mb-2">
                    <User className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="font-medium">Profile Photo</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    profile_photo.jpg
                  </p>
                  <Button variant="outline" size="sm" disabled={!isEditing}>
                    <Upload className="h-4 w-4 mr-2" />
                    Update Photo
                  </Button>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-md bg-slate-50 dark:bg-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <User className="h-4 w-4 inline mr-1 text-warning" />
                  Documents are reviewed by our team during the verification process. Please ensure
                  all uploads are clear and current.
                </p>
              </div>
            </div>
          </Card>

          {/* Submit Button */}
          {isEditing && (
            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
