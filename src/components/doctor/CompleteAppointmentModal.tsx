'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';

import type { Appointment } from '@/types/schemas';

interface CompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  appt: Appointment | null;
  onConfirm: (appointmentId: string, notes: string) => Promise<void>;
}

/**
 * Modal component for completing appointments
 * Uses Headless UI Dialog for accessibility and keyboard interactions
 */
export default function CompleteAppointmentModal({
  isOpen,
  onClose,
  appt,
  onConfirm,
}: CompleteModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to avoid visual flickering during close animation
      const timer = setTimeout(() => {
        setNotes('');
        setLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle confirmation with loading state and error handling
  const handleConfirm = async () => {
    if (!appt) return;

    setLoading(true);

    try {
      // Simulate network delay as specified in requirements
      await new Promise(resolve => setTimeout(resolve, 800));
      await onConfirm(appt.id, notes.trim());
    } finally {
      setLoading(false);
    }
  };

  if (!appt) return null;

  return (
    <Transition.Root appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => !loading && onClose()}
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
              <div className="flex items-center space-x-2 text-success mb-4">
                <CheckCircle className="h-6 w-6" />
                <Dialog.Title className="text-lg font-medium">
                  Complete Appointment
                </Dialog.Title>
              </div>

              <div className="mt-2">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Are you sure you want to mark your appointment with <strong>{appt.patientName}</strong> on{' '}
                  <strong>{new Date(appt.appointmentDate).toLocaleDateString()}</strong> at{' '}
                  <strong>{appt.startTime}</strong> as completed?
                </p>

                <Textarea
                  id="completion-notes"
                  label="Appointment Notes (optional)"
                  placeholder="Add any notes about the appointment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="mb-4"
                />

                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirm}
                    isLoading={loading}
                  >
                    Complete Appointment
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