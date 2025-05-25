/**
 * Test Script for registerUser Cloud Function
 * 
 * Tests the deployed registerUser function with various scenarios:
 * - Valid Patient registration
 * - Valid Doctor registration  
 * - Existing email (should fail)
 * - Invalid data (should fail)
 */

const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase configuration for health7-c378f project
const firebaseConfig = {
  apiKey: "AIzaSyDdXmvJXWqEBXdBz4Uj3W8cCjKJHgGqE8s",
  authDomain: "health7-c378f.firebaseapp.com",
  projectId: "health7-c378f",
  storageBucket: "health7-c378f.firebasestorage.app",
  messagingSenderId: "1092687128623",
  appId: "1:1092687128623:web:d1234567890abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Get the registerUser function
const registerUser = httpsCallable(functions, 'registerUser');

async function testPatientRegistration() {
  console.log('\n=== Testing Patient Registration ===');
  
  const timestamp = Date.now();
  const patientData = {
    email: `test-patient-${timestamp}@example.com`,
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe',
    userType: 'patient',
    phone: `+1234567${timestamp.toString().slice(-4)}`,
    dateOfBirth: '1990-01-01',
    gender: 'male',
    bloodType: 'A+',
    medicalHistory: 'No known allergies',
    address: '123 Main St, City, State'
  };

  try {
    const result = await registerUser(patientData);
    console.log('✅ Patient registration successful:', result.data);
    return result.data.userId;
  } catch (error) {
    console.error('❌ Patient registration failed:', error.message);
    console.error('Error details:', error.details || error.code);
    return null;
  }
}

async function testDoctorRegistration() {
  console.log('\n=== Testing Doctor Registration ===');
  
  const timestamp = Date.now();
  const doctorData = {
    email: `test-doctor-${timestamp}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Dr. Jane',
    lastName: 'Smith',
    userType: 'doctor',
    phone: `+1987654${timestamp.toString().slice(-4)}`,
    specialty: 'Cardiology',
    licenseNumber: 'MD123456789',
    yearsOfExperience: 10,
    bio: 'Experienced cardiologist with 10 years of practice',
    consultationFee: 150,
    languages: ['English', 'Spanish'],
    educationHistory: [],
    experienceHistory: []
  };

  try {
    const result = await registerUser(doctorData);
    console.log('✅ Doctor registration successful:', result.data);
    return result.data.userId;
  } catch (error) {
    console.error('❌ Doctor registration failed:', error.message);
    console.error('Error details:', error.details || error.code);
    return null;
  }
}

async function testExistingEmail() {
  console.log('\n=== Testing Existing Email (Should Fail) ===');
  
  const existingEmailData = {
    email: 'admin@example.com', // This email already exists
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    userType: 'patient',
    phone: '+11111111111'
  };

  try {
    const result = await registerUser(existingEmailData);
    console.error('❌ Expected failure but registration succeeded:', result.data);
  } catch (error) {
    if (error.code === 'functions/already-exists') {
      console.log('✅ Correctly rejected existing email:', error.message);
    } else {
      console.error('❌ Unexpected error for existing email:', error.message);
    }
  }
}

async function testInvalidData() {
  console.log('\n=== Testing Invalid Data (Should Fail) ===');
  
  const invalidData = {
    email: 'invalid-email', // Invalid email format
    password: '123', // Too short password
    firstName: '', // Empty first name
    lastName: 'Test',
    userType: 'invalid-type' // Invalid user type
  };

  try {
    const result = await registerUser(invalidData);
    console.error('❌ Expected validation failure but registration succeeded:', result.data);
  } catch (error) {
    if (error.code === 'functions/invalid-argument') {
      console.log('✅ Correctly rejected invalid data:', error.message);
    } else {
      console.error('❌ Unexpected error for invalid data:', error.message);
    }
  }
}

async function runAllTests() {
  console.log('🧪 Starting registerUser Function Tests');
  console.log('Project: health7-c378f');
  console.log('Function: registerUser');
  
  try {
    // Test valid registrations
    const patientUserId = await testPatientRegistration();
    const doctorUserId = await testDoctorRegistration();
    
    // Test error cases
    await testExistingEmail();
    await testInvalidData();
    
    console.log('\n=== Test Summary ===');
    console.log(`Patient User ID: ${patientUserId || 'Failed'}`);
    console.log(`Doctor User ID: ${doctorUserId || 'Failed'}`);
    console.log('✅ All tests completed');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the tests
runAllTests(); 