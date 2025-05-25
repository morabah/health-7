'use client';

import React, { useState, useRef, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { ChevronLeft, Eye, EyeOff, Upload, X, FileText, User } from 'lucide-react';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { callApi } from '@/lib/apiClient';
import { storage } from '@/lib/realFirebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { UserType } from '@/types/enums';
import { z } from 'zod';

// Backend-compatible schema for doctor registration
const DoctorRegisterSchema = z.object({
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

  userType: z.literal(UserType.DOCTOR),

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

  specialty: z
    .string()
    .min(3, 'Specialty must be at least 3 characters')
    .max(100, 'Specialty is too long'),

  licenseNumber: z
    .string()
    .min(5, 'License number must be at least 5 characters')
    .max(50, 'License number is too long'),

  yearsOfExperience: z
    .number()
    .int('Experience must be a whole number')
    .min(0, 'Experience cannot be negative')
    .max(70, 'Please enter a valid years of experience')
    .optional()
    .default(0),

  profilePictureUrl: z.string().optional().nullable(),
  licenseDocumentUrl: z.string().optional().nullable(),
  bio: z.string().optional(),
  consultationFee: z.number().optional(),
  languages: z.array(z.string()).optional(),
  educationHistory: z.array(z.any()).optional(),
  experienceHistory: z.array(z.any()).optional(),
});

type DoctorRegisterData = z.infer<typeof DoctorRegisterSchema>;

/**
 * Doctor registration form component
 * Connects to live registerUser Cloud Function with file upload capabilities
 */
export default function DoctorRegisterPage() {
  const router = useRouter();

  // Form state - all fields from DoctorRegisterSchema
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('');

  // File upload state
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [profilePicUploadProgress, setProfilePicUploadProgress] = useState<number | null>(null);
  const [licenseUploadProgress, setLicenseUploadProgress] = useState<number | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // File input refs
  const profilePicInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file upload to Firebase Storage
   * @param file - File to upload
   * @param path - Storage path for the file
   * @param progressSetter - Function to update upload progress
   * @returns Promise resolving to download URL
   */
  const handleFileUpload = useCallback(async (
    file: File, 
    path: string, 
    progressSetter: (progress: number | null) => void
  ): Promise<string> => {
    const perf = trackPerformance(`fileUpload:${path}`);
    logInfo('Starting file upload', { fileName: file.name, path, size: file.size });

    try {
      // Check if storage is available
      if (!storage) {
        throw new Error('Storage service not available.');
      }

      // Create storage reference
      const storageRef = ref(storage, path);

      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Set up progress listener and wait for completion
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Update progress
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressSetter(progress);
            logInfo('Upload progress', { path, progress: Math.round(progress) });
          },
          (error) => {
            // Handle upload error
            logError('File upload failed', { path, error });
            progressSetter(null);
            perf.stop();
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            try {
              // Upload completed successfully, get download URL
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              logInfo('File upload completed successfully', { path, downloadUrl });
              progressSetter(null);
              perf.stop();
              resolve(downloadUrl);
            } catch (error) {
              logError('Failed to get download URL', { path, error });
              progressSetter(null);
              perf.stop();
              reject(new Error('Failed to get file URL after upload'));
            }
          }
        );
      });

    } catch (error: any) {
      logError('File upload error', { path, error });
      progressSetter(null);
      perf.stop();
      throw new Error(`File upload failed: ${error.message}`);
    }
  }, []);

  /**
   * Handle doctor registration form submission
   * Uploads files to Firebase Storage then calls the live registerUser Cloud Function
   */
  const handleDoctorRegister = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setProfilePicUploadProgress(null);
    setLicenseUploadProgress(null);

    const perf = trackPerformance('handleDoctorRegisterSubmit_Live');
    logInfo('Doctor registration attempt started (Live Cloud)', { email });

    try {
      // Client-side validation - password confirmation
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        setIsLoading(false);
        perf.stop();
        return;
      }

      // Prepare data payload for validation
      const experienceNum = parseInt(yearsOfExperience) || 0;
      const feeNum = consultationFee ? parseFloat(consultationFee) : undefined;

      const dataObject: Omit<DoctorRegisterData, 'profilePictureUrl' | 'licenseDocumentUrl'> & {
        profilePictureUrl?: string | null;
        licenseDocumentUrl?: string | null;
      } = {
        email,
        password,
        firstName,
        lastName,
        userType: UserType.DOCTOR,
        phone: phone || undefined,
        specialty,
        licenseNumber,
        yearsOfExperience: experienceNum,
        bio: bio || undefined,
        consultationFee: feeNum,
        profilePictureUrl: null,
        licenseDocumentUrl: null,
      };

      // Client-side Zod validation (without file URLs first)
      const validationResult = DoctorRegisterSchema.safeParse({
        ...dataObject,
        profilePictureUrl: null,
        licenseDocumentUrl: null,
      });
      
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || 'Please check your input and try again.';
        setErrorMsg(errorMessage);
        setIsLoading(false);
        perf.stop();
        return;
      }

      logInfo('Client-side validation passed for doctor registration');

      // File Upload Logic
      let profilePicUrl: string | null = null;
      let licenseUrl: string | null = null;

      try {
        // Upload profile picture if provided
        if (profilePicFile) {
          const profilePath = `doctors/TEMP_REG_${Date.now()}/profile.${profilePicFile.name.split('.').pop()}`;
          profilePicUrl = await handleFileUpload(profilePicFile, profilePath, setProfilePicUploadProgress);
        }

        // Upload license document if provided
        if (licenseFile) {
          const licensePath = `doctors/TEMP_REG_${Date.now()}/license.${licenseFile.name.split('.').pop()}`;
          licenseUrl = await handleFileUpload(licenseFile, licensePath, setLicenseUploadProgress);
        }

        logInfo('Doctor registration files uploaded successfully (or skipped)', {
          profilePicUrl: !!profilePicUrl,
          licenseUrl: !!licenseUrl
        });

      } catch (uploadError: any) {
        logError('File upload failed during doctor registration', uploadError);
        setErrorMsg(`File upload failed: ${uploadError.message}`);
        setIsLoading(false);
        perf.stop();
        return;
      }

      // Update data object with file URLs
      dataObject.profilePictureUrl = profilePicUrl;
      dataObject.licenseDocumentUrl = licenseUrl;

      // Call backend via callApi wrapper
      logInfo('Calling registerUser function for DOCTOR (Live Cloud)', { 
        email: dataObject.email,
        hasProfilePic: !!profilePicUrl,
        hasLicense: !!licenseUrl
      });

      // Call the live registerUser Cloud Function
      const result = await callApi<{ success: boolean; userId: string }>(
        'registerUser',
        dataObject
      );

      logInfo('Doctor registration successful (Live Cloud)', { 
        userId: result.userId,
        email: dataObject.email 
      });

      perf.stop();
      
      // Navigate to pending verification page after successful registration
      router.push('/auth/pending-verification');

    } catch (error: any) {
      logError('Doctor registration failed (Live Cloud)', error);
      
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
      setProfilePicUploadProgress(null);
      setLicenseUploadProgress(null);
      perf.stop();
    }
  }, [
    email, password, confirmPassword, firstName, lastName, phone, 
    specialty, licenseNumber, yearsOfExperience, bio, consultationFee,
    profilePicFile, licenseFile, handleFileUpload, router
  ]);

  // Handle file selection
  const handleProfilePicSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setProfilePicFile(file);
  };

  const handleLicenseSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setLicenseFile(file);
  };

  // Remove selected files
  const removeProfilePic = () => {
    setProfilePicFile(null);
    if (profilePicInputRef.current) {
      profilePicInputRef.current.value = '';
    }
  };

  const removeLicense = () => {
    setLicenseFile(null);
    if (licenseInputRef.current) {
      licenseInputRef.current.value = '';
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
    'Urology',
  ];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <Link href="/auth/register">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to options
          </Button>
        </Link>
        <h1 className="text-2xl font-bold mb-2">Create a Doctor Account</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Join our platform to connect with patients and grow your practice
        </p>
      </div>

      {errorMsg && (
        <Alert variant="error" className="mb-6" role="alert">
          {errorMsg}
        </Alert>
      )}

      <Card className="p-6">
        <form
          onSubmit={handleDoctorRegister}
          className="space-y-6"
          aria-labelledby="registration-form-title"
        >
          <div className="sr-only" id="registration-form-title">
            Doctor Registration Form
          </div>

          {/* Personal Information */}
          <div>
            <h2 className="text-lg font-medium mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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

          {/* Professional Information */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h2 className="text-lg font-medium mb-4">Professional Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Specialty"
                id="specialty"
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                required
                disabled={isLoading}
              >
                <option value="">Select specialty</option>
                {specialties.map(spec => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </Select>
              <Input
                label="License Number"
                id="licenseNumber"
                value={licenseNumber}
                onChange={e => setLicenseNumber(e.target.value)}
                required
                disabled={isLoading}
                aria-required="true"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label="Years of Experience"
                id="yearsOfExperience"
                type="number"
                min="0"
                max="70"
                value={yearsOfExperience}
                onChange={e => setYearsOfExperience(e.target.value)}
                disabled={isLoading}
                helpText="Enter 0 if you're a new graduate"
              />
              <Input
                label="Consultation Fee (optional)"
                id="consultationFee"
                type="number"
                min="0"
                step="0.01"
                value={consultationFee}
                onChange={e => setConsultationFee(e.target.value)}
                disabled={isLoading}
                placeholder="0.00"
                helpText="Fee per consultation in USD"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bio (optional)
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                disabled={isLoading}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                rows={3}
                placeholder="Brief description of your practice and approach..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {bio.length}/500 characters
              </p>
            </div>
          </div>

          {/* File Uploads */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h2 className="text-lg font-medium mb-4">Documents</h2>
            
            {/* Profile Picture Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Picture (optional)
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4">
                {profilePicFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="w-8 h-8 text-primary mr-3" />
                      <div>
                        <p className="text-sm font-medium">{profilePicFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(profilePicFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeProfilePic}
                      disabled={isLoading || profilePicUploadProgress !== null}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <User className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                      Upload a professional profile picture
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => profilePicInputRef.current?.click()}
                      disabled={isLoading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                )}
                
                {profilePicUploadProgress !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading profile picture...</span>
                      <span>{Math.round(profilePicUploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${profilePicUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <input
                  ref={profilePicInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicSelect}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* License Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Medical License Document (optional)
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4">
                {licenseFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-8 h-8 text-primary mr-3" />
                      <div>
                        <p className="text-sm font-medium">{licenseFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(licenseFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeLicense}
                      disabled={isLoading || licenseUploadProgress !== null}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                      Upload your medical license or certification
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => licenseInputRef.current?.click()}
                      disabled={isLoading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                )}
                
                {licenseUploadProgress !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading license document...</span>
                      <span>{Math.round(licenseUploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${licenseUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <input
                  ref={licenseInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleLicenseSelect}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: PDF, DOC, DOCX, JPG, PNG (max 10MB)
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5"
              disabled={isLoading || profilePicUploadProgress !== null || licenseUploadProgress !== null}
              aria-busy={isLoading ? 'true' : 'false'}
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {profilePicUploadProgress !== null || licenseUploadProgress !== null 
                    ? 'Uploading files...' 
                    : 'Creating account...'}
                </>
              ) : (
                'Create Doctor Account'
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
