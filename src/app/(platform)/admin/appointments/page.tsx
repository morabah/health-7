'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Calendar,
  ClipboardList,
  User,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';

import { useAllAppointments } from '@/data/adminLoaders';
import { AppointmentStatus, UserType } from '@/types/enums';
import { logInfo } from '@/lib/logger';
import type { Appointment } from '@/types/schemas';

// Define the expected response type from the hook for clarity
interface AdminAppointmentsData {
  success: boolean;
  appointments: Appointment[];
  totalCount: number;
  error?: string;
}

const ITEMS_PER_PAGE = 10;

export default function AdminAppointmentsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const apiPayload = useMemo(() => {
    const payload: { page: number; limit: number; status?: string } = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };
    if (statusFilter !== 'all' && statusFilter !== 'scheduled') {
      payload.status = statusFilter;
    }
    // Date filtering to startDate/endDate is complex; handled client-side for now.
    // Future: convert dateFilter to startDate/endDate and pass in payload.
    return payload;
  }, [currentPage, statusFilter]);

  const {
    data: appointmentsResponse,
    isLoading,
    error,
  } = useAllAppointments(apiPayload) as {
    data: AdminAppointmentsData | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const appointmentsToDisplay = appointmentsResponse?.success
    ? appointmentsResponse.appointments
    : [];
  const totalAppointments = appointmentsResponse?.success ? appointmentsResponse.totalCount : 0;
  const totalPages = Math.ceil(totalAppointments / ITEMS_PER_PAGE);

  // Client-side filtering for date and complex status cases (like 'scheduled')
  const filteredAppointments = useMemo(() => {
    return appointmentsToDisplay.filter((appointment: Appointment) => {
      let passesDateFilter = true;
      if (dateFilter !== 'all') {
        const appointmentDate = new Date(appointment.appointmentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        if (dateFilter === 'today')
          passesDateFilter = appointmentDate.toDateString() === today.toDateString();
        else if (dateFilter === 'tomorrow')
          passesDateFilter = appointmentDate.toDateString() === tomorrow.toDateString();
        else if (dateFilter === 'week')
          passesDateFilter = appointmentDate >= today && appointmentDate < nextWeek;
        else if (dateFilter === 'month')
          passesDateFilter = appointmentDate >= today && appointmentDate < nextMonth;
      }

      let passesStatusFilter = true;
      if (statusFilter === 'scheduled') {
        passesStatusFilter = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(
          appointment.status
        );
      } else if (statusFilter !== 'all' && apiPayload.status !== statusFilter) {
        passesStatusFilter = appointment.status === statusFilter;
      }

      return passesDateFilter && passesStatusFilter;
    });
  }, [appointmentsToDisplay, dateFilter, statusFilter, apiPayload.status]);

  useEffect(() => {
    logInfo('Admin appointments page loaded', {
      currentPage,
      statusFilter,
      dateFilter,
      totalFetched: appointmentsToDisplay.length,
      totalAvailable: totalAppointments,
    });
  }, [currentPage, statusFilter, dateFilter, appointmentsToDisplay.length, totalAppointments]);

  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages || 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">All Appointments ({totalAppointments})</h1>
      </div>

      {/* Filters Card */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-auto">
            <Select
              id="date-filter"
              label="Date"
              value={dateFilter}
              onChange={e => {
                setCurrentPage(1);
                setDateFilter(e.target.value);
              }}
              className="w-full sm:w-40"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </Select>
          </div>
          <div className="w-full sm:w-auto">
            <Select
              id="status-filter"
              label="Status"
              value={statusFilter}
              onChange={e => {
                setCurrentPage(1);
                setStatusFilter(e.target.value);
              }}
              className="w-full sm:w-40"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value={AppointmentStatus.COMPLETED}>Completed</option>
              <option value={AppointmentStatus.CANCELED}>Cancelled</option>
              <option value={AppointmentStatus.PENDING}>Pending</option>
              <option value={AppointmentStatus.CONFIRMED}>Confirmed</option>
            </Select>
          </div>
          <div className="flex-grow" />
        </div>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && (
        <Alert variant="error" className="my-4">
          Error loading appointments: {error instanceof Error ? error.message : String(error)}
        </Alert>
      )}

      {!isLoading && !error && filteredAppointments.length === 0 && (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-500 dark:text-slate-400">
            {totalAppointments > 0
              ? 'No appointments match your current filters.'
              : 'No appointments found.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setCurrentPage(1);
              setDateFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </Card>
      )}

      {!isLoading && !error && filteredAppointments.length > 0 && (
        <div className="space-y-4">
          {filteredAppointments.map((appointment: Appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}

      {!isLoading && !error && totalAppointments > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button onClick={handlePreviousPage} disabled={currentPage === 1} variant="outline">
            Previous
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline">
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// AppointmentCard component remains the same
function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const formattedDate = format(new Date(appointment.appointmentDate), 'PPPP');
  const statusMap: Record<string, string> = {
    [AppointmentStatus.PENDING]: 'Pending',
    [AppointmentStatus.CONFIRMED]: 'Confirmed',
    [AppointmentStatus.COMPLETED]: 'Completed',
    [AppointmentStatus.CANCELED]: 'Cancelled',
    [AppointmentStatus.RESCHEDULED]: 'Rescheduled',
  };
  const statusColor: Record<
    string,
    'success' | 'default' | 'warning' | 'info' | 'danger' | 'pending'
  > = {
    [AppointmentStatus.PENDING]: 'pending',
    [AppointmentStatus.CONFIRMED]: 'info',
    [AppointmentStatus.COMPLETED]: 'success',
    [AppointmentStatus.CANCELED]: 'danger',
    [AppointmentStatus.RESCHEDULED]: 'warning',
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 mr-3">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">{appointment.patientName}</h3>
              <div className="text-sm text-slate-500 dark:text-slate-400">Patient</div>
            </div>
          </div>
          <div className="flex items-center mt-2 md:mt-0 md:ml-6">
            <div className="flex flex-col">
              <div className="font-medium">Dr. {appointment.doctorName}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {appointment.doctorSpecialty}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
          <div>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
              <Calendar className="h-4 w-4 mr-2" />
              {formattedDate}
            </div>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300 mt-1">
              <Clock className="h-4 w-4 mr-2" />
              {appointment.startTime} - {appointment.endTime}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={statusColor[appointment.status] || 'default'}>
              {statusMap[appointment.status] || 'Unknown'}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              as={Link}
              href={`/admin/appointments/${appointment.id}`}
            >
              <ChevronRight className="h-4 w-4 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
