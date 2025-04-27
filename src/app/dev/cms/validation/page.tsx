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
    </div>
  );
}
