'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { Pill, Clock, Plus, Calendar, Info, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePatientProfile } from '@/data/patientLoaders';
import Input from '@/components/ui/Input';

/**
 * Patient Medications Page
 * 
 * This page allows patients to view and manage their medications.
 * Currently a placeholder with basic UI structure.
 */
export default function MedicationsPage() {
  const { user } = useAuth();
  const { data: profileData, isLoading: profileLoading } = usePatientProfile();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Placeholder data - would come from API in real implementation
  const mockMedications = [
    { 
      id: '1', 
      name: 'Lisinopril', 
      dosage: '10mg', 
      instructions: 'Take once daily with food',
      prescribedBy: 'Dr. Sarah Chen',
      refills: 2,
      nextRefillDate: '2025-05-20',
      frequency: 'Daily'
    },
    { 
      id: '2', 
      name: 'Atorvastatin', 
      dosage: '20mg', 
      instructions: 'Take once daily in the evening',
      prescribedBy: 'Dr. Chris Streich',
      refills: 1,
      nextRefillDate: '2025-06-15',
      frequency: 'Daily'
    }
  ];
  
  if (profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Filter medications based on search term
  const filteredMedications = mockMedications.filter(medication => 
    medication.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medication.prescribedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">My Medications</h1>
        <Button className="flex items-center gap-2">
          <Plus size={16} />
          Add Medication
        </Button>
      </div>
      
      <Alert variant="info" className="my-4">
        <div className="flex items-start">
          <Info className="flex-shrink-0 mr-2 mt-0.5" size={18} />
          <div>
            <p className="font-medium">For demonstration purposes only</p>
            <p className="text-sm">This is a placeholder page. In a real application, this would display actual patient medications securely.</p>
          </div>
        </div>
      </Alert>
      
      <Card className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search medications or doctors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {filteredMedications.length > 0 ? (
          <div className="space-y-4">
            {filteredMedications.map((medication) => (
              <div key={medication.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <div className="rounded-full h-10 w-10 bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 mr-3">
                      <Pill size={18} />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 dark:text-slate-100">{medication.name} {medication.dosage}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Prescribed by {medication.prescribedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full">
                      {medication.refills} refills left
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-12">
                  <div className="flex items-start">
                    <Clock className="text-slate-400 mr-2 flex-shrink-0" size={16} />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Frequency</p>
                      <p className="text-sm">{medication.frequency}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="text-slate-400 mr-2 flex-shrink-0" size={16} />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Next Refill</p>
                      <p className="text-sm">{medication.nextRefillDate}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pl-12">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Instructions</p>
                  <p className="text-sm">{medication.instructions}</p>
                </div>
                
                <div className="mt-4 pl-12 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <Button variant="outline" size="sm">Request Refill</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Pill className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No medications found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? `No results found for "${searchTerm}"` : "You don't have any medications recorded yet."}
            </p>
            <Button variant="outline" size="sm" className="flex items-center gap-1 mx-auto">
              <Plus size={14} />
              Add Medication
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
} 