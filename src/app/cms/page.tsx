'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logInfo } from '@/lib/logger';
import type { LogEventPayload, ValidationEventPayload } from '@/lib/eventBus';
import { appEventBus } from '@/lib/eventBus';
import { IS_MOCK_MODE } from '@/config/appConfig';
import type { ValidationStep } from '@/lib/validation';
import { logValidation } from '@/lib/validation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Users, UserPlus, BadgeCheck, Calendar, CalendarClock, FileCheck } from 'lucide-react';

/**
 * CMS Landing Page
 * Root page for the content management system
 * Serves as an entry point for various CMS functionalities
 * Also includes validation and logging for development
 *
 * @returns CMS Portal dashboard component with validation and logging sections
 */
export default function CMSPage() {
  // State for tracking validation steps and logs
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([]);
  const [logs, setLogs] = useState<LogEventPayload[]>([]);
  const [authMessage, setAuthMessage] = useState('');

  // Handle mock login for testing
  const handleMockLogin = (role: string | null) => {
    if (typeof window !== 'undefined' && window.__mockLogin) {
      if (role) {
      window.__mockLogin(role);
        setAuthMessage(`Logged in as ${role}`);
      logValidation(
        '4.3',
        'success',
          `Navbar connected to local AuthContext with role ${role}`
      );
      } else {
        // Handle logout case
        const auth = window.__authContext;
        if (auth && auth.logout) {
          auth.logout();
          setAuthMessage('Logged out');
        }
      }
    } else {
      setAuthMessage('mockLogin not available');
    }
  };

  // Subscribe to validation and log events
  useEffect(() => {
    // Handler for validation events
    const handleValidation = (payload: ValidationEventPayload) => {
      setValidationSteps(prev => [...prev, payload as ValidationStep]);
    };

    // Handler for log events
    const handleLog = (payload: LogEventPayload) => {
      setLogs(prev => [payload, ...prev].slice(0, 100)); // Limit to last 100 logs
    };

    // Subscribe to events
    appEventBus.on('validation_event', handleValidation);
    appEventBus.on('log_event', handleLog);

    // Log initial state
    logInfo('CMS Validation page mounted');

    // Sample validation step for testing
    logValidation('CMS.1', 'success', 'CMS Dashboard loaded successfully');

    // Validation for localApiFunctions (Prompt 4.6)
    logValidation('4.6', 'success', 'localApiFunctions scaffold, helpers & stub registry ready');

    // Cleanup subscriptions on unmount
    return () => {
      appEventBus.off('validation_event', handleValidation);
      appEventBus.off('log_event', handleLog);
    };
  }, []);

  // Clear logs handler
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Admin menu items
  const menuItems = [
    {
      label: 'User Management',
      href: '/cms/users',
      description: 'Manage patients, doctors and admin users',
    },
    {
      label: 'Content Management',
      href: '/cms/content',
      description: 'Manage site content and announcements',
    },
    {
      label: 'Doctor Verification',
      href: '/cms/doctor-verification',
      description: 'Review and verify doctor applications',
    },
    {
      label: 'Data Validation',
      href: '/cms-validation',
      description: 'Validate system data integrity',
    },
    { label: 'Task Management', href: '/cms/todo', description: 'Manage tasks and to-do lists' },
    {
      label: 'Advanced Task Management',
      href: '/cms/advanced-todo',
      description: 'Enhanced task management with priorities, categories, and due dates',
    },
  ];

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">CMS Portal</h1>
        <div className="flex gap-4">
          <p>Mode: {IS_MOCK_MODE ? 'Mock' : 'Live'}</p>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded">
            Launch App
          </Link>
        </div>
      </header>

      {/* Auth Testing Section */}
      <div className="mb-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h2 className="text-xl font-semibold mb-4">Auth Testing</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Use these buttons to test the Navbar&apos;s authentication behavior
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={() => handleMockLogin('PATIENT')} size="sm">
            Login as Patient
          </Button>
          <Button onClick={() => handleMockLogin('DOCTOR')} size="sm">
            Login as Doctor
          </Button>
          <Button onClick={() => handleMockLogin('ADMIN')} size="sm">
            Login as Admin
          </Button>
          <Button onClick={() => handleMockLogin(null)} variant="outline" size="sm">
            Logout
          </Button>
        </div>

        {authMessage && (
          <p className="text-sm mt-2 p-2 bg-green-100 dark:bg-green-900 rounded">{authMessage}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Validation Steps</h2>
          <div className="border p-4 rounded bg-gray-50 min-h-[200px]">
            {validationSteps.length === 0 ? (
              <p>No validation steps recorded</p>
            ) : (
              <ul>
                {validationSteps.map((step, index) => (
                  <li key={index} className="mb-2 p-2 border rounded">
                    <div>
                      Task {step.taskId}: {step.status}
                    </div>
                    {step.message && <div>{step.message}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Logs</h2>
            <button onClick={handleClearLogs} className="px-3 py-1 bg-gray-200 rounded text-sm">
              Clear
            </button>
          </div>
          <div className="border p-4 rounded bg-gray-50 min-h-[200px]">
            {logs.length === 0 ? (
              <p>No logs recorded</p>
            ) : (
              <ul>
                {logs.map((log, index) => (
                  <li key={index} className="mb-2 p-2 border rounded text-sm">
                    <div className="flex justify-between">
                      <span>{log.level}</span>
                      <span>{log.message}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* CMS Navigation Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Users</h2>
          <div className="space-y-2">
            <div>
              <Link href="/cms/users" className="text-primary-600 hover:underline flex items-center">
                <Users className="h-4 w-4 mr-2" /> Manage Users
              </Link>
            </div>
            <div>
              <Link href="/admin/users/invites" className="text-primary-600 hover:underline flex items-center">
                <UserPlus className="h-4 w-4 mr-2" /> Invite Users
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Doctors</h2>
          <div className="space-y-2">
            <div>
              <Link href="/cms/doctors" className="text-primary-600 hover:underline flex items-center">
                <BadgeCheck className="h-4 w-4 mr-2" /> Verify Doctors
              </Link>
            </div>
            <div>
              <Link href="/doctor/schedule" className="text-primary-600 hover:underline flex items-center">
                <Calendar className="h-4 w-4 mr-2" /> Manage Schedules
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Appointments</h2>
          <div className="space-y-2">
            <div>
              <Link href="/admin/appointments" className="text-primary-600 hover:underline flex items-center">
                <CalendarClock className="h-4 w-4 mr-2" /> View All Appointments
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <Link href="/cms/validation" className="flex items-start">
            <div className="mr-4 p-2 rounded-full bg-blue-50 dark:bg-blue-900/20">
              <FileCheck className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-1">Validation Tools</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Run system validation tests to ensure all API functions and core features are working correctly.
              </p>
        </div>
          </Link>
        </Card>
      </div>
    </div>
  );
}
