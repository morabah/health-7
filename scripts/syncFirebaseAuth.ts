#!/usr/bin/env ts-node

/**
 * Sync Firebase Authentication with Database Users
 * 
 * This script ensures every user in the database has a corresponding
 * Firebase Authentication account with the correct password.
 * 
 * Usage: npm run auth:sync:firebase
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

console.log('🔄 Synchronizing Firebase Authentication with Database Users...\n');

// Default password from seeding script
const DEFAULT_PASSWORD = 'Password123!';

interface UserSyncResult {
  email: string;
  userId: string;
  action: 'created' | 'updated' | 'exists' | 'error';
  details?: string;
  firebaseUid?: string;
}

/**
 * Get all users from the database
 */
async function getAllDatabaseUsers(): Promise<any[]> {
  console.log('📋 Fetching all users from cloud database...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`✓ Found ${users.length} users in database`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
}

/**
 * Get all Firebase Auth users
 */
async function getAllFirebaseAuthUsers(): Promise<Map<string, admin.auth.UserRecord>> {
  console.log('📋 Fetching all Firebase Auth users...');
  
  try {
    const authUsers = new Map<string, admin.auth.UserRecord>();
    let nextPageToken: string | undefined;
    
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      
      listUsersResult.users.forEach(user => {
        if (user.email) {
          authUsers.set(user.email.toLowerCase(), user);
        }
      });
      
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    console.log(`✓ Found ${authUsers.size} users in Firebase Auth`);
    return authUsers;
  } catch (error) {
    console.error('❌ Error fetching Firebase Auth users:', error);
    throw error;
  }
}

/**
 * Create Firebase Auth user
 */
async function createFirebaseAuthUser(user: any): Promise<UserSyncResult> {
  try {
    console.log(`  📝 Creating Firebase Auth user for ${user.email}...`);
    
    const userRecord = await auth.createUser({
      uid: user.id, // Use database ID as Firebase UID
      email: user.email,
      password: DEFAULT_PASSWORD,
      displayName: `${user.firstName} ${user.lastName}`,
      emailVerified: user.emailVerified || false,
      disabled: !user.isActive,
    });
    
    // Set custom claims based on user type
    const customClaims: { [key: string]: any } = {
      userType: user.userType,
      role: user.userType,
    };
    
    if (user.userType === 'admin') {
      customClaims.admin = true;
    }
    
    await auth.setCustomUserClaims(userRecord.uid, customClaims);
    
    console.log(`    ✅ Created Firebase Auth user with UID: ${userRecord.uid}`);
    
    return {
      email: user.email,
      userId: user.id,
      action: 'created',
      firebaseUid: userRecord.uid,
      details: `Created with password: ${DEFAULT_PASSWORD}`
    };
    
  } catch (error: any) {
    console.error(`    ❌ Error creating Firebase Auth user for ${user.email}:`, error.message);
    
    return {
      email: user.email,
      userId: user.id,
      action: 'error',
      details: error.message
    };
  }
}

/**
 * Update existing Firebase Auth user
 */
async function updateFirebaseAuthUser(user: any, authUser: admin.auth.UserRecord): Promise<UserSyncResult> {
  try {
    console.log(`  🔄 Updating Firebase Auth user for ${user.email}...`);
    
    const updateData: admin.auth.UpdateRequest = {
      displayName: `${user.firstName} ${user.lastName}`,
      emailVerified: user.emailVerified || false,
      disabled: !user.isActive,
    };
    
    // Reset password to default
    updateData.password = DEFAULT_PASSWORD;
    
    await auth.updateUser(authUser.uid, updateData);
    
    // Update custom claims
    const customClaims: { [key: string]: any } = {
      userType: user.userType,
      role: user.userType,
    };
    
    if (user.userType === 'admin') {
      customClaims.admin = true;
    }
    
    await auth.setCustomUserClaims(authUser.uid, customClaims);
    
    console.log(`    ✅ Updated Firebase Auth user with UID: ${authUser.uid}`);
    
    return {
      email: user.email,
      userId: user.id,
      action: 'updated',
      firebaseUid: authUser.uid,
      details: `Updated with password: ${DEFAULT_PASSWORD}`
    };
    
  } catch (error: any) {
    console.error(`    ❌ Error updating Firebase Auth user for ${user.email}:`, error.message);
    
    return {
      email: user.email,
      userId: user.id,
      action: 'error',
      details: error.message
    };
  }
}

/**
 * Sync single user with Firebase Auth
 */
async function syncUserWithFirebaseAuth(
  user: any, 
  authUsers: Map<string, admin.auth.UserRecord>
): Promise<UserSyncResult> {
  const email = user.email?.toLowerCase();
  
  if (!email) {
    return {
      email: 'NO_EMAIL',
      userId: user.id,
      action: 'error',
      details: 'User has no email address'
    };
  }
  
  const existingAuthUser = authUsers.get(email);
  
  if (existingAuthUser) {
    // Check if UID matches
    if (existingAuthUser.uid === user.id) {
      console.log(`  ✅ Firebase Auth user exists for ${email} with matching UID`);
      
      // Still update to ensure password and claims are correct
      return await updateFirebaseAuthUser(user, existingAuthUser);
    } else {
      // UID mismatch - need to handle this case
      console.log(`  ⚠️  Firebase Auth user exists for ${email} but UID mismatch`);
      console.log(`    Database UID: ${user.id}`);
      console.log(`    Firebase UID: ${existingAuthUser.uid}`);
      
      // For now, update the existing user
      return await updateFirebaseAuthUser(user, existingAuthUser);
    }
  } else {
    // Create new Firebase Auth user
    return await createFirebaseAuthUser(user);
  }
}

/**
 * Clean up orphaned Firebase Auth users
 */
async function cleanupOrphanedAuthUsers(
  databaseUsers: any[],
  authUsers: Map<string, admin.auth.UserRecord>
): Promise<void> {
  console.log('\n🧹 Checking for orphaned Firebase Auth users...');
  
  const databaseEmails = new Set(
    databaseUsers
      .map(user => user.email?.toLowerCase())
      .filter(email => email)
  );
  
  const orphanedAuthUsers = Array.from(authUsers.entries())
    .filter(([email, _]) => !databaseEmails.has(email));
  
  if (orphanedAuthUsers.length === 0) {
    console.log('✅ No orphaned Firebase Auth users found');
    return;
  }
  
  console.log(`⚠️  Found ${orphanedAuthUsers.length} orphaned Firebase Auth users:`);
  
  for (const [email, authUser] of orphanedAuthUsers) {
    console.log(`  • ${email} (UID: ${authUser.uid})`);
  }
  
  console.log('\n💡 Recommendation: Review these users and delete if no longer needed');
  console.log('   Use Firebase Console or admin.auth().deleteUser(uid) to remove them');
}

/**
 * Main synchronization function
 */
async function syncFirebaseAuth(): Promise<void> {
  try {
    console.log('🚀 Starting Firebase Auth synchronization...\n');
    
    // Get all users from both sources
    const databaseUsers = await getAllDatabaseUsers();
    const authUsers = await getAllFirebaseAuthUsers();
    
    // Sync each database user with Firebase Auth
    console.log('\n🔄 Synchronizing users...\n');
    
    const results: UserSyncResult[] = [];
    
    for (const user of databaseUsers) {
      console.log(`Processing: ${user.email || 'NO_EMAIL'} (${user.userType})`);
      const result = await syncUserWithFirebaseAuth(user, authUsers);
      results.push(result);
      console.log('');
    }
    
    // Clean up orphaned users
    await cleanupOrphanedAuthUsers(databaseUsers, authUsers);
    
    // Generate summary report
    console.log('\n📊 SYNCHRONIZATION SUMMARY');
    console.log('==========================================\n');
    
    const summary = {
      total: results.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      exists: results.filter(r => r.action === 'exists').length,
      errors: results.filter(r => r.action === 'error').length,
    };
    
    console.log(`📊 Total users processed: ${summary.total}`);
    console.log(`✅ Created: ${summary.created}`);
    console.log(`🔄 Updated: ${summary.updated}`);
    console.log(`✓ Already exists: ${summary.exists}`);
    console.log(`❌ Errors: ${summary.errors}`);
    
    // Show detailed results
    if (summary.created > 0) {
      console.log('\n📝 CREATED USERS:');
      results
        .filter(r => r.action === 'created')
        .forEach(r => {
          console.log(`  ✅ ${r.email} (UID: ${r.firebaseUid}) - ${r.details}`);
        });
    }
    
    if (summary.updated > 0) {
      console.log('\n🔄 UPDATED USERS:');
      results
        .filter(r => r.action === 'updated')
        .forEach(r => {
          console.log(`  🔄 ${r.email} (UID: ${r.firebaseUid}) - ${r.details}`);
        });
    }
    
    if (summary.errors > 0) {
      console.log('\n❌ ERRORS:');
      results
        .filter(r => r.action === 'error')
        .forEach(r => {
          console.log(`  ❌ ${r.email} - ${r.details}`);
        });
    }
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary,
      results,
      defaultPassword: DEFAULT_PASSWORD
    };
    
    const fs = require('fs');
    fs.writeFileSync('firebase-auth-sync-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📁 Detailed report saved to: firebase-auth-sync-report.json');
    
    console.log('\n🔑 DEFAULT PASSWORD INFORMATION:');
    console.log('==========================================');
    console.log(`All users have been set with password: ${DEFAULT_PASSWORD}`);
    console.log('Users can change their password after first login.');
    console.log('Admin users should change their password immediately.');
    
    if (summary.errors === 0) {
      console.log('\n🎉 SUCCESS!');
      console.log('✅ All database users now have Firebase Auth accounts');
      console.log('✅ All passwords set to default development password');
      console.log('✅ Custom claims and roles properly configured');
      console.log('✅ Ready for authentication testing');
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS');
      console.log('Some users could not be synced. Check errors above.');
    }
    
  } catch (error) {
    console.error('❌ Synchronization failed:', error);
    throw error;
  }
}

// Execute synchronization
syncFirebaseAuth()
  .then(() => {
    console.log('\n🏁 Firebase Auth synchronization completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Firebase Auth synchronization failed:', error);
    process.exit(1);
  }); 