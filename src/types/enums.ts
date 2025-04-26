/** Defines core enumeration types used throughout the Health Appointment System for standardized status values and categorizations. Using string enums for better readability in database/logs. */

/**
 * Gender enum for user profiles
 */
export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other' // Includes prefer not to say / non-binary etc.
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
  License = 'License',           // Professional license
  Certificate = 'Certificate',   // Specialization certificates, diplomas etc.
  Identification = 'Identification', // Government-issued ID
  Other = 'Other'                // For miscellaneous documents
}

/** Defines the modality of the appointment. */
export enum AppointmentType {
  InPerson = 'In-person', // Physical visit
  Video = 'Video'         // Telemedicine video call
} 