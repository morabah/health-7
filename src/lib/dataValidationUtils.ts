'use client';

import type { z } from 'zod';
import { logInfo, logWarn, logError } from '@/lib/logger';
import {
  UserProfileSchema,
  PatientProfileSchema,
  DoctorProfileSchema,
  AppointmentSchema,
  NotificationSchema,
} from '@/types/schemas';
// Import localDb module statically
import * as localDb from './localDb';

/**
 * Represents a field validation error in a document
 */
export interface FieldError {
  field: string;
  message: string;
  received: unknown;
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
  commonErrors: Record<string, number>;
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
export async function validateCollectionData<TSchema extends z.ZodType<unknown>>(
  collectionName: string,
  schema: TSchema,
  verbose: boolean = false
): Promise<CollectionValidationResult> {
  logInfo(`Starting validation for collection: ${collectionName}`);
  const results: CollectionValidationResult = [];

  try {
    // Fetch data from local database
    const data = await getLocalData(collectionName);

    if (!data || !Array.isArray(data)) {
      return [
        {
          id: 'N/A',
          collection: collectionName,
          status: 'error',
          fetchError: `No documents found or invalid data type in ${collectionName}`,
        },
      ];
    }

    logInfo(`Fetched ${data.length} documents from ${collectionName}`);

    // Validate each document
    for (const doc of data) {
      // doc is unknown, so we must narrow its type for safe property access
      if (typeof doc === 'object' && doc !== null && 'id' in doc) {
        const { id, ...rest } = doc as { id: string } & Record<string, unknown>;
        const result = schema.safeParse(rest);
        const isValid = result.success;

        // Add warning log for invalid documents
        if (!isValid) {
          logWarn(`Invalid document found in ${collectionName}: ${id}`, {
            errors: result.error.issues.map(issue => ({
              path: issue.path,
              message: issue.message,
            })),
          });
        }

        results.push({
          id,
          collection: collectionName,
          status: isValid ? 'valid' : 'invalid',
          errors: isValid
            ? []
            : result.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message,
                received:
                  Array.isArray(issue.path) && issue.path.length > 0
                    ? issue.path.reduce<unknown>((obj, key) => {
                        if (typeof obj === 'object' && obj !== null && key in obj) {
                          return (obj as Record<string, unknown>)[key as string];
                        }
                        return undefined;
                      }, rest)
                    : undefined,
              })),
        });
        if (verbose && isValid) {
          logInfo(`✓ Valid: ${collectionName}/${id}`);
        }
      } else {
        results.push({
          id: 'unknown',
          collection: collectionName,
          status: 'invalid',
          errors: [{ field: 'id', message: 'Missing id', received: doc }],
        });
      }
    }

    // Generate and log summary
    const summary = generateValidationSummary(results, collectionName);
    logInfo(`Validation summary for ${collectionName}:`, summary);
  } catch (error: unknown) {
    logError(`Error fetching or validating collection ${collectionName}`, error);
    results.push({
      id: 'N/A',
      collection: collectionName,
      status: 'error',
      fetchError: error instanceof Error ? error.message : String(error),
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
    commonErrors: {},
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
): Promise<Record<string, CollectionValidationResult>> {
  const results: Record<string, CollectionValidationResult> = {};

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
export function getSchemaForCollection(collectionName: string): z.ZodType<unknown> | undefined {
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
async function getLocalData(collectionName: string): Promise<unknown[] | null> {
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

/**
 * Audits an API endpoint implementation to check if it properly uses schema validation
 *
 * @param functionName - The name of the function to audit
 * @param fileContent - The entire file content as a string
 * @returns Analysis result with details about validation patterns found
 */
export function auditApiEndpointValidation(
  functionName: string,
  fileContent: string
): {
  usesSchemaValidation: boolean;
  importsFromCentralSchema: boolean;
  usesZodSafeParse: boolean;
  validatesBeforeProcessing: boolean;
  returnsValidationErrors: boolean;
  inlineSchemaDefinitions: boolean;
  score: number; // 0-100 score based on adherence to best practices
  recommendations: string[];
} {
  const result = {
    usesSchemaValidation: false,
    importsFromCentralSchema: false,
    usesZodSafeParse: false,
    validatesBeforeProcessing: false,
    returnsValidationErrors: false,
    inlineSchemaDefinitions: false,
    score: 0,
    recommendations: [] as string[],
  };

  // Create a regex pattern to find the specific function
  const functionRegex = new RegExp(
    `export\\s+async\\s+function\\s+${functionName}\\s*\\([\\s\\S]*?\\{([\\s\\S]*?)\\n\\}`,
    'g'
  );
  const functionMatch = functionRegex.exec(fileContent);

  if (!functionMatch || !functionMatch[1]) {
    // Function body not found
    result.recommendations.push('Add Zod schema validation to validate input data');
    return result;
  }

  // Function body
  const functionBody = functionMatch[1];

  // Check for import statements related to schemas
  const hasSchemaImport = /import\s+\{[^}]*Schema[^}]*\}\s+from\s+['"]@\/types\/schemas['"]/i.test(
    fileContent
  );
  const importSpecificSchema = new RegExp(
    `import\\s+\\{[^}]*\\b(\\w+Schema)\\b[^}]*\\}\\s+from\\s+['"]@\\/types\\/schemas['"]`,
    'i'
  );

  // Use Array.from to fix the RegExpStringIterator issue
  const importMatches = Array.from(fileContent.matchAll(new RegExp(importSpecificSchema, 'g')));

  const importedSchemas = importMatches.flatMap(match => {
    const importStatement = match[0];
    // Extract everything between the curly braces
    const schemaMatch = importStatement.match(/\{([^}]*)\}/);
    if (schemaMatch && schemaMatch[1]) {
      // Split by comma and trim to get individual schema names
      return schemaMatch[1].split(',').map((s: string) => s.trim());
    }
    return [];
  });

  result.importsFromCentralSchema = hasSchemaImport;

  // Check if the function uses any of the imported schemas or any schema
  const useSchemaRegex = new RegExp(
    `(${importedSchemas.join('|')}|\\w+Schema)\\.safeParse\\(`,
    'i'
  );
  const anySchemaUsage = useSchemaRegex.test(functionBody);
  const schemaUsageWithinFunction =
    /Schema\.safeParse\(/i.test(functionBody) || /\.safeParse\(/i.test(functionBody);

  result.usesSchemaValidation = anySchemaUsage || schemaUsageWithinFunction;

  // Check for safeParse usage
  result.usesZodSafeParse = /\.safeParse\(/i.test(functionBody);

  // Check if validation is performed before business logic
  const safeParseIndex = functionBody.indexOf('.safeParse(');
  const awaitIndex = functionBody.indexOf('await');
  if (safeParseIndex > -1 && awaitIndex > -1) {
    result.validatesBeforeProcessing = safeParseIndex < awaitIndex;
  } else if (safeParseIndex > -1) {
    // If safeParse is used but no await found, assume it's okay
    result.validatesBeforeProcessing = true;
  }

  // Check for validation error handling
  const hasSuccessCheck =
    /if\s*\(\s*.*!.*\.success\s*\)/i.test(functionBody) ||
    /if\s*\(\s*!.*\.success\s*\)/i.test(functionBody);
  const returnsError =
    /return\s+\{\s*success\s*:\s*false/i.test(functionBody) || /throw\s+new/i.test(functionBody);

  result.returnsValidationErrors = hasSuccessCheck && returnsError;

  // Check for inline schema definitions
  result.inlineSchemaDefinitions =
    /const\s+\w+Schema\s*=\s*z\.object\(/i.test(functionBody) ||
    /const\s+validationSchema\s*=\s*z\.object\(/i.test(functionBody);

  // Calculate score based on adherence to best practices
  let scorePoints = 0;
  if (result.usesSchemaValidation) scorePoints += 20;
  if (result.importsFromCentralSchema) scorePoints += 20;
  if (result.usesZodSafeParse) scorePoints += 20;
  if (result.validatesBeforeProcessing) scorePoints += 20;
  if (result.returnsValidationErrors) scorePoints += 20;
  if (result.inlineSchemaDefinitions) scorePoints -= 10;

  result.score = Math.max(0, Math.min(100, scorePoints));

  // Generate recommendations
  if (!result.usesSchemaValidation) {
    result.recommendations.push('Add Zod schema validation to validate input data');
  }

  if (result.usesSchemaValidation && !result.importsFromCentralSchema) {
    result.recommendations.push(
      'Import schemas from central schema repository (@/types/schemas.ts)'
    );
  }

  if (result.usesSchemaValidation && !result.usesZodSafeParse) {
    result.recommendations.push(
      'Use safeParse() instead of parse() to handle validation errors gracefully'
    );
  }

  if (result.usesZodSafeParse && !result.validatesBeforeProcessing) {
    result.recommendations.push(
      'Move validation logic to the beginning of the function before processing data'
    );
  }

  if (result.usesZodSafeParse && !result.returnsValidationErrors) {
    result.recommendations.push('Return validation errors to the client when validation fails');
  }

  if (result.inlineSchemaDefinitions) {
    result.recommendations.push(
      'Replace inline schema with an import from the central schema repository'
    );
  }

  return result;
}
