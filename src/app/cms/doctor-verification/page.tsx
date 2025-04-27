'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { logInfo } from '@/lib/logger';

/**
 * Doctor Verification Queue Page
 * Allows admins to view and process doctor verification requests
 * 
 * @returns Doctor Verification Queue component
 */
export default function DoctorVerificationPage() {
  // Mock data for pending verifications
  const [pendingDoctors, setPendingDoctors] = useState([
    { 
      id: 'doc1', 
      firstName: 'Jane', 
      lastName: 'Smith', 
      specialty: 'Cardiology', 
      licenseNumber: 'MD12345', 
      submittedDate: new Date().toISOString(),
      email: 'jane.smith@example.com'
    },
    { 
      id: 'doc2', 
      firstName: 'John', 
      lastName: 'Doe', 
      specialty: 'Neurology', 
      licenseNumber: 'MD67890', 
      submittedDate: new Date(Date.now() - 86400000).toISOString(),
      email: 'john.doe@example.com'
    },
  ]);
  
  useEffect(() => {
    // Log when component mounts
    logInfo('Doctor Verification page mounted');
    
    // In a real implementation, fetch pending verifications from backend
    // const fetchPendingVerifications = async () => {
    //   try {
    //     const response = await callApi('getDoctorVerificationQueue');
    //     setPendingDoctors(response.data);
    //   } catch (error) {
    //     console.error('Error fetching verification queue:', error);
    //   }
    // };
    
    // fetchPendingVerifications();
  }, []);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-4">Doctor Verification Queue</h1>
          <Link href="/cms" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            Back to CMS
          </Link>
        </div>
        <p className="text-gray-600">
          Review and process verification requests from healthcare providers
        </p>
      </header>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="font-semibold">Pending Verifications ({pendingDoctors.length})</h2>
          <span className="text-sm text-gray-500">Newest first</span>
        </div>
        
        {pendingDoctors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No pending verification requests
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pendingDoctors.map(doctor => (
              <li key={doctor.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <p>{doctor.specialty} • License: {doctor.licenseNumber}</p>
                      <p className="mt-1">Email: {doctor.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Submitted: {formatDate(doctor.submittedDate)}
                    </div>
                    <Link 
                      href={`/cms/doctor-verification/${doctor.id}`}
                      className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 