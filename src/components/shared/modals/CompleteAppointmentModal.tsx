'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { Clock, CheckCircle, User, Calendar, ClipboardList } from 'lucide-react';
import type { Appointment } from '@/types/schemas';
import { CompleteAppointmentSchema } from '@/types/schemas';
import { callApi } from '@/lib/apiClient';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';

/**
 * Props for the CompleteAppointmentModal component
 */
interface CompleteAppointmentModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to set modal open state */
  setIsOpen: (open: boolean) => void;
  /** The appointment to complete (full Appointment type) */
  appointment: Appointment | null;
  /** Callback triggered when appointment is successfully completed */
  onSuccess: (appointmentId: string) => void;
}

/**
 * Modal component for completing appointments by doctors
 * 
 * Connects to the live completeAppointment Cloud Function to mark appointments
 * as completed with optional notes. Includes proper validation, error handling,
 * and UI state management.
 */
export default function CompleteAppointmentModal({
  isOpen,
  setIsOpen,
  appointment,
  onSuccess
}: CompleteAppointmentModalProps) {
  // Local state management
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize/reset notes when modal opens or appointment changes
  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || '');
      setErrorMsg(null);
    } else {
      setNotes('');
    }
  }, [appointment, isOpen]);

  // Handle form submission to complete appointment
  const handleCompleteSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate appointment selection
    if (!appointment?.id) {
      setErrorMsg('Error: No appointment selected to complete.');
      return;
    }

    // Set loading state and clear previous errors
    setIsLoading(true);
    setErrorMsg(null);
    
    // Start performance tracking
    const perf = trackPerformance('completeAppointmentSubmit_Live');
    logInfo('Starting appointment completion process', { appointmentId: appointment.id });

    try {
      // Prepare payload for backend
      const payload = {
        appointmentId: appointment.id,
        notes: notes.trim() || undefined // Send undefined if notes are empty
      };

      // Optional client-side Zod validation
      try {
        CompleteAppointmentSchema.parse(payload);
      } catch (zodError: any) {
        logError('Client-side validation failed for appointment completion', { 
          error: zodError, 
          payload 
        });
        setErrorMsg('Invalid data provided. Please check your input.');
        setIsLoading(false);
        perf.stop();
        return;
      }

      logInfo('Calling completeAppointment cloud function', { 
        appointmentId: payload.appointmentId,
        hasNotes: !!payload.notes 
      });

      // Call backend via callApi wrapper
      await callApi<{ success: boolean }>('completeAppointment', payload);

      logInfo('Appointment completed successfully via API', { appointmentId: appointment.id });
      
      // Trigger success callback and close modal
      onSuccess(appointment.id);
      setIsOpen(false);

    } catch (error: any) {
      logError('Failed to complete appointment via API', { 
        error, 
        appointmentId: appointment.id 
      });
      
      // Display HttpsError message from callApi or generic fallback
      setErrorMsg(error.message || 'Could not complete appointment at this time.');
    } finally {
      setIsLoading(false);
      perf.stop();
    }
  }, [appointment, notes, onSuccess, setIsOpen]);

  if (!appointment) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => !isLoading && setIsOpen(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-slate-900 dark:text-slate-100 mb-4"
                >
                  Complete Appointment
                </Dialog.Title>

                <form onSubmit={handleCompleteSubmit}>
                  <div className="space-y-4">
                    {/* Appointment Details */}
                    <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center text-slate-900 dark:text-slate-100">
                        <Calendar className="h-4 w-4 mr-2 text-primary-600" />
                        Appointment Details
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 text-slate-500 mt-0.5" />
                          <div>
                            <div className="text-slate-500 dark:text-slate-400">Patient</div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {appointment.patientName || 'Unknown Patient'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-slate-500 mt-0.5" />
                          <div>
                            <div className="text-slate-500 dark:text-slate-400">Date & Time</div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.startTime}
                            </div>
                          </div>
                        </div>

                        {appointment.reason && (
                          <div className="sm:col-span-2 flex items-start gap-2">
                            <ClipboardList className="h-4 w-4 text-slate-500 mt-0.5" />
                            <div>
                              <div className="text-slate-500 dark:text-slate-400">Reason for Visit</div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {appointment.reason}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Completion Notes */}
                    <div>
                      <label
                        htmlFor="completionNotes"
                        className="block text-sm font-medium mb-2 text-slate-900 dark:text-slate-100"
                      >
                        Completion Notes (Optional)
                      </label>
                      <Textarea
                        id="completionNotes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        disabled={isLoading}
                        placeholder="Enter notes about the appointment completion..."
                        className="w-full"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        These notes will be saved to the patient's medical record.
                      </p>
                    </div>

                    {/* Error Alert */}
                    {errorMsg && (
                      <Alert variant="error" className="mt-4">
                        {errorMsg}
                      </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-6 flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsOpen(false)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isLoading}
                        className="flex items-center"
                      >
                        {isLoading ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirm Completion
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
