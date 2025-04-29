'use client';

import React, { useState } from 'react';
import { callApi } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { logInfo, logError } from '@/lib/logger';
import { loadSession, saveSession } from '@/lib/localSession';
import { UserType } from '@/types/enums';

// Card component for displaying API test results
const ApiTestCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
    <h2 className="text-xl font-semibold mb-4">{title}</h2>
    {children}
  </div>
);

// Button component for API test actions
const ApiTestButton = ({ 
  onClick, 
  children, 
  isLoading = false,
  disabled = false 
}: { 
  onClick: () => void; 
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={isLoading || disabled}
    className={`px-4 py-2 rounded ${
      isLoading || disabled 
        ? 'bg-gray-300 cursor-not-allowed' 
        : 'bg-blue-500 hover:bg-blue-600 text-white'
    }`}
  >
    {isLoading ? 'Loading...' : children}
  </button>
);

// Format JSON for display
const formatJson = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

// Main component
export default function ApiTestPage() {
  const { user, profile, login, logout, loading } = useAuth();
  const isAuthenticated = !!user;
  
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [error, setError] = useState<Record<string, string>>({});
  
  // Session tests
  const testSaveSession = () => {
    const testData = { userId: '123', userData: { name: 'Test User', roles: ['user'] } };
    const success = saveSession(testData, 'test_session');
    if (success) {
      setResults({...results, session: { saved: true, data: testData }});
    } else {
      setError({...error, session: 'Failed to save session'});
    }
  };
  
  const testLoadSession = () => {
    const sessionData = loadSession('test_session');
    setResults({...results, loadSession: sessionData || { error: 'No session found' }});
  };
  
  // API Test Functions
  const testLogin = async () => {
    const testId = 'login';
    try {
      setIsLoading({...isLoading, [testId]: true});
      setError({...error, [testId]: ''});
      
      // Test login with test user - use direct API call instead of auth login
      const result = await callApi('signIn', 'patient@example.com', 'password123');
      
      setResults({...results, [testId]: result});
      logInfo('Login test result', result);
      
      // If login is successful, update the UI to show the result
      if (result.success && result.user) {
        // Instead of refreshing profile, just log success
        logInfo('Login successful, user:', result.user);
      }
    } catch (err) {
      logError('Login test error', err);
      setError({...error, [testId]: err instanceof Error ? err.message : String(err)});
    } finally {
      setIsLoading({...isLoading, [testId]: false});
    }
  };
  
  const testGetProfile = async () => {
    const testId = 'profile';
    try {
      setIsLoading({...isLoading, [testId]: true});
      setError({...error, [testId]: ''});
      
      if (!user) {
        setError({...error, [testId]: 'Not authenticated. Please login first.'});
        return;
      }
      
      // Get user profile using the current user ID
      const result = await callApi('getMyUserProfile', user.uid);
      setResults({...results, [testId]: result});
    } catch (err) {
      setError({...error, [testId]: err instanceof Error ? err.message : String(err)});
    } finally {
      setIsLoading({...isLoading, [testId]: false});
    }
  };
  
  const testFindDoctors = async () => {
    const testId = 'findDoctors';
    try {
      setIsLoading({...isLoading, [testId]: true});
      setError({...error, [testId]: ''});
      
      if (!user) {
        setError({...error, [testId]: 'Not authenticated. Please login first.'});
        return;
      }
      
      // Find doctors with the current user context and empty search criteria
      const result = await callApi('findDoctors', 
        { uid: user.uid, role: user.role },
        { specialty: '', location: '', name: '' }
      );
      
      setResults({...results, [testId]: result});
    } catch (err) {
      setError({...error, [testId]: err instanceof Error ? err.message : String(err)});
    } finally {
      setIsLoading({...isLoading, [testId]: false});
    }
  };
  
  const testGetNotifications = async () => {
    const testId = 'notifications';
    try {
      setIsLoading({...isLoading, [testId]: true});
      setError({...error, [testId]: ''});
      
      if (!user) {
        setError({...error, [testId]: 'Not authenticated. Please login first.'});
        return;
      }
      
      // Get notifications with the current user context
      const result = await callApi('getMyNotifications', { uid: user.uid, role: user.role });
      setResults({...results, [testId]: result});
    } catch (err) {
      setError({...error, [testId]: err instanceof Error ? err.message : String(err)});
    } finally {
      setIsLoading({...isLoading, [testId]: false});
    }
  };

  const testGetDashboardStats = async () => {
    const testId = 'dashboardStats';
    try {
      setIsLoading({...isLoading, [testId]: true});
      setError({...error, [testId]: ''});
      
      if (!user) {
        setError({...error, [testId]: 'Not authenticated. Please login first.'});
        return;
      }
      
      // Get dashboard stats with the current user context
      const result = await callApi('getMyDashboardStats', { uid: user.uid, role: user.role });
      setResults({...results, [testId]: result});
    } catch (err) {
      setError({...error, [testId]: err instanceof Error ? err.message : String(err)});
    } finally {
      setIsLoading({...isLoading, [testId]: false});
    }
  };
  
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">API Test Page</h1>
          <div className="flex space-x-2">
            <a href="/dev" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Dev Home
            </a>
            <a href="/" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Main App
            </a>
          </div>
        </div>
        <p className="text-gray-600 mt-2">
          Use this page to test API calls and verify they work correctly.
        </p>
      </header>
      
      {/* Auth Status */}
      <ApiTestCard title="Authentication Status">
        <div className="mb-4">
          <p>
            <strong>Status:</strong>{' '}
            <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </span>
          </p>
          {profile && (
            <p>
              <strong>User:</strong> {profile.firstName} {profile.lastName} ({profile.userType})
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          {!isAuthenticated ? (
            <ApiTestButton 
              onClick={testLogin} 
              isLoading={isLoading['login']}
            >
              Log In (Test User)
            </ApiTestButton>
          ) : (
            <ApiTestButton onClick={logout}>
              Log Out
            </ApiTestButton>
          )}
        </div>
        {error['login'] && <p className="text-red-500 mt-2">{error['login']}</p>}
        {results['login'] && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-60">
              {formatJson(results['login'])}
            </pre>
          </div>
        )}
      </ApiTestCard>
      
      {/* Session Storage Test */}
      <ApiTestCard title="Session Storage Test">
        <div className="flex space-x-2 mb-4">
          <ApiTestButton onClick={testSaveSession}>
            Save Test Session
          </ApiTestButton>
          <ApiTestButton onClick={testLoadSession}>
            Load Test Session
          </ApiTestButton>
        </div>
        {error['session'] && <p className="text-red-500 mt-2">{error['session']}</p>}
        {(results['session'] || results['loadSession']) && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-60">
              {formatJson(results['session'] || results['loadSession'])}
            </pre>
          </div>
        )}
      </ApiTestCard>
      
      {/* User Profile Test */}
      <ApiTestCard title="Get User Profile">
        <div className="mb-4">
          <ApiTestButton 
            onClick={testGetProfile} 
            isLoading={isLoading['profile']}
            disabled={!isAuthenticated}
          >
            Get My Profile
          </ApiTestButton>
        </div>
        {error['profile'] && <p className="text-red-500 mt-2">{error['profile']}</p>}
        {results['profile'] && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-60">
              {formatJson(results['profile'])}
            </pre>
          </div>
        )}
      </ApiTestCard>
      
      {/* Find Doctors Test */}
      <ApiTestCard title="Find Doctors">
        <div className="mb-4">
          <ApiTestButton 
            onClick={testFindDoctors} 
            isLoading={isLoading['findDoctors']}
            disabled={!isAuthenticated}
          >
            Find All Doctors
          </ApiTestButton>
        </div>
        {error['findDoctors'] && <p className="text-red-500 mt-2">{error['findDoctors']}</p>}
        {results['findDoctors'] && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-60">
              {formatJson(results['findDoctors'])}
            </pre>
          </div>
        )}
      </ApiTestCard>
      
      {/* Notifications Test */}
      <ApiTestCard title="Get Notifications">
        <div className="mb-4">
          <ApiTestButton 
            onClick={testGetNotifications} 
            isLoading={isLoading['notifications']}
            disabled={!isAuthenticated}
          >
            Get My Notifications
          </ApiTestButton>
        </div>
        {error['notifications'] && <p className="text-red-500 mt-2">{error['notifications']}</p>}
        {results['notifications'] && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-60">
              {formatJson(results['notifications'])}
            </pre>
          </div>
        )}
      </ApiTestCard>
      
      {/* Dashboard Stats Test */}
      <ApiTestCard title="Dashboard Stats">
        <div className="mb-4">
          <ApiTestButton 
            onClick={testGetDashboardStats} 
            isLoading={isLoading['dashboardStats']}
            disabled={!isAuthenticated}
          >
            Get Dashboard Stats
          </ApiTestButton>
        </div>
        {error['dashboardStats'] && <p className="text-red-500 mt-2">{error['dashboardStats']}</p>}
        {results['dashboardStats'] && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-60">
              {formatJson(results['dashboardStats'])}
            </pre>
          </div>
        )}
      </ApiTestCard>
    </div>
  );
} 