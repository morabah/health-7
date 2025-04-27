'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { logInfo } from '@/lib/logger';

/**
 * Doctor Verification Detail Page
 * Allows admins to review a specific doctor's verification request and approve/reject
 * 
 * @returns Doctor Verification Detail component
 */
export default function DoctorVerificationDetailPage() {
  const params = useParams();
  const doctorId = params?.doctorId as string || '';
  
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState({
    id: doctorId,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1 (555) 123-4567',
    specialty: 'Cardiology',
    licenseNumber: 'MD12345',
    yearsOfExperience: 10,
    education: [
      { institution: 'Harvard Medical School', degree: 'M.D.', year: '2010' },
      { institution: 'UCLA', degree: 'B.S. Biology', year: '2006' }
    ],
    languages: ['English', 'Spanish'],
    submittedDate: new Date().toISOString(),
    documents: [
      { type: 'Medical License', filename: 'license.pdf', url: '#' },
      { type: 'Board Certification', filename: 'certification.pdf', url: '#' }
    ]
  });
  
  useEffect(() => {
    // Log when component mounts
    logInfo(`Doctor Verification Detail page mounted for ID: ${doctorId}`);
    
    // In a real implementation, fetch specific doctor data
    // const fetchDoctorData = async () => {
    //   try {
    //     setLoading(true);
    //     const response = await callApi('getDoctorVerificationDetail', { doctorId });
    //     setDoctor(response.data);
    //   } catch (error) {
    //     console.error('Error fetching doctor data:', error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    
    // fetchDoctorData();
  }, [doctorId]);
  
  const handleVerification = async (status: 'VERIFIED' | 'REJECTED') => {
    setLoading(true);
    try {
      // In a real implementation, call API to update status
      // await callApi('updateDoctorVerificationStatus', {
      //   doctorId,
      //   status,
      //   notes: status === 'REJECTED' ? notes : undefined
      // });
      
      logInfo(`Doctor ${doctorId} status updated to ${status}`);
      
      // Navigate back to verification queue after short delay
      setTimeout(() => {
        window.location.href = '/cms/doctor-verification';
      }, 1000);
      
    } catch (error) {
      console.error('Error updating verification status:', error);
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-4">Doctor Verification Review</h1>
          <Link href="/cms/doctor-verification" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            Back to Queue
          </Link>
        </div>
        <p className="text-gray-600">
          Review submitted information and credentials for Dr. {doctor.firstName} {doctor.lastName}
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="font-semibold">Professional Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1">Dr. {doctor.firstName} {doctor.lastName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialty</label>
                  <p className="mt-1">{doctor.specialty}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">License Number</label>
                  <p className="mt-1">{doctor.licenseNumber}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                  <p className="mt-1">{doctor.yearsOfExperience}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1">{doctor.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1">{doctor.phone}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Languages</label>
                  <p className="mt-1">{doctor.languages.join(', ')}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Submitted</label>
                  <p className="mt-1">{formatDate(doctor.submittedDate)}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Education</label>
                <ul className="divide-y divide-gray-200 border rounded">
                  {doctor.education.map((edu, index) => (
                    <li key={index} className="p-3">
                      <p className="font-medium">{edu.institution}</p>
                      <p className="text-sm text-gray-500">{edu.degree}, {edu.year}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="font-semibold">Verification Documents</h2>
            </div>
            <div className="p-6">
              <ul className="divide-y divide-gray-200 border rounded">
                {doctor.documents.map((doc, index) => (
                  <li key={index} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{doc.type}</p>
                      <p className="text-sm text-gray-500">{doc.filename}</p>
                    </div>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden h-fit">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="font-semibold">Verification Decision</h2>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (required for rejection)
              </label>
              <textarea
                id="notes"
                rows={5}
                className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter verification notes or rejection reason..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleVerification('VERIFIED')}
                disabled={loading}
                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              
              <button
                onClick={() => handleVerification('REJECTED')}
                disabled={loading || (!notes && true)}
                className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
            
            {!notes && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Notes are required when rejecting a verification
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 