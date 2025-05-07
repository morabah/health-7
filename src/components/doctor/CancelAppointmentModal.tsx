'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { Clock, AlertCircle, User, Calendar, ClipboardList, XCircle } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import type { Appointment } from '@/types/schemas';

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appt: Appointment | null;
  onConfirm: (appointmentId: string, reason: string) => void;
  isSubmitting?: boolean;
}

/**
 * Modal component for doctors cancelling appointments
 * Uses Headless UI Dialog for accessibility and keyboard interactions
 */
export default function CancelAppointmentModal({
  isOpen,
  onClose,
  appt,
  onConfirm,
  isSubmitting = false
}: CancelAppointmentModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    if (appt?.id) {
      onConfirm(appt.id, reason);
    }
  };

  // Reset form when modal opens or closes
  React.useEffect(() => {
    if (!isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!appt) return null;

  // Create unique IDs for accessibility
  const reasonId = "cancellation-reason";
  const reasonErrorId = "cancellation-reason-error";

  // Ensure onClose is always a function even when we want to disable it during submission
  const handleClose = !isSubmitting ? onClose : () => {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancel Appointment"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} aria-label="Cancel appointment form">
        <div className="space-y-4">
          {/* Warning Alert */}
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-md text-sm" role="alert">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium">Are you sure you want to cancel this appointment?</p>
                <p className="mt-1">This action cannot be undone and the patient will be notified.</p>
              </div>
            </div>
          </div>

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
                  <div className="text-slate-500">Patient</div>
                  <div className="font-medium">{appt.patientName || 'Unknown Patient'}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-slate-500 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-slate-500">Date & Time</div>
                  <div className="font-medium">
                    {new Date(appt.appointmentDate).toLocaleDateString()} at {appt.startTime}
                  </div>
                </div>
              </div>
              
              {appt.reason && (
                <div className="sm:col-span-2 flex items-start gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="text-slate-500">Reason for Visit</div>
                    <div className="font-medium">{appt.reason}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor={reasonId} className="block text-sm font-medium mb-1 flex items-center">
              <XCircle className="h-4 w-4 mr-2 text-red-500" aria-hidden="true" />
              Reason for Cancellation <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            </label>
            <Textarea
              id={reasonId}
              placeholder="Please explain why you need to cancel this appointment..."
              value={reason}
              onChange={handleChange}
              rows={4}
              disabled={isSubmitting}
              error={error || ""}
              className="w-full"
              required
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? reasonErrorId : undefined}
            />
            {error && (
              <div className="mt-1 text-sm text-red-500 flex items-center" id={reasonErrorId} role="alert">
                <AlertCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                {error}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500" id="reason-description">
              This reason will be shared with the patient.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Keep Appointment
            </Button>
            <Button 
              type="submit" 
              variant="danger" 
              disabled={isSubmitting}
              aria-label="Cancel appointment"
              aria-busy={isSubmitting ? "true" : "false"}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2" aria-hidden="true" />
                  Cancelling...
                </>
              ) : (
                <>Cancel Appointment</>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
} 