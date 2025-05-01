'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { Clock, CheckCircle, AlertCircle, User, Calendar, ClipboardList } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import type { Appointment } from '@/types/schemas';

interface CompleteAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appt: Appointment | null;
  onConfirm: (appointmentId: string, notes: string) => void;
  isSubmitting?: boolean;
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
  isSubmitting = false
}: CompleteAppointmentModalProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!notes.trim()) {
      setError('Please add appointment notes before completing');
      return;
    }

    if (appt?.id) {
      onConfirm(appt.id, notes);
    }
  };

  // Reset form when modal opens or closes
  React.useEffect(() => {
    if (!isOpen) {
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  if (!appt) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={!isSubmitting ? onClose : undefined}
      title="Complete Appointment"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Appointment Summary */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
            <h3 className="font-medium mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              Appointment Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="text-slate-500">Patient</div>
                  <div className="font-medium">{appt.patientName || 'Unknown Patient'}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-slate-500 mt-0.5" />
                <div>
                  <div className="text-slate-500">Date & Time</div>
                  <div className="font-medium">
                    {new Date(appt.appointmentDate).toLocaleDateString()} at {appt.startTime}
                  </div>
                </div>
              </div>
              
              {appt.reason && (
                <div className="sm:col-span-2 flex items-start gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500 mt-0.5" />
                  <div>
                    <div className="text-slate-500">Reason for Visit</div>
                    <div className="font-medium">{appt.reason}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="appointment-notes" className="block text-sm font-medium mb-1 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Appointment Notes
            </label>
            <Textarea
              id="appointment-notes"
              placeholder="Enter detailed notes about the appointment..."
              value={notes}
              onChange={handleChange}
              rows={6}
              disabled={isSubmitting}
              error={error ? true : false}
              className="w-full"
            />
            {error && (
              <div className="mt-1 text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">
              These notes will be saved to the patient's medical record.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2" size="sm" />
                  Completing...
                </>
              ) : (
                <>Complete Appointment</>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
} 