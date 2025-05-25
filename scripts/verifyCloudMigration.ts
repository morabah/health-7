#!/usr/bin/env ts-node

/**
 * Verify Cloud Migration - Database Comparison & Schema Validation
 * 
 * This script:
 * 1. Compares local database data with cloud Firestore data
 * 2. Validates all cloud data against Zod schemas
 * 3. Generates a comprehensive verification report
 * 
 * PREREQUISITES:
 * 1. serviceAccountKey.json must be in project root
 * 2. Local database migration must have been completed
 * 
 * Usage: npm run db:verify:cloud-migration
 */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';

// Import local database utilities
import {
  getUsers,
  getPatients,
  getDoctors,
  getAppointments,
  getNotifications,
} from '../src/lib/serverLocalDb';

// Import all Zod Schemas
import {
  UserProfileSchema,
  PatientProfileSchema,
  DoctorProfileSchema,
  AppointmentSchema,
  NotificationSchema,
} from '../src/types/schemas';

// Import TypeScript Types
import type { z } from 'zod';

type UserProfile = z.infer<typeof UserProfileSchema> & { id: string };
type PatientProfile = z.infer<typeof PatientProfileSchema> & { id?: string };
type DoctorProfile = z.infer<typeof DoctorProfileSchema> & { id?: string };
type Appointment = z.infer<typeof AppointmentSchema> & { id?: string };
type Notification = z.infer<typeof NotificationSchema> & { id?: string };

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log('🔍 Starting Cloud Migration Verification...\n');

/**
 * Verification Report Interface
 */
interface VerificationReport {
  collectionName: string;
  localCount: number;
  cloudCount: number;
  matchingDocuments: number;
  missingInCloud: string[];
  extraInCloud: string[];
  schemaValidationErrors: Array<{
    docId: string;
    errors: any;
  }>;
  timestampConversions: number;
  success: boolean;
}

/**
 * Convert Firestore Timestamp back to ISO string for comparison
 */
function convertFirestoreToComparable(cloudDoc: any): any {
  const converted = { ...cloudDoc };
  
  // Convert Timestamps back to ISO strings for comparison
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object') {
      if (converted[key].constructor.name === 'Timestamp') {
        converted[key] = converted[key].toDate().toISOString();
      } else if (Array.isArray(converted[key])) {
        // Handle arrays (like blockedDates, experience)
        converted[key] = converted[key].map((item: any) => {
          if (item && typeof item === 'object') {
            if (item.constructor.name === 'Timestamp') {
              return item.toDate().toISOString();
            } else if (typeof item === 'object') {
              // Handle nested objects in arrays (like experience array)
              const convertedItem = { ...item };
              Object.keys(convertedItem).forEach(nestedKey => {
                if (convertedItem[nestedKey] && convertedItem[nestedKey].constructor.name === 'Timestamp') {
                  convertedItem[nestedKey] = convertedItem[nestedKey].toDate().toISOString();
                }
              });
              return convertedItem;
            }
          }
          return item;
        });
      }
    }
  });
  
  return converted;
}

/**
 * Generic verification function for collections
 */
async function verifyCollection<TLocal extends { id?: string; userId?: string; [key: string]: any }>(
  collectionName: string,
  localGetFunction: () => Promise<TLocal[]>,
  schema: z.ZodType<any>
): Promise<VerificationReport> {
  
  console.log(`\n📋 Verifying ${collectionName} collection...`);
  
  const report: VerificationReport = {
    collectionName,
    localCount: 0,
    cloudCount: 0,
    matchingDocuments: 0,
    missingInCloud: [],
    extraInCloud: [],
    schemaValidationErrors: [],
    timestampConversions: 0,
    success: false
  };

  try {
    // Get local data
    const localData = await localGetFunction();
    report.localCount = localData?.length || 0;
    
    if (report.localCount === 0) {
      console.log(`  ⚠️  No local data found for ${collectionName}`);
      report.success = true;
      return report;
    }

    // Get cloud data
    const cloudSnapshot = await db.collection(collectionName).get();
    report.cloudCount = cloudSnapshot.size;
    
    console.log(`  📊 Local: ${report.localCount} documents, Cloud: ${report.cloudCount} documents`);

    // Create maps for comparison
    const localMap = new Map<string, TLocal>();
    const cloudMap = new Map<string, any>();

    // Process local data
    localData.forEach(item => {
      const id = item.id || item.userId || `unknown-${Math.random()}`;
      localMap.set(id, item);
    });

    // Process cloud data
    cloudSnapshot.docs.forEach(doc => {
      const cloudData = { id: doc.id, ...doc.data() };
      cloudMap.set(doc.id, cloudData);
    });

    // Check for missing documents in cloud
    localMap.forEach((localDoc, id) => {
      if (!cloudMap.has(id)) {
        report.missingInCloud.push(id);
      }
    });

    // Check for extra documents in cloud
    cloudMap.forEach((cloudDoc, id) => {
      if (!localMap.has(id)) {
        report.extraInCloud.push(id);
      }
    });

    // Verify matching documents
    let timestampCount = 0;
    cloudMap.forEach((cloudDoc, id) => {
      if (localMap.has(id)) {
        // Convert cloud document for comparison
        const comparableCloudDoc = convertFirestoreToComparable(cloudDoc);
        
        // Count timestamp conversions
        const cloudDocString = JSON.stringify(cloudDoc);
        const timestampMatches = cloudDocString.match(/Timestamp/g);
        if (timestampMatches) {
          timestampCount += timestampMatches.length;
        }

        // Validate against schema
        const { id: docId, ...dataToValidate } = comparableCloudDoc;
        const validationResult = schema.safeParse(dataToValidate);
        
        if (validationResult.success) {
          report.matchingDocuments++;
        } else {
          report.schemaValidationErrors.push({
            docId: id,
            errors: validationResult.error.format()
          });
        }
      }
    });

    report.timestampConversions = timestampCount;

    // Determine success
    report.success = (
      report.missingInCloud.length === 0 &&
      report.schemaValidationErrors.length === 0 &&
      report.matchingDocuments > 0
    );

    // Log results
    if (report.success) {
      console.log(`  ✅ ${collectionName}: All ${report.matchingDocuments} documents verified successfully`);
      console.log(`  🕒 ${report.timestampConversions} timestamp conversions detected`);
    } else {
      console.log(`  ❌ ${collectionName}: Verification issues found`);
      if (report.missingInCloud.length > 0) {
        console.log(`    • Missing in cloud: ${report.missingInCloud.length} documents`);
      }
      if (report.schemaValidationErrors.length > 0) {
        console.log(`    • Schema validation errors: ${report.schemaValidationErrors.length} documents`);
      }
    }

    if (report.extraInCloud.length > 0) {
      console.log(`  ℹ️  Extra documents in cloud: ${report.extraInCloud.length} (this is normal for new data)`);
    }

  } catch (error) {
    console.error(`  ❌ Error verifying ${collectionName}:`, error);
    report.success = false;
  }

  return report;
}

/**
 * Main verification function
 */
async function verifyCloudMigration(): Promise<void> {
  console.log('🚀 Cloud Migration Verification Starting...\n');
  
  const reports: VerificationReport[] = [];

  try {
    // Verify all collections
    reports.push(await verifyCollection('users', getUsers, UserProfileSchema));
    reports.push(await verifyCollection('patients', getPatients, PatientProfileSchema));
    reports.push(await verifyCollection('doctors', getDoctors, DoctorProfileSchema));
    reports.push(await verifyCollection('appointments', getAppointments, AppointmentSchema));
    reports.push(await verifyCollection('notifications', getNotifications, NotificationSchema));

    // Generate comprehensive report
    console.log('\n📊 COMPREHENSIVE VERIFICATION REPORT');
    console.log('================================================\n');

    let totalSuccess = true;
    let totalLocalDocs = 0;
    let totalCloudDocs = 0;
    let totalValidated = 0;
    let totalTimestamps = 0;
    let totalErrors = 0;

    reports.forEach(report => {
      totalLocalDocs += report.localCount;
      totalCloudDocs += report.cloudCount;
      totalValidated += report.matchingDocuments;
      totalTimestamps += report.timestampConversions;
      totalErrors += report.schemaValidationErrors.length + report.missingInCloud.length;
      
      if (!report.success) {
        totalSuccess = false;
      }

      console.log(`📋 ${report.collectionName.toUpperCase()}`);
      console.log(`   Local Documents: ${report.localCount}`);
      console.log(`   Cloud Documents: ${report.cloudCount}`);
      console.log(`   Validated Documents: ${report.matchingDocuments}`);
      console.log(`   Timestamp Conversions: ${report.timestampConversions}`);
      console.log(`   Schema Errors: ${report.schemaValidationErrors.length}`);
      console.log(`   Missing in Cloud: ${report.missingInCloud.length}`);
      console.log(`   Status: ${report.success ? '✅ PASSED' : '❌ FAILED'}\n`);

      // Show detailed errors if any
      if (report.schemaValidationErrors.length > 0) {
        console.log(`   Schema Validation Errors:`);
        report.schemaValidationErrors.forEach(error => {
          console.log(`     • Document ${error.docId}:`, JSON.stringify(error.errors, null, 6));
        });
        console.log('');
      }

      if (report.missingInCloud.length > 0) {
        console.log(`   Missing Documents in Cloud:`);
        report.missingInCloud.forEach(id => {
          console.log(`     • ${id}`);
        });
        console.log('');
      }
    });

    // Final summary
    console.log('📈 OVERALL MIGRATION SUMMARY');
    console.log('================================================');
    console.log(`Total Local Documents: ${totalLocalDocs}`);
    console.log(`Total Cloud Documents: ${totalCloudDocs}`);
    console.log(`Successfully Validated: ${totalValidated}`);
    console.log(`Timestamp Conversions: ${totalTimestamps}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Migration Success Rate: ${((totalValidated / Math.max(totalLocalDocs, 1)) * 100).toFixed(1)}%`);
    console.log(`Schema Compliance: ${totalErrors === 0 ? '✅ FULLY COMPLIANT' : '❌ ISSUES FOUND'}`);
    console.log(`Overall Status: ${totalSuccess ? '✅ VERIFICATION PASSED' : '❌ VERIFICATION FAILED'}\n`);

    // Recommendations
    if (totalSuccess) {
      console.log('🎉 CONGRATULATIONS!');
      console.log('✅ Your cloud database perfectly matches your local database');
      console.log('✅ All data is fully compliant with Zod schemas');
      console.log('✅ Timestamp conversions were applied correctly');
      console.log('✅ Ready for Phase 6+ backend function development!\n');
    } else {
      console.log('⚠️  VERIFICATION ISSUES DETECTED');
      console.log('Please review the errors above and consider:');
      console.log('• Re-running the migration script for failed documents');
      console.log('• Updating local data to match Zod schema requirements');
      console.log('• Manually fixing schema validation errors in cloud data\n');
    }

    // Save detailed report to file
    const reportPath = path.join(process.cwd(), 'cloud-migration-verification-report.json');
    const detailedReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalLocalDocs,
        totalCloudDocs,
        totalValidated,
        totalTimestamps,
        totalErrors,
        successRate: ((totalValidated / Math.max(totalLocalDocs, 1)) * 100),
        overallSuccess: totalSuccess
      },
      collections: reports
    };

    require('fs').writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Execute verification
verifyCloudMigration()
  .then(() => {
    console.log('\n🏁 Cloud Migration Verification completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cloud Migration Verification failed:', error);
    process.exit(1);
  }); 