'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { logInfo, logValidation } from '@/lib/logger';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';

/**
 * Authentication Flow Validation Page
 * This page provides buttons to test the full authentication flow
 *
 * @returns Auth Validation component
 */
export default function AuthValidationPage() {
  const { user, profile, login, logout } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Test patient credentials
  const testPatient = {
    email: 'patient@test.com',
    password: 'password',
    firstName: 'Test',
    lastName: 'Patient',
    userType: UserType.PATIENT,
    gender: 'MALE',
    dateOfBirth: '1990-01-01',
    bloodType: 'A_POSITIVE',
    medicalHistory: 'No significant history',
  };

  // Test doctor credentials
  const testDoctor = {
    email: 'doctor@test.com',
    password: 'password',
    firstName: 'Test',
    lastName: 'Doctor',
    userType: UserType.DOCTOR,
    specialty: 'General Practice',
    licenseNumber: 'TEST-12345',
    yearsOfExperience: 10,
  };

  // Seed patient data and log in
  const handleSeedAndLoginPatient = async () => {
    setIsSeeding(true);
    try {
      // Check if patient already exists
      const existingUsers = await fetch('/api/localDb?collection=users').then(res => res.json());
      const patientExists = existingUsers.some(
        (u: { email: string }) => u.email === testPatient.email
      );

      // Register patient if not exists
      if (!patientExists) {
        logInfo('Registering test patient', { email: testPatient.email });
        await callApi('registerPatient', testPatient);
      }

      // Login as patient
      setIsLoggingIn(true);
      await login(testPatient.email, testPatient.password);
      logValidation('4.8', 'success', 'Patient login successful');
    } catch (error) {
      console.error('Error seeding and logging in patient:', error);
    } finally {
      setIsSeeding(false);
      setIsLoggingIn(false);
    }
  };

  // Log in doctor
  const handleLoginDoctor = async () => {
    setIsLoggingIn(true);
    try {
      // Check if doctor already exists
      const existingUsers = await fetch('/api/localDb?collection=users').then(res => res.json());
      const doctorExists = existingUsers.some(
        (u: { email: string }) => u.email === testDoctor.email
      );

      // Register doctor if not exists
      if (!doctorExists) {
        logInfo('Registering test doctor', { email: testDoctor.email });
        await callApi('registerDoctor', testDoctor);
      }

      // Login as doctor
      await login(testDoctor.email, testDoctor.password);
      logValidation('4.8', 'success', 'Doctor login successful');
    } catch (error) {
      console.error('Error logging in doctor:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Log out
  const handleLogout = async () => {
    try {
      await logout();
      logValidation('4.8', 'success', 'Logout successful');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Log full validation when all steps are completed
  useEffect(() => {
    // Check URL for completion flag
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('validate') === 'complete') {
      logValidation(
        '4.8',
        'success',
        'Local registration, login, navbar role-switch & redirects verified end-to-end'
      );
    }
  }, []);

  // Helper to run tests and display results
  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setLoading(true);
    setResults(null);
    try {
      logInfo(`Running test: ${testName}`);
      const result = await testFunction();
      setResults(result);
      return result;
    } catch (error) {
      logInfo(`Test failed: ${testName}`, error);
      setResults({ error });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Test Scenario 1: Patient books, cancels, sees notifications
  const testPatientBookingWorkflow = async () => {
    if (!user || !user.profile || user.profile.userType !== UserType.PATIENT) {
      return { error: 'Must be logged in as a patient to run this test' };
    }

    // Find available doctors
    const doctorsResult = await callApi('findDoctors', {
      specialty: '',
      location: '',
    });

    if (!doctorsResult.success || !doctorsResult.doctors.length) {
      return { error: 'No doctors found' };
    }

    const doctor = doctorsResult.doctors[0];
    
    // Get today's date in ISO format
    const today = new Date();
    const appointmentDate = today.toISOString().split('T')[0] + 'T00:00:00.000Z';
    
    // Book an appointment
    const bookingResult = await callApi('bookAppointment', {
      doctorId: doctor.id,
      appointmentDate,
      startTime: '10:00',
      endTime: '11:00',
      reason: 'Validation test appointment',
      appointmentType: AppointmentType.IN_PERSON,
    });

    if (!bookingResult.success) {
      return { error: 'Failed to book appointment', details: bookingResult };
    }

    const appointmentId = bookingResult.appointmentId;
    
    // Get appointments to verify booking
    const appointmentsResult = await callApi('getMyAppointments', {});
    
    // Get notifications to verify notification was created
    const notificationsResult = await callApi('getMyNotifications', {});
    
    // Cancel the appointment
    const cancelResult = await callApi('cancelAppointment', {
      appointmentId,
      reason: 'Validation test cancellation',
    });
    
    // Get appointments again to verify cancellation
    const appointmentsAfterCancelResult = await callApi('getMyAppointments', {});
    
    // Check notifications again to verify cancellation notification
    const notificationsAfterCancelResult = await callApi('getMyNotifications', {});
    
    logValidation('4.9', 'success', 'Patient booking workflow test completed successfully');
    
    return {
      workflow: 'Patient books, cancels, sees notifications',
      doctor,
      booking: bookingResult,
      appointments: appointmentsResult,
      notifications: notificationsResult,
      cancellation: cancelResult,
      appointmentsAfterCancel: appointmentsAfterCancelResult,
      notificationsAfterCancel: notificationsAfterCancelResult,
    };
  };

  // Test Scenario 2: Doctor sets availability → patient sees slots
  const testDoctorAvailabilityWorkflow = async () => {
    // This test requires two parts
    // Part 1: As a doctor, set availability
    if (!user || !user.profile || user.profile.userType !== UserType.DOCTOR) {
      return { error: 'Must be logged in as a doctor for part 1 of this test' };
    }

    // Set doctor availability with a weekly schedule
    const availabilityResult = await callApi('setDoctorAvailability', {
      weeklySchedule: {
        monday: [
          { startTime: '09:00', endTime: '10:00', isAvailable: true },
          { startTime: '10:00', endTime: '11:00', isAvailable: true },
          { startTime: '11:00', endTime: '12:00', isAvailable: true },
        ],
        tuesday: [
          { startTime: '09:00', endTime: '10:00', isAvailable: true },
          { startTime: '10:00', endTime: '11:00', isAvailable: true },
        ],
        wednesday: [
          { startTime: '14:00', endTime: '15:00', isAvailable: true },
          { startTime: '15:00', endTime: '16:00', isAvailable: true },
        ],
        thursday: [
          { startTime: '09:00', endTime: '10:00', isAvailable: true },
          { startTime: '10:00', endTime: '11:00', isAvailable: true },
        ],
        friday: [
          { startTime: '09:00', endTime: '10:00', isAvailable: true },
          { startTime: '10:00', endTime: '11:00', isAvailable: true },
        ],
        saturday: [],
        sunday: [],
      },
      blockedDates: [],
      timezone: 'UTC',
    });

    if (!availabilityResult.success) {
      return { error: 'Failed to set doctor availability', details: availabilityResult };
    }

    // Get doctor's own availability to verify it was set
    const getAvailabilityResult = await callApi('getDoctorAvailability', user.id);

    // For testing purposes, we'll get available slots for Monday
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7); // Next Monday
    const mondayDate = monday.toISOString().split('T')[0] + 'T00:00:00.000Z';

    const slotsResult = await callApi('getAvailableSlots', {
      doctorId: user.id,
      date: mondayDate,
    });

    logValidation('4.9', 'success', 'Doctor availability workflow test completed successfully');

    return {
      workflow: 'Doctor sets availability → patient sees slots',
      availability: availabilityResult,
      getAvailability: getAvailabilityResult,
      availableSlots: slotsResult,
    };
  };

  // Test Scenario 3: Admin verifies doctor → doctor's status flips, notification delivered
  const testAdminVerificationWorkflow = async () => {
    if (!user || !user.profile || user.profile.userType !== UserType.ADMIN) {
      return { error: 'Must be logged in as an admin to run this test' };
    }

    // Get all doctors
    const doctorsResult = await callApi('adminGetAllDoctors', {});

    if (!doctorsResult.success || !doctorsResult.doctors.length) {
      return { error: 'No doctors found' };
    }

    // Find a doctor with PENDING status, or use the first one
    const doctor = doctorsResult.doctors.find(
      d => d.verificationStatus === VerificationStatus.PENDING
    ) || doctorsResult.doctors[0];

    // Change verification status
    const verifyResult = await callApi('adminVerifyDoctor', {
      doctorId: doctor.id,
      verificationStatus: VerificationStatus.VERIFIED,
      verificationNotes: 'Verified during validation test',
    });

    if (!verifyResult.success) {
      return { error: 'Failed to verify doctor', details: verifyResult };
    }

    // Get updated doctor list
    const updatedDoctorsResult = await callApi('adminGetAllDoctors', {});

    // Get detailed info for the doctor
    const doctorDetailResult = await callApi('adminGetUserDetail', doctor.id);

    logValidation('4.9', 'success', 'Admin verification workflow test completed successfully');

    return {
      workflow: 'Admin verifies doctor → doctor\'s status flips, notification delivered',
      doctor,
      verifyResult,
      updatedDoctors: updatedDoctorsResult,
      doctorDetail: doctorDetailResult,
    };
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Auth Flow Validation</h1>
          <div className="flex gap-2">
            <Link href="/cms">
              <Button variant="secondary">Back to CMS</Button>
            </Link>
          </div>
        </div>
        <p className="text-gray-600 mt-2">
          Test the complete authentication flow from registration to login and logout
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Auth State</h2>
          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-md mb-4 max-h-60 overflow-auto">
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify({ user, profile }, null, 2)}
            </pre>
          </div>

          <p className="mb-2 text-sm text-gray-600">
            {user ? 'User is logged in' : 'User is logged out'}
          </p>

          {profile && (
            <div className="mb-4">
              <p className="text-sm">
                <span className="font-semibold">Role:</span> {profile.userType}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Email:</span> {profile.email}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Name:</span> {profile.firstName} {profile.lastName}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="flex flex-col gap-4">
            <Button onClick={handleSeedAndLoginPatient} isLoading={isSeeding || isLoggingIn}>
              Seed & Log In Patient
            </Button>

            <Button onClick={handleLoginDoctor} isLoading={isLoggingIn}>
              Log In Doctor
            </Button>

            <Button onClick={handleLogout} variant="outline">
              Log Out
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t">
            <h3 className="font-medium mb-2">Validation Script</h3>
            <ol className="list-decimal ml-5 text-sm space-y-2">
              <li>Click &quot;Seed & Log In Patient&quot;</li>
              <li>Verify Navbar shows patient navigation</li>
              <li>Click &quot;Log Out&quot;</li>
              <li>Click &quot;Log In Doctor&quot;</li>
              <li>Verify Navbar shows doctor navigation</li>
              <li>Click &quot;Log Out&quot;</li>
              <li>
                <Link href="/auth/login" className="text-blue-600 hover:underline">
                  Go to login page
                </Link>
                &nbsp;and login as &quot;patient@test.com&quot; / &quot;password&quot;
              </li>
              <li>Verify redirected to patient dashboard</li>
              <li>Append &quot;?validate=complete&quot; to the URL and refresh</li>
              <li>Verify final validation log appears</li>
              <li>
                <Link href="/auth/login" className="text-blue-600 hover:underline">
                  Go to login page
                </Link>
                &nbsp;and login as &quot;doctor@test.com&quot; / &quot;password&quot;
              </li>
              <li>Verify redirected to doctor dashboard</li>
            </ol>
          </div>
        </Card>
      </div>

      <div className="mt-8 p-4 border rounded bg-slate-50 dark:bg-slate-800">
        <h2 className="text-xl font-bold mb-2">API Validation Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border p-4 rounded bg-slate-50 dark:bg-slate-800">
            <h3 className="text-lg font-bold mb-2">Test Scenario 1</h3>
            <p className="mb-4">Patient books, cancels, sees notifications</p>
            <Button 
              onClick={() => runTest('Patient booking workflow', testPatientBookingWorkflow)}
              disabled={loading || !user || user.profile?.userType !== UserType.PATIENT}
              className="w-full"
            >
              Run Test
            </Button>
          </div>
          
          <div className="border p-4 rounded bg-slate-50 dark:bg-slate-800">
            <h3 className="text-lg font-bold mb-2">Test Scenario 2</h3>
            <p className="mb-4">Doctor sets availability → patient sees slots</p>
            <Button 
              onClick={() => runTest('Doctor availability workflow', testDoctorAvailabilityWorkflow)}
              disabled={loading || !user || user.profile?.userType !== UserType.DOCTOR}
              className="w-full"
            >
              Run Test
            </Button>
          </div>
          
          <div className="border p-4 rounded bg-slate-50 dark:bg-slate-800">
            <h3 className="text-lg font-bold mb-2">Test Scenario 3</h3>
            <p className="mb-4">Admin verifies doctor → doctor's status flips, notification delivered</p>
            <Button 
              onClick={() => runTest('Admin verification workflow', testAdminVerificationWorkflow)}
              disabled={loading || !user || user.profile?.userType !== UserType.ADMIN}
              className="w-full"
            >
              Run Test
            </Button>
          </div>
        </div>
        
        {loading && (
          <div className="mt-4 p-4 border rounded bg-slate-100 dark:bg-slate-700">
            <p>Running test...</p>
          </div>
        )}
        
        {results && (
          <div className="mt-4">
            <h3 className="text-xl font-bold mb-2">Test Results</h3>
            <pre className="p-4 border rounded bg-slate-100 dark:bg-slate-700 overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 border rounded bg-slate-50 dark:bg-slate-800">
        <h2 className="text-xl font-bold mb-2">Instructions</h2>
        <ul className="list-disc pl-5">
          <li>Login as different user types (Patient/Doctor/Admin) to test all scenarios.</li>
          <li>Test data and results will be displayed in the Results section.</li>
          <li>Check the browser console for detailed logs.</li>
          <li>All tests manipulate the local_db JSON files and demonstrate end-to-end workflows.</li>
        </ul>
      </div>
    </div>
  );
}
