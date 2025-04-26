/** Defines core enumeration types used throughout the Health Appointment System for standardized status values and categorizations. Using string enums for better readability in database/logs. */

/**
 * Gender enum for user profiles
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER' // Includes prefer not to say / non-binary etc.
}

/** Common blood types for patient profiles */
export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-'
}

/** Represents the distinct roles users can have within the system. */
export enum UserType {
  PATIENT = 'PATIENT', // End-user seeking medical care
  DOCTOR = 'DOCTOR',   // Verified healthcare provider
  ADMIN = 'ADMIN'      // System administrator
}

/** Represents the verification status of a Doctor's profile/credentials. */
export enum VerificationStatus {
  PENDING = 'PENDING',              // Initial state after doctor registration
  VERIFIED = 'VERIFIED',            // Admin approved credentials
  REJECTED = 'REJECTED',            // Admin rejected credentials
  MORE_INFO_REQUIRED = 'MORE_INFO_REQUIRED' // Admin needs more info from doctor
}

/** Represents the lifecycle states of a scheduled appointment. */
export enum AppointmentStatus {
  PENDING = 'PENDING',      // Patient booked, potentially awaiting confirmation
  CONFIRMED = 'CONFIRMED',  // Appointment confirmed (by system or doctor if needed)
  SCHEDULED = 'SCHEDULED',  // Often used synonymously with CONFIRMED
  CANCELLED = 'CANCELLED',  // Cancelled by Patient or Doctor
  COMPLETED = 'COMPLETED',  // Consultation finished successfully
  NO_SHOW = 'NO_SHOW'       // Patient did not attend the appointment
}

/** Types of documents uploaded by Doctors for verification purposes. */
export enum DocumentType {
  LICENSE = 'LICENSE',           // Professional license
  CERTIFICATE = 'CERTIFICATE',   // Specialization certificates, diplomas etc.
  IDENTIFICATION = 'IDENTIFICATION', // Government-issued ID
  OTHER = 'OTHER'                // For miscellaneous documents
}

/** Defines the modality of the appointment. */
export enum AppointmentType {
  IN_PERSON = 'IN_PERSON', // Physical visit
  VIDEO = 'VIDEO'         // Telemedicine video call
}

/** Types of notifications users can receive. */
export enum NotificationType {
  APPOINTMENT_BOOKED = 'appointment_booked',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  VERIFICATION_APPROVED = 'verification_approved',
  SYSTEM_ALERT = 'system_alert',
  OTHER = 'other'
} 