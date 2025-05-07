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
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

/** Represents the verification status of a Doctor's profile/credentials. */
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

/** Represents the lifecycle states of a scheduled appointment. */
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELED = 'canceled',
  COMPLETED = 'completed',
  RESCHEDULED = 'rescheduled',
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
  APPOINTMENT_REQUEST = 'appointment_request',
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_CANCELED = 'appointment_canceled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  NEW_MESSAGE = 'new_message',
  APPOINTMENT_COMPLETED = 'appointment_completed',
  VERIFICATION_STATUS_CHANGE = 'verification_status_change',
  ACCOUNT_STATUS_CHANGE = 'account_status_change',
  APPOINTMENT_BOOKED = 'appointment_booked',
  SYSTEM_ALERT = 'system_alert',
  SYSTEM = 'system',          // Used in seedLocalDb.mjs
  OTHER = 'other',
  PROFILE_UPDATE = 'profile_update',
  APPOINTMENT_CREATED = 'appointment_created',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  MESSAGE = 'message',
}

/** Account statuses for users */
export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
} 