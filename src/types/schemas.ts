/** 
 * Shared Zod schemas defining the structure and validation rules for application data types. 
 * These schemas are the source of truth, and TypeScript types are inferred from them where possible.
 */

import { z } from 'zod';
import { Gender, UserType, VerificationStatus, DocumentType, AppointmentStatus, AppointmentType } from './enums';
// Note: Firestore Timestamps require custom handling or z.instanceof later

/**
 * Zod schema for validating strings that represent a date-time,
 * specifically aiming for ISO 8601 format compatibility (YYYY-MM-DDTHH:mm:ss.sssZ).
 * Useful for data transfer (API) and local JSON storage before converting to/from Date or Timestamp objects.
 */
export const isoDateTimeStringSchema = z.string()
  .datetime({ offset: true, message: "Invalid ISO 8601 datetime string format (e.g., YYYY-MM-DDTHH:mm:ss.sssZ)" })
  .describe("ISO 8601 date-time string");

/**
 * Zod schema for Gender enum.
 * Accepts common variations (case-insensitive 'm'/'f'/etc.) and normalizes them
 * to the standard 'Male', 'Female', or 'Other' enum values.
 * Defaults null/empty input to 'Other'.
 */
export const genderSchema = z.string()
  .nullable() // Handles null input gracefully
  .optional() // Handles undefined input gracefully
  .transform(val => {
    // Normalize input: lowercase and trim whitespace
    const normalized = val?.toLowerCase().trim();

    if (!normalized) return Gender.Other; // Default for null/undefined/empty string
    if (['male', 'm'].includes(normalized)) return Gender.Male;
    if (['female', 'f', 'fem'].includes(normalized)) return Gender.Female;
    // Catches variations like 'prefer_not_to_say' or just 'other'
    if (normalized.includes('other') || normalized.includes('prefer')) return Gender.Other;

    // Fallback if input is non-empty but unrecognized
    return Gender.Other;
  })
  .pipe(z.nativeEnum(Gender)) // Final check: ensures output is a valid Gender enum member
  .describe("User's self-identified gender (Male, Female, Other)");

/** 
 * Zod schema for the data stored within a UserProfile Firestore document (collection 'users').
 * The document ID itself is the Firebase Auth UID and is not part of this schema.
 */
export const UserProfileSchema = z.object({
  email: z.string({ required_error: "Email is required" })
         .email("Invalid email format")
         .nullable() // Allow null if primary login is phone
         .describe("User's primary email address."),
  phone: z.string()
         .nullable() // Allow null if primary login is email
         .optional() // Make phone optional overall during creation/update
         .describe("User's primary phone number (E.164 format preferred)."),
  firstName: z.string()
            .min(1, "First name is required.")
            .describe("User's first name."),
  lastName: z.string()
           .min(1, "Last name is required.")
           .describe("User's last name."),
  userType: z.nativeEnum(UserType)
           .describe("The user's role (PATIENT, DOCTOR, ADMIN)."),
  isActive: z.boolean()
           .default(true) // Default user to active
           .describe("Account status (true=active, false=deactivated by admin)."),
  emailVerified: z.boolean()
                .default(false)
                .describe("Indicates if the user's email is verified via Firebase Auth."),
  phoneVerified: z.boolean()
                .default(false)
                .describe("Indicates if the user's phone is verified (requires separate flow)."),
  createdAt: isoDateTimeStringSchema
            .describe("Timestamp string when the user profile was created (server-set)."),
  updatedAt: isoDateTimeStringSchema
            .describe("Timestamp string when the user profile was last updated (server-set)."),
});

/** TypeScript type inferred from UserProfileSchema, adding the 'id' field (Auth UID). */
export type UserProfile = z.infer<typeof UserProfileSchema> & { id: string };

/** 
 * Zod schema for the data stored within a PatientProfile Firestore document (collection 'patients').
 * Document ID MUST match the UserProfile ID (Auth UID). Contains PHI.
 */
export const PatientProfileSchema = z.object({
  /** Links to the UserProfile document/Auth UID. Required. */
  userId: z.string()
          .min(1, "User ID linkage is required."), // Should match UserProfile['id'] type conceptually

  /** @PHI Patient's date of birth. Stored as ISO string locally. */
  dateOfBirth: isoDateTimeStringSchema
               .nullable()
               .optional() // Allow optional input, handle default/requirement elsewhere if needed
               .describe("@PHI - Patient's date of birth."),

  /** @PHI Patient's self-identified gender. Uses custom schema for normalization. */
  gender: genderSchema // Apply the transforming gender schema directly
          .describe("@PHI - Patient's gender."),

  /** @PHI Patient's blood type (e.g., 'A+', 'O-'). Max 5 chars. */
  bloodType: z.string()
             .max(5, "Blood type too long")
             .nullable()
             .optional() // Optional field
             .describe("@PHI - Patient's blood type."),

  /** @PHI Brief summary of patient's relevant medical history or allergies. Max 2000 chars. */
  medicalHistory: z.string()
                  .max(2000, "Medical history exceeds maximum length")
                  .nullable()
                  .optional() // Optional field
                  .describe("@PHI - Patient's medical history summary."),
});

/** TypeScript type inferred from PatientProfileSchema. Represents patient-specific data. */
export type PatientProfile = z.infer<typeof PatientProfileSchema>;

/**
 * Zod schema for a single education entry in DoctorProfile.educationHistory.
 */
export const EducationEntrySchema = z.object({
  institution: z.string()
               .min(1, "Institution name is required")
               .describe("Name of the educational institution"),
  
  degree: z.string()
          .min(1, "Degree is required")
          .describe("Degree or certification obtained"),
  
  field: z.string()
         .min(1, "Field of study is required")
         .describe("Field or specialty of study"),
  
  startYear: z.number()
             .int("Start year must be an integer")
             .min(1900, "Start year must be after 1900")
             .max(new Date().getFullYear(), "Start year cannot be in the future")
             .describe("Year education began"),
  
  endYear: z.number()
           .int("End year must be an integer")
           .min(1900, "End year must be after 1900")
           .max(new Date().getFullYear() + 10, "End year cannot be too far in the future")
           .optional()
           .nullable()
           .describe("Year education completed (null if ongoing)"),
  
  isOngoing: z.boolean()
             .optional()
             .default(false)
             .describe("Indicates if this education is currently in progress"),
  
  description: z.string()
               .max(500, "Description is too long (max 500 characters)")
               .optional()
               .describe("Additional details about the education"),
});

/**
 * Zod schema for a single experience entry in DoctorProfile.experience.
 */
export const ExperienceEntrySchema = z.object({
  organization: z.string()
                .min(1, "Organization name is required")
                .describe("Name of the organization or employer"),
  
  position: z.string()
            .min(1, "Position title is required")
            .describe("Job title or position held"),
  
  location: z.string()
            .optional()
            .describe("Geographic location of the position"),
  
  startYear: z.number()
             .int("Start year must be an integer")
             .min(1900, "Start year must be after 1900")
             .max(new Date().getFullYear(), "Start year cannot be in the future")
             .describe("Year experience began"),
  
  endYear: z.number()
           .int("End year must be an integer")
           .min(1900, "End year must be after 1900")
           .max(new Date().getFullYear() + 10, "End year cannot be too far in the future")
           .optional()
           .nullable()
           .describe("Year experience ended (null if ongoing)"),
  
  isOngoing: z.boolean()
             .optional()
             .default(false)
             .describe("Indicates if this position is currently held"),
  
  description: z.string()
               .max(1000, "Description is too long (max 1000 characters)")
               .optional()
               .describe("Responsibilities and achievements in this position"),
});

/**
 * Zod schema for a time slot within a weekly schedule.
 */
export const TimeSlotSchema = z.object({
  startTime: z.string()
             .regex(/^\d{2}:\d{2}$/, "Invalid start time format (HH:MM)")
             .describe("Start time in 24-hour format (HH:MM)"),
  
  endTime: z.string()
           .regex(/^\d{2}:\d{2}$/, "Invalid end time format (HH:MM)")
           .describe("End time in 24-hour format (HH:MM)"),
  
  isAvailable: z.boolean()
               .default(true)
               .describe("Whether this time slot is available for booking"),
});

/**
 * Zod schema for the recurring weekly availability schedule.
 */
export const WeeklyScheduleSchema = z.object({
  monday: z.array(TimeSlotSchema)
          .optional()
          .default([])
          .describe("Available time slots for Monday"),
  
  tuesday: z.array(TimeSlotSchema)
           .optional()
           .default([])
           .describe("Available time slots for Tuesday"),
  
  wednesday: z.array(TimeSlotSchema)
             .optional()
             .default([])
             .describe("Available time slots for Wednesday"),
  
  thursday: z.array(TimeSlotSchema)
            .optional()
            .default([])
            .describe("Available time slots for Thursday"),
  
  friday: z.array(TimeSlotSchema)
          .optional()
          .default([])
          .describe("Available time slots for Friday"),
  
  saturday: z.array(TimeSlotSchema)
            .optional()
            .default([])
            .describe("Available time slots for Saturday"),
  
  sunday: z.array(TimeSlotSchema)
          .optional()
          .default([])
          .describe("Available time slots for Sunday"),
});

/**
 * Zod schema for DoctorProfile data ('doctors' collection, ID=UID).
 */
export const DoctorProfileSchema = z.object({
  userId: z.string()
          .min(1, "User ID linkage is required")
          .describe("Auth UID / FK"),
  
  specialty: z.string()
             .min(1, "Specialty is required")
             .default("General Practice")
             .describe("Doctor's medical specialty"),
  
  licenseNumber: z.string()
                 .min(1, "License number is required")
                 .describe("Professional license number"),
  
  yearsOfExperience: z.number()
                     .int("Years of experience must be an integer")
                     .min(0, "Years of experience cannot be negative")
                     .default(0)
                     .describe("Total years of professional experience"),
  
  bio: z.string()
       .max(2000, "Biography is too long (max 2000 characters)")
       .nullable()
       .describe("@PHI - Doctor biography/summary"),
  
  verificationStatus: z.nativeEnum(VerificationStatus)
                       .default(VerificationStatus.PENDING)
                       .describe("Current verification status of the doctor"),
  
  verificationNotes: z.string()
                      .nullable()
                      .describe("Notes from admin regarding verification"),
  
  adminNotes: z.string()
              .optional()
              .describe("Internal admin notes"),
  
  location: z.string()
            .nullable()
            .describe("Primary practice location"),
  
  languages: z.array(z.string())
             .nullable()
             .describe("Languages spoken by the doctor"),
  
  consultationFee: z.number()
                   .min(0, "Consultation fee cannot be negative")
                   .nullable()
                   .describe("Standard consultation fee"),
  
  profilePictureUrl: z.string()
                     .url("Invalid profile picture URL")
                     .nullable()
                     .describe("URL to doctor's profile picture"),
  
  licenseDocumentUrl: z.string()
                      .url("Invalid license document URL")
                      .nullable()
                      .describe("URL to doctor's license document"),
  
  certificateUrl: z.string()
                  .url("Invalid certificate URL")
                  .nullable()
                  .describe("URL to doctor's certificate"),
  
  educationHistory: z.array(EducationEntrySchema)
                    .optional()
                    .default([])
                    .describe("Doctor's educational background"),
  
  experience: z.array(ExperienceEntrySchema)
              .optional()
              .default([])
              .describe("Doctor's professional experience"),
  
  weeklySchedule: WeeklyScheduleSchema
                  .optional()
                  .describe("Optional recurring schedule"),
  
  blockedDates: z.array(isoDateTimeStringSchema)
                .optional()
                .default([])
                .describe("@PHI - Specific dates doctor is unavailable (stored as ISO strings)"),
  
  createdAt: isoDateTimeStringSchema
             .describe("Timestamp when the doctor profile was created"),
  
  updatedAt: isoDateTimeStringSchema
             .describe("Timestamp when the doctor profile was last updated"),
});

/**
 * Zod schema for VerificationDocument data (subcollection 'doctors/{docId}/verificationDocuments').
 */
export const VerificationDocumentSchema = z.object({
  doctorId: z.string()
            .min(1, "Doctor ID is required")
            .describe("Reference to the doctor this document belongs to"),
  
  documentType: z.nativeEnum(DocumentType)
                .describe("Type of verification document"),
  
  fileUrl: z.string()
           .url("Invalid file URL")
           .describe("URL to the uploaded document file"),
  
  uploadedAt: isoDateTimeStringSchema
              .describe("Timestamp when the document was uploaded"),
  
  description: z.string()
               .max(500, "Description is too long (max 500 characters)")
               .optional()
               .describe("Additional details about the document"),
  
  status: z.nativeEnum(VerificationStatus)
          .optional()
          .default(VerificationStatus.PENDING)
          .describe("Verification status of this specific document"),
  
  notes: z.string()
         .optional()
         .describe("Admin notes regarding this document"),
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
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time format (HH:MM)"),
  
  /** The end time of the appointment slot (HH:MM format). Required. */
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time format (HH:MM)"),
  
  /** The current status of the appointment. Required, defaults handled by backend logic. */
  status: z.nativeEnum(AppointmentStatus),
  
  /** @PHI The reason for the visit provided by the patient. Optional. */
  reason: z.string()
          .max(1000, "Reason exceeds maximum length")
          .nullable()
          .optional()
          .describe("@PHI"),
  
  /** @PHI Notes added by the doctor upon completion. Optional. */
  notes: z.string()
         .max(2000, "Notes exceed maximum length")
         .nullable()
         .optional()
         .describe("@PHI"),
  
  /** Timestamp string when the appointment document was created (server-set). Required. */
  createdAt: isoDateTimeStringSchema,
  
  /** Timestamp string when the appointment document was last updated (server-set). Required. */
  updatedAt: isoDateTimeStringSchema,
  
  /** The type of appointment (e.g., in-person or video). Optional. */
  appointmentType: z.nativeEnum(AppointmentType)
                   .optional()
                   .default(AppointmentType.InPerson),
});

/** 
 * Zod schema for the data stored within a Notification Firestore document (collection 'notifications').
 * Targeted to a specific user via their Auth UID.
 */
export const NotificationSchema = z.object({
  /** The Firebase Auth UID of the user receiving the notification. Required. */
  userId: z.string().min(1),
  
  /** The title of the notification. Required. */
  title: z.string()
        .min(1, "Notification title is required.")
        .max(100, "Title too long")
        .describe("The main heading of the notification"),
  
  /** The main content/body of the notification message. Required. */
  message: z.string()
          .min(1, "Notification message is required.")
          .max(500, "Message too long")
          .describe("The detailed content of the notification"),
  
  /** Flag indicating if the user has marked the notification as read. Defaults to false. */
  isRead: z.boolean()
         .default(false)
         .describe("Tracking if notification has been viewed by user"),
  
  /** Timestamp string when the notification was created (server-set). Required. */
  createdAt: isoDateTimeStringSchema
             .describe("When the notification was generated"),
  
  /** Category type for the notification (e.g., appointment update, system alert, verification status). Defaults to 'system'. */
  type: z.string()
       .default('system')
       .describe("e.g., 'appointment_booked', 'verification_approved', 'system'"),
  
  /** Optional ID of a related Firestore document (e.g., the appointment ID). */
  relatedId: z.string()
            .nullable()
            .optional()
            .describe("e.g., Appointment ID"),
});

// Inferred TypeScript types
export type EducationEntry = z.infer<typeof EducationEntrySchema> & { id?: string };
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema> & { id?: string };
export type TimeSlot = z.infer<typeof TimeSlotSchema>; // No separate ID usually
export type WeeklySchedule = z.infer<typeof WeeklyScheduleSchema>;
export type DoctorProfile = z.infer<typeof DoctorProfileSchema>; // ID comes from UserProfile
export type VerificationDocument = z.infer<typeof VerificationDocumentSchema> & { id?: string };

/** TypeScript type inferred from AppointmentSchema. Represents an appointment record. */
export type Appointment = z.infer<typeof AppointmentSchema> & { id: string }; // Add Firestore document ID

/** TypeScript type inferred from NotificationSchema. Represents a notification record. */
export type Notification = z.infer<typeof NotificationSchema> & { id: string }; // Add Firestore document ID 