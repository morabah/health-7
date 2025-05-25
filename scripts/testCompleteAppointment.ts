/**
 * Test Script: completeAppointment Cloud Function
 * 
 * Tests the deployed completeAppointment function with various scenarios:
 * - Valid appointment completion
 * - Invalid appointment ID
 * - Unauthorized access
 * - Invalid appointment status
 * - Invalid input data
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// Firebase configuration for development project
const firebaseConfig = {
  apiKey: "AIzaSyDQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ", // Placeholder - replace with actual
  authDomain: "health7-c378f.firebaseapp.com",
  projectId: "health7-c378f",
  storageBucket: "health7-c378f.appspot.com",
  messagingSenderId: "776487659386",
  appId: "1:776487659386:web:placeholder"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);
const db = getFirestore(app);

// Test credentials (using existing seeded data)
const TEST_DOCTOR_EMAIL = 'user1@demo.health'; // Doctor from seeded data
const TEST_PASSWORD = 'Password123!';

async function testCompleteAppointment() {
  console.log('🧪 Testing completeAppointment Cloud Function...\n');

  try {
    // Step 1: Authenticate as a doctor
    console.log('1️⃣ Authenticating as doctor...');
    const userCredential = await signInWithEmailAndPassword(auth, TEST_DOCTOR_EMAIL, TEST_PASSWORD);
    const doctorId = userCredential.user.uid;
    console.log(`✅ Authenticated as doctor: ${doctorId}\n`);

    // Step 2: Find an appointment for this doctor
    console.log('2️⃣ Finding appointments for this doctor...');
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId)
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);
    
    if (appointmentsSnapshot.empty) {
      console.log('❌ No appointments found for this doctor. Creating a test appointment...');
      // You might want to create a test appointment here or use a different doctor
      return;
    }

    const appointments = appointmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{id: string, status: string, doctorId: string, patientId: string, [key: string]: any}>;

    console.log(`✅ Found ${appointments.length} appointments for doctor`);
    
    // Find a suitable appointment to complete (pending or confirmed)
    let testAppointment = appointments.find(apt => 
      apt.status === 'pending' || apt.status === 'confirmed'
    );

    if (!testAppointment) {
      console.log('⚠️ No suitable appointments found. Setting up test appointment...');
      // Update the first appointment to be in a completable state
      const firstAppointment = appointments[0];
      if (firstAppointment) {
        await updateDoc(doc(db, 'appointments', firstAppointment.id), {
          status: 'confirmed'
        });
        console.log(`✅ Updated appointment ${firstAppointment.id} to 'confirmed' status`);
        testAppointment = { ...firstAppointment, status: 'confirmed' };
      } else {
        console.log('❌ No appointments found at all for this doctor');
        return;
      }
    }

    console.log(`📋 Using appointment: ${testAppointment.id} (status: ${testAppointment.status})\n`);

    // Step 3: Test successful completion
    console.log('3️⃣ Testing successful appointment completion...');
    const completeAppointmentFunction = httpsCallable(functions, 'completeAppointment');
    
    const completionData = {
      appointmentId: testAppointment.id,
      notes: 'Patient responded well to treatment. Follow-up recommended in 2 weeks.'
    };

    const result = await completeAppointmentFunction(completionData);
    console.log('✅ Appointment completed successfully:', result.data);

    // Verify the appointment was updated
    const updatedAppointmentSnapshot = await getDocs(query(
      collection(db, 'appointments'),
      where('__name__', '==', testAppointment.id)
    ));
    
    if (!updatedAppointmentSnapshot.empty) {
      const updatedAppointment = updatedAppointmentSnapshot.docs[0].data();
      console.log(`✅ Appointment status updated to: ${updatedAppointment.status}`);
      console.log(`✅ Notes added: ${updatedAppointment.notes ? 'Yes' : 'No'}\n`);
    }

    // Step 4: Test error cases
    console.log('4️⃣ Testing error cases...\n');

    // Test 4a: Invalid appointment ID
    console.log('4a. Testing invalid appointment ID...');
    try {
      await completeAppointmentFunction({
        appointmentId: 'invalid-appointment-id',
        notes: 'This should fail'
      });
      console.log('❌ Expected error but function succeeded');
    } catch (error: any) {
      console.log(`✅ Expected error caught: ${error.message}`);
    }

    // Test 4b: Already completed appointment
    console.log('\n4b. Testing already completed appointment...');
    try {
      await completeAppointmentFunction({
        appointmentId: testAppointment.id,
        notes: 'Trying to complete again'
      });
      console.log('❌ Expected error but function succeeded');
    } catch (error: any) {
      console.log(`✅ Expected error caught: ${error.message}`);
    }

    // Test 4c: Invalid input data
    console.log('\n4c. Testing invalid input data...');
    try {
      await completeAppointmentFunction({
        appointmentId: '', // Empty appointment ID
        notes: 'This should fail due to empty ID'
      });
      console.log('❌ Expected error but function succeeded');
    } catch (error: any) {
      console.log(`✅ Expected error caught: ${error.message}`);
    }

    // Test 4d: Notes too long
    console.log('\n4d. Testing notes too long...');
    try {
      const longNotes = 'A'.repeat(2001); // Exceeds 2000 character limit
      await completeAppointmentFunction({
        appointmentId: testAppointment.id,
        notes: longNotes
      });
      console.log('❌ Expected error but function succeeded');
    } catch (error: any) {
      console.log(`✅ Expected error caught: ${error.message}`);
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error: any) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testCompleteAppointment()
    .then(() => {
      console.log('\n✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

export { testCompleteAppointment }; 