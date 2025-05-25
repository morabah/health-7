#!/usr/bin/env ts-node

/**
 * Test Login for Specific User
 * 
 * This script tests Firebase Authentication login for a specific user
 * to verify that the authentication credentials are working correctly.
 * 
 * Usage: npm run test:login:user
 */

import * as admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Initialize Firebase Client SDK for auth testing
const firebaseConfig = {
  apiKey: "AIzaSyAQ5B6mIjUw-Zc6VwG7J-jkMUXDadSOzkA",
  authDomain: "health7-c378f.firebaseapp.com",
  projectId: "health7-c378f",
  storageBucket: "health7-c378f.appspot.com",
  messagingSenderId: "1023896607399",
  appId: "1:1023896607399:web:6d8f9b63ac8f8b8ae9b97f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

console.log('🔐 Testing Firebase Authentication Login...\n');

interface LoginTestResult {
  email: string;
  success: boolean;
  error?: string;
  userId?: string;
  userType?: string;
}

/**
 * Test login for a specific user
 */
async function testUserLogin(email: string, password: string): Promise<LoginTestResult> {
  console.log(`Testing login for: ${email}`);
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (!user) {
      return {
        email,
        success: false,
        error: 'No user returned from authentication'
      };
    }
    
    // Get user claims to check userType
    const idTokenResult = await user.getIdTokenResult();
    const userType = idTokenResult.claims.userType as string;
    
    console.log(`  ✅ Login successful!`);
    console.log(`     UID: ${user.uid}`);
    console.log(`     Email: ${user.email}`);
    console.log(`     User Type: ${userType}`);
    console.log(`     Email Verified: ${user.emailVerified}`);
    
    return {
      email,
      success: true,
      userId: user.uid,
      userType
    };
    
  } catch (error: any) {
    const errorCode = error.code || 'unknown';
    const errorMessage = error.message || 'Unknown error';
    
    console.log(`  ❌ Login failed!`);
    console.log(`     Error Code: ${errorCode}`);
    console.log(`     Error Message: ${errorMessage}`);
    
    return {
      email,
      success: false,
      error: `${errorCode}: ${errorMessage}`
    };
  }
}

/**
 * Main test function
 */
async function testLogin(): Promise<void> {
  try {
    console.log('🚀 Starting Firebase Auth login tests...\n');
    
    // Test users with the default password
    const testUsers = [
      { email: 'user7@demo.health', password: 'Password123!' },
      { email: 'user1@demo.health', password: 'Password123!' },
      { email: 'admin@example.com', password: 'Password123!' },
      { email: 'morabah@gmail.com', password: 'Password123!' },
    ];
    
    const results: LoginTestResult[] = [];
    
    for (const testUser of testUsers) {
      const result = await testUserLogin(testUser.email, testUser.password);
      results.push(result);
      console.log(''); // Add spacing between tests
    }
    
    // Summary
    console.log('📊 LOGIN TEST SUMMARY');
    console.log('==========================================\n');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful logins: ${successful.length}/${results.length}`);
    console.log(`❌ Failed logins: ${failed.length}/${results.length}`);
    
    if (successful.length > 0) {
      console.log('\n✅ SUCCESSFUL LOGINS:');
      successful.forEach(result => {
        console.log(`  • ${result.email} (${result.userType}) - UID: ${result.userId}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED LOGINS:');
      failed.forEach(result => {
        console.log(`  • ${result.email} - ${result.error}`);
      });
    }
    
    // Test with wrong password for user7
    console.log('\n🔍 Testing with wrong password for user7@demo.health...');
    const wrongPasswordResult = await testUserLogin('user7@demo.health', 'wrongpassword');
    
    if (!wrongPasswordResult.success) {
      console.log('✅ Correctly rejected wrong password');
    } else {
      console.log('❌ ERROR: Wrong password was accepted!');
    }
    
    // Save test results
    const testData = {
      timestamp: new Date().toISOString(),
      testResults: results,
      wrongPasswordTest: wrongPasswordResult,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync('login-test-results.json', JSON.stringify(testData, null, 2));
    console.log('\n📁 Test results saved to: login-test-results.json');
    
    if (failed.length === 0) {
      console.log('\n🎉 ALL LOGIN TESTS PASSED!');
      console.log('✅ All users can authenticate with password: Password123!');
      console.log('✅ Authentication is working correctly');
    } else {
      console.log('\n⚠️  SOME LOGIN TESTS FAILED');
      console.log('Check the failed logins above for details.');
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error);
    throw error;
  }
}

// Execute test
testLogin()
  .then(() => {
    console.log('\n🏁 Login test completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Login test failed:', error);
    process.exit(1);
  }); 