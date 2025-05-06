'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';

export default function BookAppointmentRedirect() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.doctorId ? String(params.doctorId) : '';
  
  useEffect(() => {
    // Redirect to the correct platform route
    router.push(`/platform/book-appointment/${doctorId}`);
  }, [doctorId, router]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center">
      <Spinner className="w-8 h-8" />
      <p className="text-slate-600 dark:text-slate-300 mt-4">
        Redirecting to appointment booking...
      </p>
    </div>
  );
} 