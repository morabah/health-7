/**
 * Zod schemas for API function inputs/outputs
 * These schemas validate data passing between client and server functions
 */

import { z } from 'zod';
import {
  AppointmentType,
  DocumentType,
  UserType,
  VerificationStatus,
} from '../types/enums';

/**
 * Schema for completing an appointment by a doctor
 */
export const CompleteAppointmentSchema = z.object({
  appointmentId: z
    .string()
    .min(1, 'Appointment ID is required')
    .describe('ID of the appointment to complete'),

  notes: z
    .string()
    .max(2000, 'Notes cannot exceed 2000 characters')
    .optional()
    .describe('@PHI - Medical notes from the appointment'),
});

/**
 * Schema for setting/updating a doctor's availability
 */
export const SetAvailabilitySchema = z.object({
  dayOfWeek: z
    .number()
    .int()
    .min(0)
    .max(6)
    .describe(
      'Day of week (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)'
    ),

  availableSlots: z
    .array(
      z.object({
        startTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)')
          .describe('Start time in 24-hour format (HH:MM)'),

        endTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)')
          .describe('End time in 24-hour format (HH:MM)'),
      })
    )
    .min(0)
    .describe('Array of available time slots for this day'),

  isAvailableAllDay: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether the doctor is available all day (simplifies UI, overrides slots)'),

  isUnavailableAllDay: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether the doctor is not available at all this day (simplifies UI, overrides slots)'
    ),
});

/**
 * Schema for searching/finding available doctors
 */
export const FindDoctorsSchema = z.object({
  specialty: z.string().optional(),
  location: z.string().optional(),
  language: z.string().optional(),
  maxPrice: z.number().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

/**
 * Schema for retrieving a doctor's public profile
 */
export const GetDoctorPublicProfileSchema = z.object({
  doctorId: z
    .string()
    .min(1, 'Doctor ID is required')
    .describe('ID of the doctor to retrieve profile for'),
});

/**
 * Schema for retrieving available appointment slots for a doctor
 */
export const GetAvailableSlotsSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  startDate: z.string(),
  endDate: z.string().optional(),
});

/**
 * Schema for booking an appointment with a doctor
 */
export const BookAppointmentSchema = z.object({
  doctorId: z
    .string()
    .min(1, 'Doctor ID is required')
    .describe('ID of the doctor for the appointment'),

  appointmentDate: z.string(),

  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)')
    .describe('Start time of the appointment (HH:MM format)'),

  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)')
    .describe('End time of the appointment (HH:MM format)'),

  reason: z
    .string()
    .max(1000, 'Reason exceeds maximum length')
    .optional()
    .describe('@PHI - Reason for the appointment'),

  appointmentType: z
    .nativeEnum(AppointmentType)
    .optional()
    .default(AppointmentType.IN_PERSON)
    .describe('Type of appointment (in-person or video)'),
});

/**
 * Schema for cancelling an appointment
 */
export const CancelAppointmentSchema = z.object({
  appointmentId: z
    .string()
    .min(1, 'Appointment ID is required')
    .describe('ID of the appointment to cancel'),

  cancellationReason: z
    .string()
    .max(500, 'Reason exceeds maximum length')
    .optional()
    .describe('Optional reason for cancellation'),
});

/**
 * Schema for marking notifications as read
 */
export const MarkNotificationReadSchema = z.object({
  notificationId: z
    .string()
    .min(1, 'Notification ID is required')
    .describe('ID of the notification to mark as read'),

  isRead: z.boolean().default(true).describe('New read status (defaults to true)'),
});

/**
 * Schema for admin verification of a doctor
 */
export const AdminVerifyDoctorSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required').describe('ID of the doctor to verify'),

  verificationStatus: z.nativeEnum(VerificationStatus).describe('New verification status to set'),

  notes: z
    .string()
    .max(1000, 'Notes exceed maximum length')
    .optional()
    .describe('Additional notes regarding verification decision'),
});

/**
 * Schema for admin retrieval of all users
 */
export const AdminGetAllUsersSchema = z.object({
  userType: z.nativeEnum(UserType).optional().describe('Filter by user type'),

  isActive: z.boolean().optional().describe('Filter by active status'),

  searchTerm: z.string().optional().describe('Search term for name or email'),

  page: z.number().int().min(1).optional().default(1).describe('Page number for pagination'),

  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe('Number of results per page'),

  sortBy: z
    .enum(['createdAt', 'firstName', 'lastName', 'email'])
    .optional()
    .default('createdAt')
    .describe('Field to sort results by'),

  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
    .describe('Order to sort results (ascending or descending)'),
});

/**
 * Schema for admin updating a user's status
 */
export const AdminUpdateUserStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required').describe('ID of the user to update status for'),

  isActive: z.boolean().describe('New active status to set'),

  notes: z
    .string()
    .max(500, 'Notes exceed maximum length')
    .optional()
    .describe('Reason for status change'),
});

/**
 * Schema for admin triggering a password reset
 */
export const AdminTriggerResetSchema = z.object({
  userId: z.string().min(1, 'User ID is required').describe('ID of the user to trigger reset for'),

  notifyUser: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to send an email notification to the user'),
});

/**
 * Schema for admin creating a new user
 */
export const AdminCreateUserSchema = z.object({
  email: z.string().email('Invalid email format').describe("User's email address"),

  phone: z.string().optional().describe("User's phone number"),

  firstName: z.string().min(1, 'First name is required').describe("User's first name"),

  lastName: z.string().min(1, 'Last name is required').describe("User's last name"),

  userType: z.nativeEnum(UserType).describe('The type of user to create'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .describe('Initial password (will require change on first login)'),

  sendWelcomeEmail: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to send a welcome email'),
});

/**
 * Schema for admin retrieving detailed user information
 */
export const AdminGetUserDetailSchema = z.object({
  userId: z
    .string()
    .min(1, 'User ID is required')
    .describe('ID of the user to retrieve details for'),
});

/**
 * Schema for adding a verification document
 */
export const AddVerificationDocumentSchema = z.object({
  documentType: z.nativeEnum(DocumentType).describe('Type of verification document'),

  fileUrl: z.string().url('Invalid file URL').describe('URL to the uploaded document file'),

  description: z
    .string()
    .max(500, 'Description is too long (max 500 characters)')
    .optional()
    .describe('Additional details about the document'),
});

/**
 * Schema for retrieving a doctor's verification documents
 * No input needed, uses context from the authenticated user
 */
export const GetMyVerificationDocumentsSchema = z.object({});

/**
 * Base schema for user registration (common fields)
 */
const BaseRegistrationSchema = z.object({
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

  userType: z.nativeEnum(UserType),

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
});

/**
 * Schema for patient registration payload
 */
export const PatientRegisterSchema = BaseRegistrationSchema.extend({
  userType: z.literal(UserType.PATIENT),
  dateOfBirth: z.string().optional().describe("Patient's date of birth (ISO string)"),
  gender: z.string().optional().describe("Patient's gender"),
  bloodType: z.string().optional().describe("Patient's blood type"),
  medicalHistory: z.string().optional().describe("Patient's medical history"),
  address: z.string().optional().describe("Patient's address"),
  profilePictureUrl: z.string().optional().nullable(),
});

/**
 * Schema for doctor registration payload
 */
export const DoctorRegisterSchema = BaseRegistrationSchema.extend({
  userType: z.literal(UserType.DOCTOR),
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

/**
 * Combined schema for user registration (discriminated union)
 */
export const RegisterSchema = z.discriminatedUnion('userType', [
  PatientRegisterSchema,
  DoctorRegisterSchema,
]);
