'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  CalendarCheck,
  FileText,
  Pill,
  Bell,
  Pencil,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logInfo, logValidation } from '@/lib/logger';

/**
 * Re-usable Stat card
 */
const StatCard = ({
  title,
  Icon,
}: {
  title: string;
  Icon: LucideIcon;
}) => (
  <Card className="flex items-center gap-4 p-4">
    <Icon size={28} className="text-primary shrink-0" />
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-xl font-bold">—</p>
    </div>
  </Card>
);

/**
 * Patient Dashboard Page
 * Main control center for patients to view their information and upcoming appointments
 * 
 * @returns Patient dashboard component
 */
export default function PatientDashboard() {
  useEffect(() => {
    logInfo('Patient dashboard rendered (static)');
    
    // Add validation that the dashboard is working correctly
    try {
      logValidation('3.7', 'success', 'Static patient dashboard with placeholders & links ready.');
    } catch (e) {
      console.error('Could not log validation', e);
    }
  }, []);

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <h1 className="text-2xl font-semibold dark:text-white">
        Welcome,&nbsp;—
      </h1>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upcoming Appointments" Icon={CalendarCheck} />
        <StatCard title="Medical Records" Icon={FileText} />
        <StatCard title="Prescriptions" Icon={Pill} />
        <StatCard title="Notifications" Icon={Bell} />
      </section>

      {/* Upcoming appointments */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Upcoming Appointments
        </h2>
        <div className="py-6 text-center text-slate-500 dark:text-slate-400">
          Loading appointments…
        </div>
        <div className="mt-4 text-right">
          <Link href="/patient/appointments">
            <Button variant="outline" size="sm">
              View All Appointments
            </Button>
          </Link>
        </div>
      </Card>

      {/* Profile info */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Profile Information
        </h2>
        {['Name', 'Email', 'Phone', 'Date of Birth', 'Gender', 'Blood Type'].map(
          label => (
            <p key={label} className="mb-2">
              <strong>{label}:</strong>{' '}
              <span className="text-slate-500 dark:text-slate-400">
                [Loading…]
              </span>
            </p>
          )
        )}
        <div className="mt-4 text-right">
          <Link href="/patient/profile">
            <Button variant="secondary" size="sm">
              <Pencil size={14} className="mr-1" />
              Edit Profile
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
} 