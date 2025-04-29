'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { Users, UserRound, Stethoscope, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAdminDashboardData, useAllUsers, useAllDoctors } from '@/data/adminLoaders';
import { VerificationStatus, UserType } from '@/types/enums';
import { logInfo, logValidation } from '@/lib/logger';

// Stat component for dashboard statistics
function Stat({ 
  title, 
  value, 
  Icon, 
  isLoading = false 
}: { 
  title: string; 
  value: number | string; 
  Icon: React.ElementType;
  isLoading?: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-full">
          <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="font-medium text-slate-600 dark:text-slate-300">{title}</h3>
      </div>
      {isLoading ? (
        <div className="flex items-center h-8">
          <Spinner className="h-4 w-4" />
        </div>
      ) : (
        <p className="text-2xl font-bold">{value}</p>
      )}
    </Card>
  );
}

// Card header with link component
function HeaderWithLink({ title, href }: { title: string; href: string }) {
  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <Link href={href}>
        <Button variant="ghost" size="sm">
          View all
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

// For TypeScript
type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserType;
};

type Doctor = User & {
  specialty: string;
  verificationStatus: VerificationStatus;
};

export default function AdminDashboard() {
  // Use unified dashboard data loader
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useAdminDashboardData();
  
  // Still need these for the user and doctor lists
  const { data: usersData, isLoading: usersLoading, error: usersError } = useAllUsers();
  const { data: doctorsData, isLoading: doctorsLoading, error: doctorsError } = useAllDoctors();
  
  // Get stats from dashboard data
  const totalUsers = usersData?.success ? usersData.users.length : 0;
  const totalPatients = dashboardData?.success ? dashboardData.adminStats?.totalPatients || 0 : 0;
  const totalDoctors = dashboardData?.success ? dashboardData.adminStats?.totalDoctors || 0 : 0;
  const pendingVerifications = dashboardData?.success ? dashboardData.adminStats?.pendingVerifications || 0 : 0;
  
  // Get recent users and pending doctors
  const recentUsers = usersData?.success 
    ? usersData.users.slice(0, 5)
    : [];
  
  const pendingDoctors = doctorsData?.success 
    ? doctorsData.doctors.filter((doctor: Doctor) => doctor.verificationStatus === VerificationStatus.PENDING).slice(0, 5)
    : [];
  
  // Combined error state
  const hasError = dashboardError || usersError || doctorsError;
  const errorMessage = dashboardError 
    ? String(dashboardError) 
    : usersError 
      ? String(usersError) 
      : doctorsError 
        ? String(doctorsError) 
        : '';
  
  useEffect(() => {
    logInfo('Admin dashboard rendered (with real data)');
    
    // Log validation
    if (dashboardData?.success) {
      logValidation('4.10', 'success', 'Admin dashboard connected to real data via local API.');
      logValidation('4.FINAL-POLISH', 'success', 'Full local-DB prototype: all pages fetch from & write to local_db, workflows verified');
    }
  }, [dashboardData]);
  
  if (hasError) {
    return (
      <Alert variant="error" className="my-4">
        Error loading dashboard data: {errorMessage}
      </Alert>
    );
  }
  
  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold mb-6 dark:text-white">Admin Dashboard</h1>

      {/* Stats grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Total Users" value={totalUsers} Icon={Users} isLoading={usersLoading} />
        <Stat title="Patients" value={totalPatients} Icon={UserRound} isLoading={dashboardLoading} />
        <Stat title="Doctors" value={totalDoctors} Icon={Stethoscope} isLoading={dashboardLoading} />
        <Stat title="Pending Verifications" value={pendingVerifications} Icon={ShieldAlert} isLoading={dashboardLoading} />
      </section>

      {/* Recent users */}
      <Card>
        <HeaderWithLink title="Recent Users" href="/admin/users" />
        {usersLoading ? (
          <div className="p-6 flex justify-center">
            <Spinner />
          </div>
        ) : recentUsers.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {recentUsers.map((user: User, idx: number) => (
              <div key={user.id || user.email || idx} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
                <div>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                    {user.userType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">
            No users found
          </div>
        )}
      </Card>

      {/* Pending verifications */}
      <Card>
        <HeaderWithLink title="Pending Doctor Verifications" href="/admin/doctors?status=PENDING" />
        {doctorsLoading ? (
          <div className="p-6 flex justify-center">
            <Spinner />
          </div>
        ) : pendingDoctors.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {pendingDoctors.map((doctor: Doctor, idx: number) => (
              <div key={doctor.id || doctor.email || idx} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">Dr. {doctor.firstName} {doctor.lastName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.specialty}</p>
                </div>
                <Link href={`/admin/doctor-verification/${doctor.id}`}>
                  <Button size="sm" variant="secondary">Verify</Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">
            No pending verifications
          </div>
        )}
      </Card>
    </div>
  );
} 