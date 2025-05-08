// localApiCore.ts
// Core API logic, types, and utilities split from localApiFunctions.ts to resolve Fast Refresh warnings.

import { z } from 'zod';
import type { VerificationStatus } from '@/types/enums';
import { UserType } from '@/types/enums';

// For development only - a simple password store
// In a real app, passwords would be hashed and stored in a secure database
export const userPasswords: Record<string, string> = {};

// Type definition for extended doctor profile to include rating and reviewCount
export interface ExtendedDoctorProfile {
  userId: string;
  specialty: string;
  licenseNumber: string;
  yearsOfExperience: number;
  bio: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  licenseDocumentUrl: string | null;
  certificateUrl: string | null;
  issuingAuthority: string | null;
  education: string | null;
  location: string | null;
  languages: string[] | null;
  consultationFee: number | null;
  createdAt: string;
  updatedAt: string;
  blockedDates?: string[];
  profilePictureUrl?: string | null;
  rating?: number;
  reviewCount?: number;
  servicesOffered?: string | null;
  educationHistory?: { institution: string; degree: string; year: string }[];
  experience?: { position: string; hospital: string; duration: string }[];
  timezone?: string;
  weeklySchedule?: Record<
    string,
    Array<{ startTime: string; endTime: string; isAvailable: boolean }>
  >;
}

// Define the RegisterSchema
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  userType: z.nativeEnum(UserType),
  // Patient-specific fields
});

// Utility functions
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
export function nowIso(): string {
  return new Date().toISOString();
}
export function sleep(ms: number = 200): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class LocalApiError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'LocalApiError';
  }
}
export type ResultOk<T> = { success: true } & T;
export type ResultErr = { success: false; error: string; details?: unknown };
export function notImpl(fn: string): never {
  throw new LocalApiError('not-implemented', `${fn} is not implemented in localApiCore.`);
}
