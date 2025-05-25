#!/usr/bin/env ts-node

/**
 * Analyze Duplicate Users in Cloud Database
 * 
 * This script identifies duplicate users by email and provides detailed analysis
 * to help decide which duplicates to keep and which to merge/remove.
 * 
 * Usage: npm run db:analyze:duplicates
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log('🔍 Analyzing Duplicate Users in Cloud Database...\n');

interface UserAnalysis {
  email: string;
  duplicates: Array<{
    id: string;
    data: any;
    createdAt: string;
    userType: string;
    isActive: boolean;
    hasPatientProfile: boolean;
    hasDoctorProfile: boolean;
    appointmentCount: number;
    notificationCount: number;
  }>;
  totalCount: number;
}

/**
 * Get all users from the database
 */
async function getAllUsers(): Promise<any[]> {
  console.log('📋 Fetching all users from cloud database...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`✓ Found ${users.length} total users in database`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
}

/**
 * Check if user has patient profile
 */
async function hasPatientProfile(userId: string): Promise<boolean> {
  try {
    const patientDoc = await db.collection('patients').doc(userId).get();
    return patientDoc.exists;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user has doctor profile
 */
async function hasDoctorProfile(userId: string): Promise<boolean> {
  try {
    const doctorDoc = await db.collection('doctors').doc(userId).get();
    return doctorDoc.exists;
  } catch (error) {
    return false;
  }
}

/**
 * Count appointments for user
 */
async function countUserAppointments(userId: string): Promise<number> {
  try {
    const appointmentsSnapshot = await db.collection('appointments')
      .where('patientId', '==', userId)
      .get();
    return appointmentsSnapshot.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Count notifications for user
 */
async function countUserNotifications(userId: string): Promise<number> {
  try {
    const notificationsSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .get();
    return notificationsSnapshot.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Analyze duplicates by email
 */
async function analyzeDuplicateUsers(): Promise<UserAnalysis[]> {
  console.log('\n🔍 Analyzing duplicate users by email...');
  
  const users = await getAllUsers();
  const emailGroups: { [email: string]: any[] } = {};
  
  // Group users by email
  users.forEach(user => {
    const email = user.email?.toLowerCase() || 'no-email';
    if (!emailGroups[email]) {
      emailGroups[email] = [];
    }
    emailGroups[email].push(user);
  });
  
  // Find duplicates
  const duplicateAnalysis: UserAnalysis[] = [];
  
  for (const [email, emailUsers] of Object.entries(emailGroups)) {
    if (emailUsers.length > 1) {
      console.log(`\n📧 Analyzing duplicates for email: ${email}`);
      
      const duplicateDetails = [];
      
      for (const user of emailUsers) {
        console.log(`  🔍 Analyzing user ${user.id}...`);
        
        const hasPatient = await hasPatientProfile(user.id);
        const hasDoctor = await hasDoctorProfile(user.id);
        const appointmentCount = await countUserAppointments(user.id);
        const notificationCount = await countUserNotifications(user.id);
        
        duplicateDetails.push({
          id: user.id,
          data: user,
          createdAt: user.createdAt || 'unknown',
          userType: user.userType || 'unknown',
          isActive: user.isActive || false,
          hasPatientProfile: hasPatient,
          hasDoctorProfile: hasDoctor,
          appointmentCount,
          notificationCount
        });
        
        console.log(`    ✓ User Type: ${user.userType}`);
        console.log(`    ✓ Active: ${user.isActive}`);
        console.log(`    ✓ Patient Profile: ${hasPatient}`);
        console.log(`    ✓ Doctor Profile: ${hasDoctor}`);
        console.log(`    ✓ Appointments: ${appointmentCount}`);
        console.log(`    ✓ Notifications: ${notificationCount}`);
      }
      
      duplicateAnalysis.push({
        email,
        duplicates: duplicateDetails,
        totalCount: emailUsers.length
      });
    }
  }
  
  return duplicateAnalysis;
}

/**
 * Generate deduplication recommendations
 */
function generateRecommendations(analysis: UserAnalysis[]): void {
  console.log('\n📊 DUPLICATE ANALYSIS REPORT');
  console.log('==========================================\n');
  
  if (analysis.length === 0) {
    console.log('🎉 No duplicate users found! Database is clean.');
    return;
  }
  
  console.log(`Found ${analysis.length} emails with duplicate users:\n`);
  
  analysis.forEach((emailAnalysis, index) => {
    console.log(`${index + 1}. Email: ${emailAnalysis.email}`);
    console.log(`   Total duplicates: ${emailAnalysis.totalCount}`);
    console.log(`   User IDs: ${emailAnalysis.duplicates.map(d => d.id).join(', ')}`);
    
    // Sort by importance (most data/activity first)
    const sortedUsers = emailAnalysis.duplicates.sort((a, b) => {
      const scoreA = (a.appointmentCount * 10) + (a.notificationCount * 2) + 
                    (a.hasPatientProfile ? 5 : 0) + (a.hasDoctorProfile ? 5 : 0) +
                    (a.isActive ? 3 : 0);
      const scoreB = (b.appointmentCount * 10) + (b.notificationCount * 2) + 
                    (b.hasPatientProfile ? 5 : 0) + (b.hasDoctorProfile ? 5 : 0) +
                    (b.isActive ? 3 : 0);
      return scoreB - scoreA; // Highest score first
    });
    
    console.log(`   📋 Recommended Actions:`);
    console.log(`   🎯 KEEP: ${sortedUsers[0].id} (most activity/data)`);
    
    for (let i = 1; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      if (user.appointmentCount > 0 || user.notificationCount > 0) {
        console.log(`   🔄 MERGE: ${user.id} (has data to preserve)`);
      } else {
        console.log(`   🗑️  REMOVE: ${user.id} (no significant data)`);
      }
    }
    
    console.log(`   📈 Activity Summary:`);
    sortedUsers.forEach(user => {
      console.log(`     • ${user.id}: ${user.appointmentCount} appointments, ${user.notificationCount} notifications, Type: ${user.userType}`);
    });
    
    console.log('');
  });
  
  console.log('\n📋 SUMMARY RECOMMENDATIONS:');
  console.log('==========================================');
  
  let totalDuplicates = 0;
  let keepCount = 0;
  let removeCount = 0;
  let mergeCount = 0;
  
  analysis.forEach(emailAnalysis => {
    totalDuplicates += emailAnalysis.totalCount;
    keepCount += 1; // One to keep per email
    
    const sortedUsers = emailAnalysis.duplicates.sort((a, b) => {
      const scoreA = (a.appointmentCount * 10) + (a.notificationCount * 2) + 
                    (a.hasPatientProfile ? 5 : 0) + (a.hasDoctorProfile ? 5 : 0) +
                    (a.isActive ? 3 : 0);
      const scoreB = (b.appointmentCount * 10) + (b.notificationCount * 2) + 
                    (b.hasPatientProfile ? 5 : 0) + (b.hasDoctorProfile ? 5 : 0) +
                    (b.isActive ? 3 : 0);
      return scoreB - scoreA;
    });
    
    for (let i = 1; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      if (user.appointmentCount > 0 || user.notificationCount > 0) {
        mergeCount++;
      } else {
        removeCount++;
      }
    }
  });
  
  console.log(`📊 Total Duplicate Users: ${totalDuplicates}`);
  console.log(`✅ Users to Keep: ${keepCount}`);
  console.log(`🔄 Users to Merge: ${mergeCount}`);
  console.log(`🗑️  Users to Remove: ${removeCount}`);
  console.log(`📉 Net Reduction: ${removeCount + mergeCount} users`);
  
  if (analysis.length > 0) {
    console.log('\n💡 NEXT STEPS:');
    console.log('==========================================');
    console.log('1. Review the recommendations above');
    console.log('2. Run deduplication script: npm run db:deduplicate:users');
    console.log('3. Set up database indexes: npm run db:setup:indexes');
    console.log('4. Verify results: npm run db:verify:uniqueness');
  }
}

/**
 * Main analysis function
 */
async function analyzeDatabase(): Promise<void> {
  try {
    console.log('🚀 Starting Duplicate User Analysis...\n');
    
    const duplicateAnalysis = await analyzeDuplicateUsers();
    generateRecommendations(duplicateAnalysis);
    
    // Save detailed analysis to file
    const reportData = {
      timestamp: new Date().toISOString(),
      analysis: duplicateAnalysis,
      summary: {
        totalEmails: duplicateAnalysis.length,
        totalDuplicateUsers: duplicateAnalysis.reduce((sum, analysis) => sum + analysis.totalCount, 0)
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync('duplicate-users-analysis.json', JSON.stringify(reportData, null, 2));
    console.log('\n📁 Detailed analysis saved to: duplicate-users-analysis.json');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// Execute analysis
analyzeDatabase()
  .then(() => {
    console.log('\n🏁 Duplicate user analysis completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Duplicate user analysis failed:', error);
    process.exit(1);
  }); 