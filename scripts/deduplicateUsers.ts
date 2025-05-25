#!/usr/bin/env ts-node

/**
 * Deduplicate Users in Cloud Database
 * 
 * This script safely removes duplicate users by email, preserving the user
 * with the most data/activity and merging related data where necessary.
 * 
 * Usage: npm run db:deduplicate:users
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log('🧹 Starting User Deduplication Process...\n');

interface DeduplicationPlan {
  email: string;
  keepUserId: string;
  removeUserIds: string[];
  mergeOperations: Array<{
    fromUserId: string;
    toUserId: string;
    appointmentsToMove: number;
    notificationsToMove: number;
    hasPatientProfile: boolean;
    hasDoctorProfile: boolean;
  }>;
}

/**
 * Load the duplicate analysis from previous run
 */
function loadDuplicateAnalysis(): any {
  const fs = require('fs');
  
  try {
    const analysisData = fs.readFileSync('duplicate-users-analysis.json', 'utf8');
    return JSON.parse(analysisData);
  } catch (error) {
    console.error('❌ Could not load duplicate analysis file');
    console.error('Please run: npm run db:analyze:duplicates first');
    throw error;
  }
}

/**
 * Create deduplication plan based on analysis
 */
function createDeduplicationPlan(analysisData: any): DeduplicationPlan[] {
  console.log('📋 Creating deduplication plan...\n');
  
  const plans: DeduplicationPlan[] = [];
  
  analysisData.analysis.forEach((emailAnalysis: any) => {
    console.log(`📧 Planning deduplication for: ${emailAnalysis.email}`);
    
    // Sort users by importance (most data/activity first)
    const sortedUsers = emailAnalysis.duplicates.sort((a: any, b: any) => {
      const scoreA = (a.appointmentCount * 10) + (a.notificationCount * 2) + 
                    (a.hasPatientProfile ? 5 : 0) + (a.hasDoctorProfile ? 5 : 0) +
                    (a.isActive ? 3 : 0);
      const scoreB = (b.appointmentCount * 10) + (b.notificationCount * 2) + 
                    (b.hasPatientProfile ? 5 : 0) + (b.hasDoctorProfile ? 5 : 0) +
                    (b.isActive ? 3 : 0);
      return scoreB - scoreA; // Highest score first
    });
    
    const keepUser = sortedUsers[0];
    const removeUsers = sortedUsers.slice(1);
    
    console.log(`  🎯 Will keep: ${keepUser.id} (score: ${getScore(keepUser)})`);
    
    const mergeOperations: Array<{
      fromUserId: string;
      toUserId: string;
      appointmentsToMove: number;
      notificationsToMove: number;
      hasPatientProfile: boolean;
      hasDoctorProfile: boolean;
    }> = [];
    const removeUserIds: string[] = [];
    
    removeUsers.forEach((user: any) => {
      if (user.appointmentCount > 0 || user.notificationCount > 0 || 
          user.hasPatientProfile || user.hasDoctorProfile) {
        console.log(`  🔄 Will merge: ${user.id} (has data to preserve)`);
        mergeOperations.push({
          fromUserId: user.id,
          toUserId: keepUser.id,
          appointmentsToMove: user.appointmentCount,
          notificationsToMove: user.notificationCount,
          hasPatientProfile: user.hasPatientProfile,
          hasDoctorProfile: user.hasDoctorProfile
        });
      } else {
        console.log(`  🗑️  Will remove: ${user.id} (clean duplicate)`);
      }
      removeUserIds.push(user.id);
    });
    
    plans.push({
      email: emailAnalysis.email,
      keepUserId: keepUser.id,
      removeUserIds,
      mergeOperations
    });
    
    console.log('');
  });
  
  return plans;
}

/**
 * Calculate user importance score
 */
function getScore(user: any): number {
  return (user.appointmentCount * 10) + (user.notificationCount * 2) + 
         (user.hasPatientProfile ? 5 : 0) + (user.hasDoctorProfile ? 5 : 0) +
         (user.isActive ? 3 : 0);
}

/**
 * Move appointments from one user to another
 */
async function moveAppointments(fromUserId: string, toUserId: string): Promise<number> {
  console.log(`    📅 Moving appointments from ${fromUserId} to ${toUserId}...`);
  
  try {
    const appointmentsSnapshot = await db.collection('appointments')
      .where('patientId', '==', fromUserId)
      .get();
    
    const batch = db.batch();
    let moveCount = 0;
    
    appointmentsSnapshot.docs.forEach(doc => {
      const appointmentRef = db.collection('appointments').doc(doc.id);
      batch.update(appointmentRef, { patientId: toUserId });
      moveCount++;
    });
    
    if (moveCount > 0) {
      await batch.commit();
      console.log(`    ✅ Moved ${moveCount} appointments`);
    }
    
    return moveCount;
  } catch (error) {
    console.error(`    ❌ Error moving appointments:`, error);
    return 0;
  }
}

/**
 * Move notifications from one user to another
 */
async function moveNotifications(fromUserId: string, toUserId: string): Promise<number> {
  console.log(`    🔔 Moving notifications from ${fromUserId} to ${toUserId}...`);
  
  try {
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', fromUserId)
      .get();
    
    const batch = db.batch();
    let moveCount = 0;
    
    notificationsSnapshot.docs.forEach(doc => {
      const notificationRef = db.collection('notifications').doc(doc.id);
      batch.update(notificationRef, { userId: toUserId });
      moveCount++;
    });
    
    if (moveCount > 0) {
      await batch.commit();
      console.log(`    ✅ Moved ${moveCount} notifications`);
    }
    
    return moveCount;
  } catch (error) {
    console.error(`    ❌ Error moving notifications:`, error);
    return 0;
  }
}

/**
 * Merge or remove profile data
 */
async function handleProfileData(fromUserId: string, toUserId: string, hasPatientProfile: boolean, hasDoctorProfile: boolean): Promise<void> {
  if (hasPatientProfile) {
    console.log(`    👤 Handling patient profile for ${fromUserId}...`);
    try {
      const patientDoc = await db.collection('patients').doc(fromUserId).get();
      const toPatientDoc = await db.collection('patients').doc(toUserId).get();
      
      if (patientDoc.exists && !toPatientDoc.exists) {
        // Move patient profile to the kept user
        const patientData = patientDoc.data();
        await db.collection('patients').doc(toUserId).set({
          ...patientData,
          userId: toUserId
        });
        console.log(`    ✅ Moved patient profile`);
      }
      
      // Delete the old patient profile
      await db.collection('patients').doc(fromUserId).delete();
    } catch (error) {
      console.error(`    ❌ Error handling patient profile:`, error);
    }
  }
  
  if (hasDoctorProfile) {
    console.log(`    👨‍⚕️ Handling doctor profile for ${fromUserId}...`);
    try {
      const doctorDoc = await db.collection('doctors').doc(fromUserId).get();
      const toDoctorDoc = await db.collection('doctors').doc(toUserId).get();
      
      if (doctorDoc.exists && !toDoctorDoc.exists) {
        // Move doctor profile to the kept user
        const doctorData = doctorDoc.data();
        await db.collection('doctors').doc(toUserId).set({
          ...doctorData,
          userId: toUserId
        });
        console.log(`    ✅ Moved doctor profile`);
      }
      
      // Delete the old doctor profile
      await db.collection('doctors').doc(fromUserId).delete();
    } catch (error) {
      console.error(`    ❌ Error handling doctor profile:`, error);
    }
  }
}

/**
 * Remove duplicate user from Firebase Auth
 */
async function removeAuthUser(userId: string): Promise<void> {
  try {
    await admin.auth().deleteUser(userId);
    console.log(`    ✅ Removed from Firebase Auth`);
  } catch (error) {
    // User might not exist in Auth, which is okay
    console.log(`    ℹ️  User not found in Firebase Auth (this is normal)`);
  }
}

/**
 * Execute deduplication plan
 */
async function executeDeduplicationPlan(plans: DeduplicationPlan[]): Promise<void> {
  console.log('\n🚀 Executing deduplication plan...\n');
  
  let totalProcessed = 0;
  let totalRemoved = 0;
  let totalMerged = 0;
  
  for (const plan of plans) {
    console.log(`📧 Processing: ${plan.email}`);
    console.log(`  🎯 Keeping user: ${plan.keepUserId}`);
    
    // Execute merge operations first
    for (const mergeOp of plan.mergeOperations) {
      console.log(`  🔄 Merging user: ${mergeOp.fromUserId}`);
      
      // Move appointments
      if (mergeOp.appointmentsToMove > 0) {
        await moveAppointments(mergeOp.fromUserId, mergeOp.toUserId);
      }
      
      // Move notifications
      if (mergeOp.notificationsToMove > 0) {
        await moveNotifications(mergeOp.fromUserId, mergeOp.toUserId);
      }
      
      // Handle profile data
      await handleProfileData(
        mergeOp.fromUserId, 
        mergeOp.toUserId, 
        mergeOp.hasPatientProfile, 
        mergeOp.hasDoctorProfile
      );
      
      totalMerged++;
    }
    
    // Remove duplicate users
    for (const removeUserId of plan.removeUserIds) {
      console.log(`  🗑️  Removing user: ${removeUserId}`);
      
      try {
        // Remove from Firestore
        await db.collection('users').doc(removeUserId).delete();
        console.log(`    ✅ Removed from Firestore`);
        
        // Remove from Firebase Auth
        await removeAuthUser(removeUserId);
        
        totalRemoved++;
      } catch (error) {
        console.error(`    ❌ Error removing user:`, error);
      }
    }
    
    totalProcessed++;
    console.log(`  ✅ Completed deduplication for ${plan.email}\n`);
  }
  
  console.log('📊 DEDUPLICATION SUMMARY');
  console.log('==========================================');
  console.log(`📧 Emails processed: ${totalProcessed}`);
  console.log(`🔄 Users merged: ${totalMerged}`);
  console.log(`🗑️  Users removed: ${totalRemoved}`);
  console.log(`📉 Total reduction: ${totalRemoved} users`);
}

/**
 * Main deduplication function
 */
async function deduplicateUsers(): Promise<void> {
  try {
    // Load analysis
    const analysisData = loadDuplicateAnalysis();
    
    if (analysisData.analysis.length === 0) {
      console.log('🎉 No duplicates found in analysis. Database is already clean!');
      return;
    }
    
    // Create plan
    const plans = createDeduplicationPlan(analysisData);
    
    // Confirm execution
    console.log('⚠️  WARNING: This will permanently modify your database!');
    console.log('📋 Plan Summary:');
    console.log(`   • ${plans.length} emails to process`);
    console.log(`   • ${plans.reduce((sum, p) => sum + p.removeUserIds.length, 0)} users to remove`);
    console.log(`   • ${plans.reduce((sum, p) => sum + p.mergeOperations.length, 0)} users to merge`);
    
    // In a real scenario, you might want to add a confirmation prompt here
    console.log('\n🚀 Proceeding with deduplication...\n');
    
    // Execute plan
    await executeDeduplicationPlan(plans);
    
    console.log('\n✅ Deduplication completed successfully!');
    console.log('💡 Next steps:');
    console.log('   1. Run: npm run db:setup:indexes');
    console.log('   2. Run: npm run db:verify:uniqueness');
    
  } catch (error) {
    console.error('❌ Deduplication failed:', error);
    throw error;
  }
}

// Execute deduplication
deduplicateUsers()
  .then(() => {
    console.log('\n🏁 User deduplication completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 User deduplication failed:', error);
    process.exit(1);
  }); 