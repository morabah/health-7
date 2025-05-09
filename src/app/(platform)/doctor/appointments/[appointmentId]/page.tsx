'use client';

import React from 'react';
import ClientAppointmentDetail from './ClientAppointmentDetail';

// Define the expected params shape
interface AppointmentPageParams {
  appointmentId: string;
}

export default function AppointmentPage(props: any) {
  // Type 'any' is used here to bypass the TypeScript errors with PageProps constraint
  // This is a temporary fix that should be refactored when the Next.js types issue is resolved

  // Use React.use() to unwrap the params object which is now a Promise in newer Next.js versions
  const params = React.use(props.params) as AppointmentPageParams;
  const appointmentId = params.appointmentId || '';

  return <ClientAppointmentDetail appointmentId={appointmentId} />;
}
