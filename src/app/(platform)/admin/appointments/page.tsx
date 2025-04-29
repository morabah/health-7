'use client';

import { useState, useEffect } from 'react';
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

import { useAdminAppointments } from '@/data/adminLoaders';
import { AppointmentStatus, UserType } from '@/types/enums';
import { logInfo } from '@/lib/logger';
import type { Appointment } from '@/types/schemas';

export default function AdminAppointmentsPage() {
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  
  // Get appointments data from API
  const { data: appointmentsData, isLoading, error } = useAdminAppointments();

  // Filter appointments based on selected filters
  const appointments = appointmentsData?.success ? appointmentsData.appointments : [];
  
  const filteredAppointments = appointments.filter((appointment: Appointment) => {
    // Date filtering
    const appointmentDate = new Date(appointment.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    let passesDateFilter = true;
    
    if (dateFilter === 'today') {
      passesDateFilter = appointmentDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'tomorrow') {
      passesDateFilter = appointmentDate.toDateString() === tomorrow.toDateString();
    } else if (dateFilter === 'week') {
      passesDateFilter = appointmentDate >= today && appointmentDate <= nextWeek;
    } else if (dateFilter === 'month') {
      passesDateFilter = appointmentDate >= today && appointmentDate <= nextMonth;
    }
    
    // Status filtering
    let passesStatusFilter = true;
    
    if (statusFilter === 'scheduled') {
      passesStatusFilter = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status);
    } else if (statusFilter === 'completed') {
      passesStatusFilter = appointment.status === AppointmentStatus.COMPLETED;
    } else if (statusFilter === 'cancelled') {
      passesStatusFilter = appointment.status === AppointmentStatus.CANCELED;
    }
    
    return passesDateFilter && passesStatusFilter;
  });
  
  useEffect(() => {
    logInfo('Admin appointments page loaded');
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">All Appointments</h1>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-auto">
            <Select
              id="date-filter"
              label="Date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
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
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div className="flex-grow" />
        </div>
      </Card>

      {/* Loading, Error and Empty States */}
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
          <p className="text-slate-500 dark:text-slate-400">No appointments found matching your filters.</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => {
              setDateFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </Card>
      )}

      {/* List View */}
      {!isLoading && !error && filteredAppointments.length > 0 && (
        <div className="space-y-4">
          {filteredAppointments.map((appointment: Appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Appointment Card Component
function AppointmentCard({
  appointment,
}: {
  appointment: Appointment;
}) {
  // Format date nicely
  const formattedDate = format(new Date(appointment.appointmentDate), 'PPPP');

  const statusMap: Record<string, string> = {
    [AppointmentStatus.PENDING]: 'Pending',
    [AppointmentStatus.CONFIRMED]: 'Confirmed',
    [AppointmentStatus.COMPLETED]: 'Completed',
    [AppointmentStatus.CANCELED]: 'Cancelled',
    [AppointmentStatus.RESCHEDULED]: 'Rescheduled'
  };

  const statusColor: Record<string, "success" | "default" | "warning" | "info" | "danger" | "pending"> = {
    [AppointmentStatus.PENDING]: 'pending',
    [AppointmentStatus.CONFIRMED]: 'info',
    [AppointmentStatus.COMPLETED]: 'success',
    [AppointmentStatus.CANCELED]: 'danger',
    [AppointmentStatus.RESCHEDULED]: 'warning',
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Patient Info & Time */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 mr-3">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">{appointment.patientName}</h3>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Patient
              </div>
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

        {/* Date, Time and Status */}
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

            <Button size="sm" variant="outline" as={Link} href={`/admin/appointments/${appointment.id}`}>
              <ChevronRight className="h-4 w-4 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </div>
      
      {appointment.reason && (
        <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">
          <strong>Reason:</strong> {appointment.reason}
        </p>
      )}
    </Card>
  );
} 