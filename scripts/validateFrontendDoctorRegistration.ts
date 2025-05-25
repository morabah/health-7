/**
 * Validation Script for Frontend Doctor Registration Configuration with File Upload
 * 
 * Verifies that the doctor registration page is properly configured to connect
 * to the live registerUser Cloud Function with Firebase Storage file upload capabilities.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
}

function validateFile(filePath: string, description: string): ValidationResult {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return { passed: true, message: `✅ ${description} exists and is readable`, details: `${content.length} characters` };
  } catch (error) {
    return { passed: false, message: `❌ ${description} not found or not readable`, details: String(error) };
  }
}

function validateImports(content: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check for required imports
  const requiredImports = [
    { import: "import { callApi } from '@/lib/apiClient';", description: "callApi import" },
    { import: "import { logInfo, logError } from '@/lib/logger';", description: "Logger imports" },
    { import: "import { trackPerformance } from '@/lib/performance';", description: "Performance tracking import" },
    { import: "import { storage } from '@/lib/realFirebaseConfig';", description: "Firebase Storage import" },
    { import: "import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';", description: "Firebase Storage functions import" },
    { import: "import { UserType } from '@/types/enums';", description: "UserType enum import" },
    { import: "import { z } from 'zod';", description: "Zod import" },
    { import: "useState, useRef, useCallback, FormEvent", description: "React hooks import" },
  ];
  
  for (const { import: importStatement, description } of requiredImports) {
    if (content.includes(importStatement)) {
      results.push({ passed: true, message: `✅ ${description} found` });
    } else {
      results.push({ passed: false, message: `❌ ${description} missing`, details: importStatement });
    }
  }
  
  // Check that old imports are removed
  const deprecatedImports = [
    { import: "useAuth", description: "useAuth (should be removed)" },
    { import: "DoctorRegistrationSchema", description: "DoctorRegistrationSchema (should use local schema)" },
  ];
  
  for (const { import: importStatement, description } of deprecatedImports) {
    if (!content.includes(importStatement)) {
      results.push({ passed: true, message: `✅ ${description} properly removed` });
    } else {
      results.push({ passed: false, message: `❌ ${description} still present`, details: "Should be removed" });
    }
  }
  
  return results;
}

function validateSchema(content: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check for local DoctorRegisterSchema definition
  if (content.includes('const DoctorRegisterSchema = z.object({')) {
    results.push({ passed: true, message: "✅ Local DoctorRegisterSchema defined" });
    
    // Check for required schema fields
    const requiredFields = [
      'email:', 'password:', 'userType:', 'firstName:', 'lastName:',
      'phone:', 'specialty:', 'licenseNumber:', 'yearsOfExperience:',
      'profilePictureUrl:', 'licenseDocumentUrl:', 'bio:', 'consultationFee:'
    ];
    
    for (const field of requiredFields) {
      if (content.includes(field)) {
        results.push({ passed: true, message: `✅ Schema field ${field.replace(':', '')} defined` });
      } else {
        results.push({ passed: false, message: `❌ Schema field ${field.replace(':', '')} missing` });
      }
    }
    
    // Check for userType literal
    if (content.includes('z.literal(UserType.DOCTOR)')) {
      results.push({ passed: true, message: "✅ UserType literal correctly set to DOCTOR" });
    } else {
      results.push({ passed: false, message: "❌ UserType literal not set to DOCTOR" });
    }
    
  } else {
    results.push({ passed: false, message: "❌ Local DoctorRegisterSchema not defined" });
  }
  
  return results;
}

function validateFileUploadHandler(content: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check for handleFileUpload function
  if (content.includes('const handleFileUpload = useCallback(async (')) {
    results.push({ passed: true, message: "✅ handleFileUpload function defined with useCallback" });
    
    // Check for required file upload logic
    const uploadChecks = [
      { check: 'if (!storage)', description: "Storage availability check" },
      { check: 'ref(storage, path)', description: "Storage reference creation" },
      { check: 'uploadBytesResumable(storageRef, file)', description: "Upload task creation" },
      { check: 'uploadTask.on(', description: "Upload progress listener" },
      { check: 'getDownloadURL(uploadTask.snapshot.ref)', description: "Download URL retrieval" },
      { check: 'trackPerformance(`fileUpload:', description: "Performance tracking for uploads" },
    ];
    
    for (const { check, description } of uploadChecks) {
      if (content.includes(check)) {
        results.push({ passed: true, message: `✅ ${description} implemented` });
      } else {
        results.push({ passed: false, message: `❌ ${description} missing` });
      }
    }
    
  } else {
    results.push({ passed: false, message: "❌ handleFileUpload function not defined" });
  }
  
  return results;
}

function validateFormHandler(content: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check for proper function signature
  if (content.includes('const handleDoctorRegister = useCallback(async (event: FormEvent<HTMLFormElement>) => {')) {
    results.push({ passed: true, message: "✅ Form handler properly defined with useCallback" });
  } else {
    results.push({ passed: false, message: "❌ Form handler not properly defined" });
  }
  
  // Check for performance tracking
  if (content.includes("trackPerformance('handleDoctorRegisterSubmit_Live')")) {
    results.push({ passed: true, message: "✅ Performance tracking configured for Live mode" });
  } else {
    results.push({ passed: false, message: "❌ Performance tracking not configured for Live mode" });
  }
  
  // Check for file upload integration
  if (content.includes('await handleFileUpload(profilePicFile') && content.includes('await handleFileUpload(licenseFile')) {
    results.push({ passed: true, message: "✅ File upload integration in registration handler" });
  } else {
    results.push({ passed: false, message: "❌ File upload integration missing in registration handler" });
  }
  
  // Check for callApi usage
  if (content.includes("await callApi") && content.includes("'registerUser'")) {
    results.push({ passed: true, message: "✅ callApi properly used to call registerUser function" });
  } else {
    results.push({ passed: false, message: "❌ callApi not properly used for registerUser" });
  }
  
  // Check for proper error handling
  if (content.includes('already-exists') && content.includes('invalid-argument')) {
    results.push({ passed: true, message: "✅ Error handling includes backend error codes" });
  } else {
    results.push({ passed: false, message: "❌ Error handling missing backend error codes" });
  }
  
  // Check for redirect to pending verification
  if (content.includes("router.push('/auth/pending-verification')")) {
    results.push({ passed: true, message: "✅ Redirect to pending verification configured" });
  } else {
    results.push({ passed: false, message: "❌ Redirect to pending verification missing" });
  }
  
  return results;
}

function validateFormFields(content: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check for all required form state variables
  const requiredStateVars = [
    'firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword',
    'specialty', 'licenseNumber', 'yearsOfExperience', 'bio', 'consultationFee'
  ];
  
  for (const stateVar of requiredStateVars) {
    if (content.includes(`const [${stateVar}, set${stateVar.charAt(0).toUpperCase() + stateVar.slice(1)}] = useState`)) {
      results.push({ passed: true, message: `✅ State variable ${stateVar} properly defined` });
    } else {
      results.push({ passed: false, message: `❌ State variable ${stateVar} missing or incorrectly defined` });
    }
  }
  
  // Check for file upload state variables
  const fileStateVars = [
    'profilePicFile', 'licenseFile', 'profilePicUploadProgress', 'licenseUploadProgress'
  ];
  
  for (const stateVar of fileStateVars) {
    if (content.includes(`[${stateVar}, set${stateVar.charAt(0).toUpperCase() + stateVar.slice(1)}]`)) {
      results.push({ passed: true, message: `✅ File state variable ${stateVar} properly defined` });
    } else {
      results.push({ passed: false, message: `❌ File state variable ${stateVar} missing` });
    }
  }
  
  // Check for file input refs
  if (content.includes('profilePicInputRef') && content.includes('licenseInputRef')) {
    results.push({ passed: true, message: "✅ File input refs properly defined" });
  } else {
    results.push({ passed: false, message: "❌ File input refs missing" });
  }
  
  return results;
}

function validateFileUploadUI(content: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check for file upload UI components
  const uiChecks = [
    { check: 'Profile Picture (optional)', description: "Profile picture upload section" },
    { check: 'Medical License Document (optional)', description: "License document upload section" },
    { check: 'Choose File', description: "File selection buttons" },
    { check: 'profilePicUploadProgress', description: "Profile picture upload progress" },
    { check: 'licenseUploadProgress', description: "License upload progress" },
    { check: 'accept="image/*"', description: "Profile picture file type restriction" },
    { check: 'accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"', description: "License document file type restriction" },
    { check: 'removeProfilePic', description: "Profile picture removal function" },
    { check: 'removeLicense', description: "License document removal function" },
  ];
  
  for (const { check, description } of uiChecks) {
    if (content.includes(check)) {
      results.push({ passed: true, message: `✅ ${description} implemented` });
    } else {
      results.push({ passed: false, message: `❌ ${description} missing` });
    }
  }
  
  return results;
}

function validateUIComponents(content: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check for required UI components
  const requiredComponents = [
    'Button', 'Input', 'Select', 'Card', 'Alert', 'Spinner'
  ];
  
  for (const component of requiredComponents) {
    if (content.includes(`<${component}`)) {
      results.push({ passed: true, message: `✅ ${component} component used` });
    } else {
      results.push({ passed: false, message: `❌ ${component} component missing` });
    }
  }
  
  // Check for loading state
  if (content.includes('disabled={isLoading}') && content.includes('{isLoading ? (')) {
    results.push({ passed: true, message: "✅ Loading state properly implemented" });
  } else {
    results.push({ passed: false, message: "❌ Loading state not properly implemented" });
  }
  
  // Check for upload progress display
  if (content.includes('Uploading files...') && content.includes('Creating account...')) {
    results.push({ passed: true, message: "✅ Upload progress display implemented" });
  } else {
    results.push({ passed: false, message: "❌ Upload progress display missing" });
  }
  
  return results;
}

async function runValidation() {
  console.log('🔍 Validating Frontend Doctor Registration Configuration with File Upload');
  console.log('File: src/app/auth/register/doctor/page.tsx');
  console.log('Target: Live registerUser Cloud Function connection with Firebase Storage\n');
  
  const filePath = join(process.cwd(), 'src/app/auth/register/doctor/page.tsx');
  
  // Check if file exists
  const fileCheck = validateFile(filePath, 'Doctor registration page');
  console.log(fileCheck.message);
  
  if (!fileCheck.passed) {
    console.log('❌ Cannot proceed with validation - file not found');
    return;
  }
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Run all validations
  const validationSections = [
    { name: 'Imports', validator: () => validateImports(content) },
    { name: 'Schema Definition', validator: () => validateSchema(content) },
    { name: 'File Upload Handler', validator: () => validateFileUploadHandler(content) },
    { name: 'Form Handler', validator: () => validateFormHandler(content) },
    { name: 'Form Fields', validator: () => validateFormFields(content) },
    { name: 'File Upload UI', validator: () => validateFileUploadUI(content) },
    { name: 'UI Components', validator: () => validateUIComponents(content) },
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const { name, validator } of validationSections) {
    console.log(`\n=== ${name} Validation ===`);
    const results = validator();
    
    for (const result of results) {
      console.log(result.message);
      if (result.details) {
        console.log(`    ${result.details}`);
      }
      totalTests++;
      if (result.passed) passedTests++;
    }
  }
  
  // Summary
  console.log('\n=== Validation Summary ===');
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All validations passed! Frontend is properly configured.');
    console.log('\n📋 Ready for testing:');
    console.log('1. Navigate to http://localhost:3000/auth/register/doctor');
    console.log('2. Fill out the registration form');
    console.log('3. Upload profile picture and license document');
    console.log('4. Submit and verify file uploads to Firebase Storage');
    console.log('5. Check for proper error handling and validation');
    console.log('6. Verify connection to live registerUser function');
  } else {
    console.log('\n⚠️  Some validations failed. Please review and fix the issues above.');
  }
}

// Run the validation
runValidation(); 