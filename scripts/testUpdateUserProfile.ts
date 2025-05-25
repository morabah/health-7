/**
 * Test Script: updateUserProfile Function
 * 
 * Tests the deployed updateUserProfile Cloud Function with various scenarios:
 * - Patient updating patient-specific fields
 * - Doctor updating doctor-specific fields
 * - Invalid data validation
 * - Authentication requirements
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration for development project
const firebaseConfig = {
  apiKey: "AIzaSyDwHOKKKOKKKOKKKOKKKOKKKOKKKOKKKOK", // Replace with actual API key
  authDomain: "health7-c378f.firebaseapp.com",
  projectId: "health7-c378f",
  storageBucket: "health7-c378f.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

// Test credentials (using seeded test users)
const TEST_USERS = {
  patient: {
    email: 'patient1@example.com',
    password: 'Password123!'
  },
  doctor: {
    email: 'doctor1@example.com', 
    password: 'Password123!'
  },
  admin: {
    email: 'admin@example.com',
    password: 'Password123!'
  }
};

/**
 * Test updateUserProfile function with different scenarios
 */
async function testUpdateUserProfile() {
  console.log('🧪 Testing updateUserProfile Cloud Function...\n');

  try {
    // Test 1: Patient updating patient-specific fields
    console.log('📋 Test 1: Patient updating patient-specific fields');
    await testPatientUpdate();

    // Test 2: Doctor updating doctor-specific fields  
    console.log('\n📋 Test 2: Doctor updating doctor-specific fields');
    await testDoctorUpdate();

    // Test 3: Invalid data validation
    console.log('\n📋 Test 3: Invalid data validation');
    await testInvalidData();

    // Test 4: Unauthenticated request
    console.log('\n📋 Test 4: Unauthenticated request');
    await testUnauthenticated();

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

/**
 * Test patient updating patient-specific fields
 */
async function testPatientUpdate() {
  try {
    // Sign in as patient
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      TEST_USERS.patient.email, 
      TEST_USERS.patient.password
    );
    console.log(`✅ Signed in as patient: ${userCredential.user.email}`);

    // Get the updateUserProfile function
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');

    // Test valid patient updates
    const patientUpdates = {
      updates: {
        firstName: 'UpdatedPatient',
        lastName: 'TestUser',
        phone: '+1234567890',
        medicalHistory: 'Updated medical history for testing',
        address: '123 Test Street, Test City, TC 12345'
      }
    };

    console.log('📤 Sending patient update request...');
    const result = await updateUserProfile(patientUpdates);
    console.log('✅ Patient update successful:', result.data);

    // Sign out
    await auth.signOut();

  } catch (error: any) {
    console.error('❌ Patient update test failed:', error.message);
    throw error;
  }
}

/**
 * Test doctor updating doctor-specific fields
 */
async function testDoctorUpdate() {
  try {
    // Sign in as doctor
    const userCredential = await signInWithEmailAndPassword(
      auth,
      TEST_USERS.doctor.email,
      TEST_USERS.doctor.password
    );
    console.log(`✅ Signed in as doctor: ${userCredential.user.email}`);

    // Get the updateUserProfile function
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');

    // Test valid doctor updates
    const doctorUpdates = {
      updates: {
        firstName: 'UpdatedDoctor',
        specialty: 'Updated Cardiology',
        bio: 'Updated biography for testing purposes',
        consultationFee: 150,
        yearsOfExperience: 12,
        location: 'Updated Medical Center'
      }
    };

    console.log('📤 Sending doctor update request...');
    const result = await updateUserProfile(doctorUpdates);
    console.log('✅ Doctor update successful:', result.data);

    // Sign out
    await auth.signOut();

  } catch (error: any) {
    console.error('❌ Doctor update test failed:', error.message);
    throw error;
  }
}

/**
 * Test invalid data validation
 */
async function testInvalidData() {
  try {
    // Sign in as patient
    const userCredential = await signInWithEmailAndPassword(
      auth,
      TEST_USERS.patient.email,
      TEST_USERS.patient.password
    );
    console.log(`✅ Signed in as patient: ${userCredential.user.email}`);

    // Get the updateUserProfile function
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');

    // Test invalid data (firstName as number)
    const invalidUpdates = {
      updates: {
        firstName: 123, // Should be string
        consultationFee: 'invalid' // Patient shouldn't be able to set this
      }
    };

    console.log('📤 Sending invalid update request...');
    
    try {
      await updateUserProfile(invalidUpdates);
      console.log('❌ Expected validation error but request succeeded');
    } catch (error: any) {
      if (error.code === 'functions/invalid-argument') {
        console.log('✅ Validation error caught as expected:', error.message);
      } else {
        throw error;
      }
    }

    // Sign out
    await auth.signOut();

  } catch (error: any) {
    console.error('❌ Invalid data test failed:', error.message);
    throw error;
  }
}

/**
 * Test unauthenticated request
 */
async function testUnauthenticated() {
  try {
    // Ensure user is signed out
    await auth.signOut();
    console.log('✅ Signed out user');

    // Get the updateUserProfile function
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');

    // Test unauthenticated request
    const updates = {
      updates: {
        firstName: 'ShouldFail'
      }
    };

    console.log('📤 Sending unauthenticated request...');
    
    try {
      await updateUserProfile(updates);
      console.log('❌ Expected authentication error but request succeeded');
    } catch (error: any) {
      if (error.code === 'functions/unauthenticated') {
        console.log('✅ Authentication error caught as expected:', error.message);
      } else {
        throw error;
      }
    }

  } catch (error: any) {
    console.error('❌ Unauthenticated test failed:', error.message);
    throw error;
  }
}

// Run the tests
if (require.main === module) {
  testUpdateUserProfile()
    .then(() => {
      console.log('\n🎉 Test suite completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { testUpdateUserProfile }; 