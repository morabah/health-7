#!/usr/bin/env ts-node

/**
 * Verify Database Uniqueness and Integrity
 * 
 * This script verifies that all users are unique by email and that
 * database integrity is maintained after deduplication.
 * 
 * Usage: npm run db:verify:uniqueness
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log('✅ Verifying Database Uniqueness and Integrity...\n');

interface VerificationResult {
  collection: string;
  totalDocuments: number;
  uniqueEmails?: number;
  duplicateEmails?: string[];
  orphanedProfiles?: number;
  validReferences?: number;
  issues: string[];
}

/**
 * Verify users collection uniqueness
 */
async function verifyUsersUniqueness(): Promise<VerificationResult> {
  console.log('👥 Verifying Users Collection...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    
    const emailCounts: { [email: string]: number } = {};
    const duplicateEmails: string[] = [];
    const issues: string[] = [];
    
    // Count emails
    users.forEach(user => {
      const email = user.email?.toLowerCase();
      if (email) {
        emailCounts[email] = (emailCounts[email] || 0) + 1;
      } else {
        issues.push(`User ${user.id} has no email`);
      }
    });
    
    // Find duplicates
    Object.entries(emailCounts).forEach(([email, count]) => {
      if (count > 1) {
        duplicateEmails.push(email);
      }
    });
    
    // Check for missing required fields
    users.forEach(user => {
      if (!user.userType) {
        issues.push(`User ${user.id} missing userType`);
      }
      if (!user.firstName) {
        issues.push(`User ${user.id} missing firstName`);
      }
      if (!user.lastName) {
        issues.push(`User ${user.id} missing lastName`);
      }
    });
    
    console.log(`  📊 Total users: ${users.length}`);
    console.log(`  📧 Unique emails: ${Object.keys(emailCounts).length}`);
    console.log(`  🔄 Duplicate emails: ${duplicateEmails.length}`);
    console.log(`  ⚠️  Issues found: ${issues.length}`);
    
    if (duplicateEmails.length > 0) {
      console.log('  ❌ Duplicate emails found:');
      duplicateEmails.forEach(email => {
        console.log(`     • ${email} (${emailCounts[email]} users)`);
      });
    } else {
      console.log('  ✅ All emails are unique');
    }
    
    return {
      collection: 'users',
      totalDocuments: users.length,
      uniqueEmails: Object.keys(emailCounts).length,
      duplicateEmails,
      issues
    };
    
  } catch (error) {
    console.error('❌ Error verifying users:', error);
    return {
      collection: 'users',
      totalDocuments: 0,
      issues: [`Error: ${error}`]
    };
  }
}

/**
 * Verify patient profiles integrity
 */
async function verifyPatientsIntegrity(): Promise<VerificationResult> {
  console.log('\n👤 Verifying Patients Collection...');
  
  try {
    const patientsSnapshot = await db.collection('patients').get();
    const usersSnapshot = await db.collection('users').get();
    
    const userIds = new Set(usersSnapshot.docs.map(doc => doc.id));
    const patients = patientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    
    let orphanedProfiles = 0;
    let validReferences = 0;
    const issues: string[] = [];
    
    patients.forEach(patient => {
      const userId = patient.userId || patient.id;
      
      if (!userIds.has(userId)) {
        orphanedProfiles++;
        issues.push(`Patient ${patient.id} references non-existent user ${userId}`);
      } else {
        validReferences++;
      }
      
      // Check required fields
      if (!patient.dateOfBirth) {
        issues.push(`Patient ${patient.id} missing dateOfBirth`);
      }
    });
    
    console.log(`  📊 Total patients: ${patients.length}`);
    console.log(`  ✅ Valid references: ${validReferences}`);
    console.log(`  🔄 Orphaned profiles: ${orphanedProfiles}`);
    console.log(`  ⚠️  Issues found: ${issues.length}`);
    
    return {
      collection: 'patients',
      totalDocuments: patients.length,
      validReferences,
      orphanedProfiles,
      issues
    };
    
  } catch (error) {
    console.error('❌ Error verifying patients:', error);
    return {
      collection: 'patients',
      totalDocuments: 0,
      issues: [`Error: ${error}`]
    };
  }
}

/**
 * Verify doctor profiles integrity
 */
async function verifyDoctorsIntegrity(): Promise<VerificationResult> {
  console.log('\n👨‍⚕️ Verifying Doctors Collection...');
  
  try {
    const doctorsSnapshot = await db.collection('doctors').get();
    const usersSnapshot = await db.collection('users').get();
    
    const userIds = new Set(usersSnapshot.docs.map(doc => doc.id));
    const doctors = doctorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    
    let orphanedProfiles = 0;
    let validReferences = 0;
    const issues: string[] = [];
    
    doctors.forEach(doctor => {
      const userId = doctor.userId || doctor.id;
      
      if (!userIds.has(userId)) {
        orphanedProfiles++;
        issues.push(`Doctor ${doctor.id} references non-existent user ${userId}`);
      } else {
        validReferences++;
      }
      
      // Check required fields
      if (!doctor.specialty) {
        issues.push(`Doctor ${doctor.id} missing specialty`);
      }
      if (!doctor.licenseNumber) {
        issues.push(`Doctor ${doctor.id} missing licenseNumber`);
      }
    });
    
    console.log(`  📊 Total doctors: ${doctors.length}`);
    console.log(`  ✅ Valid references: ${validReferences}`);
    console.log(`  🔄 Orphaned profiles: ${orphanedProfiles}`);
    console.log(`  ⚠️  Issues found: ${issues.length}`);
    
    return {
      collection: 'doctors',
      totalDocuments: doctors.length,
      validReferences,
      orphanedProfiles,
      issues
    };
    
  } catch (error) {
    console.error('❌ Error verifying doctors:', error);
    return {
      collection: 'doctors',
      totalDocuments: 0,
      issues: [`Error: ${error}`]
    };
  }
}

/**
 * Verify appointments integrity
 */
async function verifyAppointmentsIntegrity(): Promise<VerificationResult> {
  console.log('\n📅 Verifying Appointments Collection...');
  
  try {
    const appointmentsSnapshot = await db.collection('appointments').get();
    const usersSnapshot = await db.collection('users').get();
    const doctorsSnapshot = await db.collection('doctors').get();
    
    const userIds = new Set(usersSnapshot.docs.map(doc => doc.id));
    const doctorIds = new Set(doctorsSnapshot.docs.map(doc => doc.data().userId || doc.id));
    const appointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let validReferences = 0;
    let orphanedProfiles = 0;
    const issues: string[] = [];
    
    appointments.forEach(appointment => {
      let hasValidPatient = true;
      let hasValidDoctor = true;
      
      // Check patient reference
      if (!appointment.patientId || !userIds.has(appointment.patientId)) {
        hasValidPatient = false;
        issues.push(`Appointment ${appointment.id} references invalid patient ${appointment.patientId}`);
      }
      
      // Check doctor reference
      if (!appointment.doctorId || !doctorIds.has(appointment.doctorId)) {
        hasValidDoctor = false;
        issues.push(`Appointment ${appointment.id} references invalid doctor ${appointment.doctorId}`);
      }
      
      if (hasValidPatient && hasValidDoctor) {
        validReferences++;
      } else {
        orphanedProfiles++;
      }
      
      // Check required fields
      if (!appointment.appointmentDate) {
        issues.push(`Appointment ${appointment.id} missing appointmentDate`);
      }
      if (!appointment.status) {
        issues.push(`Appointment ${appointment.id} missing status`);
      }
    });
    
    console.log(`  📊 Total appointments: ${appointments.length}`);
    console.log(`  ✅ Valid references: ${validReferences}`);
    console.log(`  🔄 Orphaned appointments: ${orphanedProfiles}`);
    console.log(`  ⚠️  Issues found: ${issues.length}`);
    
    return {
      collection: 'appointments',
      totalDocuments: appointments.length,
      validReferences,
      orphanedProfiles,
      issues
    };
    
  } catch (error) {
    console.error('❌ Error verifying appointments:', error);
    return {
      collection: 'appointments',
      totalDocuments: 0,
      issues: [`Error: ${error}`]
    };
  }
}

/**
 * Verify notifications integrity
 */
async function verifyNotificationsIntegrity(): Promise<VerificationResult> {
  console.log('\n🔔 Verifying Notifications Collection...');
  
  try {
    const notificationsSnapshot = await db.collection('notifications').get();
    const usersSnapshot = await db.collection('users').get();
    
    const userIds = new Set(usersSnapshot.docs.map(doc => doc.id));
    const notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let validReferences = 0;
    let orphanedProfiles = 0;
    const issues: string[] = [];
    
    notifications.forEach(notification => {
      if (!notification.userId || !userIds.has(notification.userId)) {
        orphanedProfiles++;
        issues.push(`Notification ${notification.id} references invalid user ${notification.userId}`);
      } else {
        validReferences++;
      }
      
      // Check required fields
      if (!notification.message) {
        issues.push(`Notification ${notification.id} missing message`);
      }
      if (!notification.type) {
        issues.push(`Notification ${notification.id} missing type`);
      }
    });
    
    console.log(`  📊 Total notifications: ${notifications.length}`);
    console.log(`  ✅ Valid references: ${validReferences}`);
    console.log(`  🔄 Orphaned notifications: ${orphanedProfiles}`);
    console.log(`  ⚠️  Issues found: ${issues.length}`);
    
    return {
      collection: 'notifications',
      totalDocuments: notifications.length,
      validReferences,
      orphanedProfiles,
      issues
    };
    
  } catch (error) {
    console.error('❌ Error verifying notifications:', error);
    return {
      collection: 'notifications',
      totalDocuments: 0,
      issues: [`Error: ${error}`]
    };
  }
}

/**
 * Main verification function
 */
async function verifyDatabaseUniqueness(): Promise<void> {
  try {
    console.log('🚀 Starting Database Uniqueness and Integrity Verification...\n');
    
    const results: VerificationResult[] = [];
    
    // Verify each collection
    results.push(await verifyUsersUniqueness());
    results.push(await verifyPatientsIntegrity());
    results.push(await verifyDoctorsIntegrity());
    results.push(await verifyAppointmentsIntegrity());
    results.push(await verifyNotificationsIntegrity());
    
    // Generate comprehensive report
    console.log('\n📊 DATABASE INTEGRITY REPORT');
    console.log('==========================================\n');
    
    let totalDocuments = 0;
    let totalIssues = 0;
    let hasUniquenessViolations = false;
    
    results.forEach(result => {
      totalDocuments += result.totalDocuments;
      totalIssues += result.issues.length;
      
      console.log(`${result.collection.toUpperCase()} Collection:`);
      console.log(`  📊 Documents: ${result.totalDocuments}`);
      
      if (result.uniqueEmails !== undefined) {
        console.log(`  📧 Unique emails: ${result.uniqueEmails}`);
        if (result.duplicateEmails && result.duplicateEmails.length > 0) {
          console.log(`  ❌ Duplicate emails: ${result.duplicateEmails.length}`);
          hasUniquenessViolations = true;
        } else {
          console.log(`  ✅ All emails unique`);
        }
      }
      
      if (result.validReferences !== undefined) {
        console.log(`  ✅ Valid references: ${result.validReferences}`);
      }
      
      if (result.orphanedProfiles !== undefined && result.orphanedProfiles > 0) {
        console.log(`  🔄 Orphaned profiles: ${result.orphanedProfiles}`);
      }
      
      if (result.issues.length > 0) {
        console.log(`  ⚠️  Issues: ${result.issues.length}`);
      } else {
        console.log(`  ✅ No issues found`);
      }
      
      console.log('');
    });
    
    console.log('📈 OVERALL SUMMARY');
    console.log('==========================================');
    console.log(`📊 Total Documents: ${totalDocuments}`);
    console.log(`⚠️  Total Issues: ${totalIssues}`);
    console.log(`📧 Email Uniqueness: ${hasUniquenessViolations ? '❌ VIOLATIONS FOUND' : '✅ VERIFIED'}`);
    
    const integrityScore = Math.round(((totalDocuments - totalIssues) / totalDocuments) * 100);
    console.log(`🎯 Database Integrity Score: ${integrityScore}%`);
    
    // Detailed issues report
    if (totalIssues > 0) {
      console.log('\n📋 DETAILED ISSUES REPORT');
      console.log('==========================================');
      
      results.forEach(result => {
        if (result.issues.length > 0) {
          console.log(`\n${result.collection.toUpperCase()} Issues:`);
          result.issues.forEach(issue => {
            console.log(`  • ${issue}`);
          });
        }
      });
      
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('==========================================');
      
      if (hasUniquenessViolations) {
        console.log('1. Run deduplication script: npm run db:deduplicate:users');
      }
      
      if (results.some(r => r.orphanedProfiles && r.orphanedProfiles > 0)) {
        console.log('2. Clean up orphaned profiles (manual cleanup recommended)');
      }
      
      console.log('3. Review and fix data integrity issues listed above');
      console.log('4. Re-run verification: npm run db:verify:uniqueness');
    } else {
      console.log('\n🎉 EXCELLENT!');
      console.log('✅ Database integrity is perfect');
      console.log('✅ All users are unique by email');
      console.log('✅ All references are valid');
      console.log('✅ No orphaned profiles found');
      console.log('✅ Ready for production use!');
    }
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDocuments,
        totalIssues,
        integrityScore,
        hasUniquenessViolations
      },
      collections: results
    };
    
    const fs = require('fs');
    fs.writeFileSync('database-integrity-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📁 Detailed report saved to: database-integrity-report.json');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Execute verification
verifyDatabaseUniqueness()
  .then(() => {
    console.log('\n🏁 Database uniqueness verification completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Database uniqueness verification failed:', error);
    process.exit(1);
  }); 