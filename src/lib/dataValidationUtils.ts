'use client';

import type { z } from 'zod';
import { logInfo, logWarn, logError } from '@/lib/logger';
import { 
  UserProfileSchema, 
  PatientProfileSchema, 
  DoctorProfileSchema, 
  AppointmentSchema, 
  NotificationSchema,
  type UserProfile,
  type PatientProfile,
  type DoctorProfile,
  type Appointment,
  type Notification
} from '@/types/schemas';

/**
 * Represents a field validation error in a document
 */
export interface FieldError { 
  field: string; 
  message: string; 
  received: any; 
}

/**
 * Represents the validation result for a single document
 */
export interface DocumentValidationResult {
  id: string;
  collection: string;
  status: 'valid' | 'invalid' | 'error';
  errors?: FieldError[]; // Array of specific field errors if invalid
  fetchError?: string; // Error during fetch itself
}

/**
 * Represents the validation results for a collection of documents
 */
export type CollectionValidationResult = DocumentValidationResult[];

/**
 * Fetches all documents from a collection in the local database
 * and validates each against a Zod schema.
 * 
 * @param collectionName - The name of the collection to validate
 * @param schema - The Zod schema to validate against
 * @returns Promise resolving to validation results for each document
 */
export async function validateCollectionData<
  TData extends { [key: string]: any },
  TSchema extends z.ZodType<any>
>(
  collectionName: string,
  schema: TSchema
): Promise<CollectionValidationResult> {
  logInfo(`Starting validation for collection: ${collectionName}`);
  const results: CollectionValidationResult = [];
  
  try {
    // Fetch data from local database
    const documents = await getLocalData(collectionName);
    
    if (!documents || !Array.isArray(documents)) {
      return [{ 
        id: 'N/A', 
        collection: collectionName, 
        status: 'error', 
        fetchError: `No documents found or invalid data type in ${collectionName}` 
      }];
    }
    
    logInfo(`Fetched ${documents.length} documents from ${collectionName}`);
    
    // Validate each document
    documents.forEach((doc) => {
      const id = doc.id;
      // Remove id from validation if using separate id field
      const { id: docId, ...dataToValidate } = doc;
      
      const validation = schema.safeParse(dataToValidate);
      
      if (validation.success) {
        results.push({ 
          id, 
          collection: collectionName, 
          status: 'valid' 
        });
      } else {
        const fieldErrors: FieldError[] = validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          received: issue.path.reduce((obj, key) => obj?.[key], dataToValidate) // Get failing value
        }));
        
        results.push({ 
          id, 
          collection: collectionName, 
          status: 'invalid', 
          errors: fieldErrors 
        });
        
        logWarn(`Validation failed for ${collectionName}/${id}`, fieldErrors);
      }
    });
  } catch (error: any) {
    logError(`Error fetching or validating collection ${collectionName}`, error);
    results.push({ 
      id: 'N/A', 
      collection: collectionName, 
      status: 'error', 
      fetchError: error.message 
    });
  }
  
  logInfo(`Validation finished for collection: ${collectionName}`);
  return results;
}

/**
 * Helper function to get the appropriate schema for a collection
 * 
 * @param collectionName - The name of the collection
 * @returns The Zod schema for the collection or undefined if not found
 */
export function getSchemaForCollection(collectionName: string): z.ZodType<any> | undefined {
  switch (collectionName) {
    case 'users':
      return UserProfileSchema;
    case 'patients':
      return PatientProfileSchema;
    case 'doctors':
      return DoctorProfileSchema;
    case 'appointments':
      return AppointmentSchema;
    case 'notifications':
      return NotificationSchema;
    default:
      return undefined;
  }
}

/**
 * Helper function to read data from the local database
 * 
 * @param collectionName - The name of the collection
 * @returns Promise resolving to the data or null if not found
 */
async function getLocalData(collectionName: string): Promise<any[] | null> {
  switch (collectionName) {
    case 'users':
      return await import('./localDb').then(module => module.getUsers());
    case 'patients':
      return await import('./localDb').then(module => module.getPatients());
    case 'doctors':
      return await import('./localDb').then(module => module.getDoctors());
    case 'appointments':
      return await import('./localDb').then(module => module.getAppointments());
    case 'notifications':
      return await import('./localDb').then(module => module.getNotifications());
    default:
      return null;
  }
} 