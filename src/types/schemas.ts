/** 
 * Shared Zod schemas defining the structure and validation rules for application data types. 
 * These schemas are the source of truth, and TypeScript types are inferred from them where possible.
 */

import { z } from 'zod';
import { Gender } from './enums';
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