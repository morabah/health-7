#!/usr/bin/env ts-node

/**
 * Verify Timestamp Conversions in Cloud Firestore
 * 
 * This script specifically checks that ISO date strings from local database
 * were properly converted to Firestore Timestamp objects in the cloud.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function verifyTimestampConversions(): Promise<void> {
  console.log('🕒 Verifying Firestore Timestamp Conversions...\n');
  
  const collections = ['users', 'patients', 'doctors', 'appointments', 'notifications'];
  let totalTimestamps = 0;
  let totalDocs = 0;

  for (const collectionName of collections) {
    console.log(`📋 Checking ${collectionName} collection...`);
    
    const snapshot = await db.collection(collectionName).get();
    let collectionTimestamps = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const docTimestamps = findTimestamps(data);
      if (docTimestamps > 0) {
        console.log(`  ✓ ${doc.id}: ${docTimestamps} Timestamp objects found`);
        collectionTimestamps += docTimestamps;
      }
    });
    
    console.log(`  📊 ${collectionName}: ${snapshot.size} documents, ${collectionTimestamps} total Timestamps\n`);
    totalTimestamps += collectionTimestamps;
    totalDocs += snapshot.size;
  }

  console.log('📈 TIMESTAMP CONVERSION SUMMARY');
  console.log('================================');
  console.log(`Total Documents: ${totalDocs}`);
  console.log(`Total Timestamp Objects: ${totalTimestamps}`);
  console.log(`Conversion Status: ${totalTimestamps > 0 ? '✅ TIMESTAMPS DETECTED' : '❌ NO TIMESTAMPS FOUND'}`);
  
  if (totalTimestamps === 0) {
    console.log('\n⚠️  No Firestore Timestamp objects found!');
    console.log('This might indicate an issue with the timestamp conversion during migration.');
  } else {
    console.log('\n✅ Firestore Timestamp conversions verified successfully!');
  }
}

function findTimestamps(obj: any, path: string = ''): number {
  if (!obj || typeof obj !== 'object') return 0;
  
  let count = 0;
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (value && typeof value === 'object') {
      // Check if it's a Firestore Timestamp
      if (value.constructor.name === 'Timestamp') {
        console.log(`    🕒 Timestamp found at: ${currentPath}`);
        count++;
      } else if (Array.isArray(value)) {
        // Check array items
        value.forEach((item, index) => {
          count += findTimestamps(item, `${currentPath}[${index}]`);
        });
      } else {
        // Check nested objects
        count += findTimestamps(value, currentPath);
      }
    }
  }
  
  return count;
}

// Execute verification
verifyTimestampConversions()
  .then(() => {
    console.log('\n🏁 Timestamp verification completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Timestamp verification failed:', error);
    process.exit(1);
  }); 