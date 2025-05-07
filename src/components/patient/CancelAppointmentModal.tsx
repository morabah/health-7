'use client';

import React, { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import type { Appointment } from '@/types/schemas';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  appt: Appointment | null;
  onConfirm: (id: string, reason: string) => Promise<void>;
}

/**
 * Modal component for cancelling appointments
 * Uses Headless UI Dialog for accessibility and keyboard interactions
 */
export default function CancelAppointmentModal({
  isOpen,
  onClose,
  appt,
  onConfirm,
}: CancelModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to avoid visual flickering during close animation
      const timer = setTimeout(() => {
        setReason('');
        setLoading(false);
        setError(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle confirmation with loading state and error handling
  const handleConfirm = async () => {
    if (!appt) return;
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(appt.id, reason.trim());
      // Success is handled in the parent component
    } catch (error) {
      // Convert the error to a string message for display
      setError(error instanceof Error ? error.message : 'Failed to cancel appointment');
      setLoading(false);
    }
  };

  if (!appt) return null;

  // Generate ID for accessibility
  const reasonId = "patient-cancel-reason";
  const errorId = "patient-cancel-error";

  return (
    <Transition.Root appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => !loading && onClose()}
        aria-labelledby="cancel-dialog-title"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-6 shadow-xl">
              <div className="flex items-center space-x-2 text-danger mb-4">
                <XCircle className="h-6 w-6" aria-hidden="true" />
                <Dialog.Title id="cancel-dialog-title" className="text-lg font-medium">
                  Cancel Appointment
                </Dialog.Title>
              </div>

              {error && (
                <Alert variant="error" className="mb-4" role="alert" id={errorId}>
                  {error}
                </Alert>
              )}

              <div className="mt-2">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Are you sure you want to cancel your appointment with <strong>{appt.doctorName}</strong> on{' '}
                  <strong>{new Date(appt.appointmentDate).toLocaleDateString()}</strong> at{' '}
                  <strong>{appt.startTime}</strong>?
                </p>

                <Textarea
                  id={reasonId}
                  label="Reason for cancellation"
                  placeholder="Please provide a reason for cancelling this appointment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
                  required
                  aria-required="true"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? errorId : undefined}
                  rows={3}
                  className="mb-4"
                />

                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                    aria-label="Keep appointment"
                  >
                    Keep Appointment
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleConfirm}
                    isLoading={loading}
                    aria-label="Confirm appointment cancellation"
                    aria-busy={loading ? "true" : "false"}
                  >
                    Confirm Cancellation
                  </Button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 