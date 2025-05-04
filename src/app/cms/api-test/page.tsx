'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { logInfo, logError } from '@/lib/logger';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { ArrowLeft, Play, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { localApi } from '@/lib/localApiFunctions';
import { UserType, AppointmentStatus, AppointmentType } from '@/types/enums';

// Define test types
type TestResult = {
  name: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
};

type ApiTest = {
  name: string;
  description: string;
  run: () => Promise<TestResult>;
};

// API Test page
export default function ApiTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  // Define API tests
  const apiTests: ApiTest[] = [
    {
      name: 'Login',
      description: 'Test login functionality with test credentials',
      run: async () => {
        try {
          const result = await localApi.login({
            email: 'user0@demo.health',
            password: 'Password123!'
          });
          
          return {
            name: 'Login',
            success: result.success,
            message: result.success ? 'Successfully logged in' : `Login failed: ${result.error}`,
            data: result.success ? {
              userId: result.user.id,
              userType: result.userProfile.userType
            } : undefined,
            error: result.success ? undefined : result.error
          };
        } catch (error) {
          return {
            name: 'Login',
            success: false,
            message: 'Login test threw an exception',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    },
    {
      name: 'Get User Profile',
      description: 'Test fetching the current user profile',
      run: async () => {
        try {
          const result = await localApi.getMyUserProfile({
            uid: 'u-000',
            role: UserType.DOCTOR
          });
          
          return {
            name: 'Get User Profile',
            success: result.success,
            message: result.success ? 'Successfully retrieved user profile' : `Failed to get profile: ${result.error}`,
            data: result.success ? {
              firstName: result.userProfile.firstName,
              lastName: result.userProfile.lastName,
              userType: result.userProfile.userType
            } : undefined,
            error: result.success ? undefined : result.error
          };
        } catch (error) {
          return {
            name: 'Get User Profile',
            success: false,
            message: 'Get profile test threw an exception',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    },
    {
      name: 'Find Doctors',
      description: 'Test doctor search functionality',
      run: async () => {
        try {
          const result = await localApi.findDoctors({
            uid: 'u-007',
            role: UserType.PATIENT
          }, {
            specialty: 'Cardiology'
          });
          
          return {
            name: 'Find Doctors',
            success: result.success,
            message: result.success 
              ? `Found ${result.doctors.length} doctors` 
              : `Doctor search failed: ${result.error}`,
            data: result.success ? {
              count: result.doctors.length,
              doctors: result.doctors.map(d => ({
                id: d.id,
                name: `${d.firstName} ${d.lastName}`,
                specialty: d.specialty
              }))
            } : undefined,
            error: result.success ? undefined : result.error
          };
        } catch (error) {
          return {
            name: 'Find Doctors',
            success: false,
            message: 'Find doctors test threw an exception',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    },
    {
      name: 'Get Appointments',
      description: 'Test fetching user appointments',
      run: async () => {
        try {
          const result = await localApi.getMyAppointments({
            uid: 'u-000',
            role: UserType.DOCTOR
          });
          
          return {
            name: 'Get Appointments',
            success: result.success,
            message: result.success 
              ? `Retrieved ${result.appointments.length} appointments` 
              : `Failed to get appointments: ${result.error}`,
            data: result.success ? {
              count: result.appointments.length,
              appointments: result.appointments.map(a => ({
                id: a.id,
                status: a.status,
                date: a.appointmentDate,
                patientName: a.patientName
              }))
            } : undefined,
            error: result.success ? undefined : result.error
          };
        } catch (error) {
          return {
            name: 'Get Appointments',
            success: false,
            message: 'Get appointments test threw an exception',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    },
    {
      name: 'Book Appointment',
      description: 'Test appointment booking functionality',
      run: async () => {
        try {
          const now = new Date();
          const futureDate = new Date(now.setDate(now.getDate() + 7)).toISOString().split('T')[0];
          
          const result = await localApi.bookAppointment({
            uid: 'u-007',
            role: UserType.PATIENT
          }, {
            doctorId: 'u-000',
            appointmentDate: futureDate,
            startTime: '10:00',
            endTime: '10:30',
            reason: 'API Test Appointment',
            appointmentType: AppointmentType.IN_PERSON
          });
          
          return {
            name: 'Book Appointment',
            success: result.success,
            message: result.success 
              ? `Successfully booked appointment with ID: ${result.appointment.id}` 
              : `Failed to book appointment: ${result.error}`,
            data: result.success ? {
              appointmentId: result.appointment.id,
              status: result.appointment.status,
              date: result.appointment.appointmentDate,
            } : undefined,
            error: result.success ? undefined : result.error
          };
        } catch (error) {
          return {
            name: 'Book Appointment',
            success: false,
            message: 'Book appointment test threw an exception',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    }
  ];

  // Run a specific test
  const runTest = async (test: ApiTest) => {
    setRunning(test.name);
    try {
      logInfo(`Running API test: ${test.name}`);
      const result = await test.run();
      logInfo(`API test completed: ${test.name}`, { success: result.success });
      setResults(prev => [...prev, result]);
    } catch (error) {
      logError(`API test failed: ${test.name}`, error);
      setResults(prev => [...prev, {
        name: test.name,
        success: false,
        message: 'Test failed with unhandled exception',
        error: error instanceof Error ? error.message : String(error)
      }]);
    } finally {
      setRunning(null);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setResults([]);
    for (const test of apiTests) {
      await runTest(test);
    }
  };

  // Toggle expanding a result
  const toggleExpand = (name: string) => {
    if (expandedResult === name) {
      setExpandedResult(null);
    } else {
      setExpandedResult(name);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">API Testing Suite</h1>
        <Link href="/cms/validation">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Validation
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Available Tests</h2>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Click on a test to run it individually, or run all tests at once.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={runAllTests} disabled={running !== null}>
              <Play className="w-4 h-4 mr-2" />
              Run All Tests
            </Button>
          </div>
          
          <div className="grid gap-4 mt-6">
            {apiTests.map((test) => (
              <Card key={test.name} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{test.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{test.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runTest(test)}
                    disabled={running !== null}
                  >
                    {running === test.name ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                        Running...
                      </div>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Test
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>

      {results.length > 0 && (
        <Card className="p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="grid gap-4">
            {results.map((result, index) => (
              <div 
                key={`${result.name}-${index}`} 
                className={`border-b border-gray-200 py-3 ${expandedResult === result.name ? 'bg-gray-50' : ''}`}
              >
                <button
                  className="flex justify-between items-center w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => toggleExpand(`${result.name}-${index}`)}
                  aria-expanded={expandedResult === `${result.name}-${index}`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="text-green-500 h-5 w-5" />
                    ) : (
                      <XCircle className="text-red-500 h-5 w-5" />
                    )}
                    <span className="font-medium">{result.name}</span>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                </button>
                
                {expandedResult === `${result.name}-${index}` && (
                  <div className="px-4 py-3 text-sm">
                    <p className="mb-2">{result.message}</p>
                    
                    {result.data && (
                      <div className="mb-2">
                        <h4 className="font-semibold mb-1">Data:</h4>
                        <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {result.error && (
                      <div className="text-red-600">
                        <h4 className="font-semibold mb-1">Error:</h4>
                        <p>{result.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
} 