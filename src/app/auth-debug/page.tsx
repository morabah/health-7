'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import { logValidation } from '@/lib/logger';

/**
 * Simple page for debugging authentication
 * Shows current auth state and provides buttons to login/logout
 */
export default function AuthDebugPage() {
  const { user, profile, loading } = useAuth();
  const [authMessage, setAuthMessage] = useState('');

  // Log auth state changes
  useEffect(() => {
    console.log('Auth state in debug page:', { loading, user, profile });
  }, [loading, user, profile]);

  // Handle mock login
  const handleMockLogin = (role: string | null) => {
    if (typeof window !== 'undefined' && window.__mockLogin) {
      window.__mockLogin(role);
      setAuthMessage(`Logged in as ${role || 'none'}`);
      logValidation(
        '4.3',
        'success',
        `Navbar connected to local AuthContext with role ${role || 'none'}`
      );
    } else {
      setAuthMessage('mockLogin not available');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Auth Debug Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Auth Controls */}
        <div className="p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Auth Controls</h2>
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

        {/* Auth State Display */}
        <div className="p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>

          {loading ? (
            <p>Loading authentication state...</p>
          ) : user ? (
            <div>
              <div className="mb-4">
                <h3 className="font-medium">User:</h3>
                <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-medium">Profile:</h3>
                <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(profile, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p>Not logged in</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Debugging Tips</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            When you login/logout, check if the Navbar changes to reflect your authentication state
          </li>
          <li>If the Navbar doesn&apos;t update, check the console logs for any errors</li>
          <li>
            Observe if both this page and the Navbar are receiving the same authentication state
          </li>
        </ul>
      </div>
    </div>
  );
}
