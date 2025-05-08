'use client';

import ClientAppointmentDetail from './ClientAppointmentDetail';

export default function AppointmentPage(props: any) {
  // Type 'any' is used here to bypass the TypeScript errors with PageProps constraint
  // This is a temporary fix that should be refactored when the Next.js types issue is resolved

  const appointmentId = props.params?.appointmentId || '';

  return <ClientAppointmentDetail appointmentId={appointmentId} />;
}
