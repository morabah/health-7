'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  CheckCircle,
  MapPin,
  VideoIcon,
  Calendar,
  AlertOctagon,
} from 'lucide-react';
import { logInfo, logValidation, logError } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { useDoctorProfile, useDoctorAvailability } from '@/data/sharedLoaders';
import { useBookAppointment } from '@/data/sharedLoaders';
import { format, addDays } from 'date-fns';
import { AppointmentType } from '@/types/enums';
import Image from 'next/image';
import type { DoctorProfile, TimeSlot } from '@/types/schemas';
import { 
  BookingWorkflowErrorBoundary, 
  TimeSlotSelectionErrorBoundary,
  BookingPaymentErrorBoundary
} from '@/components/error-boundaries';
import useErrorHandler from '@/hooks/useErrorHandler';
import useBookingError from '@/hooks/useBookingError';
import { callApi } from '@/lib/apiClient';

// Define the merged doctor profile type based on API response
interface DoctorPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  location?: string;
  consultationFee?: number;
  profilePictureUrl?: string;
  rating?: number;
  reviewCount?: number;
  servicesOffered?: string[];
  educationHistory?: { institution: string; degree: string; year: string }[];
  experience?: { position: string; hospital: string; duration: string }[];
}

// Define API response interfaces
interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

interface AvailableSlotsResponse {
  success: boolean;
  error?: string;
  slots: Array<{ startTime: string; endTime: string }>;
}

interface DoctorProfileResponse {
  success: boolean;
  error?: string;
  doctor: DoctorPublicProfile;
}

interface AvailabilityResponse {
  success: boolean;
  error?: string;
  availability: { 
    weeklySchedule: Record<string, TimeSlot[]>; 
    blockedDates: string[] 
  };
}

interface BookAppointmentParams {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  reason?: string;
}

// Create a custom fallback UI specific to the booking page
const BookingErrorFallback = () => (
  <div className="container mx-auto px-4 py-8 max-w-4xl">
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 text-center">
      <AlertOctagon className="mx-auto mb-4 h-12 w-12 text-red-500" />
      <h2 className="text-xl font-bold mb-2">Unable to Load Booking Page</h2>
      <p className="mb-4 text-slate-600 dark:text-slate-300">
        We encountered an error while trying to load the doctor's appointment booking page.
        This could be due to network issues or the doctor may no longer be available.
      </p>
      <div className="flex justify-center space-x-4 mt-6">
        <Link href="/find-doctors">
          <Button variant="primary">Find Another Doctor</Button>
        </Link>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    </div>
  </div>
);

function BookAppointmentPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { throwTimeSlotError, throwBookingError } = useBookingError();
  
  const doctorId = params?.doctorId ? String(params.doctorId) : '';

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(AppointmentType.IN_PERSON);
  const [reason, setReason] = useState<string>('');
  const [allDates, setAllDates] = useState<Date[]>([]);
  const [selectableDates, setSelectableDates] = useState<Date[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<{ startTime: string; endTime: string }>>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Fetch doctor profile with proper typing
  const { 
    data: doctorDataResponse, 
    isLoading: isLoadingDoctor,
    error: doctorError
  } = useDoctorProfile(doctorId) as {
    data: DoctorProfileResponse | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  
  const doctor = doctorDataResponse?.success ? doctorDataResponse.doctor : null;

  // Fetch doctor availability with proper typing
  const { 
    data: availabilityDataResponse, 
    isLoading: isLoadingAvailability,
    error: availabilityError
  } = useDoctorAvailability(doctorId) as {
    data: AvailabilityResponse | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const availability = availabilityDataResponse?.success ? availabilityDataResponse.availability : null;

  // Booking mutation
  const bookAppointmentMutation = useBookAppointment();

  const isLoading = isLoadingDoctor || isLoadingAvailability;

  // Log doctor fetch errors
  useEffect(() => {
    if (doctorError) {
      logError('Failed to fetch doctor profile', { doctorId, error: doctorError });
    }
    if (availabilityError) {
      logError('Failed to fetch doctor availability', { doctorId, error: availabilityError });
    }
  }, [doctorError, availabilityError, doctorId]);

  // Handle successful booking
  useEffect(() => {
    if (bookAppointmentMutation.isSuccess) {
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/patient/appointments?justBooked=1');
      }, 3000);
    }
  }, [bookAppointmentMutation.isSuccess, router]);

  // Generate selectable dates based on availability
  useEffect(() => {
    generateDates();
  }, [availabilityDataResponse]);

  // On date selection, fetch available time slots
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  // Generate dates for the next 14 days, marking which ones are available
  const generateDates = () => {
    const dates: Date[] = [];
    const availableDates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get doctor's availability
    const blockedDates = availability?.blockedDates || [];
    const weeklySchedule = availability?.weeklySchedule || {};

    // Generate dates for the next 14 days
    for (let i = 0; i < 14; i++) {
      const date = addDays(today, i);
      dates.push(date);

      // Check if this date is available
      const dayOfWeek = format(date, 'EEEE').toLowerCase();
      const dateString = format(date, 'yyyy-MM-dd');
      
      // A date is available if it's not blocked and has a schedule for that day
      const isBlocked = blockedDates.includes(dateString);
      const hasSchedule = weeklySchedule[dayOfWeek] && weeklySchedule[dayOfWeek].length > 0;
      
      if (!isBlocked && hasSchedule) {
        availableDates.push(date);
      }
    }

    setAllDates(dates);
    setSelectableDates(availableDates);

    // If we have available dates, pre-select the first one
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  };

  // Fetch available time slots for the selected date
  const fetchAvailableSlots = async () => {
    if (!selectedDate || !doctorId) return;

    setSlotsLoading(true);
    setAvailableTimeSlots([]);
    setSelectedTimeSlot('');
    setSelectedEndTime('');

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      // Use callApi directly with proper typing
      const response = await callApi<AvailableSlotsResponse>('getAvailableSlots', {
        doctorId,
        date: dateString
      });
      
      if (!response.success) {
        throwTimeSlotError(
          'LOADING_FAILED',
          `Failed to load time slots: ${response.error || 'Unknown error'}`,
          { doctorId, date: dateString }
        );
        return;
      }
      
      // If no slots are available
      if (!response.slots || response.slots.length === 0) {
        throwTimeSlotError(
          'NO_SLOTS_AVAILABLE',
          'No available time slots for the selected date',
          { doctorId, date: dateString }
        );
        return;
      }
      
      setAvailableTimeSlots(response.slots);
    } catch (err) {
      logError('Error fetching available slots', { error: err, doctorId, date: selectedDate });
      throwTimeSlotError(
        'LOADING_FAILED',
        'An error occurred while loading time slots',
        { doctorId, date: format(selectedDate, 'yyyy-MM-dd'), error: err }
      );
    } finally {
      setSlotsLoading(false);
    }
  };

  // Check if a date is selectable
  const isDateSelectable = (date: Date) => {
    return selectableDates.some(d => d.toDateString() === date.toDateString());
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  // Handle appointment booking
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      throwBookingError(
        'UNAUTHORIZED',
        'You must be logged in to book an appointment',
        { doctorId }
      );
      return;
    }

    if (!selectedDate || !selectedTimeSlot) {
      throwBookingError(
        'VALIDATION_ERROR',
        'Please select a date and time for your appointment',
        { doctorId, hasDate: !!selectedDate, hasTime: !!selectedTimeSlot }
      );
      return;
    }
    
    try {
      const appointmentDetails: BookAppointmentParams = {
        doctorId,
        appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedTimeSlot,
        endTime: selectedEndTime,
        appointmentType: appointmentType,
        reason: reason || 'General consultation'
      };
      
      await bookAppointmentMutation.mutateAsync(appointmentDetails);
    } catch (error) {
      logError('Failed to book appointment', { error, appointmentDetails: {
        doctorId,
        date: selectedDate,
        startTime: selectedTimeSlot
      }});
      
      throwBookingError(
        'BOOKING_CONFLICT',
        'Failed to book the appointment. The time slot may no longer be available.',
        { doctorId, date: format(selectedDate, 'yyyy-MM-dd'), startTime: selectedTimeSlot }
      );
    }
  };

  if (doctorError || availabilityError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <ErrorDisplay 
          error={doctorError || availabilityError}
          message="We couldn't load the doctor's information"
          category="data"
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back button */}
      <Link href="/find-doctors" className="inline-flex items-center text-sm text-primary mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Doctors
      </Link>

      <h1 className="text-2xl font-bold mb-6 dark:text-white">Book an Appointment</h1>

      {/* Error message from mutation */}
      {bookAppointmentMutation.isError && (
        <Alert variant="error" className="mb-6">
          {bookAppointmentMutation.error?.message || 'Failed to book appointment. Please try again.'}
        </Alert>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !doctor ? (
        <Alert variant="error">
          Doctor not found or has been removed from the platform.
        </Alert>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Doctor Info */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4">
                  <Image
                    src={doctor.profilePictureUrl || '/images/default-doctor.png'}
                    alt={`Dr. ${doctor.lastName}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <h2 className="text-xl font-semibold">
                  Dr. {doctor.firstName} {doctor.lastName}
                </h2>
                <p className="text-slate-600 dark:text-slate-300">{doctor.specialty}</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{doctor.location}</p>
                
                {doctor.consultationFee && (
                  <div className="mt-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    ${doctor.consultationFee} per visit
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-2">Services</h3>
                <ul className="text-sm space-y-1 text-slate-600 dark:text-slate-300">
                  {Array.isArray(doctor.servicesOffered) && doctor.servicesOffered.length > 0 ? (
                    doctor.servicesOffered.map((service: string, index: number) => (
                      <li key={index} className="flex items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                        {service}
                      </li>
                    ))
                  ) : (
                    <li className="flex items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                      General consultation
                    </li>
                  )}
                </ul>
              </div>
            
            {/* Appointment Summary */}
            {selectedDate && selectedTimeSlot && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="font-medium text-sm mb-2">Appointment Summary</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                    <span>{formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    <span>
                      {selectedTimeSlot} - {selectedEndTime}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    {appointmentType === AppointmentType.IN_PERSON ? (
                      <>
                        <MapPin className="h-4 w-4 mr-2 text-primary" />
                        <span>In-person visit</span>
                      </>
                    ) : (
                      <>
                        <VideoIcon className="h-4 w-4 mr-2 text-primary" />
                        <span>Video consultation</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Main Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          {success ? (
            <Card className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-success/10 p-3">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Appointment Booked Successfully!</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Your appointment with Dr. {doctor?.firstName ?? ''} {doctor?.lastName ?? ''} has
                been confirmed.
              </p>
              <p className="text-sm text-slate-500 mb-4">Redirecting to your appointments...</p>
            </Card>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <form onSubmit={handleBookAppointment}>
              {/* Date Selection */}
              <Card className="p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">1. Select a Date</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Array.isArray(allDates) && allDates.map((date, index) => {
                    const isSelectable = isDateSelectable(date);
                    return (
                      <button
                        key={index}
                        type="button"
                        disabled={!isSelectable}
                        className={`p-3 rounded-md border text-center transition-colors duration-200 ${
                          selectedDate && date.toDateString() === selectedDate.toDateString()
                            ? 'bg-primary/10 border-primary text-primary'
                            : isSelectable
                              ? 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600'
                        }`}
                        onClick={() => isSelectable && setSelectedDate(date)}
                      >
                        <div className="font-medium">{format(date, 'EEE')}</div>
                        <div className="text-xl font-bold">{format(date, 'd')}</div>
                        <div className="text-xs">{format(date, 'MMM')}</div>
                      </button>
                    );
                  })}
                </div>
                {selectableDates.length === 0 && !isLoading && (
                  <p className="text-center mt-4 text-slate-500">
                    No available dates in the doctor&apos;s schedule for the next 14 days
                  </p>
                )}
              </Card>

              {/* Time Slot Selection */}
              {selectedDate && (
                <TimeSlotSelectionErrorBoundary componentName="TimeSlotSelection">
                  <Card className="p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">2. Select a Time Slot</h2>

                    {slotsLoading ? (
                      <div className="py-8 flex justify-center">
                        <Spinner />
                      </div>
                    ) : Array.isArray(availableTimeSlots) && availableTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {availableTimeSlots.map((slot, index: number) => (
                          <Button
                            key={index}
                            type="button"
                            variant={slot.startTime === selectedTimeSlot ? 'primary' : 'outline'}
                            size="sm"
                            className="py-2 px-3 text-center justify-center"
                            onClick={() => {
                              setSelectedTimeSlot(slot.startTime);
                              setSelectedEndTime(slot.endTime);
                            }}
                          >
                            {slot.startTime}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>No available time slots for this date</p>
                        <p className="text-sm mt-1">Please select another date</p>
                      </div>
                    )}
                  </Card>
                </TimeSlotSelectionErrorBoundary>
              )}

              {/* Appointment Type & Reason */}
              {selectedDate && selectedTimeSlot && (
                <Card className="p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">3. Appointment Details</h2>

                  <div className="space-y-4">
                    <div>
                      <label
                        className="block text-sm font-medium mb-2"
                        htmlFor="appointment-type-inperson"
                      >
                        Appointment Type
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center" htmlFor="appointment-type-inperson">
                          <input
                            id="appointment-type-inperson"
                            type="radio"
                            className="h-4 w-4 text-primary border-slate-300"
                            checked={appointmentType === AppointmentType.IN_PERSON}
                            onChange={() => setAppointmentType(AppointmentType.IN_PERSON)}
                          />
                          <span className="ml-2 text-sm">In-person Visit</span>
                        </label>
                        <label className="flex items-center" htmlFor="appointment-type-video">
                          <input
                            id="appointment-type-video"
                            type="radio"
                            className="h-4 w-4 text-primary border-slate-300"
                            checked={appointmentType === AppointmentType.VIDEO}
                            onChange={() => setAppointmentType(AppointmentType.VIDEO)}
                          />
                          <span className="ml-2 text-sm">Video Consultation</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" htmlFor="reason">
                        Reason for Visit (Optional)
                      </label>
                      <Textarea
                        id="reason"
                        rows={3}
                        placeholder="Describe your symptoms or reason for the appointment"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <BookingPaymentErrorBoundary componentName="BookAppointmentSubmit">
                  <Button
                    type="submit"
                    disabled={!selectedDate || !selectedTimeSlot || bookAppointmentMutation.isPending}
                    isLoading={bookAppointmentMutation.isPending}
                  >
                    Book Appointment
                  </Button>
                </BookingPaymentErrorBoundary>
              </div>
            </form>
          )}
        </div>
      </div>
    )}
    </div>
  );
}

// Export with error boundary
export default function BookAppointmentPage() {
  return (
    <BookingWorkflowErrorBoundary componentName="BookAppointmentPage">
      <BookAppointmentPageContent />
    </BookingWorkflowErrorBoundary>
  );
}
