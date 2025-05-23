'use client';

import React, { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { Calendar, Clock } from 'lucide-react';
import { useAvailableSlots } from '@/data/sharedLoaders';
import { AppointmentType } from '@/types/enums';
import type { DoctorProfile } from '@/types/schemas';
import { UserType } from '@/types/enums';

// Define the slot interface
export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// Define the API response interface
interface AvailableSlotsResponse {
  success: boolean;
  slots: TimeSlot[];
  error?: string;
}

// Extend the base DoctorProfile to include the properties we need
// Making all properties optional to match the actual data structure
interface DoctorProfileWithName extends Partial<DoctorProfile> {
  userId: string; // Keep userId as required
  firstName?: string;
  lastName?: string;
  name?: string;
  specialty?: string;
}

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorOptions: DoctorProfileWithName[];
  onBook: (data: {
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    appointmentType: AppointmentType;
    notes?: string;
  }) => Promise<void>;
}

export default function BookAppointmentModal({
  isOpen,
  onClose,
  doctorOptions,
  onBook,
}: BookAppointmentModalProps) {
  const [doctorId, setDoctorId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [slot, setSlot] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(
    AppointmentType.IN_PERSON
  );
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch available slots only when doctorId and date are selected
  const {
    data: slotsData,
    isLoading: slotsLoading,
    error: slotsError,
  } = useAvailableSlots(doctorId, date);

  // Memoize available slots for the selected doctor/date
  const availableSlots = useMemo(() => {
    if (
      !slotsData ||
      typeof slotsData !== 'object' ||
      !('success' in slotsData) ||
      !slotsData.success
    ) {
      return [];
    }

    const slots = (slotsData as AvailableSlotsResponse).slots || [];
    return Array.isArray(slots) ? slots.filter((s: TimeSlot) => s.isAvailable) : [];
  }, [slotsData]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate required fields with specific error messages
    if (!doctorId) {
      setError('Please select a doctor to continue.');
      return;
    }

    if (!date) {
      setError('Please select an appointment date.');
      return;
    }

    if (!slot) {
      setError('Please select an available time slot.');
      return;
    }

    setLoading(true);

    try {
      // Format the date to ISO string for the backend
      const appointmentDate = new Date(date);
      const isoDate = appointmentDate.toISOString();

      // Get the selected time slot details
      const selectedSlot = availableSlots.find(s => s.startTime === slot);

      if (!selectedSlot) {
        throw new Error('Selected time slot is no longer available. Please choose another time.');
      }

      // Validate time format (HH:MM)
      const timeFormatRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
      if (
        !timeFormatRegex.test(selectedSlot.startTime) ||
        !timeFormatRegex.test(selectedSlot.endTime)
      ) {
        throw new Error('Invalid time format. Time must be in HH:MM format.');
      }

      // Log the formatted appointment details for debugging
      console.log('Formatted times:', {
        original: { date, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime },
        formatted: {
          date: isoDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        },
      });

      // Call the onBook callback with the appointment details
      await onBook({
        doctorId,
        appointmentDate: isoDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        appointmentType,
        notes: `Appointment with Dr. ${getDoctorName(doctorId)} on ${new Date(date).toLocaleDateString()} at ${selectedSlot.startTime}`,
      });

      // Show success message
      setSuccess(true);

      // Reset form after successful booking
      setDoctorId('');
      setDate('');
      setSlot('');
      setAppointmentType(AppointmentType.IN_PERSON);

      // Close the modal after 2 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 2000);

      // Use a useEffect for cleanup instead of returning from the async function
      React.useEffect(() => {
        return () => clearTimeout(timer);
      }, [timer]);
    } catch (err: any) {
      console.error('Booking error:', err);

      // Enhanced error handling with improved API response checking
      let errorMessage = 'Booking failed. Please check your appointment details and try again.';

      // First check if we have an API response object
      if (err?.success === false) {
        // This is a structured API error response
        errorMessage =
          err.message ||
          err.error ||
          'Booking failed. Please check your appointment details and try again.';
        console.log('API error response:', err);
      } else if (err?.message) {
        // Check for specific validation errors and provide helpful messages
        if (err.message.includes('startTime') || err.message.includes('endTime')) {
          errorMessage = 'Invalid appointment time format. Please select a different time slot.';
        } else if (err.message.includes('doctorId')) {
          errorMessage = 'Doctor selection is invalid. Please select a different doctor.';
        } else if (err.message.includes('appointmentDate')) {
          errorMessage = 'Invalid appointment date. Please select a different date.';
        } else {
          errorMessage = err.message;
        }
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      // Log the derived error message
      console.log('Displaying error to user:', errorMessage);

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get doctor name from ID
  const getDoctorName = (id: string): string => {
    const doctor = doctorOptions.find(d => d.userId === id);
    if (!doctor) return '';
    return `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Unknown';
  };

  // Logging for debugging redundant API calls
  React.useEffect(() => {
    if (doctorId && date) {
      // eslint-disable-next-line no-console
      console.log('useAvailableSlots called', { doctorId, date });
    }
  }, [doctorId, date]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Book Appointment">
      <form onSubmit={handleBook} className="space-y-4">
        <div>
          <div className="mb-4">
            <label htmlFor="doctor-select" className="block text-sm font-medium text-gray-700 mb-1">
              Doctor <span className="text-red-500">*</span>
            </label>
            <Select
              id="doctor-select"
              value={doctorId}
              onChange={e => {
                setDoctorId(e.target.value);
                setDate(''); // Reset date when doctor changes
                setSlot(''); // Reset slot when doctor changes
              }}
              required
              aria-required="true"
              aria-invalid={!doctorId}
              className="w-full"
            >
              <option value="">Select a doctor</option>
              {doctorOptions.map(doc => (
                <option key={doc.userId} value={doc.userId}>
                  {`${doc.firstName || ''} ${doc.lastName || ''}`.trim()}{' '}
                  {doc.specialty ? `(${doc.specialty})` : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mb-4">
          <label
            htmlFor="appointment-date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="appointment-date"
            type="date"
            className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={date}
            min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
            onChange={e => {
              setDate(e.target.value);
              setSlot(''); // Reset slot when date changes
            }}
            required
            aria-required="true"
            aria-invalid={!date}
            disabled={!doctorId}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="time-slot" className="block text-sm font-medium text-gray-700 mb-1">
            Time Slot <span className="text-red-500">*</span>
          </label>
          {slotsLoading ? (
            <div className="flex items-center justify-center p-4">
              <Spinner size="sm" />
              <span className="ml-2 text-sm text-gray-600">Loading available time slots...</span>
            </div>
          ) : availableSlots.length === 0 && date && !slotsError ? (
            <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded-md">
              No available time slots for the selected date. Please choose another date.
            </div>
          ) : (
            <Select
              id="time-slot"
              value={slot}
              onChange={e => setSlot(e.target.value)}
              required
              disabled={!doctorId || !date || availableSlots.length === 0}
              aria-required="true"
              aria-invalid={!slot}
              className="w-full"
            >
              <option value="">Select a time slot</option>
              {availableSlots.length > 0 ? (
                availableSlots.map((s: TimeSlot) => (
                  <option
                    key={s.startTime}
                    value={s.startTime}
                    disabled={!s.isAvailable}
                    className={!s.isAvailable ? 'text-gray-400' : ''}
                  >
                    {s.startTime} - {s.endTime}
                    {!s.isAvailable ? ' (Booked)' : ''}
                  </option>
                ))
              ) : (
                <option disabled>No available slots</option>
              )}
            </Select>
          )}
          {slotsError && (
            <Alert variant="error" className="mt-2">
              Failed to load time slots. {slotsError.message || 'Please try again.'}
            </Alert>
          )}
        </div>
        <div className="mb-6">
          <label
            htmlFor="appointment-type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Appointment Type <span className="text-red-500">*</span>
          </label>
          <Select
            id="appointment-type"
            value={appointmentType}
            onChange={e => setAppointmentType(e.target.value as AppointmentType)}
            required
            aria-required="true"
            className="w-full"
          >
            <option value={AppointmentType.IN_PERSON}>In-Person</option>
            <option value={AppointmentType.VIDEO}>Video Call</option>
          </Select>
          <p className="mt-1 text-xs text-gray-500">
            {appointmentType === AppointmentType.IN_PERSON
              ? "You will visit the doctor's office in person."
              : 'You will receive a video call link before the appointment.'}
          </p>
        </div>
        {error && (
          <Alert variant="error" className="mb-4">
            <div className="flex items-start">
              <span className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                {error.includes('time format') && (
                  <div className="mt-1 text-xs text-red-600">
                    Make sure times are in 24-hour format (e.g., 14:30).
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-4">
            <div className="flex items-start">
              <span className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Your appointment has been booked successfully! You'll receive a confirmation
                    shortly.
                  </p>
                </div>
                <div className="mt-1 text-xs text-green-600">
                  You can view and manage your appointments in the Appointments tab.
                </div>
              </div>
            </div>
          </Alert>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !doctorId || !date || !slot}
            className="px-6 py-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Booking...
              </>
            ) : (
              'Book Appointment'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export { BookAppointmentModal };
