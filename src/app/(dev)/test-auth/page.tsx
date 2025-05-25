'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/realFirebaseConfig';
import { logInfo, logError } from '@/lib/logger';

/**
 * Test page for verifying live AuthContext functionality
 * This page allows testing the Firebase Auth integration and profile fetching
 */
export default function TestAuthPage() {
  const { user, userProfile, patientProfile, doctorProfile, loading, logout, refreshUserProfile } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Password123!');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    
    try {
      logInfo('[TestAuth] Attempting Firebase Auth login', { email });
      
      // Use Firebase Auth directly to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      logInfo('[TestAuth] Firebase Auth login successful', { 
        uid: userCredential.user.uid,
        email: userCredential.user.email 
      });
      
      // The AuthContext should automatically pick up the auth state change
      // and fetch the user profile via the getMyUserProfileData function
      
    } catch (error: any) {
      logError('[TestAuth] Firebase Auth login failed', error);
      setLoginError(error.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error: any) {
      logError('[TestAuth] Logout failed', error);
    }
  };

  const handleRefreshProfile = async () => {
    try {
      await refreshUserProfile();
    } catch (error: any) {
      logError('[TestAuth] Profile refresh failed', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🧪 Live AuthContext Test
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Login Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Firebase Auth Login</h2>
              
              {!user ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter password"
                    />
                  </div>
                  
                  {loginError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-red-800 text-sm">{loginError}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleLogin}
                    disabled={loginLoading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loginLoading ? 'Signing In...' : 'Sign In with Firebase Auth'}
                  </button>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>Test Accounts:</strong></p>
                    <ul className="mt-1 space-y-1">
                      <li>• Admin: admin@example.com</li>
                      <li>• Doctor: user1@demo.health</li>
                      <li>• Patient: user7@demo.health</li>
                      <li>• Password: Password123!</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h3 className="text-green-800 font-medium">✅ Authenticated</h3>
                    <p className="text-green-700 text-sm mt-1">
                      Signed in as: {user.email}
                    </p>
                    <p className="text-green-700 text-sm">
                      UID: {user.uid}
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleRefreshProfile}
                      className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                      Refresh Profile
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Profile Data Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Profile Data</h2>
              
              {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-blue-800">🔄 Loading profile data...</p>
                </div>
              )}
              
              {!loading && !user && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <p className="text-gray-600">Not authenticated</p>
                </div>
              )}
              
              {!loading && user && !userProfile && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-yellow-800">⚠️ User authenticated but no profile data</p>
                </div>
              )}
              
              {userProfile && (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h3 className="font-medium text-gray-800 mb-2">👤 User Profile</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>ID:</strong> {userProfile.id}</p>
                      <p><strong>Name:</strong> {userProfile.firstName} {userProfile.lastName}</p>
                      <p><strong>Email:</strong> {userProfile.email}</p>
                      <p><strong>Type:</strong> {userProfile.userType}</p>
                      <p><strong>Active:</strong> {userProfile.isActive ? 'Yes' : 'No'}</p>
                      <p><strong>Email Verified:</strong> {userProfile.emailVerified ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  
                  {patientProfile && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h3 className="font-medium text-blue-800 mb-2">🏥 Patient Profile</h3>
                      <div className="text-sm space-y-1">
                        <p><strong>User ID:</strong> {patientProfile.userId}</p>
                        <p><strong>DOB:</strong> {patientProfile.dateOfBirth || 'Not set'}</p>
                        <p><strong>Gender:</strong> {patientProfile.gender || 'Not set'}</p>
                        <p><strong>Blood Type:</strong> {patientProfile.bloodType || 'Not set'}</p>
                      </div>
                    </div>
                  )}
                  
                  {doctorProfile && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <h3 className="font-medium text-green-800 mb-2">👨‍⚕️ Doctor Profile</h3>
                      <div className="text-sm space-y-1">
                        <p><strong>User ID:</strong> {doctorProfile.userId}</p>
                        <p><strong>Specialty:</strong> {doctorProfile.specialty}</p>
                        <p><strong>License:</strong> {doctorProfile.licenseNumber}</p>
                        <p><strong>Experience:</strong> {doctorProfile.yearsOfExperience} years</p>
                                                 <p><strong>Status:</strong> {doctorProfile.verificationStatus}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">🔍 Test Instructions</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>1. <strong>Login:</strong> Use one of the test accounts above to sign in with Firebase Auth</p>
              <p>2. <strong>Profile Fetch:</strong> The AuthContext should automatically call getMyUserProfileData function</p>
              <p>3. <strong>Verify Data:</strong> Check that the profile data matches the user type (admin/doctor/patient)</p>
              <p>4. <strong>Check Logs:</strong> Open browser console to see detailed logging</p>
              <p>5. <strong>Firebase Logs:</strong> Check Firebase Functions logs for backend execution</p>
              <p>6. <strong>Refresh:</strong> Test the refresh profile functionality</p>
              <p>7. <strong>Logout:</strong> Verify logout clears all state and redirects</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 