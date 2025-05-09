'use client';

import React from 'react';
import ClientAppointmentDetail from './ClientAppointmentDetail';

// Define the expected params shape
interface AppointmentPageParams {
  appointmentId: string;
}

// Define proper page props with complete typing
interface AppointmentPageProps {
  params: Promise<AppointmentPageParams>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function AppointmentPage(props: AppointmentPageProps) {
  // Use React.use() to unwrap the params object which is now a Promise in newer Next.js versions
  const params = React.use(props.params);
  const appointmentId = params.appointmentId || '';

  return <ClientAppointmentDetail appointmentId={appointmentId} />;
}
