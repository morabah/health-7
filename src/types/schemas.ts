/** 
 * Shared Zod schemas defining the structure and validation rules for application data types. 
 * These schemas are the source of truth, and TypeScript types are inferred from them where possible.
 */

import { z } from 'zod';
import { Gender, UserType } from './enums';
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