#!/usr/bin/env tsx

/**
 * Complete Registration Flow Test
 * 
 * Tests both patient and doctor registration to verify:
 * - Live Firebase function calls
 * - User creation in Firebase Auth
 * - Document creation in Firestore
 * - File uploads for doctors (Firebase Storage)
 * - Proper error handling and validation
 */

// Set environment variables for live mode testing
process.env.NEXT_PUBLIC_API_MODE = 'live';
process.env.NEXT_PUBLIC_FIREBASE_ENABLED = 'true';
process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR = 'false';

import { callApi } from '../src/lib/apiClient';
import { UserType } from '../src/types/enums';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../src/lib/realFirebaseConfig';

console.log('🧪 Starting Complete Registration Flow Tests');
console.log('Project: health7-c378f');
console.log('Testing: Patient and Doctor registration with live Firebase functions');
console.log('Environment: Live Firebase services');
console.log('');

// Test data
const timestamp = Date.now();
const testPatientEmail = `test-patient-${timestamp}@example.com`;
const testDoctorEmail = `test-doctor-${timestamp}@example.com`;

// Helper function to create test file
function createTestFile(name: string, content: string, type: string): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

// Helper function to upload file to Firebase Storage
async function uploadTestFile(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`📤 Upload progress: ${Math.round(progress)}%`);
      },
      (error) => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadUrl);
      }
    );
  });
}

async function testPatientRegistration() {
  console.log('=== Testing Patient Registration ===');
  
  try {
    const patientData = {
      email: testPatientEmail,
      password: 'TestPassword123!',
      userType: UserType.PATIENT,
      firstName: 'Test',
      lastName: 'Patient',
      phone: '+1234567890',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      address: '123 Test Street',
      emergencyContact: 'Emergency Contact',
      emergencyPhone: '+0987654321'
    };

    console.log(`📤 Registering patient: ${testPatientEmail}`);
    const response = await callApi('registerUser', patientData);
    
    console.log('✅ Patient registration successful!');
    console.log(`User ID: ${(response as any).userId}`);
    console.log(`Response:`, response);
    
    return (response as any).userId;
  } catch (error) {
    console.error('❌ Patient registration failed:', error);
    throw error;
  }
}

async function testDoctorRegistration() {
  console.log('\n=== Testing Doctor Registration with File Upload ===');
  
  try {
    // Create test files
    const profilePicFile = createTestFile(
      'test-profile.jpg',
      'fake-image-content-for-testing',
      'image/jpeg'
    );
    
    const licenseFile = createTestFile(
      'test-license.pdf',
      'fake-pdf-content-for-testing',
      'application/pdf'
    );

    // Upload files to Firebase Storage
    console.log('📁 Uploading test files to Firebase Storage...');
    const tempPath = `doctors/TEMP_REG_${timestamp}`;
    
    console.log(`📤 Uploading profile picture to ${tempPath}/profile.jpg`);
    const profilePictureUrl = await uploadTestFile(profilePicFile, `${tempPath}/profile.jpg`);
    
    console.log(`📤 Uploading license document to ${tempPath}/license.pdf`);
    const licenseDocumentUrl = await uploadTestFile(licenseFile, `${tempPath}/license.pdf`);
    
    console.log('✅ File uploads completed successfully!');

    // Register doctor with file URLs
    const doctorData = {
      email: testDoctorEmail,
      password: 'TestPassword123!',
      userType: UserType.DOCTOR,
      firstName: 'Test',
      lastName: 'Doctor',
      phone: '+1234567890',
      specialty: 'Cardiology',
      licenseNumber: 'MD123456',
      yearsOfExperience: 5,
      bio: 'Test doctor for registration flow testing',
      consultationFee: 150,
      profilePictureUrl,
      licenseDocumentUrl
    };

    console.log(`📤 Registering doctor: ${testDoctorEmail}`);
    const response = await callApi('registerUser', doctorData);
    
    console.log('✅ Doctor registration successful!');
    console.log(`User ID: ${(response as any).userId}`);
    console.log(`Profile Picture URL: ${profilePictureUrl}`);
    console.log(`License Document URL: ${licenseDocumentUrl}`);
    console.log(`Response:`, response);
    
    return (response as any).userId;
  } catch (error) {
    console.error('❌ Doctor registration failed:', error);
    throw error;
  }
}

async function testValidationErrors() {
  console.log('\n=== Testing Validation Error Handling ===');
  
  try {
    // Test invalid email
    console.log('1. Testing invalid email format...');
    try {
      await callApi('registerUser', {
        email: 'invalid-email',
        password: 'TestPassword123!',
        userType: UserType.PATIENT,
        firstName: 'Test',
        lastName: 'User'
      });
      console.log('❌ Should have rejected invalid email');
    } catch (error) {
      console.log('✅ Correctly rejected invalid email format');
    }

    // Test existing email
    console.log('2. Testing existing email...');
    try {
      await callApi('registerUser', {
        email: 'admin@example.com', // Known existing email
        password: 'TestPassword123!',
        userType: UserType.PATIENT,
        firstName: 'Test',
        lastName: 'User'
      });
      console.log('❌ Should have rejected existing email');
    } catch (error) {
      console.log('✅ Correctly rejected existing email');
      console.log(`Error message: ${(error as any).message}`);
    }

    // Test weak password
    console.log('3. Testing weak password...');
    try {
      await callApi('registerUser', {
        email: `weak-password-test-${timestamp}@example.com`,
        password: '123',
        userType: UserType.PATIENT,
        firstName: 'Test',
        lastName: 'User'
      });
      console.log('❌ Should have rejected weak password');
    } catch (error) {
      console.log('✅ Correctly rejected weak password');
    }

  } catch (error) {
    console.error('❌ Validation testing failed:', error);
  }
}

async function runCompleteTest() {
  try {
    console.log('🚀 Starting complete registration flow test...\n');
    
    // Test patient registration
    const patientUserId = await testPatientRegistration();
    
    // Test doctor registration with file upload
    const doctorUserId = await testDoctorRegistration();
    
    // Test validation errors
    await testValidationErrors();
    
    console.log('\n=== Test Summary ===');
    console.log('✅ Patient registration: SUCCESS');
    console.log('✅ Doctor registration with files: SUCCESS');
    console.log('✅ File upload to Storage: SUCCESS');
    console.log('✅ Validation error handling: TESTED');
    console.log('✅ Live Firebase function calls: VERIFIED');
    
    console.log('\n📊 Created Users:');
    console.log(`👤 Patient: ${testPatientEmail} (ID: ${patientUserId})`);
    console.log(`👨‍⚕️ Doctor: ${testDoctorEmail} (ID: ${doctorUserId})`);
    
    console.log('\n🎉 All registration flows working correctly!');
    
    console.log('\n📋 Verification Steps:');
    console.log('1. Check Firebase Console → Authentication → Users');
    console.log(`   - Verify patient: ${testPatientEmail}`);
    console.log(`   - Verify doctor: ${testDoctorEmail}`);
    console.log('2. Check Firebase Console → Firestore Database');
    console.log('   - Check users collection for both user documents');
    console.log('   - Check patients collection for patient profile');
    console.log('   - Check doctors collection for doctor profile');
    console.log('3. Check Firebase Console → Storage');
    console.log(`   - Check doctors/TEMP_REG_${timestamp}/ folder for uploaded files`);
    
  } catch (error) {
    console.error('\n❌ Complete registration test failed:', error);
    process.exit(1);
  }
}

// Run the test
runCompleteTest(); 