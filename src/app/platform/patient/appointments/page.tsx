'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Calendar, Clock, MapPin, MoreVertical, ChevronRight, Trash } from 'lucide-react';
import { Menu } from '@headlessui/react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import CancelAppointmentModal from '@/components/patient/CancelAppointmentModal';

// Sample data - would come from API in real implementation
const sampleAppointments = [
  {
    id: 'appt-123',
    doctorId: 'doc-123',
    doctorName: 'Dr. Sarah Johnson',
    doctorPhoto: '/placeholder-doctor.jpg',
    specialty: 'Cardiologist',
    date: '2023-12-15T00:00:00.000Z',
    time: '10:30 AM',
    address: '123 Medical Center, Suite 101',
    status: 'confirmed',
  },
  {
    id: 'appt-124',
    doctorId: 'doc-456',
    doctorName: 'Dr. Michael Chen',
    doctorPhoto: '/placeholder-doctor.jpg',
    specialty: 'Dermatologist',
    date: '2023-12-18T00:00:00.000Z',
    time: '2:00 PM',
    address: '456 Health Clinic, Floor 2',
    status: 'confirmed',
  },
  {
    id: 'appt-125',
    doctorId: 'doc-789',
    doctorName: 'Dr. Emily Wilson',
    doctorPhoto: '/placeholder-doctor.jpg',
    specialty: 'Neurologist',
    date: '2023-12-10T00:00:00.000Z',
    time: '9:15 AM',
    address: '789 Brain Center, Building A',
    status: 'past',
  },
];

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState(sampleAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<
    null | (typeof sampleAppointments)[0]
  >(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Filter appointments into upcoming and past
  const upcomingAppointments = appointments.filter(appt => appt.status !== 'past');
  const pastAppointments = appointments.filter(appt => appt.status === 'past');

  // Handle appointment cancellation
  const handleCancelAppointment = async (id: string, reason: string) => {
    try {
      // In a real app, this would call an API endpoint
      console.log(`Cancelling appointment ${id} with reason: ${reason}`);

      // Update local state to remove the appointment
      setAppointments(appointments.filter(appt => appt.id !== id));
      setShowCancelModal(false);

      // Would show a success toast in a real implementation
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      throw error; // Let the modal handle the error display
    }
  };

  // Open cancel modal with the selected appointment
  const openCancelModal = (appointment: (typeof sampleAppointments)[0]) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Appointments</h1>

      {/* Upcoming Appointments Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>

        {upcomingAppointments.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              You don&apos;t have any upcoming appointments.
            </p>
            <Button variant="primary" className="mt-4">
              Book an Appointment
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancelClick={() => openCancelModal(appointment)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past Appointments Section */}
      {pastAppointments.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Past Appointments</h2>
          <div className="space-y-4">
            {pastAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} isPast />
            ))}
          </div>
        </section>
      )}

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        appt={selectedAppointment}
        onConfirm={handleCancelAppointment}
      />
    </div>
  );
}

// Appointment Card Component
function AppointmentCard({
  appointment,
  isPast = false,
  onCancelClick,
}: {
  appointment: (typeof sampleAppointments)[0];
  isPast?: boolean;
  onCancelClick?: () => void;
}) {
  const formattedDate = format(new Date(appointment.date), 'MMMM d, yyyy');

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        {/* Doctor Info */}
        <div className="flex space-x-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden">
            <Image
              src={appointment.doctorPhoto}
              alt={appointment.doctorName}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h3 className="font-medium">{appointment.doctorName}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{appointment.specialty}</p>

            <div className="mt-2 space-y-1">
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                <Calendar className="h-4 w-4 mr-2" />
                {formattedDate}
              </div>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                <Clock className="h-4 w-4 mr-2" />
                {appointment.time}
              </div>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                <MapPin className="h-4 w-4 mr-2" />
                {appointment.address}
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge and Actions */}
        <div className="flex flex-col items-end space-y-2">
          <Badge variant={isPast ? 'default' : 'success'}>
            {isPast ? 'Completed' : 'Confirmed'}
          </Badge>

          {!isPast && (
            <Menu as="div" className="relative">
              <Menu.Button className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                <MoreVertical className="h-5 w-5 text-slate-400" />
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-1 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="p-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active
                            ? 'bg-primary-50 dark:bg-slate-700 text-primary-600 dark:text-white'
                            : 'text-slate-700 dark:text-slate-200'
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                        onClick={() => (window.location.href = `/doctor/${appointment.doctorId}`)}
                      >
                        <ChevronRight className="mr-2 h-4 w-4" />
                        View Doctor Profile
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active
                            ? 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200'
                            : 'text-red-500 dark:text-red-400'
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                        onClick={onCancelClick}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Cancel Appointment
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Menu>
          )}
        </div>
      </div>
    </Card>
  );
}
