/**
 * Local type definitions for Firebase Functions
 * Simplified versions of the main project types to avoid complex Zod compilation issues
 */

// Simplified UserType enum
export enum UserType {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

// Simplified VerificationStatus enum
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

// Simplified UserProfile interface
export interface UserProfile {
  id: string;
  email: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  userType: UserType;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  profilePictureUrl?: string | null;
}

// Simplified PatientProfile interface
export interface PatientProfile {
  userId: string;
  id?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodType?: string | null;
  medicalHistory?: string | null;
  address?: string | null;
}

// Simplified DoctorProfile interface
export interface DoctorProfile {
  userId: string;
  id?: string;
  specialty: string;
  licenseNumber: string;
  yearsOfExperience: number;
  bio?: string | null;
  consultationFee?: number | null;
  verificationStatus: VerificationStatus;
  isAvailable?: boolean;
  languages?: string[];
  educationHistory?: any[];
  experienceHistory?: any[];
  weeklySchedule?: any;
  verificationDocuments?: any[];
  profilePictureUrl?: string | null;
  licenseDocumentUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
} 