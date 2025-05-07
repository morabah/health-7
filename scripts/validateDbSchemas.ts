#!/usr/bin/env ts-node

/**
 * Database Schema Validation Script
 *
 * This script validates all local database files against their Zod schemas
 * to ensure data integrity and consistency with the defined schemas.
 *
 * Usage:
 *   npm run validate-db
 *
 * Output:
 *   - Console report of validation results
 *   - JSON report file with detailed validation issues
 */

import {
  validateMultipleCollections,
  type CollectionValidationResult,
} from '../src/lib/dataValidationUtils';

import { logError } from '../src/lib/logger';
import * as fs from 'fs';

async function main() {
  console.log('🔍 Starting Database Schema Validation');

  const collections = ['users', 'patients', 'doctors', 'appointments', 'notifications'];

  try {
    console.log('\n🔄 Validating collections against schema definitions...');

    // Get general validation results
    const results = await validateMultipleCollections(collections, true);

    // Generate summary report
    let totalDocuments = 0;
    let validDocuments = 0;

    for (const collection of Object.keys(results)) {
      const validationResults: CollectionValidationResult = results[collection];
      totalDocuments += validationResults.length;
      validDocuments += validationResults.filter(doc => doc.status === 'valid').length;

      const validPercentage =
        Math.round(
          (validationResults.filter(doc => doc.status === 'valid').length /
            validationResults.length) *
            100
        ) || 0;

      console.log(`\n📊 Collection: ${collection}`);
      console.log(`Total documents: ${validationResults.length}`);
      console.log(
        `Valid documents: ${validationResults.filter(doc => doc.status === 'valid').length} (${validPercentage}%)`
      );

      // Show invalid documents
      const invalidDocs = validationResults.filter(doc => doc.status === 'invalid');
      if (invalidDocs.length > 0) {
        console.log(`\n⚠️ Invalid documents (${invalidDocs.length}):`);

        for (const doc of invalidDocs) {
          console.log(`\nDocument ID: ${doc.id}`);

          if (doc.errors && doc.errors.length > 0) {
            for (const error of doc.errors) {
              console.log(`  - Field '${error.field}': ${error.message}`);
              console.log(`    Received: ${JSON.stringify(error.received)}`);
            }
          }
        }
      }
    }

    // Write complete report to file
    fs.writeFileSync(
      'db-validation-report.json',
      JSON.stringify(
        {
          summary: {
            totalDocuments,
            validDocuments,
            validPercentage: Math.round((validDocuments / totalDocuments) * 100) || 0,
          },
          collections: results,
        },
        null,
        2
      )
    );

    console.log(`\n💾 Detailed report saved to db-validation-report.json`);

    // Provide recommendations if needed
    if (validDocuments < totalDocuments) {
      console.log('\n🔧 Recommendations:');
      console.log('1. Update invalid documents to match schema definitions');
      console.log('2. If the schema needs to be updated, make changes in src/types/schemas.ts');
      console.log('3. Consider running the data migration script to fix issues automatically');
    } else {
      console.log('\n✅ All documents follow schema definitions!');
    }
  } catch (error) {
    logError('Error validating database schemas', error);
    console.error('Failed to validate database schemas:', error);
  }
}

// Run the validation
main().catch(error => {
  console.error('Error running schema validation:', error);
  process.exit(1);
});
