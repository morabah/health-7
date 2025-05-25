#!/usr/bin/env ts-node

/**
 * Migrate Local File Database to Development Cloud Firestore (Zod-Validated)
 * 
 * This script reads all data from the local JSON file database (local_db/),
 * validates it against Zod schemas, converts necessary fields (like ISO date 
 * strings to Firestore Timestamps), and writes it to the live Development 
 * Cloud Firestore.
 * 
 * PREREQUISITES:
 * 1. Download serviceAccountKey.json for your DEV project from Firebase Console
 * 2. Place it in the project root (ensure it's gitignored)
 * 3. Ensure local_db/*.json files contain your local test data
 * 
 * Usage: npm run db:migrate:local-to-cloud-dev
 */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import path from 'path';

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

// Import TypeScript Types (inferred from Zod schemas)
import type { z } from 'zod';

type UserProfile = z.infer<typeof UserProfileSchema> & { id: string };
type PatientProfile = z.infer<typeof PatientProfileSchema> & { id?: string };
type DoctorProfile = z.infer<typeof DoctorProfileSchema> & { id?: string };
type Appointment = z.infer<typeof AppointmentSchema> & { id?: string };
type Notification = z.infer<typeof NotificationSchema> & { id?: string };

// Import Enums
import {
  UserType,
} from '../src/types/enums';

// IMPORTANT: Download serviceAccountKey.json for your DEV project
// and place it in a secure location (e.g., project root, gitignored).
// Adjust path as needed.
const serviceAccount = require('../serviceAccountKey.json'); // Path relative to compiled JS in scripts/

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: "https://YOUR-DEV-PROJECT-ID.firebaseio.com" // Optional if using default DB
});

const db = admin.firestore();
const auth = admin.auth();

console.log('Connected to LIVE Development Firebase Project for migration.');

/**
 * Conversion functions for each data type
 * Converts Zod-validated data (with ISO date strings) to Firestore format (with Timestamps)
 */

function convertUserProfileToFirestore(data: z.infer<typeof UserProfileSchema>): any {
  const converted: any = { ...data };
  
  // Convert date fields from ISO strings to Firestore Timestamps
  if (converted.createdAt && typeof converted.createdAt === 'string') {
    converted.createdAt = Timestamp.fromDate(new Date(converted.createdAt));
  }
  if (converted.updatedAt && typeof converted.updatedAt === 'string') {
    converted.updatedAt = Timestamp.fromDate(new Date(converted.updatedAt));
  }
  if (converted.phoneVerificationSentAt && typeof converted.phoneVerificationSentAt === 'string') {
    converted.phoneVerificationSentAt = Timestamp.fromDate(new Date(converted.phoneVerificationSentAt));
  }
  if (converted.emailVerificationSentAt && typeof converted.emailVerificationSentAt === 'string') {
    converted.emailVerificationSentAt = Timestamp.fromDate(new Date(converted.emailVerificationSentAt));
  }
  
  return converted;
}

function convertPatientProfileToFirestore(data: z.infer<typeof PatientProfileSchema>): any {
  const converted: any = { ...data };
  
  // Convert dateOfBirth from ISO string to Firestore Timestamp
  if (converted.dateOfBirth && typeof converted.dateOfBirth === 'string') {
    converted.dateOfBirth = Timestamp.fromDate(new Date(converted.dateOfBirth));
  }
  
  return converted;
}

function convertDoctorProfileToFirestore(data: z.infer<typeof DoctorProfileSchema>): any {
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

function convertAppointmentToFirestore(data: z.infer<typeof AppointmentSchema>): any {
  const converted: any = { ...data };
  
  // Convert date fields
  if (converted.appointmentDate && typeof converted.appointmentDate === 'string') {
    converted.appointmentDate = Timestamp.fromDate(new Date(converted.appointmentDate));
  }
  if (converted.createdAt && typeof converted.createdAt === 'string') {
    converted.createdAt = Timestamp.fromDate(new Date(converted.createdAt));
  }
  if (converted.updatedAt && typeof converted.updatedAt === 'string') {
    converted.updatedAt = Timestamp.fromDate(new Date(converted.updatedAt));
  }
  
  return converted;
}

function convertNotificationToFirestore(data: z.infer<typeof NotificationSchema>): any {
  const converted: any = { ...data };
  
  // Convert date fields
  if (converted.createdAt && typeof converted.createdAt === 'string') {
    converted.createdAt = Timestamp.fromDate(new Date(converted.createdAt));
  }
  if (converted.scheduledDate && typeof converted.scheduledDate === 'string') {
    converted.scheduledDate = Timestamp.fromDate(new Date(converted.scheduledDate));
  }
  
  return converted;
}

/**
 * Generic migration function for collections
 * Reads local JSON, validates against Zod, converts, and writes to Firestore
 */
async function migrateCollection<
  TLocal extends { id?: string; userId?: string; [key: string]: any }, // Local data has ID and string dates
  TSchema extends z.ZodType<any> // Zod schema expects string dates from local file
>(
  collectionName: string,
  localGetFunction: () => Promise<TLocal[]>,
  schema: TSchema,
  // Function to convert Zod-validated data (with string dates) to Firestore-ready data (with Timestamps)
  convertToFirestoreFormat: (validatedData: z.infer<TSchema>) => any
) {
  console.log(`\n📝 Starting migration for ${collectionName}...`);
  
  try {
    const localDataArray = await localGetFunction();
    
    if (!localDataArray || localDataArray.length === 0) {
      console.log(`  ⚠️  No data found in local_db/${collectionName}.json, skipping.`);
      return;
    }

    const batch = db.batch();
    let migratedCount = 0;
    let validationErrorCount = 0;

    for (const localItem of localDataArray) {
      // Extract ID - try id first, then userId, then generate one
      const docId = localItem.id || localItem.userId || `${collectionName}-${migratedCount + 1}`;
      const { id, ...itemDataToValidate } = localItem; // Remove id from data to validate

      // Zod schema should be validating the structure as read from JSON (e.g., ISO date strings)
      const validationResult = schema.safeParse(itemDataToValidate);

      if (validationResult.success) {
        // Convert validated data (which might still have string dates) to Firestore format (with Timestamps)
        const firestoreReadyData = convertToFirestoreFormat(validationResult.data);
        const docRef = db.collection(collectionName).doc(docId);
        batch.set(docRef, firestoreReadyData);
        migratedCount++;
        console.log(`  ✓ Prepared ${collectionName} document: ${docId}`);
      } else {
        validationErrorCount++;
        console.error(`  ❌ Zod validation failed for ${collectionName} item ID ${docId}:`, validationResult.error.format());
      }
    }

    if (migratedCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} documents to ${collectionName} collection`);
    } else {
      console.log(`  ⚠️  No valid documents to migrate for ${collectionName}`);
    }
    
    if (validationErrorCount > 0) {
      console.warn(`  ⚠️  ${validationErrorCount} documents in local_db/${collectionName}.json failed Zod validation.`);
    }
  } catch (error) {
    console.error(`❌ Error migrating ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Optional function to clear existing cloud data
 * Use with EXTREME caution - this will delete all data in the specified collections
 */
async function clearCloudCollections(collections: string[]): Promise<void> {
  console.log('\n🗑️  WARNING: Clearing existing cloud data...');
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`  ℹ️  Collection ${collectionName} is already empty`);
        continue;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`  ✅ Cleared ${snapshot.size} documents from ${collectionName}`);
    } catch (error) {
      console.error(`  ❌ Error clearing ${collectionName}:`, error);
    }
  }
}

/**
 * Migrate Auth Users to Firebase Authentication
 */
async function migrateAuthUsers(): Promise<void> {
  console.log('\n👤 Migrating Firebase Auth users...');
  
  try {
    const localUsers = await getUsers();
    
    if (!localUsers || localUsers.length === 0) {
      console.log('  ⚠️  No users found in local database');
      return;
    }

    for (const user of localUsers) {
      try {
        const uid = user.id || user.email?.split('@')[0] || 'unknown';
        
        // Check if user already exists
        const existingUser = await auth.getUser(uid).catch(() => null);
        
        if (!existingUser) {
          // Create new user
          const userRecord = await auth.createUser({
            uid: uid,
            email: user.email || undefined,
            displayName: `${user.firstName} ${user.lastName}`,
            phoneNumber: user.phone || undefined,
            emailVerified: user.emailVerified || false,
          });
          
          // Set custom claims for admin users
          if (user.userType === UserType.ADMIN) {
            await auth.setCustomUserClaims(uid, { 
              role: 'admin',
              isAdmin: true,
            });
            console.log(`  ✓ Created admin user: ${user.email} with custom claims`);
          } else {
            console.log(`  ✓ Created user: ${user.email}`);
          }
        } else {
          // Update existing user
          await auth.updateUser(uid, {
            email: user.email || undefined,
            displayName: `${user.firstName} ${user.lastName}`,
            phoneNumber: user.phone || undefined,
            emailVerified: user.emailVerified || false,
          });
          
          // Update custom claims for admin users
          if (user.userType === UserType.ADMIN) {
            await auth.setCustomUserClaims(uid, { 
              role: 'admin',
              isAdmin: true,
            });
          }
          
          console.log(`  ✓ Updated existing user: ${user.email}`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to migrate user ${user.email}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error during auth user migration:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrateLocalDatabaseToCloud(): Promise<void> {
  console.log('🚀 Starting Local Database to Development Cloud Firestore Migration...\n');
  
  try {
    // Optional: Clear existing cloud data (uncomment with caution)
    // await clearCloudCollections(['users', 'patients', 'doctors', 'appointments', 'notifications']);
    
    // Migrate Auth Users first
    await migrateAuthUsers();
    
    // Migrate Collections
    console.log('\n📊 Migrating collections...');
    
    await migrateCollection('users', getUsers, UserProfileSchema, convertUserProfileToFirestore);
    await migrateCollection('patients', getPatients, PatientProfileSchema, convertPatientProfileToFirestore);
    await migrateCollection('doctors', getDoctors, DoctorProfileSchema, convertDoctorProfileToFirestore);
    await migrateCollection('appointments', getAppointments, AppointmentSchema, convertAppointmentToFirestore);
    await migrateCollection('notifications', getNotifications, NotificationSchema, convertNotificationToFirestore);
    
    console.log('\n🎉 Local Database Migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    
    // Get final counts for summary
    const users = await getUsers();
    const patients = await getPatients();
    const doctors = await getDoctors();
    const appointments = await getAppointments();
    const notifications = await getNotifications();
    
    console.log(`   • ${users?.length || 0} Users migrated`);
    console.log(`   • ${patients?.length || 0} Patient Profiles migrated`);
    console.log(`   • ${doctors?.length || 0} Doctor Profiles migrated`);
    console.log(`   • ${appointments?.length || 0} Appointments migrated`);
    console.log(`   • ${notifications?.length || 0} Notifications migrated`);
    
    console.log('\n✅ Your local database data is now available in Development Cloud Firestore!');
    console.log('✅ You can now deploy and test cloud functions with your existing data.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Execute migration
migrateLocalDatabaseToCloud()
  .then(() => {
    console.log('\n🏁 Migration script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  }); 