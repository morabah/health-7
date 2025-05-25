/**
 * Validation Script for registerUser Function Results
 * 
 * Verifies that the registerUser function correctly created users in Firebase Auth
 * and Firestore with proper data structure and relationships.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

// Test user IDs from the latest test run
const TEST_PATIENT_ID = 'XbhZCmisj6f6aWWswJNpCcikey62';
const TEST_DOCTOR_ID = 'W05s0zRU42WFzvF0J9MS023SY5z2';

async function validateUserProfile(userId: string, expectedUserType: 'patient' | 'doctor') {
  console.log(`\n=== Validating UserProfile for ${expectedUserType}: ${userId} ===`);
  
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      console.error('❌ UserProfile document not found');
      return false;
    }
    
    const userData = userDocSnap.data();
    console.log('✅ UserProfile document found');
    
    // Validate required fields
    const requiredFields = ['id', 'email', 'firstName', 'lastName', 'userType', 'isActive', 'emailVerified', 'phoneVerified', 'createdAt', 'updatedAt'];
    const missingFields = requiredFields.filter(field => !(field in userData));
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return false;
    }
    
    console.log('✅ All required fields present');
    
    // Validate userType
    if (userData.userType !== expectedUserType) {
      console.error(`❌ Incorrect userType. Expected: ${expectedUserType}, Got: ${userData.userType}`);
      return false;
    }
    
    console.log(`✅ Correct userType: ${userData.userType}`);
    
    // Validate isActive status
    const expectedIsActive = expectedUserType === 'patient'; // Doctors start inactive
    if (userData.isActive !== expectedIsActive) {
      console.error(`❌ Incorrect isActive status. Expected: ${expectedIsActive}, Got: ${userData.isActive}`);
      return false;
    }
    
    console.log(`✅ Correct isActive status: ${userData.isActive}`);
    
    // Validate email verification status
    if (userData.emailVerified !== false) {
      console.error(`❌ Incorrect emailVerified status. Expected: false, Got: ${userData.emailVerified}`);
      return false;
    }
    
    console.log('✅ Correct emailVerified status: false');
    
    console.log('✅ UserProfile validation passed');
    return true;
    
  } catch (error) {
    console.error('❌ Error validating UserProfile:', error);
    return false;
  }
}

async function validatePatientProfile(userId: string) {
  console.log(`\n=== Validating PatientProfile for: ${userId} ===`);
  
  try {
    const patientDocRef = doc(db, 'patients', userId);
    const patientDocSnap = await getDoc(patientDocRef);
    
    if (!patientDocSnap.exists()) {
      console.error('❌ PatientProfile document not found');
      return false;
    }
    
    const patientData = patientDocSnap.data();
    console.log('✅ PatientProfile document found');
    
    // Validate required fields
    if (patientData.userId !== userId) {
      console.error(`❌ Incorrect userId. Expected: ${userId}, Got: ${patientData.userId}`);
      return false;
    }
    
    console.log('✅ Correct userId linkage');
    
    // Validate optional fields are present (even if null)
    const expectedFields = ['dateOfBirth', 'gender', 'bloodType', 'medicalHistory', 'address'];
    const hasExpectedFields = expectedFields.every(field => field in patientData);
    
    if (!hasExpectedFields) {
      console.error('❌ Missing expected patient fields');
      return false;
    }
    
    console.log('✅ All expected patient fields present');
    console.log('✅ PatientProfile validation passed');
    return true;
    
  } catch (error) {
    console.error('❌ Error validating PatientProfile:', error);
    return false;
  }
}

async function validateDoctorProfile(userId: string) {
  console.log(`\n=== Validating DoctorProfile for: ${userId} ===`);
  
  try {
    const doctorDocRef = doc(db, 'doctors', userId);
    const doctorDocSnap = await getDoc(doctorDocRef);
    
    if (!doctorDocSnap.exists()) {
      console.error('❌ DoctorProfile document not found');
      return false;
    }
    
    const doctorData = doctorDocSnap.data();
    console.log('✅ DoctorProfile document found');
    
    // Validate required fields
    const requiredFields = ['userId', 'specialty', 'licenseNumber', 'yearsOfExperience', 'verificationStatus', 'createdAt', 'updatedAt'];
    const missingFields = requiredFields.filter(field => !(field in doctorData));
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required doctor fields:', missingFields);
      return false;
    }
    
    console.log('✅ All required doctor fields present');
    
    // Validate userId linkage
    if (doctorData.userId !== userId) {
      console.error(`❌ Incorrect userId. Expected: ${userId}, Got: ${doctorData.userId}`);
      return false;
    }
    
    console.log('✅ Correct userId linkage');
    
    // Validate verification status
    if (doctorData.verificationStatus !== 'pending') {
      console.error(`❌ Incorrect verificationStatus. Expected: pending, Got: ${doctorData.verificationStatus}`);
      return false;
    }
    
    console.log('✅ Correct verificationStatus: pending');
    
    // Validate specialty and license
    if (!doctorData.specialty || !doctorData.licenseNumber) {
      console.error('❌ Missing specialty or licenseNumber');
      return false;
    }
    
    console.log(`✅ Specialty: ${doctorData.specialty}, License: ${doctorData.licenseNumber}`);
    console.log('✅ DoctorProfile validation passed');
    return true;
    
  } catch (error) {
    console.error('❌ Error validating DoctorProfile:', error);
    return false;
  }
}

async function validateDataConsistency() {
  console.log('\n=== Validating Data Consistency ===');
  
  try {
    // Check that user count matches profile count
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    const userCount = usersSnapshot.size;
    
    const patientsQuery = query(collection(db, 'patients'));
    const patientsSnapshot = await getDocs(patientsQuery);
    const patientCount = patientsSnapshot.size;
    
    const doctorsQuery = query(collection(db, 'doctors'));
    const doctorsSnapshot = await getDocs(doctorsQuery);
    const doctorCount = doctorsSnapshot.size;
    
    console.log(`📊 Total users: ${userCount}`);
    console.log(`📊 Total patients: ${patientCount}`);
    console.log(`📊 Total doctors: ${doctorCount}`);
    
    // Validate that each patient user has a patient profile
    const patientUsers = usersSnapshot.docs.filter(doc => doc.data().userType === 'patient');
    const doctorUsers = usersSnapshot.docs.filter(doc => doc.data().userType === 'doctor');
    
    console.log(`📊 Patient users: ${patientUsers.length}`);
    console.log(`📊 Doctor users: ${doctorUsers.length}`);
    
    if (patientUsers.length !== patientCount) {
      console.error(`❌ Patient count mismatch. Users: ${patientUsers.length}, Profiles: ${patientCount}`);
      return false;
    }
    
    if (doctorUsers.length !== doctorCount) {
      console.error(`❌ Doctor count mismatch. Users: ${doctorUsers.length}, Profiles: ${doctorCount}`);
      return false;
    }
    
    console.log('✅ Data consistency validation passed');
    return true;
    
  } catch (error) {
    console.error('❌ Error validating data consistency:', error);
    return false;
  }
}

async function runValidation() {
  console.log('🔍 Starting registerUser Function Results Validation');
  console.log('Project: health7-c378f');
  console.log(`Patient ID: ${TEST_PATIENT_ID}`);
  console.log(`Doctor ID: ${TEST_DOCTOR_ID}`);
  
  try {
    // Validate patient registration
    const patientUserValid = await validateUserProfile(TEST_PATIENT_ID, 'patient');
    const patientProfileValid = await validatePatientProfile(TEST_PATIENT_ID);
    
    // Validate doctor registration
    const doctorUserValid = await validateUserProfile(TEST_DOCTOR_ID, 'doctor');
    const doctorProfileValid = await validateDoctorProfile(TEST_DOCTOR_ID);
    
    // Validate data consistency
    const consistencyValid = await validateDataConsistency();
    
    console.log('\n=== Validation Summary ===');
    console.log(`Patient UserProfile: ${patientUserValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Patient Profile: ${patientProfileValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Doctor UserProfile: ${doctorUserValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Doctor Profile: ${doctorProfileValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Data Consistency: ${consistencyValid ? '✅ PASS' : '❌ FAIL'}`);
    
    const allValid = patientUserValid && patientProfileValid && doctorUserValid && doctorProfileValid && consistencyValid;
    
    if (allValid) {
      console.log('\n🎉 All validations passed! registerUser function is working correctly.');
    } else {
      console.log('\n❌ Some validations failed. Please check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Validation suite failed:', error);
  }
}

// Run the validation
runValidation(); 