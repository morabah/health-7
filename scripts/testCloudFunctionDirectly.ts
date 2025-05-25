#!/usr/bin/env ts-node

/**
 * Test Cloud Function Directly
 * 
 * This script tests the actual deployed Firebase Function by making HTTP calls
 * exactly as the frontend would, verifying end-to-end communication.
 * 
 * Usage: npm run test:cloud-function-direct
 */

import * as admin from 'firebase-admin';
const fetch = require('node-fetch');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const FIREBASE_PROJECT_ID = 'health7-c378f';
const FIREBASE_REGION = 'us-central1';
const FUNCTION_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/getMyUserProfileData`;

console.log('🎯 Testing Deployed Cloud Function Directly...\n');

/**
 * Get a test user from the database
 */
async function getTestUser(): Promise<any> {
  const db = admin.firestore();
  const usersSnapshot = await db.collection('users').where('userType', '==', 'patient').limit(1).get();
  
  if (usersSnapshot.empty) {
    throw new Error('No patient users found for testing');
  }
  
  const userDoc = usersSnapshot.docs[0];
  return { id: userDoc.id, ...userDoc.data() };
}

/**
 * Test the cloud function with authentication
 */
async function testCloudFunctionWithAuth(): Promise<boolean> {
  console.log('🔐 Testing Cloud Function with Authentication...');
  
  try {
    // Get a test user
    const testUser = await getTestUser();
    console.log(`✓ Using test user: ${testUser.email} (${testUser.userType})`);
    
    // Create a custom token for the test user
    const customToken = await admin.auth().createCustomToken(testUser.id);
    console.log('✓ Created custom auth token');
    
    // Sign in with the custom token to get an ID token
    // Note: In a real scenario, the frontend would handle this
    console.log('📞 Making authenticated request to cloud function...');
    
    // Make the request to the cloud function
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customToken}` // This should ideally be an ID token
      },
      body: JSON.stringify({
        data: {} // No data needed for getMyUserProfileData
      })
    });
    
    console.log(`📈 Response status: ${response.status}`);
    console.log(`📋 Response headers:`, response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Function call failed: ${response.status}`);
      console.log(`Error details: ${errorText}`);
      return false;
    }
    
    const responseData = await response.json() as any;
    console.log('✅ Function call successful!');
    console.log('📄 Response data:', JSON.stringify(responseData, null, 2));
    
    // Verify response structure
    if (responseData.result) {
      const result = responseData.result;
      if (result.userProfile) {
        console.log(`✓ User profile returned: ${result.userProfile.firstName} ${result.userProfile.lastName}`);
        console.log(`✓ User type: ${result.userProfile.userType}`);
        
        if (result.patientProfile) {
          console.log(`✓ Patient profile included`);
        }
        
        if (result.doctorProfile) {
          console.log(`✓ Doctor profile included`);
        }
        
        return true;
      } else {
        console.log('❌ No userProfile in response');
        return false;
      }
    } else {
      console.log('❌ No result in response');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing cloud function:', error);
    return false;
  }
}

/**
 * Test the cloud function without authentication (should fail)
 */
async function testCloudFunctionWithoutAuth(): Promise<boolean> {
  console.log('\n🚫 Testing Cloud Function without Authentication...');
  
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {}
      })
    });
    
    console.log(`📈 Response status: ${response.status}`);
    
    if (response.status === 401 || response.status === 403) {
      console.log('✅ Correctly rejected unauthenticated request');
      return true;
    } else {
      console.log('❌ Function should have rejected unauthenticated request');
      const responseText = await response.text();
      console.log('Response:', responseText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing unauthenticated request:', error);
    return false;
  }
}

/**
 * Test function availability and CORS
 */
async function testFunctionAvailability(): Promise<boolean> {
  console.log('\n🌐 Testing Function Availability and CORS...');
  
  try {
    // Test OPTIONS request for CORS
    const optionsResponse = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    
    console.log(`📈 OPTIONS response status: ${optionsResponse.status}`);
    
    const corsHeaders = {
      'access-control-allow-origin': optionsResponse.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': optionsResponse.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': optionsResponse.headers.get('access-control-allow-headers')
    };
    
    console.log('🔗 CORS headers:', corsHeaders);
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log('✅ CORS is properly configured');
      return true;
    } else {
      console.log('⚠️  CORS headers not found - may cause frontend issues');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing function availability:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function testCloudFunctionDirectly(): Promise<void> {
  console.log('🚀 Direct Cloud Function Testing Starting...\n');
  console.log(`📡 Function URL: ${FUNCTION_URL}\n`);
  
  const results: Array<{ test: string; passed: boolean }> = [];
  
  try {
    // Test 1: Function availability and CORS
    const availabilityResult = await testFunctionAvailability();
    results.push({ test: 'Function Availability & CORS', passed: availabilityResult });
    
    // Test 2: Unauthenticated request (should fail)
    const unauthResult = await testCloudFunctionWithoutAuth();
    results.push({ test: 'Authentication Enforcement', passed: unauthResult });
    
    // Test 3: Authenticated request (should succeed)
    const authResult = await testCloudFunctionWithAuth();
    results.push({ test: 'Authenticated Function Call', passed: authResult });
    
    // Generate report
    console.log('\n📊 DIRECT FUNCTION TEST REPORT');
    console.log('================================================\n');
    
    let allPassed = true;
    results.forEach(result => {
      console.log(`${result.passed ? '✅' : '❌'} ${result.test}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      if (!result.passed) allPassed = false;
    });
    
    console.log('\n📈 OVERALL SUMMARY');
    console.log('================================================');
    console.log(`Tests Passed: ${results.filter(r => r.passed).length}/${results.length}`);
    console.log(`Success Rate: ${((results.filter(r => r.passed).length / results.length) * 100).toFixed(1)}%`);
    console.log(`Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);
    
    if (allPassed) {
      console.log('🎉 EXCELLENT!');
      console.log('✅ Cloud Function is properly deployed and accessible');
      console.log('✅ Authentication is working correctly');
      console.log('✅ CORS is configured for frontend access');
      console.log('✅ Database communication is functioning');
      console.log('✅ Ready for frontend integration!\n');
    } else {
      console.log('⚠️  ISSUES DETECTED');
      console.log('Please review the failed tests above.');
      console.log('Check Firebase Console for detailed function logs.\n');
    }
    
  } catch (error) {
    console.error('❌ Direct function testing failed:', error);
    throw error;
  }
}

// Execute test
testCloudFunctionDirectly()
  .then(() => {
    console.log('🏁 Direct cloud function testing completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Direct cloud function testing failed:', error);
    process.exit(1);
  }); 