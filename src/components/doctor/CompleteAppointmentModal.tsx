'use client';

/**
 * @deprecated This component is deprecated. Use the shared CompleteAppointmentModal from '@/components/shared/modals/CompleteAppointmentModal' instead.
 */

import React from 'react';
import SharedCompleteAppointmentModal from '@/components/shared/modals/CompleteAppointmentModal';
import type { Appointment } from '@/types/schemas';
import { UserType } from '@/types/enums';

interface CompleteAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appt: Appointment | null;
  onConfirm: (appointmentId: string, notes: string) => void;
  isSubmitting?: boolean;
}

/**
 * @deprecated This component is deprecated. Use the shared CompleteAppointmentModal from '@/components/shared/modals/CompleteAppointmentModal' instead.
 * This is a compatibility wrapper to maintain backward compatibility.
 */
export default function CompleteAppointmentModal({
  isOpen,
  onClose,
  appt,
  onConfirm,
  isSubmitting = false,
}: CompleteAppointmentModalProps) {
  // Convert the synchronous onConfirm to a Promise-based function
  const handleConfirm = async (appointmentId: string, notes: string) => {
    onConfirm(appointmentId, notes);
  };

  return (
    <SharedCompleteAppointmentModal
      isOpen={isOpen}
      onClose={onClose}
      appointment={appt}
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
      userType={UserType.DOCTOR}
    />
  );
}
