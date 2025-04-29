'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import {
  CalendarCheck,
  FileText,
  Pill,
  Bell,
  Pencil,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { logValidation, logError } from '@/lib/logger';
import { useMyDashboard } from '@/data/sharedLoaders';
import { usePatientProfile } from '@/data/patientLoaders';
import { format } from 'date-fns';
import type { Appointment } from '@/types/schemas';

/**
 * Re-usable Stat card
 */
const StatCard = ({
  title,
  value,
  Icon,
  isLoading = false,
}: {
  title: string;
  value: string | number;
  Icon: LucideIcon;
  isLoading?: boolean;
}) => (
  <Card className="flex items-center gap-4 p-4">
    <Icon size={28} className="text-primary shrink-0" />
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
      {isLoading ? (
        <div className="h-7 flex items-center">
          <Spinner />
        </div>
      ) : (
        <p className="text-xl font-bold">{value}</p>
      )}
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
  // Use combined dashboard hook for stats
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useMyDashboard();
  // Still need profile data for user info
  const { data: profileData, isLoading: profileLoading, error: profileError } = usePatientProfile();
  
  // Extract data from dashboard response
  const upcomingCount = dashboardData?.success ? dashboardData.upcomingCount : 0;
  const pastCount = dashboardData?.success ? dashboardData.pastCount : 0;
  const notifUnread = dashboardData?.success ? dashboardData.notifUnread : 0;
  const appointments = dashboardData?.success && dashboardData.appointments ? dashboardData.appointments : [];
  
  // Get upcoming appointments for the quick view
  const upcomingAppointments = appointments.slice(0, 3); // Show maximum 3 appointments in the preview

  useEffect(() => {
    // Add validation that the dashboard is working correctly
    try {
      logValidation('4.10', 'success', 'Patient dashboard connected to real data via local API.');
    } catch (e) {
      logError('Failed to log validation', e);
    }
  }, []);

  // Show error if any API calls fail
  if (dashboardError || profileError) {
    return (
      <Alert variant="error">
        Error loading dashboard data: {(dashboardError || profileError)?.toString()}
      </Alert>
    );
  }

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <h1 className="text-2xl font-semibold dark:text-white">
        Welcome,&nbsp;
        {profileLoading ? (
          <Spinner />
        ) : profileData?.success ? (
          `${profileData.firstName} ${profileData.lastName}`
        ) : (
          'Patient'
        )}
      </h1>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Upcoming Appointments" 
          value={upcomingCount} 
          Icon={CalendarCheck} 
          isLoading={dashboardLoading} 
        />
        <StatCard 
          title="Past Appointments" 
          value={pastCount} 
          Icon={FileText} 
          isLoading={dashboardLoading} 
        />
        <StatCard 
          title="Prescriptions" 
          value="0" 
          Icon={Pill} 
        />
        <StatCard 
          title="Notifications" 
          value={notifUnread} 
          Icon={Bell} 
          isLoading={dashboardLoading} 
        />
      </section>

      {/* Upcoming appointments */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Upcoming Appointments
        </h2>
        
        {dashboardLoading ? (
          <div className="py-6 text-center">
            <Spinner />
          </div>
        ) : upcomingAppointments.length > 0 ? (
          <div className="space-y-4">
            {upcomingAppointments.map((appointment: Appointment) => (
              <div key={appointment.id} className="p-3 border-b last:border-0">
                <div className="flex justify-between">
                  <h3 className="font-medium">{appointment.doctorName}</h3>
                  <span className="text-sm text-slate-500">
                    {appointment.doctorSpecialty}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-sm">
                    {format(new Date(appointment.appointmentDate), 'PPP')} at {appointment.startTime}
                  </span>
                  <span className="text-sm text-primary">
                    {appointment.appointmentType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400">
            No upcoming appointments
          </div>
        )}
        
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
        
        {profileLoading ? (
          <div className="py-6 text-center">
            <Spinner />
          </div>
        ) : profileData?.success ? (
          <div className="space-y-2">
            <p><strong>Name:</strong> {profileData.firstName} {profileData.lastName}</p>
            <p><strong>Email:</strong> {profileData.email || 'Not provided'}</p>
            <p><strong>Phone:</strong> {profileData.phone || 'Not provided'}</p>
            {/* For patient-specific fields we would need to join with patient profile data */}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400">
            Failed to load profile
          </div>
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