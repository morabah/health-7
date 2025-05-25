#!/usr/bin/env ts-node

/**
 * Setup Database Indexes for Cloud Firestore
 * 
 * This script creates indexes for better query performance and data integrity.
 * Note: Firestore indexes must be created through Firebase CLI or Console.
 * This script generates the necessary index configuration files.
 * 
 * Usage: npm run db:setup:indexes
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log('🗂️  Setting up Database Indexes...\n');

/**
 * Generate Firestore index configuration
 */
function generateIndexConfig(): any {
  return {
    indexes: [
      // Users collection indexes
      {
        collectionGroup: "users",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "email", order: "ASCENDING" },
          { fieldPath: "isActive", order: "ASCENDING" }
        ]
      },
      {
        collectionGroup: "users",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "userType", order: "ASCENDING" },
          { fieldPath: "createdAt", order: "DESCENDING" }
        ]
      },
      {
        collectionGroup: "users",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "email", order: "ASCENDING" }
        ]
      },
      
      // Doctors collection indexes
      {
        collectionGroup: "doctors",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "specialty", order: "ASCENDING" },
          { fieldPath: "verificationStatus", order: "ASCENDING" }
        ]
      },
      {
        collectionGroup: "doctors",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "verificationStatus", order: "ASCENDING" },
          { fieldPath: "createdAt", order: "DESCENDING" }
        ]
      },
      {
        collectionGroup: "doctors",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "location", order: "ASCENDING" },
          { fieldPath: "specialty", order: "ASCENDING" }
        ]
      },
      
      // Appointments collection indexes
      {
        collectionGroup: "appointments",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "patientId", order: "ASCENDING" },
          { fieldPath: "appointmentDate", order: "DESCENDING" }
        ]
      },
      {
        collectionGroup: "appointments",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "doctorId", order: "ASCENDING" },
          { fieldPath: "appointmentDate", order: "DESCENDING" }
        ]
      },
      {
        collectionGroup: "appointments",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "status", order: "ASCENDING" },
          { fieldPath: "appointmentDate", order: "ASCENDING" }
        ]
      },
      {
        collectionGroup: "appointments",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "patientId", order: "ASCENDING" },
          { fieldPath: "status", order: "ASCENDING" },
          { fieldPath: "appointmentDate", order: "DESCENDING" }
        ]
      },
      
      // Notifications collection indexes
      {
        collectionGroup: "notifications",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "userId", order: "ASCENDING" },
          { fieldPath: "createdAt", order: "DESCENDING" }
        ]
      },
      {
        collectionGroup: "notifications",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "userId", order: "ASCENDING" },
          { fieldPath: "isRead", order: "ASCENDING" },
          { fieldPath: "createdAt", order: "DESCENDING" }
        ]
      },
      {
        collectionGroup: "notifications",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "type", order: "ASCENDING" },
          { fieldPath: "createdAt", order: "DESCENDING" }
        ]
      },
      
      // Patients collection indexes
      {
        collectionGroup: "patients",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "userId", order: "ASCENDING" }
        ]
      }
    ],
    fieldOverrides: [
      {
        collectionGroup: "users",
        fieldPath: "email",
        indexes: [
          {
            order: "ASCENDING",
            queryScope: "COLLECTION"
          }
        ]
      }
    ]
  };
}

/**
 * Generate Firebase Security Rules
 */
function generateSecurityRules(): string {
  return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.admin == true;
    }
    
    function isDoctor() {
      return isAuthenticated() && 
             request.auth.token.userType == 'doctor';
    }
    
    function isPatient() {
      return isAuthenticated() && 
             request.auth.token.userType == 'patient';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isAuthenticated() && 
                      request.auth.uid == userId &&
                      isValidUserData();
      allow update: if (isOwner(userId) || isAdmin()) &&
                      isValidUserData();
      allow delete: if isAdmin();
      
      function isValidUserData() {
        return request.resource.data.keys().hasAll(['email', 'userType']) &&
               request.resource.data.email is string &&
               request.resource.data.userType in ['patient', 'doctor', 'admin'];
      }
    }
    
    // Patients collection
    match /patients/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create, update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Doctors collection  
    match /doctors/{userId} {
      allow read: if true; // Public reading for doctor discovery
      allow create, update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Appointments collection
    match /appointments/{appointmentId} {
      allow read: if isOwner(resource.data.patientId) || 
                    isOwner(resource.data.doctorId) || 
                    isAdmin();
      allow create: if isAuthenticated() && 
                      (isOwner(request.resource.data.patientId) || isAdmin());
      allow update: if isOwner(resource.data.patientId) || 
                      isOwner(resource.data.doctorId) || 
                      isAdmin();
      allow delete: if isOwner(resource.data.patientId) || isAdmin();
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId) || isAdmin();
      allow delete: if isOwner(resource.data.userId) || isAdmin();
    }
  }
}`;
}

/**
 * Check if indexes already exist
 */
async function checkExistingIndexes(): Promise<void> {
  console.log('🔍 Checking existing indexes...');
  
  try {
    // Note: Firebase Admin SDK doesn't provide direct index management
    // This is a placeholder for future functionality
    console.log('ℹ️  Index checking requires Firebase CLI or Console');
    console.log('   Firestore indexes are managed through:');
    console.log('   • Firebase Console: https://console.firebase.google.com');
    console.log('   • Firebase CLI: firebase deploy --only firestore:indexes');
  } catch (error) {
    console.error('❌ Error checking indexes:', error);
  }
}

/**
 * Generate firestore.indexes.json file
 */
function generateIndexFile(): void {
  console.log('📝 Generating firestore.indexes.json...');
  
  const indexConfig = generateIndexConfig();
  const indexFilePath = 'firestore.indexes.json';
  
  fs.writeFileSync(indexFilePath, JSON.stringify(indexConfig, null, 2));
  console.log(`✅ Created: ${indexFilePath}`);
  
  // Also create in Firebase functions directory if it exists
  const functionsPath = 'src/firebase_backend/functions';
  if (fs.existsSync(functionsPath)) {
    const functionsIndexPath = path.join(functionsPath, 'firestore.indexes.json');
    fs.writeFileSync(functionsIndexPath, JSON.stringify(indexConfig, null, 2));
    console.log(`✅ Created: ${functionsIndexPath}`);
  }
}

/**
 * Generate firestore.rules file
 */
function generateRulesFile(): void {
  console.log('📝 Generating firestore.rules...');
  
  const rules = generateSecurityRules();
  const rulesFilePath = 'firestore.rules';
  
  fs.writeFileSync(rulesFilePath, rules);
  console.log(`✅ Created: ${rulesFilePath}`);
  
  // Also create in Firebase functions directory if it exists
  const functionsPath = 'src/firebase_backend/functions';
  if (fs.existsSync(functionsPath)) {
    const functionsRulesPath = path.join(functionsPath, 'firestore.rules');
    fs.writeFileSync(functionsRulesPath, rules);
    console.log(`✅ Created: ${functionsRulesPath}`);
  }
}

/**
 * Test database uniqueness constraints
 */
async function testUniqueConstraints(): Promise<void> {
  console.log('\n🧪 Testing uniqueness constraints...');
  
  try {
    // Check for duplicate emails
    const usersSnapshot = await db.collection('users').get();
    const emails: string[] = [];
    const duplicateEmails: string[] = [];
    
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email?.toLowerCase();
      if (email) {
        if (emails.includes(email)) {
          if (!duplicateEmails.includes(email)) {
            duplicateEmails.push(email);
          }
        } else {
          emails.push(email);
        }
      }
    });
    
    if (duplicateEmails.length === 0) {
      console.log('✅ No duplicate emails found');
    } else {
      console.log(`❌ Found ${duplicateEmails.length} duplicate emails:`);
      duplicateEmails.forEach(email => console.log(`   • ${email}`));
    }
    
    // Check for orphaned profiles
    console.log('\n🔍 Checking for orphaned profiles...');
    
    const userIds = usersSnapshot.docs.map(doc => doc.id);
    
    // Check patient profiles
    const patientsSnapshot = await db.collection('patients').get();
    const orphanedPatients = patientsSnapshot.docs.filter(doc => 
      !userIds.includes(doc.data().userId || doc.id)
    );
    
    // Check doctor profiles
    const doctorsSnapshot = await db.collection('doctors').get();
    const orphanedDoctors = doctorsSnapshot.docs.filter(doc => 
      !userIds.includes(doc.data().userId || doc.id)
    );
    
    console.log(`✅ Patient profiles: ${patientsSnapshot.size - orphanedPatients.length} valid, ${orphanedPatients.length} orphaned`);
    console.log(`✅ Doctor profiles: ${doctorsSnapshot.size - orphanedDoctors.length} valid, ${orphanedDoctors.length} orphaned`);
    
    if (orphanedPatients.length > 0 || orphanedDoctors.length > 0) {
      console.log('⚠️  Consider running cleanup script for orphaned profiles');
    }
    
  } catch (error) {
    console.error('❌ Error testing constraints:', error);
  }
}

/**
 * Main setup function
 */
async function setupDatabaseIndexes(): Promise<void> {
  try {
    console.log('🚀 Setting up Database Indexes and Rules...\n');
    
    // Check existing setup
    await checkExistingIndexes();
    
    // Generate configuration files
    generateIndexFile();
    generateRulesFile();
    
    // Test current data integrity
    await testUniqueConstraints();
    
    console.log('\n📋 SETUP SUMMARY');
    console.log('==========================================');
    console.log('✅ Generated firestore.indexes.json');
    console.log('✅ Generated firestore.rules');
    console.log('✅ Tested data integrity constraints');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('==========================================');
    console.log('1. Deploy indexes to Firebase:');
    console.log('   cd src/firebase_backend/functions');
    console.log('   firebase deploy --only firestore:indexes');
    console.log('');
    console.log('2. Deploy security rules to Firebase:');
    console.log('   firebase deploy --only firestore:rules');
    console.log('');
    console.log('3. Verify setup:');
    console.log('   npm run db:verify:uniqueness');
    console.log('');
    console.log('📍 Index deployment may take several minutes to complete');
    console.log('📍 Check Firebase Console for index build status');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Execute setup
setupDatabaseIndexes()
  .then(() => {
    console.log('\n🏁 Database indexes setup completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Database indexes setup failed:', error);
    process.exit(1);
  }); 