'use client';

/**
 * @deprecated This component is deprecated. Use the shared CancelAppointmentModal from '@/components/shared/modals/CancelAppointmentModal' instead.
 */

import React from 'react';
import SharedCancelAppointmentModal from '@/components/shared/modals/CancelAppointmentModal';
import type { Appointment } from '@/types/schemas';
import { UserType } from '@/types/enums';

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appt: Appointment | null;
  onConfirm: (appointmentId: string, reason: string) => void;
  isSubmitting?: boolean;
}

/**
 * @deprecated This component is deprecated. Use the shared CancelAppointmentModal from '@/components/shared/modals/CancelAppointmentModal' instead.
 * This is a compatibility wrapper to maintain backward compatibility.
 */
export default function CancelAppointmentModal({
  isOpen,
  onClose,
  appt,
  onConfirm,
  isSubmitting = false
}: CancelAppointmentModalProps) {
  // Convert the synchronous onConfirm to a Promise-based function
  const handleConfirm = async (appointmentId: string, reason: string) => {
    onConfirm(appointmentId, reason);
  };

  return (
    <SharedCancelAppointmentModal
      isOpen={isOpen}
      onClose={onClose}
      appointment={appt}
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
      userType={UserType.DOCTOR}
    />
  );
} 