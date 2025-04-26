import React from 'react';
import Link from 'next/link';

/**
 * Patient Dashboard Page
 * Main control center for patients to view their information and upcoming appointments
 * 
 * @returns Patient dashboard component
 */
export default function PatientDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Patient Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3">Upcoming Appointments</h2>
          <p className="text-gray-500">You have no upcoming appointments</p>
          <Link 
            href="/main/find-doctors" 
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Find a Doctor
          </Link>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3">Profile Summary</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> John Doe</p>
            <p><span className="font-medium">Email:</span> john.doe@example.com</p>
            <p><span className="font-medium">Blood Type:</span> Not provided</p>
          </div>
          <Link 
            href="/patient/profile" 
            className="inline-block mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
          >
            Edit Profile
          </Link>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-3">Health Stats</h2>
          <p className="text-gray-500">No health data available</p>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <Link 
          href="/patient/appointments" 
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          View All Appointments
        </Link>
        <Link 
          href="/main/notifications" 
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
        >
          Notifications
        </Link>
      </div>
    </div>
  );
} 