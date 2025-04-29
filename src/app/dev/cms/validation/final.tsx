'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { logInfo, logError, logValidation } from '@/lib/logger';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { callApi } from '@/lib/apiClient';
import { UserType, AppointmentStatus, AppointmentType, VerificationStatus } from '@/types/enums';

type ValidationResult = {
  name: string;
  function: string;
  passed: boolean;
  message?: string;
  duration?: number;
};

export default function FinalValidationPage() {
  const { user, profile } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [allPassed, setAllPassed] = useState<boolean | null>(null);
  const [currentTest, setCurrentTest] = useState<string>('');

  // Test accounts
  const TEST_PATIENT_ID = 'test-patient-001';
  const TEST_DOCTOR_ID = 'test-doctor-verified-003';
  const TEST_ADMIN_ID = 'test-admin-001';

  // Add a test result
  const addResult = (result: ValidationResult) => {
    setResults(prev => [...prev, result]);
    return result.passed;
  };

  // Run a validation test and handle errors
  const runTest = async (
    name: string, 
    functionName: string, 
    testFunction: () => Promise<any>
  ): Promise<boolean> => {
    setCurrentTest(name);
    const startTime = performance.now();
    
    try {
      await testFunction();
      const duration = Math.round(performance.now() - startTime);
      return addResult({
        name,
        function: functionName,
        passed: true,
        message: `Success (${duration}ms)`,
        duration
      });
    } catch (error: any) {
      const duration = Math.round(performance.now() - startTime);
      logError(`Validation test failed: ${name}`, error);
      return addResult({
        name,
        function: functionName,
        passed: false,
        message: `Error: ${error?.message || 'Unknown error'} (${duration}ms)`,
        duration
      });
    }
  };

  // Run all validation tests
  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    setAllPassed(null);
    let allTestsPassed = true;

    // Test user profile
    allTestsPassed = await runTest(
      'Get User Profile', 
      'getMyUserProfile',
      async () => {
        const result = await callApi('getMyUserProfile', { 
          uid: user?.uid || TEST_DOCTOR_ID, 
          role: profile?.userType || UserType.DOCTOR 
        });
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;

    // Test finding doctors
    allTestsPassed = await runTest(
      'Find Doctors', 
      'findDoctors',
      async () => {
        const result = await callApi('findDoctors', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT 
        });
        if (!result.success) throw new Error(result.error);
        if (!result.doctors || !Array.isArray(result.doctors)) {
          throw new Error('No doctors returned');
        }
        return result;
      }
    ) && allTestsPassed;

    // Test get doctor public profile
    allTestsPassed = await runTest(
      'Get Doctor Profile', 
      'getDoctorPublicProfile',
      async () => {
        const result = await callApi('getDoctorPublicProfile', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT,
          doctorId: TEST_DOCTOR_ID
        });
        if (!result.success) throw new Error(result.error);
        if (!result.doctor) throw new Error('No doctor returned');
        return result;
      }
    ) && allTestsPassed;

    // Test get doctor availability
    allTestsPassed = await runTest(
      'Get Doctor Availability', 
      'getDoctorAvailability',
      async () => {
        const result = await callApi('getDoctorAvailability', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT,
          doctorId: TEST_DOCTOR_ID
        });
        if (!result.success) throw new Error(result.error);
        if (!result.availability) throw new Error('No availability data returned');
        return result;
      }
    ) && allTestsPassed;

    // Test get available slots
    allTestsPassed = await runTest(
      'Get Available Slots', 
      'getAvailableSlots',
      async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const result = await callApi('getAvailableSlots', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT,
          doctorId: TEST_DOCTOR_ID,
          date: tomorrow.toISOString()
        });
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;

    // Test book appointment
    let appointmentId = '';
    allTestsPassed = await runTest(
      'Book Appointment', 
      'bookAppointment',
      async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        const startTime = '10:00';
        const endTime = '10:30';
        
        const result = await callApi('bookAppointment', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT,
          doctorId: TEST_DOCTOR_ID,
          appointmentDate: tomorrow.toISOString(),
          startTime,
          endTime,
          reason: 'Validation Test Appointment',
          appointmentType: AppointmentType.IN_PERSON
        });
        
        if (!result.success) throw new Error(result.error);
        if (!result.appointment || !result.appointment.id) {
          throw new Error('No appointment created');
        }
        
        appointmentId = result.appointment.id;
        return result;
      }
    ) && allTestsPassed;

    // Test get appointment details
    allTestsPassed = await runTest(
      'Get Appointment Details', 
      'getAppointmentDetails',
      async () => {
        if (!appointmentId) {
          throw new Error('No appointment ID from previous test');
        }
        
        const result = await callApi('getAppointmentDetails', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT,
          appointmentId
        });
        
        if (!result.success) throw new Error(result.error);
        if (!result.appointment) throw new Error('No appointment details returned');
        return result;
      }
    ) && allTestsPassed;

    // Test get all appointments
    allTestsPassed = await runTest(
      'Get My Appointments', 
      'getMyAppointments',
      async () => {
        const result = await callApi('getMyAppointments', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT 
        });
        
        if (!result.success) throw new Error(result.error);
        if (!result.appointments || !Array.isArray(result.appointments)) {
          throw new Error('No appointments returned');
        }
        return result;
      }
    ) && allTestsPassed;

    // Test cancel appointment
    if (appointmentId) {
      allTestsPassed = await runTest(
        'Cancel Appointment', 
        'cancelAppointment',
        async () => {
          const result = await callApi('cancelAppointment', { 
            uid: user?.uid || TEST_PATIENT_ID, 
            role: UserType.PATIENT,
            appointmentId,
            reason: 'Validation Test Cancellation'
          });
          
          if (!result.success) throw new Error(result.error);
          if (!result.appointment || result.appointment.status !== AppointmentStatus.CANCELED) {
            throw new Error('Appointment not canceled properly');
          }
          return result;
        }
      ) && allTestsPassed;
    }

    // Test set doctor availability
    allTestsPassed = await runTest(
      'Set Doctor Availability', 
      'setDoctorAvailability',
      async () => {
        const weeklySchedule = {
          monday: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ],
          tuesday: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ],
          wednesday: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ],
          thursday: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ],
          friday: [
            { startTime: '09:00', endTime: '12:00', isAvailable: true },
            { startTime: '13:00', endTime: '17:00', isAvailable: true }
          ],
          saturday: [],
          sunday: []
        };
        
        const result = await callApi('setDoctorAvailability', { 
          uid: user?.uid || TEST_DOCTOR_ID, 
          role: UserType.DOCTOR,
          weeklySchedule
        });
        
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;

    // Test get notifications
    allTestsPassed = await runTest(
      'Get Notifications', 
      'getMyNotifications',
      async () => {
        const result = await callApi('getMyNotifications', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT 
        });
        
        if (!result.success) throw new Error(result.error);
        if (!result.notifications || !Array.isArray(result.notifications)) {
          throw new Error('No notifications returned');
        }
        return result;
      }
    ) && allTestsPassed;

    // Test mark notification as read (if there are any)
    allTestsPassed = await runTest(
      'Mark Notification Read', 
      'markNotificationRead',
      async () => {
        // First get notifications
        const notificationsResult = await callApi('getMyNotifications', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT 
        });
        
        if (!notificationsResult.success) throw new Error(notificationsResult.error);
        if (!notificationsResult.notifications || !notificationsResult.notifications.length) {
          return { success: true, message: 'No notifications to mark as read' };
        }
        
        // Mark the first notification as read
        const notificationId = notificationsResult.notifications[0].id;
        const result = await callApi('markNotificationRead', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT,
          notificationId,
          isRead: true
        });
        
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;

    // Test admin verify doctor
    allTestsPassed = await runTest(
      'Admin Verify Doctor', 
      'adminVerifyDoctor',
      async () => {
        const result = await callApi('adminVerifyDoctor', { 
          uid: user?.uid || TEST_ADMIN_ID, 
          role: UserType.ADMIN,
          doctorId: 'test-doctor-pending-002',
          status: VerificationStatus.VERIFIED,
          notes: 'Verified through validation test'
        });
        
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;

    // Test admin get all users
    allTestsPassed = await runTest(
      'Admin Get All Users', 
      'adminGetAllUsers',
      async () => {
        const result = await callApi('adminGetAllUsers', { 
          uid: user?.uid || TEST_ADMIN_ID, 
          role: UserType.ADMIN 
        });
        
        if (!result.success) throw new Error(result.error);
        if (!result.users || !Array.isArray(result.users)) {
          throw new Error('No users returned');
        }
        return result;
      }
    ) && allTestsPassed;

    // Test admin get all doctors
    allTestsPassed = await runTest(
      'Admin Get All Doctors', 
      'adminGetAllDoctors',
      async () => {
        const result = await callApi('adminGetAllDoctors', { 
          uid: user?.uid || TEST_ADMIN_ID, 
          role: UserType.ADMIN 
        });
        
        if (!result.success) throw new Error(result.error);
        if (!result.doctors || !Array.isArray(result.doctors)) {
          throw new Error('No doctors returned');
        }
        return result;
      }
    ) && allTestsPassed;

    // Test get dashboard stats
    allTestsPassed = await runTest(
      'Get Dashboard Stats', 
      'getMyDashboardStats',
      async () => {
        const result = await callApi('getMyDashboardStats', { 
          uid: user?.uid || TEST_DOCTOR_ID, 
          role: UserType.DOCTOR 
        });
        
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;

    // Test send direct message
    allTestsPassed = await runTest(
      'Send Direct Message', 
      'sendDirectMessage',
      async () => {
        const result = await callApi('sendDirectMessage', { 
          uid: user?.uid || TEST_PATIENT_ID, 
          role: UserType.PATIENT,
          recipientId: TEST_DOCTOR_ID,
          subject: 'Validation Test Message',
          message: 'This is a test message from the validation suite.'
        });
        
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;

    setAllPassed(allTestsPassed);
    setIsRunning(false);
    
    if (allTestsPassed) {
      logValidation('5.0', 'success', 'Local prototype fully functional');
    } else {
      logError('Final validation failed', 'Some tests did not pass');
    }

    return allTestsPassed;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Final Validation Suite</h1>
          <div className="flex gap-2">
            <Link href="/dev/cms/validation">
              <Button variant="secondary">Back</Button>
            </Link>
            <Link href="/cms">
              <Button variant="secondary">CMS Home</Button>
            </Link>
          </div>
        </div>
        <p className="text-gray-600 mt-2">
          This page tests all API functions to ensure the local prototype is fully functional
        </p>
      </header>

      <Card className="mb-6 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Validation Tests</h2>
          <Button 
            variant="primary" 
            onClick={runAllTests} 
            disabled={isRunning}
          >
            {isRunning ? (
              <span className="flex items-center">
                <Spinner className="w-4 h-4 mr-2" /> 
                Running: {currentTest}
              </span>
            ) : 'Run All Tests'}
          </Button>
        </div>

        {allPassed !== null && (
          <div className={`mb-4 p-4 rounded-md ${allPassed ? 'bg-green-100' : 'bg-red-100'} flex items-center`}>
            <span className={`rounded-full h-4 w-4 mr-2 ${allPassed ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">
              {allPassed 
                ? 'All tests passed successfully!' 
                : 'Some tests failed. Check the results below.'}
            </span>
          </div>
        )}

        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API Function
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.length === 0 && !isRunning ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No tests have been run yet. Click "Run All Tests" to begin.
                  </td>
                </tr>
              ) : (
                results.map((result, index) => (
                  <tr key={index} className={result.passed ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {result.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {result.function}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        result.passed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {result.message}
                    </td>
                  </tr>
                ))
              )}
              {isRunning && results.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <Spinner />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {allPassed === true && (
        <div className="mt-6 p-4 border-l-4 border-green-500 bg-green-50 text-green-800">
          <p className="font-medium">Local prototype fully functional!</p>
          <p className="text-sm mt-1">All API functions are working correctly. The application is ready to use.</p>
        </div>
      )}
    </div>
  );
} 