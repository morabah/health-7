/**
 * Shared Zod schemas defining the structure and validation rules for application data types.
 * These schemas are the source of truth, and TypeScript types are inferred from them where possible.
 */

import { z } from 'zod';
import {
  Gender,
  UserType,
  VerificationStatus,
  DocumentType,
  AppointmentStatus,
  AppointmentType,
  BloodType,
  NotificationType,
} from './enums';
// Note: Firestore Timestamps require custom handling or z.instanceof later

/**
 * Zod schema for validating strings that represent a date-time,
 * specifically aiming for ISO 8601 format compatibility (YYYY-MM-DDTHH:mm:ss.sssZ).
 * Useful for data transfer (API) and local JSON storage before converting to/from Date or Timestamp objects.
 */
export const isoDateTimeStringSchema = z
  .string()
  .datetime({
    offset: true,
    message: 'Invalid ISO 8601 datetime string format (e.g., YYYY-MM-DDTHH:mm:ss.sssZ)',
  })
  .describe('ISO 8601 date-time string');

/**
 * Zod schema for Gender enum.
 * Accepts common variations (case-insensitive 'm'/'f'/etc.) and normalizes them
 * to the standard 'MALE', 'FEMALE', or 'OTHER' enum values.
 * Defaults null/empty input to 'OTHER'.
 */
export const genderSchema = z
  .string()
  .nullable() // Handles null input gracefully
  .optional() // Handles undefined input gracefully
  .transform(val => {
    // Normalize input: lowercase and trim whitespace
    const normalized = val?.toLowerCase().trim();

    if (!normalized) return Gender.OTHER; // Default for null/undefined/empty string
    if (['male', 'm'].includes(normalized)) return Gender.MALE;
    if (['female', 'f', 'fem'].includes(normalized)) return Gender.FEMALE;
    // Catches variations like 'prefer_not_to_say' or just 'other'
    if (normalized.includes('other') || normalized.includes('prefer')) return Gender.OTHER;

    // Fallback if input is non-empty but unrecognized
    return Gender.OTHER;
  })
  .pipe(z.nativeEnum(Gender)) // Final check: ensures output is a valid Gender enum member
  .describe("User's self-identified gender (MALE, FEMALE, OTHER)");

/**
 * Zod schema for the data stored within a UserProfile Firestore document (collection 'users').
 * The document ID itself is the Firebase Auth UID and is not part of this schema.
 */
export const UserProfileSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .nullable() // Allow null if primary login is phone
    .describe("User's primary email address."),
  phone: z
    .string()
    .nullable() // Allow null if primary login is email
    .optional() // Make phone optional overall during creation/update
    .describe("User's primary phone number (E.164 format preferred)."),
  firstName: z.string().min(1, 'First name is required.').describe("User's first name."),
  lastName: z.string().min(1, 'Last name is required.').describe("User's last name."),
  userType: z.nativeEnum(UserType).describe("The user's role (PATIENT, DOCTOR, ADMIN)."),
  isActive: z
    .boolean()
    .default(true) // Default user to active
    .describe('Account status (true=active, false=deactivated by admin).'),
  emailVerified: z
    .boolean()
    .default(false)
    .describe("Indicates if the user's email is verified via Firebase Auth."),
  phoneVerified: z
    .boolean()
    .default(false)
    .describe("Indicates if the user's phone is verified (requires separate flow)."),
  phoneVerificationCode: z
    .string()
    .optional()
    .nullable()
    .describe('Verification code sent via SMS'),
  phoneVerificationSentAt: isoDateTimeStringSchema
    .optional()
    .nullable()
    .describe('Timestamp when the phone verification code was last sent'),
  emailVerificationToken: z
    .string()
    .optional()
    .nullable()
    .describe("Token sent to user's email for verification purposes"),
  emailVerificationSentAt: isoDateTimeStringSchema
    .optional()
    .nullable()
    .describe('Timestamp when email verification token was last sent'),
  createdAt: isoDateTimeStringSchema.describe(
    'Stored as ISO in schema; converted to Firestore Timestamp at runtime.'
  ),
  updatedAt: isoDateTimeStringSchema.describe(
    'Stored as ISO in schema; converted to Firestore Timestamp at runtime.'
  ),
  profilePictureUrl: z.string().nullable().optional().describe("URL to the user's profile picture"),
});

/** TypeScript type inferred from UserProfileSchema, adding the 'id' field (Auth UID). */
export type UserProfile = z.infer<typeof UserProfileSchema> & { id: string };

/**
 * Zod schema for the data stored within a PatientProfile Firestore document (collection 'patients').
 * Document ID MUST match the UserProfile ID (Auth UID). Contains PHI.
 */
export const PatientProfileSchema = z.object({
  /** Links to the UserProfile document/Auth UID. Required. */
  userId: z.string().min(1, 'User ID linkage is required').describe('Auth UID / FK'),
  id: z.string().optional().describe('Document ID, if available'),

  /** @PHI Patient's date of birth. Stored as ISO string locally. */
  dateOfBirth: isoDateTimeStringSchema
    .nullable()
    .optional() // Allow optional input, handle default/requirement elsewhere if needed
    .describe("@PHI - Patient's date of birth."),

  /** @PHI Patient's self-identified gender. Uses custom schema for normalization. */
  gender: genderSchema // Apply the transforming gender schema directly
    .describe("@PHI - Patient's gender."),

  /** @PHI Patient's blood type (e.g., 'A+', 'O-'). Max 5 chars. */
  bloodType: z
    .nativeEnum(BloodType)
    .nullable()
    .optional() // Optional field
    .describe("@PHI - Patient's blood type."),

  /** @PHI Detailed patient medical history. Max 4000 chars. */
  medicalHistory: z
    .string()
    .max(4000, 'Medical history is too long (max 4000 characters)')
    .nullable()
    .describe('@PHI – Optional free-text medical history'),

  /** @PHI Patient's address. Max 500 chars. */
  address: z
    .string()
    .max(500, 'Address is too long')
    .nullable()
    .optional()
    .describe("Patient's address"),
});

/** TypeScript type inferred from PatientProfileSchema. Represents patient-specific data. */
export type PatientProfile = z.infer<typeof PatientProfileSchema>;

/**
 * Zod schema for a single education entry in DoctorProfile.educationHistory.
 */
export const EducationEntrySchema = z.object({
  institution: z
    .string()
    .min(1, 'Institution name is required')
    .describe('Name of the educational institution'),

  degree: z.string().min(1, 'Degree is required').describe('Degree or certification obtained'),

  field: z.string().min(1, 'Field of study is required').describe('Field or specialty of study'),

  startYear: z
    .number()
    .int('Start year must be an integer')
    .min(1900, 'Start year must be after 1900')
    .max(new Date().getFullYear(), 'Start year cannot be in the future')
    .describe('Year education began'),

  endYear: z
    .number()
    .int('End year must be an integer')
    .min(1900, 'End year must be after 1900')
    .max(new Date().getFullYear() + 10, 'End year cannot be too far in the future')
    .optional()
    .nullable()
    .describe('Year education completed (null if ongoing)'),

  isOngoing: z
    .boolean()
    .optional()
    .default(false)
    .describe('Indicates if this education is currently in progress'),

  description: z
    .string()
    .max(500, 'Description is too long (max 500 characters)')
    .optional()
    .describe('Additional details about the education'),
});

/**
 * Zod schema for a single experience entry in DoctorProfile.experience.
 */
export const ExperienceEntrySchema = z.object({
  organization: z
    .string()
    .min(1, 'Organization name is required')
    .describe('Name of the organization or employer'),

  position: z.string().min(1, 'Position title is required').describe('Job title or position held'),

  location: z.string().optional().describe('Geographic location of the position'),

  startYear: z
    .number()
    .int('Start year must be an integer')
    .min(1900, 'Start year must be after 1900')
    .max(new Date().getFullYear(), 'Start year cannot be in the future')
    .describe('Year experience began'),

  endYear: z
    .number()
    .int('End year must be an integer')
    .min(1900, 'End year must be after 1900')
    .max(new Date().getFullYear() + 10, 'End year cannot be too far in the future')
    .optional()
    .nullable()
    .describe('Year experience ended (null if ongoing)'),

  isOngoing: z
    .boolean()
    .optional()
    .default(false)
    .describe('Indicates if this position is currently held'),

  description: z
    .string()
    .max(1000, 'Description is too long (max 1000 characters)')
    .optional()
    .describe('Responsibilities and achievements in this position'),
});

/**
 * Zod schema for a time slot within a weekly schedule.
 */
export const TimeSlotSchema = z.object({
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)')
    .describe('Start time in 24-hour format (HH:MM)'),

  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)')
    .describe('End time in 24-hour format (HH:MM)'),

  isAvailable: z
    .boolean()
    .default(true)
    .describe('Whether this time slot is available for booking'),
});

/**
 * Zod schema for the recurring weekly availability schedule.
 */
export const WeeklyScheduleSchema = z.object({
  monday: z
    .array(TimeSlotSchema)
    .optional()
    .default([])
    .describe('Available time slots for Monday'),

  tuesday: z
    .array(TimeSlotSchema)
    .optional()
    .default([])
    .describe('Available time slots for Tuesday'),

  wednesday: z
    .array(TimeSlotSchema)
    .optional()
    .default([])
    .describe('Available time slots for Wednesday'),

  thursday: z
    .array(TimeSlotSchema)
    .optional()
    .default([])
    .describe('Available time slots for Thursday'),

  friday: z
    .array(TimeSlotSchema)
    .optional()
    .default([])
    .describe('Available time slots for Friday'),

  saturday: z
    .array(TimeSlotSchema)
    .optional()
    .default([])
    .describe('Available time slots for Saturday'),

  sunday: z
    .array(TimeSlotSchema)
    .optional()
    .default([])
    .describe('Available time slots for Sunday'),
});

/**
 * Zod schema for DoctorProfile data ('doctors' collection, ID=UID).
 */
export const DoctorProfileSchema = z.object({
  userId: z.string().min(1, 'User ID linkage is required').describe('Auth UID / FK'),

  specialty: z
    .string()
    .min(1, 'Specialty is required')
    .default('General Practice')
    .describe("Doctor's medical specialty"),

  licenseNumber: z
    .string()
    .min(1, 'License number is required')
    .describe('Professional license number'),

  yearsOfExperience: z
    .number()
    .int('Years of experience must be an integer')
    .min(0, 'Years of experience cannot be negative')
    .default(0)
    .describe('Total years of professional experience'),

  bio: z
    .string()
    .max(2000, 'Biography is too long (max 2000 characters)')
    .nullable()
    .describe('@PHI - Doctor biography/summary'),

  verificationStatus: z
    .nativeEnum(VerificationStatus)
    .default(VerificationStatus.PENDING)
    .describe('Current verification status of the doctor'),

  verificationNotes: z.string().nullable().describe('Notes from admin regarding verification'),

  adminNotes: z.string().optional().describe('Internal admin notes'),

  location: z.string().nullable().describe('Primary practice location'),

  education: z
    .string()
    .max(2000, 'Education section is too long')
    .nullable()
    .describe("Doctor's education & training details"),

  servicesOffered: z
    .string()
    .max(2000, 'Services section is too long')
    .nullable()
    .describe('Short description of services the doctor provides'),

  languages: z.array(z.string()).nullable().describe('Languages spoken by the doctor'),

  consultationFee: z
    .number()
    .min(0, 'Consultation fee cannot be negative')
    .nullable()
    .describe('Standard consultation fee'),

  profilePictureUrl: z
    .string()
    .url('Invalid profile picture URL')
    .nullable()
    .describe('Primary URL (Firebase Storage). Use when image is publicly hosted.'),

  profilePicturePath: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Alternative local file path, if local storage is preferred during certain operations.'
    ),

  licenseDocumentUrl: z
    .string()
    .url('Invalid license document URL')
    .nullable()
    .describe('Primary URL (Firebase Storage). Use when document is securely stored in cloud.'),

  licenseDocumentPath: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Alternative local file path, if local storage is preferred during certain operations.'
    ),

  certificateUrl: z
    .string()
    .url('Invalid certificate URL')
    .nullable()
    .describe('Primary URL (Firebase Storage). Use when certificate is securely stored in cloud.'),

  certificatePath: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Alternative local file path, if local storage is preferred during certain operations.'
    ),

  educationHistory: z
    .array(EducationEntrySchema)
    .optional()
    .default([])
    .describe("Doctor's educational background"),

  experience: z
    .array(ExperienceEntrySchema)
    .optional()
    .default([])
    .describe("Doctor's professional experience"),

  weeklySchedule: WeeklyScheduleSchema.optional().describe('Optional recurring schedule'),

  timezone: z
    .string()
    .default('UTC')
    .describe('IANA timezone identifier used to interpret weeklySchedule and blockedDates'),

  blockedDates: z
    .array(isoDateTimeStringSchema)
    .optional()
    .default([])
    .describe('@PHI - Specific dates doctor is unavailable (stored as ISO strings)'),

  createdAt: isoDateTimeStringSchema.describe(
    'Stored as ISO in schema; converted to Firestore Timestamp at runtime.'
  ),

  updatedAt: isoDateTimeStringSchema.describe(
    'Stored as ISO in schema; converted to Firestore Timestamp at runtime.'
  ),

  // Added fields for UI display
  rating: z
    .number()
    .min(0, 'Rating cannot be negative')
    .max(5, 'Rating cannot exceed 5')
    .optional()
    .default(0)
    .describe("Doctor's average rating from reviews"),

  reviewCount: z
    .number()
    .int('Review count must be an integer')
    .min(0, 'Review count cannot be negative')
    .optional()
    .default(0)
    .describe('Number of reviews received by the doctor'),
});

/**
 * Zod schema for VerificationDocument data (subcollection 'doctors/{docId}/verificationDocuments').
 */
export const VerificationDocumentSchema = z.object({
  doctorId: z
    .string()
    .min(1, 'Doctor ID is required')
    .describe('Reference to the doctor this document belongs to'),

  documentType: z.nativeEnum(DocumentType).describe('Type of verification document'),

  fileUrl: z.string().url('Invalid file URL').describe('URL to the uploaded document file'),

  uploadedAt: isoDateTimeStringSchema.describe('Timestamp when the document was uploaded'),

  description: z
    .string()
    .max(500, 'Description is too long (max 500 characters)')
    .optional()
    .describe('Additional details about the document'),

  status: z
    .nativeEnum(VerificationStatus)
    .optional()
    .default(VerificationStatus.PENDING)
    .describe('Verification status of this specific document'),

  notes: z.string().optional().describe('Admin notes regarding this document'),
});

/**
 * Zod schema for the data stored within an Appointment Firestore document (collection 'appointments').
 * Contains PHI. Linked to users via Auth UIDs.
 */
export const AppointmentSchema = z.object({
  /** The Firebase Auth UID of the patient who booked. Required. */
  patientId: z.string().min(1),

  /** Denormalized patient name for display purposes. Optional. */
  patientName: z.string().optional(),

  /** The Firebase Auth UID of the doctor for the appointment. Required. */
  doctorId: z.string().min(1),

  /** Denormalized doctor name for display purposes. Optional. */
  doctorName: z.string().optional(),

  /** Denormalized doctor specialty for display purposes. Optional. */
  doctorSpecialty: z.string().optional(),

  /** The specific date of the appointment (stored as ISO string). Required. */
  appointmentDate: isoDateTimeStringSchema,

  /** The start time of the appointment slot (HH:MM format). Required. */
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)'),

  /** The end time of the appointment slot (HH:MM format). Required. */
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)'),

  /** The current status of the appointment. Required, defaults handled by backend logic. */
  status: z.nativeEnum(AppointmentStatus),

  /** @PHI The reason for the visit provided by the patient. Optional. */
  reason: z
    .string()
    .max(1000, 'Reason exceeds maximum length')
    .nullable()
    .optional()
    .describe('@PHI'),

  /** @PHI Notes added by the doctor upon completion. Optional. */
  notes: z.string().max(2000, 'Notes exceed maximum length').nullable().optional().describe('@PHI'),

  /** Timestamp string when the appointment document was created (server-set). Required. */
  createdAt: isoDateTimeStringSchema,

  /** Timestamp string when the appointment document was last updated (server-set). Required. */
  updatedAt: isoDateTimeStringSchema,

  /** The type of appointment (e.g., in-person or video). Optional. */
  appointmentType: z.nativeEnum(AppointmentType).optional().default(AppointmentType.IN_PERSON),

  videoCallUrl: z
    .string()
    .url('Invalid video call URL')
    .nullable()
    .describe('Video consultation link (required when appointmentType = VIDEO)'),
});

/**
 * Zod schema for the data stored within a Notification Firestore document (collection 'notifications').
 * Targeted to a specific user via their Auth UID.
 */
export const NotificationSchema = z.object({
  /** The Firebase Auth UID of the user receiving the notification. Required. */
  userId: z.string().min(1),

  /** The title of the notification. Required. */
  title: z
    .string()
    .min(1, 'Notification title is required.')
    .max(100, 'Title too long')
    .describe('The main heading of the notification'),

  /** The main content/body of the notification message. Required. */
  message: z
    .string()
    .min(1, 'Notification message is required.')
    .max(500, 'Message too long')
    .describe('The detailed content of the notification'),

  /** Flag indicating if the user has marked the notification as read. Defaults to false. */
  isRead: z.boolean().default(false).describe('Tracking if notification has been viewed by user'),

  /** Timestamp string when the notification was created (server-set). Required. */
  createdAt: isoDateTimeStringSchema.describe('When the notification was generated'),

  /** Category type for the notification (e.g., appointment update, system alert, verification status). Defaults to 'system'. */
  type: z
    .nativeEnum(NotificationType)
    .default(NotificationType.OTHER)
    .describe('Type/category of notification'),

  /** Optional ID of a related Firestore document (e.g., the appointment ID). */
  relatedId: z.string().nullable().optional().describe('e.g., Appointment ID'),
});

/**
 * Zod schema for a document in the 'doctors/{doctorId}/availability' subcollection,
 * representing a specific block of time a doctor is available during the week.
 */
export const DoctorAvailabilitySlotSchema = z.object({
  /** Links to the DoctorProfile document/Auth UID. Required. */
  doctorId: z.string().min(1).describe('Reference to the doctor this availability slot belongs to'),

  /** Day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday - adjust if 0=Monday). Required. */
  dayOfWeek: z
    .number()
    .int()
    .min(0)
    .max(6)
    .describe(
      'Day of week (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)'
    ),

  /** Start time of the slot (HH:MM format). Required. */
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)')
    .describe('Start time in 24-hour format (HH:MM)'),

  /** End time of the slot (HH:MM format). Required. */
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)')
    .describe('End time in 24-hour format (HH:MM)'),

  /** Whether this specific slot is available (can be used to override weekly schedule). Defaults true. */
  isAvailable: z
    .boolean()
    .default(true)
    .describe('Whether this specific timeslot is available for booking'),
});

/**
 * Zod schema for a single entry in the Admin User List.
 * Contains essential fields for display and actions.
 */
export const AdminUserListEntrySchema = UserProfileSchema.pick({
  // id is implicitly the doc ID, but needed in the TS type
  email: true,
  firstName: true,
  lastName: true,
  userType: true,
  isActive: true,
  createdAt: true, // Keep createdAt for 'Joined Date' column
}).extend({
  id: z.string().describe('Auth UID / Document ID'), // Explicitly add ID needed for frontend keys/actions
});

/**
 * Zod schema for a single entry in the Admin Doctor List.
 * Combines user and doctor profile info.
 */
// Select necessary fields from UserProfile for the doctor list
const BaseUserInfoForDoctorList = UserProfileSchema.pick({
  email: true,
  firstName: true,
  lastName: true,
  createdAt: true, // 'Joined Date'
});

// Select necessary fields from DoctorProfile
const DoctorInfoForList = DoctorProfileSchema.pick({
  specialty: true,
  verificationStatus: true,
});

// Combine and add ID
export const AdminDoctorListEntrySchema = BaseUserInfoForDoctorList.merge(DoctorInfoForList).extend(
  {
    id: z.string().describe('Auth UID / Document ID'),
  }
);

/**
 * Zod schema for data displayed on Doctor Cards in search results (public view).
 */
// Base user info needed
const UserInfoForPublicCard = UserProfileSchema.pick({
  firstName: true,
  lastName: true,
});

// Public doctor info needed
const DoctorInfoForPublicCard = DoctorProfileSchema.pick({
  userId: true, // Needed for linking
  specialty: true,
  yearsOfExperience: true,
  location: true,
  languages: true,
  consultationFee: true,
  profilePictureUrl: true,
  // Add a field for calculated availability indicator if backend provides it
  // isAvailableSoon: z.boolean().optional().describe('Indicates recent availability')
});

// Combine - DO NOT include sensitive fields like verificationNotes, adminNotes
export const PublicDoctorCardSchema = UserInfoForPublicCard.merge(DoctorInfoForPublicCard).extend({
  id: z.string().describe('Auth UID / Document ID'), // Same as userId, represents the document ID / Auth UID
});

// Inferred TypeScript types
export type EducationEntry = z.infer<typeof EducationEntrySchema> & { id?: string };
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema> & { id?: string };
export type TimeSlot = z.infer<typeof TimeSlotSchema>; // No separate ID usually
export type WeeklySchedule = z.infer<typeof WeeklyScheduleSchema>;
export type DoctorProfile = z.infer<typeof DoctorProfileSchema> & { id: string }; // ID comes from UserProfile
export type VerificationDocument = z.infer<typeof VerificationDocumentSchema> & { id?: string };

/** TypeScript type inferred from AppointmentSchema. Represents an appointment record. */
export type Appointment = z.infer<typeof AppointmentSchema> & { id: string }; // Add Firestore document ID

/** TypeScript type inferred from NotificationSchema. Represents a notification record. */
export type Notification = z.infer<typeof NotificationSchema> & { id: string }; // Add Firestore document ID

/** TypeScript type inferred from DoctorAvailabilitySlotSchema. */
export type DoctorAvailabilitySlot = z.infer<typeof DoctorAvailabilitySlotSchema> & { id?: string }; // Add optional Firestore document ID

/** TS type for Admin User List entries. */
export type AdminUserListEntry = z.infer<typeof AdminUserListEntrySchema>;

/** TS type for Admin Doctor List entries. */
export type AdminDoctorListEntry = z.infer<typeof AdminDoctorListEntrySchema>;

/** TS type for data displayed on public Doctor Card results. */
export type PublicDoctorCard = z.infer<typeof PublicDoctorCardSchema>;

/**
 * Zod schema for tracking changes to a doctor's verification status ('verificationHistory' collection).
 * Provides a full audit trail of verification status changes, who made them, and why.
 */
export const VerificationHistoryEntrySchema = z.object({
  /** Reference to the doctor whose verification status changed. Required. */
  doctorId: z
    .string()
    .min(1, 'Doctor ID is required')
    .describe('The doctor whose verification status was changed'),

  /** The verification status before the change. Required. */
  previousStatus: z
    .nativeEnum(VerificationStatus)
    .describe('The verification status before the change'),

  /** The new verification status after the change. Required. */
  newStatus: z.nativeEnum(VerificationStatus).describe('The verification status after the change'),

  /** The admin who changed the verification status. Required. */
  changedByAdminId: z
    .string()
    .min(1, 'Admin ID is required')
    .describe('The admin who performed the verification status change'),

  /** Timestamp when the change occurred. Required. */
  timestamp: isoDateTimeStringSchema.describe('When the verification status change occurred'),

  /** Optional notes explaining the reason for the change. */
  notes: z
    .string()
    .max(1000, 'Notes are too long (max 1000 characters)')
    .optional()
    .describe('Explanation for why the verification status was changed'),
});

/** Generic action types for system log entries */
export enum SystemLogActionType {
  VERIFICATION_STATUS_CHANGE = 'verification_status_change',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DEACTIVATED = 'user_deactivated',
  USER_REACTIVATED = 'user_reactivated',
  PASSWORD_RESET_TRIGGERED = 'password_reset_triggered',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_COMPLETED = 'appointment_completed',
  SYSTEM_ERROR = 'system_error',
  DATA_EXPORT = 'data_export',
}

/**
 * Zod schema for general system audit logs ('systemLogs' collection).
 * Provides a comprehensive audit trail of all significant system actions.
 */
export const SystemLogSchema = z.object({
  /** The type of action that occurred. Required. */
  action: z.nativeEnum(SystemLogActionType).describe('Type of system action that occurred'),

  /** The user who performed the action. Required. */
  actorId: z
    .string()
    .min(1, 'Actor ID is required')
    .describe('The user who performed the action (often an admin)'),

  /** The user who was the target of the action, if applicable. */
  targetUserId: z
    .string()
    .optional()
    .describe('The user that was the subject of the action, if applicable'),

  /** Timestamp when the action occurred. Required. */
  timestamp: isoDateTimeStringSchema.describe('When the action occurred'),

  /** Application module where the action occurred. */
  module: z
    .string()
    .optional()
    .describe("System module where the action occurred (e.g., 'verification', 'appointments')"),

  /** IP address of the actor, for security audit purposes. */
  ipAddress: z
    .string()
    .optional()
    .describe('IP address of the actor (for security audit purposes)'),

  /** Browser/client information, for security audit purposes. */
  userAgent: z
    .string()
    .optional()
    .describe('Browser/client information (for security audit purposes)'),

  /** Additional context about the action in either string format or as a structured object. */
  details: z
    .union([
      z.string().max(5000, 'Details are too long (max 5000 characters)'),
      z.record(z.unknown()),
    ])
    .optional()
    .describe('Additional context about the action (structured data or text)'),
});

/** TypeScript type inferred from VerificationHistoryEntrySchema. Represents a verification status change record. */
export type VerificationHistoryEntry = z.infer<typeof VerificationHistoryEntrySchema> & {
  id: string;
}; // Add Firestore document ID

/** TypeScript type inferred from SystemLogSchema. Represents a system audit log entry. */
export type SystemLog = z.infer<typeof SystemLogSchema> & { id: string }; // Add Firestore document ID

/**
 * Zod schema for booking an appointment
 */
export const BookAppointmentSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  appointmentDate: isoDateTimeStringSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)'),
  reason: z.string().max(1000, 'Reason exceeds maximum length').optional(),
  appointmentType: z.nativeEnum(AppointmentType).default(AppointmentType.IN_PERSON),
});

/**
 * Zod schema for updating user profile
 */
export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().nullable().optional(),
  // ... add any other updatable fields here
});

/**
 * Zod schema for finding doctors
 */
export const FindDoctorsSchema = z.object({
  specialty: z.string().optional(),
  location: z.string().optional(),
  availableDate: isoDateTimeStringSchema.optional(),
  languages: z.array(z.string()).optional(),
  maxConsultationFee: z.number().optional(),
  searchTerm: z.string().optional(),
  pageSize: z.number().optional(),
  pageNumber: z.number().optional(),
});

/**
 * Zod schema for setting doctor availability
 */
export const SetDoctorAvailabilitySchema = z.object({
  weeklySchedule: WeeklyScheduleSchema.optional(),
  blockedDates: z.array(isoDateTimeStringSchema).optional(),
  timezone: z.string().optional(),
});

/**
 * Zod schema for getting available slots
 */
export const GetAvailableSlotsSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  date: isoDateTimeStringSchema,
});

/**
 * Zod schema for canceling an appointment
 */
export const CancelAppointmentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  reason: z.string().max(1000, 'Reason exceeds maximum length').optional(),
});

/**
 * Zod schema for completing an appointment
 */
export const CompleteAppointmentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  notes: z.string().max(2000, 'Notes exceed maximum length').optional(),
});

/**
 * Zod schema for getting appointment details
 */
export const GetAppointmentDetailsSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
});

/**
 * Zod schema for getting user's appointments
 *
 * This schema validates the authentication context for user accessing their appointments.
 * Parameters for filtering appointments are optional.
 */
export const GetMyAppointmentsSchema = z
  .object({
    // Optional filter parameters
    status: z.nativeEnum(AppointmentStatus).optional(),
    startDate: isoDateTimeStringSchema.optional(),
    endDate: isoDateTimeStringSchema.optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strict()
  .partial();

/**
 * Zod schema for admin user updates
 */
export const AdminUpdateUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().nullable().optional(),
  address: z.string().max(500, 'Address is too long').nullable().optional(),
  accountStatus: z
    .enum(['active', 'suspended', 'deactivated'], {
      errorMap: () => ({ message: 'Status must be one of: active, suspended, deactivated' }),
    })
    .optional(),
});

/**
 * Zod schema for admin user status updates
 */
export const AdminUpdateUserStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: z.enum(['active', 'suspended', 'deactivated'], {
    errorMap: () => ({ message: 'Status must be one of: active, suspended, deactivated' }),
  }),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

/**
 * Zod schema for admin doctor verification
 */
export const AdminVerifyDoctorSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  verificationStatus: z.nativeEnum(VerificationStatus),
  verificationNotes: z.string().max(1000, 'Notes exceed maximum length').optional(),
});

/**
 * Zod schema for admin user creation
 */
export const AdminCreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  userType: z.nativeEnum(UserType),
  isActive: z.boolean().optional().default(true),
  // Patient-specific fields
  dateOfBirth: isoDateTimeStringSchema.optional(),
  gender: genderSchema.optional(),
  bloodType: z.nativeEnum(BloodType).optional(),
  medicalHistory: z.string().max(4000).optional(),
  // Doctor-specific fields
  specialty: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).max(70).optional(),
});

export const isoDateOrDateTimeStringSchema = z.string().refine(
  val =>
    /^\d{4}-\d{2}-\d{2}$/.test(val) || // date only
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(val), // date-time
  { message: 'Invalid ISO date or date-time string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)' }
);

/**
 * Zod schema for patient registration payload.
 * Used for validating user input during patient registration.
 */
export const PatientRegistrationSchema = z.object({
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

  dateOfBirth: z.string().refine(val => {
    // Check if the string is a valid date
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;

    // Check if patient is at least 18 years old
    const today = new Date();
    const eighteenYearsAgo = new Date(today);
    eighteenYearsAgo.setFullYear(today.getFullYear() - 18);

    return date <= eighteenYearsAgo;
  }, 'You must be at least 18 years old'),

  gender: genderSchema,

  // Optional fields
  bloodType: z.string().optional(),
  medicalHistory: z.string().optional(),
});

/**
 * Zod schema for doctor registration payload.
 * Used for validating user input during doctor registration.
 */
export const DoctorRegistrationSchema = z.object({
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
    .max(70, 'Please enter a valid years of experience'),
});

// Export TypeScript types inferred from the schemas
export type PatientRegistrationPayload = z.infer<typeof PatientRegistrationSchema>;
export type DoctorRegistrationPayload = z.infer<typeof DoctorRegistrationSchema>;

/**
 * Zod schema for admin retrieving user details
 */
export const AdminGetUserDetailSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * Zod schema for getting user's notifications
 */
export const GetMyNotificationsSchema = z
  .object({
    // Optional filtering parameters could be added here in the future
    // limit: z.number().int().min(1).max(100).optional(),
    // onlyUnread: z.boolean().optional(),
  })
  .strict();

/**
 * Zod schema for marking a notification as read
 */
export const MarkNotificationReadSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
  isRead: z.boolean().optional().default(true),
});

/**
 * Zod schema for sending a direct message
 */
export const SendDirectMessageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  subject: z.string().max(200, 'Subject is too long').optional(),
  message: z.string().min(1, 'Message body is required').max(5000, 'Message is too long'),
});

/**
 * Zod schema for getting a doctor's public profile
 */
export const GetDoctorPublicProfileSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
});

/**
 * Zod schema for getting doctor's availability
 */
export const GetDoctorAvailabilitySchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
});

/**
 * Zod schema for retrieving user dashboard statistics
 */
export const GetMyDashboardStatsSchema = z
  .object({
    // Optional filtering parameters could be added here in the future
  })
  .strict();

/**
 * Zod schema for admin dashboard data
 */
export const AdminGetDashboardDataSchema = z
  .object({
    // Optional parameters could be added here in the future
  })
  .strict();

/**
 * Zod schema for batch getting doctor data
 */
export const BatchGetDoctorDataSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  includeProfile: z.boolean().optional().default(true),
  includeAvailability: z.boolean().optional().default(true),
  includeAppointments: z.boolean().optional().default(false),
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  numDays: z.number().int().min(1).max(30).optional().default(1),
});

/**
 * Zod schema for batch getting multiple doctors data
 */
export const BatchGetDoctorsDataSchema = z
  .array(z.string().min(1, 'Doctor ID is required'))
  .min(1, 'At least one doctor ID is required')
  .max(20, 'Maximum 20 doctor IDs allowed');

/**
 * Zod schema for batch getting multiple patients data
 */
export const BatchGetPatientDataSchema = z
  .array(z.string().min(1, 'Patient ID is required'))
  .min(1, 'At least one patient ID is required')
  .max(20, 'Maximum 20 patient IDs allowed');

/**
 * Zod schema for admin getting all users
 */
export const AdminGetAllUsersSchema = z
  .object({
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(10),
    filter: z.string().optional(),
    status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
    userType: z.nativeEnum(UserType).optional(),
  })
  .strict()
  .partial();

/**
 * Zod schema for admin getting all doctors
 */
export const AdminGetAllDoctorsSchema = z
  .object({
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(10),
    filter: z.string().optional(),
    verificationStatus: z.nativeEnum(VerificationStatus).optional(),
  })
  .strict()
  .partial();

/**
 * Zod schema for admin getting all appointments
 */
export const AdminGetAllAppointmentsSchema = z
  .object({
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(10),
    status: z.nativeEnum(AppointmentStatus).optional(),
    startDate: isoDateTimeStringSchema.optional(),
    endDate: isoDateTimeStringSchema.optional(),
    doctorId: z.string().optional(),
    patientId: z.string().optional(),
  })
  .strict()
  .partial();

/**
 * Zod schema for admin getting doctor by ID
 */
export const AdminGetDoctorByIdSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
});

/**
 * Zod schema for getting mock doctor profile
 */
export const GetMockDoctorProfileSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * Zod schema for mock API get available time slots
 */
export const MockGetAvailableTimeSlotsSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

/**
 * Zod schema for mock API get doctor schedule
 */
export const MockGetDoctorScheduleSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional(),
});

/**
 * Zod schema for user sign-in
 */
export const SignInSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});
