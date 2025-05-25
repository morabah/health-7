#!/usr/bin/env ts-node

/**
 * Fix Failed Doctor Record - Migrate Specific Fixed Record
 * 
 * This script migrates the specific doctor record that previously failed validation
 * after it has been fixed in the local database.
 * 
 * Usage: npm run db:fix:failed-doctor
 */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Import local database utilities
import { getDoctors } from '../src/lib/serverLocalDb';

// Import Zod Schema
import { DoctorProfileSchema } from '../src/types/schemas';

// Import TypeScript Types
import type { z } from 'zod';

const FAILED_DOCTOR_ID = 'htggr2d1eeevik1kcux1ed';

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log('🔧 Starting Fixed Doctor Record Migration...\n');

/**
 * Convert doctor data to Firestore format
 */
function convertDoctorToFirestore(data: z.infer<typeof DoctorProfileSchema>): any {
  const converted: any = { ...data };
  
  // Convert date fields
  if (converted.createdAt && typeof converted.createdAt === 'string') {
    converted.createdAt = Timestamp.fromDate(new Date(converted.createdAt));
  }
  if (converted.updatedAt && typeof converted.updatedAt === 'string') {
    converted.updatedAt = Timestamp.fromDate(new Date(converted.updatedAt));
  }
  
  // Convert blockedDates array from ISO strings to Firestore Timestamps
  if (converted.blockedDates && Array.isArray(converted.blockedDates)) {
    converted.blockedDates = converted.blockedDates.map((date: string) => 
      Timestamp.fromDate(new Date(date))
    );
  }
  
  // Convert nested experience array dates
  if (converted.experience && Array.isArray(converted.experience)) {
    converted.experience = converted.experience.map((exp: any) => {
      const convertedExp = { ...exp };
      if (convertedExp.startDate && typeof convertedExp.startDate === 'string') {
        convertedExp.startDate = Timestamp.fromDate(new Date(convertedExp.startDate));
      }
      if (convertedExp.endDate && typeof convertedExp.endDate === 'string') {
        convertedExp.endDate = Timestamp.fromDate(new Date(convertedExp.endDate));
      }
      return convertedExp;
    });
  }
  
  return converted;
}

/**
 * Fix the failed doctor record
 */
async function fixFailedDoctorRecord(): Promise<void> {
  try {
    console.log(`📋 Looking for fixed doctor record: ${FAILED_DOCTOR_ID}...`);
    
    // Get all doctors from local database
    const localDoctors = await getDoctors();
    
    // Find the specific doctor record
    const doctorRecord = localDoctors.find(doc => 
      doc.id === FAILED_DOCTOR_ID || doc.userId === FAILED_DOCTOR_ID
    );
    
    if (!doctorRecord) {
      console.log(`❌ Doctor record ${FAILED_DOCTOR_ID} not found in local database`);
      return;
    }
    
    console.log(`✓ Found doctor record for: ${doctorRecord.userId}`);
    console.log(`   Specialty: ${doctorRecord.specialty}`);
    console.log(`   License: ${doctorRecord.licenseNumber}`);
    
    // Validate against schema
    const { id, ...dataToValidate } = doctorRecord;
    const validationResult = DoctorProfileSchema.safeParse(dataToValidate);
    
    if (!validationResult.success) {
      console.log(`❌ Doctor record still fails validation:`);
      console.log(JSON.stringify(validationResult.error.format(), null, 2));
      return;
    }
    
    console.log(`✅ Doctor record passes Zod validation`);
    
    // Convert to Firestore format
    const firestoreData = convertDoctorToFirestore(validationResult.data);
    
    // Check if record already exists in cloud
    const docRef = db.collection('doctors').doc(FAILED_DOCTOR_ID);
    const existingDoc = await docRef.get();
    
    if (existingDoc.exists) {
      console.log(`📝 Updating existing doctor record in cloud...`);
      await docRef.update(firestoreData);
      console.log(`✅ Doctor record updated successfully`);
    } else {
      console.log(`📝 Creating new doctor record in cloud...`);
      await docRef.set(firestoreData);
      console.log(`✅ Doctor record created successfully`);
    }
    
    console.log(`\n🎉 Doctor record migration completed successfully!`);
    console.log(`   Document ID: ${FAILED_DOCTOR_ID}`);
    console.log(`   Specialty: ${doctorRecord.specialty}`);
    console.log(`   License: ${doctorRecord.licenseNumber}`);
    console.log(`   Status: Ready for use in cloud environment`);
    
  } catch (error) {
    console.error('❌ Failed to fix doctor record:', error);
    throw error;
  }
}

// Execute the fix
fixFailedDoctorRecord()
  .then(() => {
    console.log('\n🏁 Fixed doctor record migration completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fixed doctor record migration failed:', error);
    process.exit(1);
  }); 