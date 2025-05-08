'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { FileText, Upload, Download, Info, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePatientProfile } from '@/data/patientLoaders';

/**
 * Patient Health Records Page
 * 
 * This page allows patients to view and manage their health records.
 * Currently a placeholder with basic UI structure.
 */
export default function HealthRecordsPage() {
  const { user } = useAuth();
  const { data: profileData, isLoading: profileLoading } = usePatientProfile();
  const [activeTab, setActiveTab] = useState<'lab-results' | 'medical-history' | 'visit-summary'>('lab-results');
  
  // Placeholder data - would come from API in real implementation
  const mockRecords = {
    'lab-results': [
      { id: '1', title: 'Blood Test Results', date: '2025-04-15', doctor: 'Dr. Sarah Chen', status: 'complete' },
      { id: '2', title: 'Cholesterol Screening', date: '2025-02-20', doctor: 'Dr. Chris Streich', status: 'complete' },
    ],
    'medical-history': [
      { id: '3', title: 'Allergies and Conditions', date: '2025-03-10', doctor: 'Dr. Sarah Chen', status: 'complete' },
      { id: '4', title: 'Vaccination History', date: '2025-01-05', doctor: 'Dr. Michael Rodriguez', status: 'complete' },
    ],
    'visit-summary': [
      { id: '5', title: 'Annual Checkup', date: '2025-04-02', doctor: 'Dr. Sarah Chen', status: 'complete' },
      { id: '6', title: 'Cardiology Consultation', date: '2025-02-18', doctor: 'Dr. Chris Streich', status: 'complete' },
    ]
  };
  
  if (profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  const records = mockRecords[activeTab] || [];
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Health Records</h1>
        <Button className="flex items-center gap-2">
          <Upload size={16} />
          Upload Health Record
        </Button>
      </div>
      
      <Alert variant="info" className="my-4">
        <div className="flex items-start">
          <Info className="flex-shrink-0 mr-2 mt-0.5" size={18} />
          <div>
            <p className="font-medium">For demonstration purposes only</p>
            <p className="text-sm">This is a placeholder page. In a real application, this would display actual patient health records securely.</p>
          </div>
        </div>
      </Alert>
      
      <Card>
        <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'lab-results' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('lab-results')}
          >
            Lab Results
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'medical-history' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('medical-history')}
          >
            Medical History
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'visit-summary' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('visit-summary')}
          >
            Visit Summaries
          </button>
        </div>
        
        <div className="p-6">
          {records.length > 0 ? (
            <div className="space-y-4">
              {records.map((record) => (
                <div key={record.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center">
                      <div className="rounded-full h-10 w-10 bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500">
                        <FileText size={18} />
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-slate-800 dark:text-slate-100">{record.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{record.doctor}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end sm:items-center gap-2">
                      <div className="text-sm text-slate-600 dark:text-slate-400">{record.date}</div>
                      <Button variant="outline" size="sm" className="flex items-center gap-1">
                        <Download size={14} />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No records found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                We couldn't find any health records in this category.
              </p>
              <Button variant="outline" size="sm" className="flex items-center gap-1 mx-auto">
                <Plus size={14} />
                Add Record
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 