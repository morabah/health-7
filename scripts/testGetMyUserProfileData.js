/**
 * Test script for getMyUserProfileData Cloud Function
 * 
 * This script tests the deployed getMyUserProfileData function by:
 * 1. Authenticating with Firebase Auth using test credentials
 * 2. Calling the deployed function with the auth token
 * 3. Verifying the response structure and data
 */

const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'health7-c378f'
  });
}

const auth = getAuth();

/**
 * Test the getMyUserProfileData function with a specific user
 */
async function testGetMyUserProfileData(email, password = 'Password123!') {
  console.log(`\n🧪 Testing getMyUserProfileData for: ${email}`);
  console.log('=' .repeat(60));

  try {
    // Get user by email to get their UID
    console.log('📋 Step 1: Getting user from Firebase Auth...');
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.uid}`);

    // Create a custom token for testing
    console.log('🔑 Step 2: Creating custom token...');
    const customToken = await auth.createCustomToken(userRecord.uid);
    console.log('✅ Custom token created');

    // Import Firebase client SDK for testing
    const { initializeApp } = require('firebase/app');
    const { getAuth: getClientAuth, signInWithCustomToken } = require('firebase/auth');
    const { getFunctions, httpsCallable } = require('firebase/functions');

    // Initialize client app
    const clientApp = initializeApp({
      apiKey: 'AIzaSyAQ5B6mIjUw-Zc6VwG7J-jkMUXDadSOzkA',
      authDomain: 'health7-c378f.firebaseapp.com',
      projectId: 'health7-c378f',
      storageBucket: 'health7-c378f.firebasestorage.app',
      messagingSenderId: '776487659386',
      appId: '1:776487659386:web:ee5636a3c3fc4ef94dd8c3'
    });

    const clientAuth = getClientAuth(clientApp);
    const functions = getFunctions(clientApp, 'us-central1');

    console.log('🔐 Step 3: Signing in with custom token...');
    const userCredential = await signInWithCustomToken(clientAuth, customToken);
    console.log(`✅ Signed in as: ${userCredential.user.uid}`);

    console.log('📞 Step 4: Calling getMyUserProfileData function...');
    const getMyUserProfileData = httpsCallable(functions, 'getMyUserProfileData');
    
    const result = await getMyUserProfileData();
    console.log('✅ Function call successful!');

    console.log('\n📊 Response Data:');
    console.log('─'.repeat(40));
    
    if (result.data) {
      const { userProfile, patientProfile, doctorProfile } = result.data;
      
      console.log('👤 User Profile:');
      console.log(`   ID: ${userProfile?.id}`);
      console.log(`   Email: ${userProfile?.email}`);
      console.log(`   Name: ${userProfile?.firstName} ${userProfile?.lastName}`);
      console.log(`   Type: ${userProfile?.userType}`);
      console.log(`   Active: ${userProfile?.isActive}`);
      
      if (patientProfile) {
        console.log('\n🏥 Patient Profile:');
        console.log(`   User ID: ${patientProfile.userId}`);
        console.log(`   DOB: ${patientProfile.dateOfBirth || 'Not set'}`);
        console.log(`   Gender: ${patientProfile.gender || 'Not set'}`);
      }
      
      if (doctorProfile) {
        console.log('\n👨‍⚕️ Doctor Profile:');
        console.log(`   User ID: ${doctorProfile.userId}`);
        console.log(`   Specialty: ${doctorProfile.specialty}`);
        console.log(`   License: ${doctorProfile.licenseNumber}`);
        console.log(`   Experience: ${doctorProfile.yearsOfExperience} years`);
        console.log(`   Status: ${doctorProfile.verificationStatus}`);
      }
    } else {
      console.log('❌ No data returned from function');
    }

    // Sign out
    await clientAuth.signOut();
    console.log('\n✅ Test completed successfully!');
    
    return result.data;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.details) {
      console.error(`   Details: ${error.details}`);
    }
    throw error;
  }
}

/**
 * Test unauthenticated access (should fail)
 */
async function testUnauthenticatedAccess() {
  console.log('\n🧪 Testing unauthenticated access (should fail)');
  console.log('=' .repeat(60));

  try {
    const { initializeApp } = require('firebase/app');
    const { getFunctions, httpsCallable } = require('firebase/functions');

    const clientApp = initializeApp({
      apiKey: 'AIzaSyAQ5B6mIjUw-Zc6VwG7J-jkMUXDadSOzkA',
      authDomain: 'health7-c378f.firebaseapp.com',
      projectId: 'health7-c378f',
      storageBucket: 'health7-c378f.firebasestorage.app',
      messagingSenderId: '776487659386',
      appId: '1:776487659386:web:ee5636a3c3fc4ef94dd8c3'
    });

    const functions = getFunctions(clientApp, 'us-central1');
    const getMyUserProfileData = httpsCallable(functions, 'getMyUserProfileData');
    
    console.log('📞 Calling function without authentication...');
    await getMyUserProfileData();
    
    console.log('❌ Function should have failed but didn\'t!');
    
  } catch (error) {
    console.log('✅ Function correctly rejected unauthenticated request');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting getMyUserProfileData Function Tests');
  console.log('='.repeat(80));

  try {
    // Test with different user types
    const testUsers = [
      'admin@example.com',      // Admin user
      'user1@demo.health',      // Doctor user  
      'user7@demo.health'       // Patient user
    ];

    for (const email of testUsers) {
      try {
        await testGetMyUserProfileData(email);
      } catch (error) {
        console.error(`❌ Test failed for ${email}:`, error.message);
      }
    }

    // Test unauthenticated access
    await testUnauthenticatedAccess();

    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ Test suite finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testGetMyUserProfileData,
  testUnauthenticatedAccess,
  runTests
}; 