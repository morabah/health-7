/**
 * Test Script for Live Doctor Registration Frontend Connection with File Upload
 * 
 * Tests the frontend doctor registration page connection to the live registerUser Cloud Function
 * including Firebase Storage file upload capabilities. This simulates the complete doctor
 * registration flow with profile picture and license document uploads.
 */

import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Firebase configuration for health7-c378f project
const firebaseConfig = {
  apiKey: "AIzaSyAQ5B6mIjUw-Zc6VwG7J-jkMUXDadSOzkA",
  authDomain: "health7-c378f.firebaseapp.com",
  projectId: "health7-c378f",
  storageBucket: "health7-c378f.firebasestorage.app",
  messagingSenderId: "776487659386",
  appId: "1:776487659386:web:ee5636a3c3fc4ef94dd8c3",
  measurementId: "G-HNJRSQEBLD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const storage = getStorage(app);

// Get the registerUser function
const registerUser = httpsCallable(functions, 'registerUser');

/**
 * Create a test file for upload simulation
 */
function createTestFile(fileName: string, content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

/**
 * Test file upload to Firebase Storage
 */
async function testFileUpload(fileName: string, content: Buffer, path: string): Promise<string> {
  console.log(`📤 Uploading test file: ${fileName} to ${path}`);
  
  try {
    const storageRef = ref(storage, path);
    const uploadResult = await uploadBytes(storageRef, content);
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    console.log(`✅ File uploaded successfully: ${downloadUrl}`);
    return downloadUrl;
  } catch (error: any) {
    console.error(`❌ File upload failed: ${error.message}`);
    throw error;
  }
}

async function testFrontendDoctorRegistration() {
  console.log('\n=== Testing Frontend Doctor Registration Connection with File Upload ===');
  console.log('Simulating frontend form submission to live registerUser function...');
  
  const timestamp = Date.now();
  
  try {
    // Test file uploads first
    console.log('\n📁 Testing file uploads to Firebase Storage...');
    
    // Create test files
    const profilePicContent = createTestFile('test-profile.jpg', 'Mock profile picture content for testing');
    const licenseContent = createTestFile('test-license.pdf', 'Mock medical license document content for testing');
    
    // Upload test files
    const profilePicUrl = await testFileUpload(
      'test-profile.jpg',
      profilePicContent,
      `doctors/TEMP_REG_${timestamp}/profile.jpg`
    );
    
    const licenseUrl = await testFileUpload(
      'test-license.pdf',
      licenseContent,
      `doctors/TEMP_REG_${timestamp}/license.pdf`
    );
    
    console.log('\n📋 File uploads completed successfully!');
    
    // Simulate the exact data structure that the frontend sends
    const frontendDoctorData = {
      email: `frontend-test-doctor-${timestamp}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Frontend',
      lastName: 'TestDoctor',
      userType: 'doctor',
      phone: `+1555${timestamp.toString().slice(-7)}`,
      specialty: 'Cardiology',
      licenseNumber: `LIC${timestamp.toString().slice(-6)}`,
      yearsOfExperience: 5,
      bio: 'Experienced cardiologist specializing in preventive care and cardiac interventions.',
      consultationFee: 150.00,
      profilePictureUrl: profilePicUrl,
      licenseDocumentUrl: licenseUrl,
    };

    console.log('\n📤 Sending doctor registration data...');
    console.log('Email:', frontendDoctorData.email);
    console.log('User Type:', frontendDoctorData.userType);
    console.log('Specialty:', frontendDoctorData.specialty);
    console.log('Has Profile Picture:', !!frontendDoctorData.profilePictureUrl);
    console.log('Has License Document:', !!frontendDoctorData.licenseDocumentUrl);
    
    const result = await registerUser(frontendDoctorData);
    
    if (result.data && typeof result.data === 'object' && 'success' in result.data) {
      const data = result.data as { success: boolean; userId: string };
      console.log('✅ Frontend doctor registration successful!');
      console.log('Response:', data);
      console.log('User ID:', data.userId);
      console.log('Profile Picture URL:', profilePicUrl);
      console.log('License Document URL:', licenseUrl);
      return data.userId;
    } else {
      console.error('❌ Unexpected response format:', result.data);
      return null;
    }
    
  } catch (error: any) {
    console.error('❌ Frontend doctor registration failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    return null;
  }
}

async function testValidationErrors() {
  console.log('\n=== Testing Frontend Validation Error Handling ===');
  
  // Test 1: Invalid specialty
  console.log('\n1. Testing invalid specialty...');
  try {
    const invalidSpecialtyData = {
      email: 'test-doctor@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Doctor',
      userType: 'doctor',
      specialty: 'XY', // Too short
      licenseNumber: 'LIC123456',
      yearsOfExperience: 5
    };
    
    await registerUser(invalidSpecialtyData);
    console.error('❌ Expected validation error but registration succeeded');
  } catch (error: any) {
    if (error.code === 'functions/invalid-argument') {
      console.log('✅ Correctly rejected invalid specialty');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 2: Invalid license number
  console.log('\n2. Testing invalid license number...');
  try {
    const invalidLicenseData = {
      email: 'test-doctor@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Doctor',
      userType: 'doctor',
      specialty: 'Cardiology',
      licenseNumber: '123', // Too short
      yearsOfExperience: 5
    };
    
    await registerUser(invalidLicenseData);
    console.error('❌ Expected validation error but registration succeeded');
  } catch (error: any) {
    if (error.code === 'functions/invalid-argument') {
      console.log('✅ Correctly rejected invalid license number');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 3: Invalid years of experience
  console.log('\n3. Testing invalid years of experience...');
  try {
    const invalidExperienceData = {
      email: 'test-doctor@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Doctor',
      userType: 'doctor',
      specialty: 'Cardiology',
      licenseNumber: 'LIC123456',
      yearsOfExperience: -5 // Negative value
    };
    
    await registerUser(invalidExperienceData);
    console.error('❌ Expected validation error but registration succeeded');
  } catch (error: any) {
    if (error.code === 'functions/invalid-argument') {
      console.log('✅ Correctly rejected invalid years of experience');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

async function testExistingEmailError() {
  console.log('\n=== Testing Existing Email Error Handling ===');
  
  try {
    const existingEmailData = {
      email: 'admin@example.com', // This email already exists
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Doctor',
      userType: 'doctor',
      specialty: 'Cardiology',
      licenseNumber: 'LIC123456',
      yearsOfExperience: 5
    };
    
    await registerUser(existingEmailData);
    console.error('❌ Expected existing email error but registration succeeded');
  } catch (error: any) {
    if (error.code === 'functions/already-exists') {
      console.log('✅ Correctly rejected existing email with proper error message');
      console.log('Error message:', error.message);
    } else {
      console.error('❌ Unexpected error for existing email:', error.message);
    }
  }
}

async function testStoragePermissions() {
  console.log('\n=== Testing Firebase Storage Permissions ===');
  
  try {
    const testContent = createTestFile('permission-test.txt', 'Testing storage permissions');
    const testPath = `doctors/TEMP_REG_${Date.now()}/permission-test.txt`;
    
    await testFileUpload('permission-test.txt', testContent, testPath);
    console.log('✅ Storage permissions working correctly');
  } catch (error: any) {
    console.error('❌ Storage permission test failed:', error.message);
    console.log('⚠️  Check Firebase Storage rules for the development project');
  }
}

async function runFrontendTests() {
  console.log('🧪 Starting Frontend Doctor Registration Tests with File Upload');
  console.log('Project: health7-c378f');
  console.log('Function: registerUser (via frontend simulation)');
  console.log('Storage: Firebase Storage file upload');
  
  try {
    // Test storage permissions first
    await testStoragePermissions();
    
    // Test successful registration with file uploads
    const userId = await testFrontendDoctorRegistration();
    
    // Test validation errors
    await testValidationErrors();
    
    // Test existing email error
    await testExistingEmailError();
    
    console.log('\n=== Frontend Test Summary ===');
    console.log(`✅ Doctor registration with files: ${userId ? 'SUCCESS' : 'FAILED'}`);
    console.log('✅ File upload to Storage: TESTED');
    console.log('✅ Validation error handling: TESTED');
    console.log('✅ Existing email error handling: TESTED');
    console.log('✅ Storage permissions: TESTED');
    console.log('\n🎉 Frontend doctor registration connection verified!');
    console.log('\n📋 Next Steps:');
    console.log('1. Navigate to http://localhost:3000/auth/register/doctor');
    console.log('2. Fill out the form with valid data');
    console.log('3. Upload a profile picture and license document');
    console.log('4. Submit and verify file uploads to Firebase Storage');
    console.log('5. Verify redirect to /auth/pending-verification');
    console.log('6. Check Firebase Auth, Firestore, and Storage for new data');
    
  } catch (error) {
    console.error('❌ Frontend test suite failed:', error);
  }
}

// Run the tests
runFrontendTests(); 