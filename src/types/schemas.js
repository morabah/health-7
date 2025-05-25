"use strict";
/**
 * Shared Zod schemas defining the structure and validation rules for application data types.
 * These schemas are the source of truth, and TypeScript types are inferred from them where possible.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGetDoctorByIdSchema = exports.AdminGetAllAppointmentsSchema = exports.AdminGetAllDoctorsSchema = exports.AdminGetAllUsersSchema = exports.BatchGetPatientDataSchema = exports.BatchGetDoctorsDataSchema = exports.BatchGetDoctorDataSchema = exports.AdminGetDashboardDataSchema = exports.GetMyDashboardStatsSchema = exports.GetDoctorAvailabilitySchema = exports.GetDoctorPublicProfileSchema = exports.SendDirectMessageSchema = exports.MarkNotificationReadSchema = exports.GetMyNotificationsSchema = exports.AdminGetUserDetailSchema = exports.DoctorRegistrationSchema = exports.PatientRegistrationSchema = exports.isoDateOrDateTimeStringSchema = exports.AdminCreateUserSchema = exports.AdminVerifyDoctorSchema = exports.AdminUpdateUserStatusSchema = exports.AdminUpdateUserSchema = exports.GetMyAppointmentsSchema = exports.GetAppointmentDetailsSchema = exports.CompleteAppointmentSchema = exports.CancelAppointmentSchema = exports.GetAvailableSlotsSchema = exports.SetDoctorAvailabilitySchema = exports.FindDoctorsSchema = exports.UpdateProfileSchema = exports.BookAppointmentSchema = exports.SystemLogSchema = exports.SystemLogActionType = exports.VerificationHistoryEntrySchema = exports.PublicDoctorCardSchema = exports.AdminDoctorListEntrySchema = exports.AdminUserListEntrySchema = exports.DoctorAvailabilitySlotSchema = exports.NotificationSchema = exports.AppointmentSchema = exports.VerificationDocumentSchema = exports.DoctorProfileSchema = exports.WeeklyScheduleSchema = exports.TimeSlotSchema = exports.ExperienceEntrySchema = exports.EducationEntrySchema = exports.PatientProfileSchema = exports.UserProfileSchema = exports.genderSchema = exports.isoDateTimeStringSchema = void 0;
exports.BatchUpdateUserStatusSchema = exports.BatchUpdateAppointmentStatusSchema = exports.SignInSchema = exports.MockGetDoctorScheduleSchema = exports.MockGetAvailableTimeSlotsSchema = exports.GetMockDoctorProfileSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
// Note: Firestore Timestamps require custom handling or z.instanceof later
/**
 * Zod schema for validating strings that represent a date-time,
 * specifically aiming for ISO 8601 format compatibility (YYYY-MM-DDTHH:mm:ss.sssZ).
 * Useful for data transfer (API) and local JSON storage before converting to/from Date or Timestamp objects.
 */
exports.isoDateTimeStringSchema = zod_1.z
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
exports.genderSchema = zod_1.z
    .string()
    .nullable() // Handles null input gracefully
    .optional() // Handles undefined input gracefully
    .transform(val => {
    // Normalize input: lowercase and trim whitespace
    const normalized = val === null || val === void 0 ? void 0 : val.toLowerCase().trim();
    if (!normalized)
        return enums_1.Gender.OTHER; // Default for null/undefined/empty string
    if (['male', 'm'].includes(normalized))
        return enums_1.Gender.MALE;
    if (['female', 'f', 'fem'].includes(normalized))
        return enums_1.Gender.FEMALE;
    // Catches variations like 'prefer_not_to_say' or just 'other'
    if (normalized.includes('other') || normalized.includes('prefer'))
        return enums_1.Gender.OTHER;
    // Fallback if input is non-empty but unrecognized
    return enums_1.Gender.OTHER;
})
    .pipe(zod_1.z.nativeEnum(enums_1.Gender)) // Final check: ensures output is a valid Gender enum member
    .describe("User's self-identified gender (MALE, FEMALE, OTHER)");
/**
 * Zod schema for the data stored within a UserProfile Firestore document (collection 'users').
 * The document ID itself is the Firebase Auth UID and is not part of this schema.
 */
exports.UserProfileSchema = zod_1.z.object({
    email: zod_1.z
        .string({ required_error: 'Email is required' })
        .email('Invalid email format')
        .nullable() // Allow null if primary login is phone
        .describe("User's primary email address."),
    phone: zod_1.z
        .string()
        .nullable() // Allow null if primary login is email
        .optional() // Make phone optional overall during creation/update
        .describe("User's primary phone number (E.164 format preferred)."),
    firstName: zod_1.z.string().min(1, 'First name is required.').describe("User's first name."),
    lastName: zod_1.z.string().min(1, 'Last name is required.').describe("User's last name."),
    userType: zod_1.z.nativeEnum(enums_1.UserType).describe("The user's role (PATIENT, DOCTOR, ADMIN)."),
    isActive: zod_1.z
        .boolean()
        .default(true) // Default user to active
        .describe('Account status (true=active, false=deactivated by admin).'),
    emailVerified: zod_1.z
        .boolean()
        .default(false)
        .describe("Indicates if the user's email is verified via Firebase Auth."),
    phoneVerified: zod_1.z
        .boolean()
        .default(false)
        .describe("Indicates if the user's phone is verified (requires separate flow)."),
    phoneVerificationCode: zod_1.z
        .string()
        .optional()
        .nullable()
        .describe('Verification code sent via SMS'),
    phoneVerificationSentAt: exports.isoDateTimeStringSchema
        .optional()
        .nullable()
        .describe('Timestamp when the phone verification code was last sent'),
    emailVerificationToken: zod_1.z
        .string()
        .optional()
        .nullable()
        .describe("Token sent to user's email for verification purposes"),
    emailVerificationSentAt: exports.isoDateTimeStringSchema
        .optional()
        .nullable()
        .describe('Timestamp when email verification token was last sent'),
    createdAt: exports.isoDateTimeStringSchema.describe('Stored as ISO in schema; converted to Firestore Timestamp at runtime.'),
    updatedAt: exports.isoDateTimeStringSchema.describe('Stored as ISO in schema; converted to Firestore Timestamp at runtime.'),
    profilePictureUrl: zod_1.z.string().nullable().optional().describe("URL to the user's profile picture"),
});
/**
 * Zod schema for the data stored within a PatientProfile Firestore document (collection 'patients').
 * Document ID MUST match the UserProfile ID (Auth UID). Contains PHI.
 */
exports.PatientProfileSchema = zod_1.z.object({
    /** Links to the UserProfile document/Auth UID. Required. */
    userId: zod_1.z.string().min(1, 'User ID linkage is required').describe('Auth UID / FK'),
    id: zod_1.z.string().optional().describe('Document ID, if available'),
    /** @PHI Patient's date of birth. Stored as ISO string locally. */
    dateOfBirth: exports.isoDateTimeStringSchema
        .nullable()
        .optional() // Allow optional input, handle default/requirement elsewhere if needed
        .describe("@PHI - Patient's date of birth."),
    /** @PHI Patient's self-identified gender. Uses custom schema for normalization. */
    gender: exports.genderSchema // Apply the transforming gender schema directly
        .describe("@PHI - Patient's gender."),
    /** @PHI Patient's blood type (e.g., 'A+', 'O-'). Max 5 chars. */
    bloodType: zod_1.z
        .nativeEnum(enums_1.BloodType)
        .nullable()
        .optional() // Optional field
        .describe("@PHI - Patient's blood type."),
    /** @PHI Detailed patient medical history. Max 4000 chars. */
    medicalHistory: zod_1.z
        .string()
        .max(4000, 'Medical history is too long (max 4000 characters)')
        .nullable()
        .describe('@PHI – Optional free-text medical history'),
    /** @PHI Patient's address. Max 500 chars. */
    address: zod_1.z
        .string()
        .max(500, 'Address is too long')
        .nullable()
        .optional()
        .describe("Patient's address"),
});
/**
 * Zod schema for a single education entry in DoctorProfile.educationHistory.
 */
exports.EducationEntrySchema = zod_1.z.object({
    institution: zod_1.z
        .string()
        .min(1, 'Institution name is required')
        .describe('Name of the educational institution'),
    degree: zod_1.z.string().min(1, 'Degree is required').describe('Degree or certification obtained'),
    field: zod_1.z.string().min(1, 'Field of study is required').describe('Field or specialty of study'),
    startYear: zod_1.z
        .number()
        .int('Start year must be an integer')
        .min(1900, 'Start year must be after 1900')
        .max(new Date().getFullYear(), 'Start year cannot be in the future')
        .describe('Year education began'),
    endYear: zod_1.z
        .number()
        .int('End year must be an integer')
        .min(1900, 'End year must be after 1900')
        .max(new Date().getFullYear() + 10, 'End year cannot be too far in the future')
        .optional()
        .nullable()
        .describe('Year education completed (null if ongoing)'),
    isOngoing: zod_1.z
        .boolean()
        .optional()
        .default(false)
        .describe('Indicates if this education is currently in progress'),
    description: zod_1.z
        .string()
        .max(500, 'Description is too long (max 500 characters)')
        .optional()
        .describe('Additional details about the education'),
});
/**
 * Zod schema for a single experience entry in DoctorProfile.experience.
 */
exports.ExperienceEntrySchema = zod_1.z.object({
    organization: zod_1.z
        .string()
        .min(1, 'Organization name is required')
        .describe('Name of the organization or employer'),
    position: zod_1.z.string().min(1, 'Position title is required').describe('Job title or position held'),
    location: zod_1.z.string().optional().describe('Geographic location of the position'),
    startYear: zod_1.z
        .number()
        .int('Start year must be an integer')
        .min(1900, 'Start year must be after 1900')
        .max(new Date().getFullYear(), 'Start year cannot be in the future')
        .describe('Year experience began'),
    endYear: zod_1.z
        .number()
        .int('End year must be an integer')
        .min(1900, 'End year must be after 1900')
        .max(new Date().getFullYear() + 10, 'End year cannot be too far in the future')
        .optional()
        .nullable()
        .describe('Year experience ended (null if ongoing)'),
    isOngoing: zod_1.z
        .boolean()
        .optional()
        .default(false)
        .describe('Indicates if this position is currently held'),
    description: zod_1.z
        .string()
        .max(1000, 'Description is too long (max 1000 characters)')
        .optional()
        .describe('Responsibilities and achievements in this position'),
});
/**
 * Zod schema for a time slot within a weekly schedule.
 */
exports.TimeSlotSchema = zod_1.z.object({
    startTime: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)')
        .describe('Start time in 24-hour format (HH:MM)'),
    endTime: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)')
        .describe('End time in 24-hour format (HH:MM)'),
    isAvailable: zod_1.z
        .boolean()
        .default(true)
        .describe('Whether this time slot is available for booking'),
});
/**
 * Zod schema for the recurring weekly availability schedule.
 */
exports.WeeklyScheduleSchema = zod_1.z.object({
    monday: zod_1.z
        .array(exports.TimeSlotSchema)
        .optional()
        .default([])
        .describe('Available time slots for Monday'),
    tuesday: zod_1.z
        .array(exports.TimeSlotSchema)
        .optional()
        .default([])
        .describe('Available time slots for Tuesday'),
    wednesday: zod_1.z
        .array(exports.TimeSlotSchema)
        .optional()
        .default([])
        .describe('Available time slots for Wednesday'),
    thursday: zod_1.z
        .array(exports.TimeSlotSchema)
        .optional()
        .default([])
        .describe('Available time slots for Thursday'),
    friday: zod_1.z
        .array(exports.TimeSlotSchema)
        .optional()
        .default([])
        .describe('Available time slots for Friday'),
    saturday: zod_1.z
        .array(exports.TimeSlotSchema)
        .optional()
        .default([])
        .describe('Available time slots for Saturday'),
    sunday: zod_1.z
        .array(exports.TimeSlotSchema)
        .optional()
        .default([])
        .describe('Available time slots for Sunday'),
});
/**
 * Zod schema for DoctorProfile data ('doctors' collection, ID=UID).
 */
exports.DoctorProfileSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID linkage is required').describe('Auth UID / FK'),
    specialty: zod_1.z
        .string()
        .min(1, 'Specialty is required')
        .default('General Practice')
        .describe("Doctor's medical specialty"),
    licenseNumber: zod_1.z
        .string()
        .min(1, 'License number is required')
        .describe('Professional license number'),
    yearsOfExperience: zod_1.z
        .number()
        .int('Years of experience must be an integer')
        .min(0, 'Years of experience cannot be negative')
        .default(0)
        .describe('Total years of professional experience'),
    bio: zod_1.z
        .string()
        .max(2000, 'Biography is too long (max 2000 characters)')
        .nullable()
        .describe('@PHI - Doctor biography/summary'),
    verificationStatus: zod_1.z
        .nativeEnum(enums_1.VerificationStatus)
        .default(enums_1.VerificationStatus.PENDING)
        .describe('Current verification status of the doctor'),
    verificationNotes: zod_1.z.string().nullable().describe('Notes from admin regarding verification'),
    adminNotes: zod_1.z.string().optional().describe('Internal admin notes'),
    location: zod_1.z.string().nullable().describe('Primary practice location'),
    education: zod_1.z
        .string()
        .max(2000, 'Education section is too long')
        .nullable()
        .describe("Doctor's education & training details"),
    servicesOffered: zod_1.z
        .string()
        .max(2000, 'Services section is too long')
        .nullable()
        .describe('Short description of services the doctor provides'),
    languages: zod_1.z.array(zod_1.z.string()).nullable().describe('Languages spoken by the doctor'),
    consultationFee: zod_1.z
        .number()
        .min(0, 'Consultation fee cannot be negative')
        .nullable()
        .describe('Standard consultation fee'),
    profilePictureUrl: zod_1.z
        .string()
        .url('Invalid profile picture URL')
        .nullable()
        .describe('Primary URL (Firebase Storage). Use when image is publicly hosted.'),
    profilePicturePath: zod_1.z
        .string()
        .optional()
        .nullable()
        .describe('Alternative local file path, if local storage is preferred during certain operations.'),
    licenseDocumentUrl: zod_1.z
        .string()
        .url('Invalid license document URL')
        .nullable()
        .describe('Primary URL (Firebase Storage). Use when document is securely stored in cloud.'),
    licenseDocumentPath: zod_1.z
        .string()
        .optional()
        .nullable()
        .describe('Alternative local file path, if local storage is preferred during certain operations.'),
    certificateUrl: zod_1.z
        .string()
        .url('Invalid certificate URL')
        .nullable()
        .describe('Primary URL (Firebase Storage). Use when certificate is securely stored in cloud.'),
    certificatePath: zod_1.z
        .string()
        .optional()
        .nullable()
        .describe('Alternative local file path, if local storage is preferred during certain operations.'),
    educationHistory: zod_1.z
        .array(exports.EducationEntrySchema)
        .optional()
        .default([])
        .describe("Doctor's educational background"),
    experience: zod_1.z
        .array(exports.ExperienceEntrySchema)
        .optional()
        .default([])
        .describe("Doctor's professional experience"),
    weeklySchedule: exports.WeeklyScheduleSchema.optional().describe('Optional recurring schedule'),
    timezone: zod_1.z
        .string()
        .default('UTC')
        .describe('IANA timezone identifier used to interpret weeklySchedule and blockedDates'),
    blockedDates: zod_1.z
        .array(exports.isoDateTimeStringSchema)
        .optional()
        .default([])
        .describe('@PHI - Specific dates doctor is unavailable (stored as ISO strings)'),
    createdAt: exports.isoDateTimeStringSchema.describe('Stored as ISO in schema; converted to Firestore Timestamp at runtime.'),
    updatedAt: exports.isoDateTimeStringSchema.describe('Stored as ISO in schema; converted to Firestore Timestamp at runtime.'),
    // Added fields for UI display
    rating: zod_1.z
        .number()
        .min(0, 'Rating cannot be negative')
        .max(5, 'Rating cannot exceed 5')
        .optional()
        .default(0)
        .describe("Doctor's average rating from reviews"),
    reviewCount: zod_1.z
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
exports.VerificationDocumentSchema = zod_1.z.object({
    doctorId: zod_1.z
        .string()
        .min(1, 'Doctor ID is required')
        .describe('Reference to the doctor this document belongs to'),
    documentType: zod_1.z.nativeEnum(enums_1.DocumentType).describe('Type of verification document'),
    fileUrl: zod_1.z.string().url('Invalid file URL').describe('URL to the uploaded document file'),
    uploadedAt: exports.isoDateTimeStringSchema.describe('Timestamp when the document was uploaded'),
    description: zod_1.z
        .string()
        .max(500, 'Description is too long (max 500 characters)')
        .optional()
        .describe('Additional details about the document'),
    status: zod_1.z
        .nativeEnum(enums_1.VerificationStatus)
        .optional()
        .default(enums_1.VerificationStatus.PENDING)
        .describe('Verification status of this specific document'),
    notes: zod_1.z.string().optional().describe('Admin notes regarding this document'),
});
/**
 * Zod schema for the data stored within an Appointment Firestore document (collection 'appointments').
 * Contains PHI. Linked to users via Auth UIDs.
 */
exports.AppointmentSchema = zod_1.z.object({
    /** The Firebase Auth UID of the patient who booked. Required. */
    patientId: zod_1.z.string().min(1),
    /** Denormalized patient name for display purposes. Optional. */
    patientName: zod_1.z.string().optional(),
    /** The Firebase Auth UID of the doctor for the appointment. Required. */
    doctorId: zod_1.z.string().min(1),
    /** Denormalized doctor name for display purposes. Optional. */
    doctorName: zod_1.z.string().optional(),
    /** Denormalized doctor specialty for display purposes. Optional. */
    doctorSpecialty: zod_1.z.string().optional(),
    /** The specific date of the appointment (stored as ISO string). Required. */
    appointmentDate: exports.isoDateTimeStringSchema,
    /** The start time of the appointment slot (HH:MM format). Required. */
    startTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)'),
    /** The end time of the appointment slot (HH:MM format). Required. */
    endTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)'),
    /** The current status of the appointment. Required, defaults handled by backend logic. */
    status: zod_1.z.nativeEnum(enums_1.AppointmentStatus),
    /** @PHI The reason for the visit provided by the patient. Optional. */
    reason: zod_1.z
        .string()
        .max(1000, 'Reason exceeds maximum length')
        .nullable()
        .optional()
        .describe('@PHI'),
    /** @PHI Notes added by the doctor upon completion. Optional. */
    notes: zod_1.z.string().max(2000, 'Notes exceed maximum length').nullable().optional().describe('@PHI'),
    /** Timestamp string when the appointment document was created (server-set). Required. */
    createdAt: exports.isoDateTimeStringSchema,
    /** Timestamp string when the appointment document was last updated (server-set). Required. */
    updatedAt: exports.isoDateTimeStringSchema,
    /** The type of appointment (e.g., in-person or video). Optional. */
    appointmentType: zod_1.z.nativeEnum(enums_1.AppointmentType).optional().default(enums_1.AppointmentType.IN_PERSON),
    videoCallUrl: zod_1.z
        .string()
        .url('Invalid video call URL')
        .nullable()
        .describe('Video consultation link (required when appointmentType = VIDEO)'),
});
/**
 * Zod schema for the data stored within a Notification Firestore document (collection 'notifications').
 * Targeted to a specific user via their Auth UID.
 */
exports.NotificationSchema = zod_1.z.object({
    /** The Firebase Auth UID of the user receiving the notification. Required. */
    userId: zod_1.z.string().min(1),
    /** The title of the notification. Required. */
    title: zod_1.z
        .string()
        .min(1, 'Notification title is required.')
        .max(100, 'Title too long')
        .describe('The main heading of the notification'),
    /** The main content/body of the notification message. Required. */
    message: zod_1.z
        .string()
        .min(1, 'Notification message is required.')
        .max(500, 'Message too long')
        .describe('The detailed content of the notification'),
    /** Flag indicating if the user has marked the notification as read. Defaults to false. */
    isRead: zod_1.z.boolean().default(false).describe('Tracking if notification has been viewed by user'),
    /** Timestamp string when the notification was created (server-set). Required. */
    createdAt: exports.isoDateTimeStringSchema.describe('When the notification was generated'),
    /** Category type for the notification (e.g., appointment update, system alert, verification status). Defaults to 'system'. */
    type: zod_1.z
        .nativeEnum(enums_1.NotificationType)
        .default(enums_1.NotificationType.OTHER)
        .describe('Type/category of notification'),
    /** Optional ID of a related Firestore document (e.g., the appointment ID). */
    relatedId: zod_1.z.string().nullable().optional().describe('e.g., Appointment ID'),
});
/**
 * Zod schema for a document in the 'doctors/{doctorId}/availability' subcollection,
 * representing a specific block of time a doctor is available during the week.
 */
exports.DoctorAvailabilitySlotSchema = zod_1.z.object({
    /** Links to the DoctorProfile document/Auth UID. Required. */
    doctorId: zod_1.z.string().min(1).describe('Reference to the doctor this availability slot belongs to'),
    /** Day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday - adjust if 0=Monday). Required. */
    dayOfWeek: zod_1.z
        .number()
        .int()
        .min(0)
        .max(6)
        .describe('Day of week (0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday)'),
    /** Start time of the slot (HH:MM format). Required. */
    startTime: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)')
        .describe('Start time in 24-hour format (HH:MM)'),
    /** End time of the slot (HH:MM format). Required. */
    endTime: zod_1.z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)')
        .describe('End time in 24-hour format (HH:MM)'),
    /** Whether this specific slot is available (can be used to override weekly schedule). Defaults true. */
    isAvailable: zod_1.z
        .boolean()
        .default(true)
        .describe('Whether this specific timeslot is available for booking'),
});
/**
 * Zod schema for a single entry in the Admin User List.
 * Contains essential fields for display and actions.
 */
exports.AdminUserListEntrySchema = exports.UserProfileSchema.pick({
    // id is implicitly the doc ID, but needed in the TS type
    email: true,
    firstName: true,
    lastName: true,
    userType: true,
    isActive: true,
    createdAt: true, // Keep createdAt for 'Joined Date' column
}).extend({
    id: zod_1.z.string().describe('Auth UID / Document ID'), // Explicitly add ID needed for frontend keys/actions
});
/**
 * Zod schema for a single entry in the Admin Doctor List.
 * Combines user and doctor profile info.
 */
// Select necessary fields from UserProfile for the doctor list
const BaseUserInfoForDoctorList = exports.UserProfileSchema.pick({
    email: true,
    firstName: true,
    lastName: true,
    createdAt: true, // 'Joined Date'
});
// Select necessary fields from DoctorProfile
const DoctorInfoForList = exports.DoctorProfileSchema.pick({
    specialty: true,
    verificationStatus: true,
});
// Combine and add ID
exports.AdminDoctorListEntrySchema = BaseUserInfoForDoctorList.merge(DoctorInfoForList).extend({
    id: zod_1.z.string().describe('Auth UID / Document ID'),
});
/**
 * Zod schema for data displayed on Doctor Cards in search results (public view).
 */
// Base user info needed
const UserInfoForPublicCard = exports.UserProfileSchema.pick({
    firstName: true,
    lastName: true,
});
// Public doctor info needed
const DoctorInfoForPublicCard = exports.DoctorProfileSchema.pick({
    userId: true,
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
exports.PublicDoctorCardSchema = UserInfoForPublicCard.merge(DoctorInfoForPublicCard).extend({
    id: zod_1.z.string().describe('Auth UID / Document ID'), // Same as userId, represents the document ID / Auth UID
});
/**
 * Zod schema for tracking changes to a doctor's verification status ('verificationHistory' collection).
 * Provides a full audit trail of verification status changes, who made them, and why.
 */
exports.VerificationHistoryEntrySchema = zod_1.z.object({
    /** Reference to the doctor whose verification status changed. Required. */
    doctorId: zod_1.z
        .string()
        .min(1, 'Doctor ID is required')
        .describe('The doctor whose verification status was changed'),
    /** The verification status before the change. Required. */
    previousStatus: zod_1.z
        .nativeEnum(enums_1.VerificationStatus)
        .describe('The verification status before the change'),
    /** The new verification status after the change. Required. */
    newStatus: zod_1.z.nativeEnum(enums_1.VerificationStatus).describe('The verification status after the change'),
    /** The admin who changed the verification status. Required. */
    changedByAdminId: zod_1.z
        .string()
        .min(1, 'Admin ID is required')
        .describe('The admin who performed the verification status change'),
    /** Timestamp when the change occurred. Required. */
    timestamp: exports.isoDateTimeStringSchema.describe('When the verification status change occurred'),
    /** Optional notes explaining the reason for the change. */
    notes: zod_1.z
        .string()
        .max(1000, 'Notes are too long (max 1000 characters)')
        .optional()
        .describe('Explanation for why the verification status was changed'),
});
/** Generic action types for system log entries */
var SystemLogActionType;
(function (SystemLogActionType) {
    SystemLogActionType["VERIFICATION_STATUS_CHANGE"] = "verification_status_change";
    SystemLogActionType["USER_CREATED"] = "user_created";
    SystemLogActionType["USER_UPDATED"] = "user_updated";
    SystemLogActionType["USER_DEACTIVATED"] = "user_deactivated";
    SystemLogActionType["USER_REACTIVATED"] = "user_reactivated";
    SystemLogActionType["PASSWORD_RESET_TRIGGERED"] = "password_reset_triggered";
    SystemLogActionType["LOGIN_SUCCESS"] = "login_success";
    SystemLogActionType["LOGIN_FAILURE"] = "login_failure";
    SystemLogActionType["APPOINTMENT_CREATED"] = "appointment_created";
    SystemLogActionType["APPOINTMENT_CANCELLED"] = "appointment_cancelled";
    SystemLogActionType["APPOINTMENT_COMPLETED"] = "appointment_completed";
    SystemLogActionType["SYSTEM_ERROR"] = "system_error";
    SystemLogActionType["DATA_EXPORT"] = "data_export";
})(SystemLogActionType = exports.SystemLogActionType || (exports.SystemLogActionType = {}));
/**
 * Zod schema for general system audit logs ('systemLogs' collection).
 * Provides a comprehensive audit trail of all significant system actions.
 */
exports.SystemLogSchema = zod_1.z.object({
    /** The type of action that occurred. Required. */
    action: zod_1.z.nativeEnum(SystemLogActionType).describe('Type of system action that occurred'),
    /** The user who performed the action. Required. */
    actorId: zod_1.z
        .string()
        .min(1, 'Actor ID is required')
        .describe('The user who performed the action (often an admin)'),
    /** The user who was the target of the action, if applicable. */
    targetUserId: zod_1.z
        .string()
        .optional()
        .describe('The user that was the subject of the action, if applicable'),
    /** Timestamp when the action occurred. Required. */
    timestamp: exports.isoDateTimeStringSchema.describe('When the action occurred'),
    /** Application module where the action occurred. */
    module: zod_1.z
        .string()
        .optional()
        .describe("System module where the action occurred (e.g., 'verification', 'appointments')"),
    /** IP address of the actor, for security audit purposes. */
    ipAddress: zod_1.z
        .string()
        .optional()
        .describe('IP address of the actor (for security audit purposes)'),
    /** Browser/client information, for security audit purposes. */
    userAgent: zod_1.z
        .string()
        .optional()
        .describe('Browser/client information (for security audit purposes)'),
    /** Additional context about the action in either string format or as a structured object. */
    details: zod_1.z
        .union([
        zod_1.z.string().max(5000, 'Details are too long (max 5000 characters)'),
        zod_1.z.record(zod_1.z.unknown()),
    ])
        .optional()
        .describe('Additional context about the action (structured data or text)'),
});
/**
 * Zod schema for booking an appointment
 */
exports.BookAppointmentSchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, 'Doctor ID is required'),
    appointmentDate: exports.isoDateTimeStringSchema,
    startTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Invalid start time format (HH:MM)'),
    endTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Invalid end time format (HH:MM)'),
    reason: zod_1.z.string().max(1000, 'Reason exceeds maximum length').optional(),
    appointmentType: zod_1.z.nativeEnum(enums_1.AppointmentType).default(enums_1.AppointmentType.IN_PERSON),
});
/**
 * Zod schema for updating user profile
 */
exports.UpdateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required').optional(),
    lastName: zod_1.z.string().min(1, 'Last name is required').optional(),
    phone: zod_1.z.string().nullable().optional(),
    // ... add any other updatable fields here
});
/**
 * Zod schema for finding doctors
 */
exports.FindDoctorsSchema = zod_1.z.object({
    specialty: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    availableDate: exports.isoDateTimeStringSchema.optional(),
    languages: zod_1.z.array(zod_1.z.string()).optional(),
    maxConsultationFee: zod_1.z.number().optional(),
    searchTerm: zod_1.z.string().optional(),
    pageSize: zod_1.z.number().optional(),
    pageNumber: zod_1.z.number().optional(),
});
/**
 * Zod schema for setting doctor availability
 */
exports.SetDoctorAvailabilitySchema = zod_1.z.object({
    weeklySchedule: exports.WeeklyScheduleSchema.optional(),
    blockedDates: zod_1.z.array(exports.isoDateTimeStringSchema).optional(),
    timezone: zod_1.z.string().optional(),
});
/**
 * Zod schema for getting available slots
 */
exports.GetAvailableSlotsSchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, 'Doctor ID is required'),
    date: exports.isoDateTimeStringSchema,
});
/**
 * Zod schema for canceling an appointment
 */
exports.CancelAppointmentSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().min(1, 'Appointment ID is required'),
    reason: zod_1.z.string().max(1000, 'Reason exceeds maximum length').optional(),
});
/**
 * Zod schema for completing an appointment
 */
exports.CompleteAppointmentSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().min(1, 'Appointment ID is required'),
    notes: zod_1.z.string().max(2000, 'Notes exceed maximum length').optional(),
});
/**
 * Zod schema for getting appointment details
 */
exports.GetAppointmentDetailsSchema = zod_1.z.object({
    appointmentId: zod_1.z.string().min(1, 'Appointment ID is required'),
});
/**
 * Zod schema for getting user's appointments
 *
 * This schema validates the authentication context for user accessing their appointments.
 * Parameters for filtering appointments are optional.
 */
exports.GetMyAppointmentsSchema = zod_1.z
    .object({
    // Optional filter parameters
    status: zod_1.z.union([zod_1.z.nativeEnum(enums_1.AppointmentStatus), zod_1.z.literal('upcoming')]).optional(),
    startDate: exports.isoDateTimeStringSchema.optional(),
    endDate: exports.isoDateTimeStringSchema.optional(),
    limit: zod_1.z.number().int().min(1).max(100).optional(),
    offset: zod_1.z.number().int().min(0).optional(),
})
    .strict()
    .partial();
/**
 * Zod schema for admin user updates
 */
exports.AdminUpdateUserSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
    firstName: zod_1.z.string().min(1, 'First name is required').optional(),
    lastName: zod_1.z.string().min(1, 'Last name is required').optional(),
    email: zod_1.z.string().email('Invalid email format').optional(),
    phone: zod_1.z.string().nullable().optional(),
    address: zod_1.z.string().max(500, 'Address is too long').nullable().optional(),
    accountStatus: zod_1.z
        .enum(['active', 'suspended', 'deactivated'], {
        errorMap: () => ({ message: 'Status must be one of: active, suspended, deactivated' }),
    })
        .optional(),
});
/**
 * Zod schema for admin user status updates
 */
exports.AdminUpdateUserStatusSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
    status: zod_1.z.enum(['active', 'suspended', 'deactivated'], {
        errorMap: () => ({ message: 'Status must be one of: active, suspended, deactivated' }),
    }),
    reason: zod_1.z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});
/**
 * Zod schema for admin doctor verification
 */
exports.AdminVerifyDoctorSchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, 'Doctor ID is required'),
    verificationStatus: zod_1.z.nativeEnum(enums_1.VerificationStatus),
    verificationNotes: zod_1.z.string().max(1000, 'Notes exceed maximum length').optional(),
});
/**
 * Zod schema for admin user creation
 */
exports.AdminCreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    userType: zod_1.z.nativeEnum(enums_1.UserType),
    isActive: zod_1.z.boolean().optional().default(true),
    // Patient-specific fields
    dateOfBirth: exports.isoDateTimeStringSchema.optional(),
    gender: exports.genderSchema.optional(),
    bloodType: zod_1.z.nativeEnum(enums_1.BloodType).optional(),
    medicalHistory: zod_1.z.string().max(4000).optional(),
    // Doctor-specific fields
    specialty: zod_1.z.string().optional(),
    licenseNumber: zod_1.z.string().optional(),
    yearsOfExperience: zod_1.z.number().int().min(0).max(70).optional(),
});
exports.isoDateOrDateTimeStringSchema = zod_1.z.string().refine(val => /^\d{4}-\d{2}-\d{2}$/.test(val) || // date only
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(val), // date-time
{ message: 'Invalid ISO date or date-time string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)' });
/**
 * Zod schema for patient registration payload.
 * Used for validating user input during patient registration.
 */
exports.PatientRegistrationSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Please enter a valid email address')
        .min(5, 'Email is too short')
        .max(100, 'Email is too long'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password is too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    userType: zod_1.z.nativeEnum(enums_1.UserType),
    firstName: zod_1.z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name is too long'),
    lastName: zod_1.z
        .string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name is too long'),
    dateOfBirth: zod_1.z.string().refine(val => {
        // Check if the string is a valid date
        const date = new Date(val);
        if (isNaN(date.getTime()))
            return false;
        // Check if patient is at least 18 years old
        const today = new Date();
        const eighteenYearsAgo = new Date(today);
        eighteenYearsAgo.setFullYear(today.getFullYear() - 18);
        return date <= eighteenYearsAgo;
    }, 'You must be at least 18 years old'),
    gender: exports.genderSchema,
    // Optional fields
    bloodType: zod_1.z.string().optional(),
    medicalHistory: zod_1.z.string().optional(),
});
/**
 * Zod schema for doctor registration payload.
 * Used for validating user input during doctor registration.
 */
exports.DoctorRegistrationSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Please enter a valid email address')
        .min(5, 'Email is too short')
        .max(100, 'Email is too long'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password is too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    userType: zod_1.z.nativeEnum(enums_1.UserType),
    firstName: zod_1.z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name is too long'),
    lastName: zod_1.z
        .string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name is too long'),
    specialty: zod_1.z
        .string()
        .min(3, 'Specialty must be at least 3 characters')
        .max(100, 'Specialty is too long'),
    licenseNumber: zod_1.z
        .string()
        .min(5, 'License number must be at least 5 characters')
        .max(50, 'License number is too long'),
    yearsOfExperience: zod_1.z
        .number()
        .int('Experience must be a whole number')
        .min(0, 'Experience cannot be negative')
        .max(70, 'Please enter a valid years of experience'),
});
/**
 * Zod schema for admin retrieving user details
 */
exports.AdminGetUserDetailSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
});
/**
 * Zod schema for getting user's notifications
 */
exports.GetMyNotificationsSchema = zod_1.z
    .object({
// Optional filtering parameters could be added here in the future
// limit: z.number().int().min(1).max(100).optional(),
// onlyUnread: z.boolean().optional(),
})
    .strict();
/**
 * Zod schema for marking a notification as read
 */
exports.MarkNotificationReadSchema = zod_1.z.object({
    notificationId: zod_1.z.string().min(1, 'Notification ID is required'),
    isRead: zod_1.z.boolean().optional().default(true),
});
/**
 * Zod schema for sending a direct message
 */
exports.SendDirectMessageSchema = zod_1.z.object({
    recipientId: zod_1.z.string().min(1, 'Recipient ID is required'),
    subject: zod_1.z.string().max(200, 'Subject is too long').optional(),
    message: zod_1.z.string().min(1, 'Message body is required').max(5000, 'Message is too long'),
});
/**
 * Zod schema for getting a doctor's public profile
 */
exports.GetDoctorPublicProfileSchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, 'Doctor ID is required'),
});
/**
 * Zod schema for getting doctor's availability
 */
exports.GetDoctorAvailabilitySchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, 'Doctor ID is required'),
});
/**
 * Zod schema for retrieving user dashboard statistics
 */
exports.GetMyDashboardStatsSchema = zod_1.z
    .object({
// Optional filtering parameters could be added here in the future
})
    .strict();
/**
 * Zod schema for admin dashboard data
 */
exports.AdminGetDashboardDataSchema = zod_1.z
    .object({
// Optional parameters could be added here in the future
})
    .strict();
/**
 * Zod schema for batch getting doctor data
 */
exports.BatchGetDoctorDataSchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, 'Doctor ID is required'),
    includeProfile: zod_1.z.boolean().optional().default(true),
    includeAvailability: zod_1.z.boolean().optional().default(true),
    includeAppointments: zod_1.z.boolean().optional().default(false),
    currentDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    numDays: zod_1.z.number().int().min(1).max(30).optional().default(1),
});
/**
 * Zod schema for batch getting multiple doctors data
 */
exports.BatchGetDoctorsDataSchema = zod_1.z
    .array(zod_1.z.string().min(1, 'Doctor ID is required'))
    .min(1, 'At least one doctor ID is required')
    .max(20, 'Maximum 20 doctor IDs allowed');
/**
 * Zod schema for batch getting multiple patients data
 */
exports.BatchGetPatientDataSchema = zod_1.z
    .array(zod_1.z.string().min(1, 'Patient ID is required'))
    .min(1, 'At least one patient ID is required')
    .max(20, 'Maximum 20 patient IDs allowed');
/**
 * Zod schema for admin getting all users
 */
exports.AdminGetAllUsersSchema = zod_1.z
    .object({
    page: zod_1.z.number().int().min(1).optional().default(1),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(10),
    filter: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'inactive', 'all']).optional().default('all'),
    userType: zod_1.z.nativeEnum(enums_1.UserType).optional(),
})
    .strict()
    .partial();
/**
 * Zod schema for admin getting all doctors
 */
exports.AdminGetAllDoctorsSchema = zod_1.z
    .object({
    page: zod_1.z.number().int().min(1).optional().default(1),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(10),
    filter: zod_1.z.string().optional(),
    verificationStatus: zod_1.z.nativeEnum(enums_1.VerificationStatus).optional(),
})
    .strict()
    .partial();
/**
 * Zod schema for admin getting all appointments
 */
exports.AdminGetAllAppointmentsSchema = zod_1.z
    .object({
    page: zod_1.z.number().int().min(1).optional().default(1),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(10),
    status: zod_1.z.nativeEnum(enums_1.AppointmentStatus).optional(),
    startDate: exports.isoDateTimeStringSchema.optional(),
    endDate: exports.isoDateTimeStringSchema.optional(),
    doctorId: zod_1.z.string().optional(),
    patientId: zod_1.z.string().optional(),
})
    .strict()
    .partial();
/**
 * Zod schema for admin getting doctor by ID
 */
exports.AdminGetDoctorByIdSchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, 'Doctor ID is required'),
});
/**
 * Zod schema for getting mock doctor profile
 */
exports.GetMockDoctorProfileSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
});
/**
 * Zod schema for mock API get available time slots
 */
exports.MockGetAvailableTimeSlotsSchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, 'Doctor ID is required'),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});
/**
 * Zod schema for mock API get doctor schedule
 */
exports.MockGetDoctorScheduleSchema = zod_1.z.object({
    doctorId: zod_1.z.string().min(1, 'Doctor ID is required'),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
    endDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
        .optional(),
});
/**
 * Zod schema for user sign-in
 */
exports.SignInSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
/**
 * Zod schema for validating the payload to update the status of multiple appointments in batch.
 */
exports.BatchUpdateAppointmentStatusSchema = zod_1.z.object({
    appointmentIds: zod_1.z.array(zod_1.z.string().min(1, "Appointment ID cannot be empty"))
        .nonempty("At least one appointment ID must be provided.")
        .max(50, "Cannot update more than 50 appointments at once.") // Safety limit
        .describe("An array of appointment IDs to update."),
    status: zod_1.z.nativeEnum(enums_1.AppointmentStatus)
        .describe("The new status to apply to all specified appointments."),
    // Optional: Add admin notes or reason for batch update if needed
    // adminNotes: z.string().optional().describe("Optional notes from the admin for this batch update.")
}).strict(); // Ensure no extra properties are passed
/**
 * Zod schema for validating the payload to update the status of multiple users in batch.
 */
exports.BatchUpdateUserStatusSchema = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.string().min(1, "User ID cannot be empty"))
        .nonempty("At least one user ID must be provided.")
        .max(50, "Cannot update more than 50 users at once.") // Safety limit
        .describe("An array of user IDs to update."),
    isActive: zod_1.z.boolean()
        .describe("The new active status to apply to all specified users (true for active, false for inactive)."),
    // Optional: Add admin notes or reason for batch update
    adminNotes: zod_1.z.string().optional().describe("Optional notes from the admin for this batch update.")
}).strict();
//# sourceMappingURL=schemas.js.map