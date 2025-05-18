'use client';

/**
 * @deprecated This component is deprecated. Use the shared CancelAppointmentModal from '@/components/shared/modals/CancelAppointmentModal' instead.
 */

import React from 'react';
import SharedCancelAppointmentModal from '@/components/shared/modals/CancelAppointmentModal';
import type { Appointment } from '@/types/schemas';
import { UserType } from '@/types/enums';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  appt: Appointment | null;
  onConfirm: (id: string, reason: string) => Promise<void>;
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
}: CancelModalProps) {
  return (
    <SharedCancelAppointmentModal
      isOpen={isOpen}
      onClose={onClose}
      appointment={appt}
      onConfirm={onConfirm}
      userType={UserType.PATIENT}
    />
  );
} 