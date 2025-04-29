'use client';

import React, { useState, useEffect } from 'react';
import { callApi } from '@/lib/apiClient';
import { UserType, AppointmentStatus } from '@/types/enums';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { setCurrentAuthCtx, clearCurrentAuthCtx } from '@/lib/apiAuthCtx';
import { logInfo, logError, logValidation } from '@/lib/logger';
import Link from 'next/link';

type TestResult = {
  name: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
};

/**
 * Final Validation Page
 * This page runs a comprehensive test suite to validate critical system functionality:
 * - Authentication & role-based routing
 * - Doctor availability management
 * - Appointment booking flow
 * - API function consistency
 */
export default function FinalValidationPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  
  // Helper to set result for a test
  const setTestResult = (name: string, status: 'success' | 'error' | 'pending', message?: string) => {
    setResults(prev => {
      const index = prev.findIndex(r => r.name === name);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { name, status, message };
        return updated;
      } else {
        return [...prev, { name, status, message }];
      }
    });
  };
  
  // Mock login as a specific user type
  const mockLogin = async (role: UserType) => {
    setCurrentStep(`Logging in as ${role}`);
    const testUsers = {
      [UserType.PATIENT]: 'test-patient-001',
      [UserType.DOCTOR]: 'test-doctor-verified-001',
      [UserType.ADMIN]: 'test-admin-001'
    };
    
    const testUserId = testUsers[role];
    setCurrentAuthCtx({ uid: testUserId, role });
    return testUserId;
  };
  
  // Run the full validation test suite
  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    // Track test data across steps
    let testDoctorId = '';
    let testPatientId = '';
    let testAppointmentId = '';
    
    try {
      // Test 1: Patient authentication
      setTestResult('1. Patient Authentication', 'pending');
      setCurrentStep('Patient Authentication');
      try {
        testPatientId = await mockLogin(UserType.PATIENT);
        const profile = await callApi('getMyUserProfile');
        
        if (!profile.success || !profile.userProfile) {
          throw new Error('Failed to get patient profile');
        }
        
        if (profile.userProfile.userType !== UserType.PATIENT) {
          throw new Error('Wrong user type in profile');
        }
        
        setTestResult('1. Patient Authentication', 'success');
      } catch (error) {
        setTestResult('1. Patient Authentication', 'error', 
          error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
      // Test 2: Find Doctors
      setTestResult('2. Find Doctors', 'pending');
      setCurrentStep('Finding Doctors');
      try {
        const result = await callApi('findDoctors', {});
        
        if (!result.success || !result.doctors || result.doctors.length === 0) {
          throw new Error('No doctors found');
        }
        
        testDoctorId = result.doctors[0].userId;
        setTestResult('2. Find Doctors', 'success', 
          `Found ${result.doctors.length} doctors`);
      } catch (error) {
        setTestResult('2. Find Doctors', 'error',
          error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
      // Test 3: Get Doctor Availability
      setTestResult('3. Doctor Availability', 'pending');
      setCurrentStep('Getting Doctor Availability');
      try {
        const result = await callApi('getDoctorAvailability', { doctorId: testDoctorId });
        
        if (!result.success) {
          throw new Error('Failed to get doctor availability');
        }
        
        setTestResult('3. Doctor Availability', 'success');
      } catch (error) {
        setTestResult('3. Doctor Availability', 'error',
          error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
      // Test 4: Get Available Slots
      setTestResult('4. Available Slots', 'pending');
      setCurrentStep('Getting Available Slots');
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const result = await callApi('getAvailableSlots', { 
          doctorId: testDoctorId,
          date: tomorrow.toISOString()
        });
        
        if (!result.success) {
          throw new Error('Failed to get available slots');
        }
        
        setTestResult('4. Available Slots', 'success', 
          `Found ${result.slots.length} available slots`);
      } catch (error) {
        setTestResult('4. Available Slots', 'error',
          error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
      // Test 5: Book Appointment
      setTestResult('5. Book Appointment', 'pending');
      setCurrentStep('Booking Appointment');
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        const result = await callApi('bookAppointment', {
          doctorId: testDoctorId,
          appointmentDate: tomorrow.toISOString(),
          startTime: '10:00',
          endTime: '10:30',
          reason: 'Final Validation Test',
          appointmentType: 'IN_PERSON'
        });
        
        if (!result.success || !result.appointment) {
          throw new Error('Failed to book appointment');
        }
        
        testAppointmentId = result.appointment.id;
        setTestResult('5. Book Appointment', 'success',
          `Booked appointment ID: ${testAppointmentId}`);
      } catch (error) {
        setTestResult('5. Book Appointment', 'error',
          error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
      // Test 6: Get Appointment Details
      setTestResult('6. Appointment Details', 'pending');
      setCurrentStep('Getting Appointment Details');
      try {
        const result = await callApi('getAppointmentDetails', {
          appointmentId: testAppointmentId
        });
        
        if (!result.success || !result.appointment) {
          throw new Error('Failed to get appointment details');
        }
        
        setTestResult('6. Appointment Details', 'success',
          `Appointment status: ${result.appointment.status}`);
      } catch (error) {
        setTestResult('6. Appointment Details', 'error',
          error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
      // Test 7: Switch to Doctor
      setTestResult('7. Doctor Authentication', 'pending');
      setCurrentStep('Switching to Doctor');
      try {
        await mockLogin(UserType.DOCTOR);
        const profile = await callApi('getMyUserProfile');
        
        if (!profile.success || !profile.userProfile) {
          throw new Error('Failed to get doctor profile');
        }
        
        if (profile.userProfile.userType !== UserType.DOCTOR) {
          throw new Error('Wrong user type in profile');
        }
        
        setTestResult('7. Doctor Authentication', 'success');
      } catch (error) {
        setTestResult('7. Doctor Authentication', 'error',
          error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
      // Test 8: Complete Appointment
      setTestResult('8. Complete Appointment', 'pending');
      setCurrentStep('Completing Appointment');
      try {
        const result = await callApi('completeAppointment', {
          appointmentId: testAppointmentId,
          notes: 'Test appointment completed successfully'
        });
        
        if (!result.success) {
          throw new Error('Failed to complete appointment');
        }
        
        if (result.appointment.status !== AppointmentStatus.COMPLETED) {
          throw new Error(`Unexpected status: ${result.appointment.status}`);
        }
        
        setTestResult('8. Complete Appointment', 'success');
      } catch (error) {
        setTestResult('8. Complete Appointment', 'error',
          error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
      // Final cleanup
      clearCurrentAuthCtx();
      
      // Log validation success
      logValidation('4.11', 'success', 'All validation tests passed successfully');
    } catch (error) {
      logError('Validation tests failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRunning(false);
      setCurrentStep(null);
    }
  };
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">System Validation</h1>
        <Link href="/cms/validation">
          <Button variant="outline" size="sm">
            Back to Validation Tools
          </Button>
        </Link>
      </div>
      
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold mb-4">Smoke Test Suite</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          This test suite validates the core functionality of the system, including authentication,
          doctor availability, appointment booking, and API integration.
        </p>
        
        <Button
          onClick={runTests}
          disabled={isRunning}
          className="mb-4"
        >
          {isRunning ? (
            <span className="flex items-center">
              <Spinner className="w-4 h-4 mr-2" />
              Running: {currentStep}
            </span>
          ) : 'Run All Tests'}
        </Button>
        
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Test Results</h3>
          {results.length === 0 ? (
            <p className="text-gray-500">No tests have been run yet</p>
          ) : (
            <div className="space-y-2">
              {results.map((result) => (
                <div 
                  key={result.name}
                  className={`p-3 rounded border ${
                    result.status === 'success' 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' 
                      : result.status === 'error'
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                        : 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{result.name}</span>
                    <span className={`
                      px-2 py-0.5 text-xs rounded-full ${
                        result.status === 'success' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : result.status === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }
                    `}>
                      {result.status === 'success' ? 'PASS' : result.status === 'error' ? 'FAIL' : 'RUNNING'}
                    </span>
                  </div>
                  {result.message && (
                    <p className="mt-1 text-sm">
                      {result.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      
      <Alert variant="info">
        <p>Testing sequence:</p>
        <ol className="list-decimal pl-6 mt-2">
          <li>Patient authentication</li>
          <li>Find doctors</li>
          <li>Get doctor availability</li>
          <li>Get available slots</li>
          <li>Book appointment</li>
          <li>Get appointment details</li>
          <li>Doctor authentication</li>
          <li>Complete appointment</li>
        </ol>
      </Alert>
    </div>
  );
} 