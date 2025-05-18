'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { Clock, CheckCircle, AlertCircle, User, Calendar, ClipboardList } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import type { Appointment } from '@/types/schemas';
import { UserType } from '@/types/enums';

interface CompleteAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onConfirm: (appointmentId: string, notes: string) => Promise<void> | void;
  isSubmitting?: boolean;
  userType?: UserType | string;
}

/**
 * Unified modal component for completing appointments
 * Currently used by doctors, but designed to be extensible for potential patient feedback
 */
export default function CompleteAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onConfirm,
  isSubmitting = false,
  userType = UserType.DOCTOR
}: CompleteAppointmentModalProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Determine if this is a doctor or patient context
  const isDoctor = userType === UserType.DOCTOR;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!notes.trim()) {
      setError('Please add appointment notes before completing');
      return;
    }

    if (!appointment?.id) return;

    try {
      setLoading(true);
      await onConfirm(appointment.id, notes.trim());
      // Success is handled in the parent component
    } catch (error) {
      // Convert the error to a string message for display
      setError(error instanceof Error ? error.message : 'Failed to complete appointment');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to avoid visual flickering during close animation
      const timer = setTimeout(() => {
        setNotes('');
        setError('');
        setLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!appointment) return null;

  // Create unique IDs for accessibility
  const notesId = "appointment-notes";
  const notesErrorId = "appointment-notes-error";
  const notesDescriptionId = "notes-description";

  // Ensure onClose is always a function even when we want to disable it during submission
  const handleClose = (!isSubmitting && !loading) ? onClose : () => {};
  
  // Determine which name to display based on user type
  const otherPartyName = isDoctor 
    ? appointment.patientName || 'Unknown Patient'
    : appointment.doctorName || 'Unknown Doctor';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Complete Appointment" 
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} aria-label="Complete appointment form">
        <div className="space-y-4">
          {/* Appointment Summary */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
            <h3 className="font-medium mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-primary" aria-hidden="true" />
              Appointment Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-slate-500 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-slate-500">{isDoctor ? 'Patient' : 'Doctor'}</div>
                  <div className="font-medium">{otherPartyName}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-slate-500 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-slate-500">Date & Time</div>
                  <div className="font-medium">
                    {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.startTime}
                  </div>
                </div>
              </div>

              {appointment.reason && (
                <div className="sm:col-span-2 flex items-start gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="text-slate-500">Reason for Visit</div>
                    <div className="font-medium">{appointment.reason}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor={notesId}
              className="block text-sm font-medium mb-1 flex items-center"
            >
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" aria-hidden="true" />
              {isDoctor ? 'Appointment Notes' : 'Feedback'} <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            </label>
            <Textarea
              id={notesId}
              placeholder={isDoctor 
                ? "Enter detailed notes about the appointment..." 
                : "Enter your feedback about this appointment..."}
              value={notes}
              onChange={handleChange}
              rows={6}
              disabled={isSubmitting || loading}
              error={error || ''}
              required
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? notesErrorId : notesDescriptionId}
              className="w-full"
            />
            {error && (
              <div className="mt-1 text-sm text-red-500 flex items-center" id={notesErrorId} role="alert">
                <AlertCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                {error}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500" id={notesDescriptionId}>
              {isDoctor 
                ? "These notes will be saved to the patient's medical record."
                : "Your feedback will be shared with the doctor."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting || loading}
              aria-label="Cancel completion"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting || loading}
              aria-label="Complete appointment"
              aria-busy={(isSubmitting || loading) ? "true" : "false"}
            >
              {(isSubmitting || loading) ? (
                <>
                  <Spinner className="mr-2" aria-hidden="true" />
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
