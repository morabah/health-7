'use client';

import { z } from 'zod';
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
// Import localDb module statically
import * as localDb from './localDb';

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
 * Summary of validation results across a collection
 */
export interface ValidationSummary {
  collection: string;
  totalDocuments: number;
  validDocuments: number;
  invalidDocuments: number;
  errorDocuments: number;
  commonErrors: {[field: string]: number};
}

/**
 * Fetches all documents from a collection in the local database
 * and validates each against a Zod schema.
 * 
 * @param collectionName - The name of the collection to validate
 * @param schema - The Zod schema to validate against
 * @param verbose - Whether to log detailed validation information
 * @returns Promise resolving to validation results for each document
 */
export async function validateCollectionData<
  TData extends { [key: string]: any },
  TSchema extends z.ZodType<any>
>(
  collectionName: string,
  schema: TSchema,
  verbose: boolean = false
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
        if (verbose) {
          logInfo(`✓ Valid: ${collectionName}/${id}`);
        }
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
        
        logWarn(`✗ Validation failed for ${collectionName}/${id}`, fieldErrors);
      }
    });

    // Generate and log summary
    const summary = generateValidationSummary(results, collectionName);
    logInfo(`Validation summary for ${collectionName}:`, summary);
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
 * Generates a summary of validation results for a collection
 * 
 * @param results - The validation results for the collection
 * @param collectionName - The name of the collection
 * @returns A summary of the validation results
 */
export function generateValidationSummary(
  results: CollectionValidationResult,
  collectionName: string
): ValidationSummary {
  const summary: ValidationSummary = {
    collection: collectionName,
    totalDocuments: results.length,
    validDocuments: 0,
    invalidDocuments: 0,
    errorDocuments: 0,
    commonErrors: {}
  };

  results.forEach(result => {
    if (result.status === 'valid') {
      summary.validDocuments++;
    } else if (result.status === 'invalid') {
      summary.invalidDocuments++;
      
      // Track common field errors
      result.errors?.forEach(error => {
        const field = error.field;
        summary.commonErrors[field] = (summary.commonErrors[field] || 0) + 1;
      });
    } else if (result.status === 'error') {
      summary.errorDocuments++;
    }
  });

  return summary;
}

/**
 * Validates multiple collections against their respective schemas
 * 
 * @param collections - Array of collection names to validate
 * @param verbose - Whether to log detailed validation information
 * @returns Promise resolving to an object with results for each collection
 */
export async function validateMultipleCollections(
  collections: string[],
  verbose: boolean = false
): Promise<{[collection: string]: CollectionValidationResult}> {
  const results: {[collection: string]: CollectionValidationResult} = {};
  
  for (const collection of collections) {
    const schema = getSchemaForCollection(collection);
    
    if (!schema) {
      logWarn(`No schema found for collection: ${collection}`);
      continue;
    }
    
    results[collection] = await validateCollectionData(collection, schema, verbose);
  }
  
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
      return await localDb.getUsers();
    case 'patients':
      return await localDb.getPatients();
    case 'doctors':
      return await localDb.getDoctors();
    case 'appointments':
      return await localDb.getAppointments();
    case 'notifications':
      return await localDb.getNotifications();
    default:
      return null;
  }
} 