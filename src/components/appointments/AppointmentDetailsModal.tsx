'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { trackPerformance } from '@/lib/performance';
import { logInfo } from '@/lib/logger';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  appointmentId 
}) => {
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const perfTracker = trackPerformance('AppointmentDetailsModal_Load');
    
    if (isOpen && appointmentId) {
      setLoading(true);
      setError(null);
      
      // Simulate fetching appointment details
      // In a real implementation, this would be a call to your API
      setTimeout(() => {
        try {
          // Mock data for demonstration
          setAppointment({
            id: appointmentId,
            patientName: 'John Doe',
            doctorName: 'Dr. Jane Smith',
            date: new Date().toISOString(),
            status: 'confirmed',
            reason: 'Annual checkup',
            notes: 'Patient has history of high blood pressure'
          });
          setLoading(false);
          perfTracker.stop();
          logInfo('Appointment details loaded', { appointmentId });
        } catch (err) {
          setError('Failed to load appointment details');
          setLoading(false);
          perfTracker.stop();
          logInfo('Error loading appointment details', { appointmentId, error: err });
        }
      }, 500);
    }
  }, [isOpen, appointmentId]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-xl rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-medium">
              Appointment Details
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          {loading && (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-2 text-sm text-gray-500">Loading appointment details...</p>
            </div>
          )}
          
          {error && (
            <div className="py-8 text-center text-red-500">
              <p>{error}</p>
              <button 
                onClick={onClose}
                className="mt-4 rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Close
              </button>
            </div>
          )}
          
          {!loading && !error && appointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Patient</h3>
                  <p className="mt-1">{appointment.patientName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Doctor</h3>
                  <p className="mt-1">{appointment.doctorName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date & Time</h3>
                  <p className="mt-1">{new Date(appointment.date).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1 capitalize">{appointment.status}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Reason for Visit</h3>
                <p className="mt-1">{appointment.reason}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                <p className="mt-1">{appointment.notes}</p>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  Edit Appointment
                </button>
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AppointmentDetailsModal;
