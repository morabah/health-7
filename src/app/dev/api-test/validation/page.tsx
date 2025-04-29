'use client';

import React, { useState, useEffect } from 'react';
import { callApi } from '@/lib/apiClient';
import { UserType } from '@/types/enums';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { setCurrentAuthCtx, clearCurrentAuthCtx } from '@/lib/apiAuthCtx';
import { logInfo, logError, logValidation } from '@/lib/logger';
import Link from 'next/link';

type TestResult = {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
};

export default function ApiValidationPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [allPassed, setAllPassed] = useState<boolean | null>(null);
  
  // Helper to mock-login and set auth context
  const mockLogin = async (role: UserType) => {
    let testUserId = '';
    
    switch (role) {
      case UserType.PATIENT:
        testUserId = 'test-patient-001';
        break;
      case UserType.DOCTOR:
        testUserId = 'test-doctor-verified-003';
        break;
      case UserType.ADMIN:
        testUserId = 'test-admin-001';
        break;
    }
    
    setCurrentAuthCtx({
      uid: testUserId,
      role
    });
    
    return testUserId;
  };
  
  // Add a test result
  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
    return result.success;
  };
  
  // Run a test and handle errors
  const runTest = async (
    name: string,
    testFunction: () => Promise<any>
  ): Promise<boolean> => {
    setCurrentTest(name);
    const startTime = performance.now();
    
    try {
      const result = await testFunction();
      const duration = Math.round(performance.now() - startTime);
      return addResult({
        name,
        success: true,
        data: result,
        duration
      });
    } catch (error: any) {
      const duration = Math.round(performance.now() - startTime);
      logError(`Test failed: ${name}`, error);
      return addResult({
        name,
        success: false,
        error: error?.message || 'Unknown error',
        duration
      });
    }
  };
  
  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    setAllPassed(null);
    
    let allTestsPassed = true;
    let testDoctorId = '';
    let testPatientId = '';
    let testAppointmentId = '';
    
    // Test 1: Login as patient
    allTestsPassed = await runTest(
      'Login as Patient',
      async () => {
        testPatientId = await mockLogin(UserType.PATIENT);
        return { success: true, userId: testPatientId };
      }
    ) && allTestsPassed;
    
    // Test 2: Get user profile
    allTestsPassed = await runTest(
      'Get User Profile',
      async () => {
        const result = await callApi('getMyUserProfile');
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;
    
    // Test 3: Find Doctors
    allTestsPassed = await runTest(
      'Find Doctors',
      async () => {
        const result = await callApi('findDoctors', {});
        if (!result.success) throw new Error(result.error);
        if (result.doctors && result.doctors.length > 0) {
          testDoctorId = result.doctors[0].userId;
        }
        return result;
      }
    ) && allTestsPassed;
    
    // Test 4: Get Doctor Availability
    allTestsPassed = await runTest(
      'Get Doctor Availability',
      async () => {
        const result = await callApi('getDoctorAvailability', { doctorId: testDoctorId });
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;
    
    // Test 5: Get Available Slots
    allTestsPassed = await runTest(
      'Get Available Slots',
      async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const result = await callApi('getAvailableSlots', { 
          doctorId: testDoctorId,
          date: tomorrow.toISOString()
        });
        
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;
    
    // Test 6: Book Appointment
    allTestsPassed = await runTest(
      'Book Appointment',
      async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        const result = await callApi('bookAppointment', {
          doctorId: testDoctorId,
          appointmentDate: tomorrow.toISOString(),
          startTime: '10:00',
          endTime: '10:30',
          reason: 'API Validation Test',
          appointmentType: 'IN_PERSON'
        });
        
        if (!result.success) throw new Error(result.error);
        testAppointmentId = result.appointment.id;
        return result;
      }
    ) && allTestsPassed;
    
    // Test 7: Switch to Doctor Role
    allTestsPassed = await runTest(
      'Switch to Doctor Role',
      async () => {
        const doctorId = await mockLogin(UserType.DOCTOR);
        return { success: true, userId: doctorId };
      }
    ) && allTestsPassed;
    
    // Test 8: Get Doctor Profile
    allTestsPassed = await runTest(
      'Get Doctor Profile',
      async () => {
        const result = await callApi('getMyUserProfile');
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;
    
    // Test 9: Set Doctor Availability
    allTestsPassed = await runTest(
      'Set Doctor Availability',
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
        
        const result = await callApi('setDoctorAvailability', { weeklySchedule });
        if (!result.success) throw new Error(result.error);
        return result;
      }
    ) && allTestsPassed;
    
    // Test 10: Logout
    clearCurrentAuthCtx();
    
    setAllPassed(allTestsPassed);
    setIsRunning(false);
    
    if (allTestsPassed) {
      logValidation('4.11', 'success', 'All API validation tests passed');
    } else {
      logError('API validation failed', 'Some tests did not pass, see results above');
    }
    
    return allTestsPassed;
  };
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Validation Tests</h1>
      <p className="mb-6 text-gray-700 dark:text-gray-300">
        This page runs a series of tests to validate that the core API functions work correctly,
        especially the getAvailableSlots function and authentication flows.
      </p>
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Button
            variant="primary"
            onClick={runAllTests}
            disabled={isRunning}
            className="mr-4"
          >
            {isRunning ? (
              <span className="flex items-center">
                <Spinner className="w-4 h-4 mr-2" />
                Running: {currentTest}
              </span>
            ) : 'Run All Tests'}
          </Button>
          
          <Link href="/cms">
            <Button variant="outline">Back to CMS</Button>
          </Link>
        </div>
        
        {allPassed !== null && (
          <div className={`p-3 rounded-md ${allPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {allPassed ? 'All tests passed!' : 'Some tests failed'}
          </div>
        )}
      </div>
      
      <Card className="mb-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Test
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No tests have been run yet
                  </td>
                </tr>
              ) : (
                results.map((result, index) => (
                  <tr key={index} className={result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {result.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        result.success 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {result.success ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {result.duration}ms
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {result.error || (result.success ? 'Success' : 'Failed')}
                    </td>
                  </tr>
                ))
              )}
              {isRunning && results.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <Spinner />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Testing Sequence</h2>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Login as patient</li>
          <li>Get user profile</li>
          <li>Find doctors</li>
          <li>Get doctor availability</li>
          <li>Get available slots</li>
          <li>Book appointment</li>
          <li>Switch to doctor role</li>
          <li>Get doctor profile</li>
          <li>Set doctor availability</li>
          <li>Logout</li>
        </ol>
      </div>
      
      <Alert variant="info">
        This test will create real data in your local database including a test appointment. Make sure to run this only in development.
      </Alert>
    </div>
  );
} 