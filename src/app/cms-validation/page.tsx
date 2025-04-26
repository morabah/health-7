'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { logInfo, logWarn, logError } from '@/lib/logger';
import { 
  validateCollectionData, 
  getSchemaForCollection,
  type CollectionValidationResult,
  type DocumentValidationResult
} from '@/lib/dataValidationUtils';
import { 
  UserProfileSchema, 
  PatientProfileSchema, 
  DoctorProfileSchema, 
  AppointmentSchema, 
  NotificationSchema
} from '@/types/schemas';

/**
 * CMS Data Validation Page
 * This page allows validating the data in the local database against Zod schemas
 * 
 * @returns CMS Data Validation page component
 */
export default function CMSValidationPage() {
  // State for validation results
  const [validationResults, setValidationResults] = useState<Record<string, CollectionValidationResult>>({});
  
  // State for loading status
  const [isValidating, setIsValidating] = useState(false);
  
  // Handler for running validation
  const handleRunValidation = useCallback(async () => {
    setIsValidating(true);
    setValidationResults({});
    logInfo('Starting data validation for all collections');
    
    try {
      // Define collections and schemas to validate
      const collectionsToValidate = [
        { name: 'users', schema: UserProfileSchema },
        { name: 'patients', schema: PatientProfileSchema },
        { name: 'doctors', schema: DoctorProfileSchema },
        { name: 'appointments', schema: AppointmentSchema },
        { name: 'notifications', schema: NotificationSchema }
      ];
      
      // Run validation for each collection
      const results = await Promise.all(
        collectionsToValidate.map(async ({ name, schema }) => {
          const collectionResults = await validateCollectionData(name, schema);
          return { name, results: collectionResults };
        })
      );
      
      // Process results
      const resultsMap: Record<string, CollectionValidationResult> = {};
      let totalDocuments = 0;
      let totalValid = 0;
      let totalInvalid = 0;
      let totalErrors = 0;
      
      results.forEach(({ name, results }) => {
        resultsMap[name] = results;
        totalDocuments += results.length;
        totalValid += results.filter(r => r.status === 'valid').length;
        totalInvalid += results.filter(r => r.status === 'invalid').length;
        totalErrors += results.filter(r => r.status === 'error').length;
      });
      
      setValidationResults(resultsMap);
      
      // Log summary
      logInfo('Data validation completed', {
        collections: results.length,
        totalDocuments,
        totalValid,
        totalInvalid,
        totalErrors
      });
    } catch (error) {
      logError('Error during data validation', error);
    } finally {
      setIsValidating(false);
    }
  }, []);
  
  // Count valid/invalid/error documents for a collection
  const countResults = (results: CollectionValidationResult) => {
    const valid = results.filter(r => r.status === 'valid').length;
    const invalid = results.filter(r => r.status === 'invalid').length;
    const error = results.filter(r => r.status === 'error').length;
    return { valid, invalid, error };
  };
  
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">CMS Data Validation</h1>
        <div className="flex gap-4">
          <Link href="/cms" className="px-4 py-2 bg-blue-600 text-white rounded">
            Back to CMS
          </Link>
        </div>
      </header>
      
      <div className="mb-8">
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Local Database Data Integrity Check</h2>
          <p className="mb-4">
            Run validation against Zod schemas to check data integrity in the local database.
          </p>
          <button
            onClick={handleRunValidation}
            disabled={isValidating}
            className="btn-primary"
          >
            {isValidating ? 'Validating...' : 'Validate All Collections'}
          </button>
        </div>
        
        {isValidating && (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {Object.keys(validationResults).length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Validation Results</h3>
            
            {Object.entries(validationResults).map(([collectionName, results]) => {
              const { valid, invalid, error } = countResults(results);
              
              return (
                <div key={collectionName} className="card mb-4">
                  <h4 className="text-lg font-medium mb-2">
                    Collection: {collectionName}
                  </h4>
                  
                  <div className="mb-4 flex gap-4">
                    <div className="text-green-600">
                      Valid: {valid}
                    </div>
                    <div className={invalid > 0 ? "text-orange-600 font-bold" : "text-gray-600"}>
                      Invalid: {invalid}
                    </div>
                    <div className={error > 0 ? "text-red-600 font-bold" : "text-gray-600"}>
                      Errors: {error}
                    </div>
                  </div>
                  
                  {invalid > 0 && (
                    <div className="mt-4">
                      <h5 className="text-md font-medium mb-2">Invalid Documents:</h5>
                      <ul className="list-disc pl-5">
                        {results
                          .filter(r => r.status === 'invalid')
                          .map(result => (
                            <li key={result.id} className="mb-4 p-3 bg-orange-50 rounded">
                              <div className="font-medium">Document ID: {result.id}</div>
                              <ul className="list-disc pl-5 mt-2">
                                {result.errors?.map((e, idx) => (
                                  <li key={idx} className="text-orange-700">
                                    <span className="font-medium">{e.field}:</span> {e.message}
                                    <div className="text-xs mt-1">
                                      Received: {typeof e.received === 'object' 
                                        ? JSON.stringify(e.received) 
                                        : String(e.received)}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  
                  {error > 0 && (
                    <div className="mt-4">
                      <h5 className="text-md font-medium mb-2">Fetch Errors:</h5>
                      <ul className="list-disc pl-5">
                        {results
                          .filter(r => r.status === 'error')
                          .map((result, idx) => (
                            <li key={idx} className="text-red-600">
                              {result.fetchError}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 