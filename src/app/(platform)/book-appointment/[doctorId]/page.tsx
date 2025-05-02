'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  CheckCircle,
  MapPin,
  VideoIcon,
  Calendar,
} from 'lucide-react';
import { logInfo, logValidation, logError } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { useDoctorProfile, useDoctorAvailability, useAvailableSlots } from '@/data/sharedLoaders';
import { useBookAppointment } from '@/data/sharedLoaders';
import { format, addDays } from 'date-fns';
import { AppointmentType } from '@/types/enums';
import Image from 'next/image';
import type { DoctorProfile, TimeSlot } from '@/types/schemas';

// Define the merged doctor profile type based on API response
interface DoctorPublicProfile
  extends Omit<DoctorProfile, 'servicesOffered' | 'educationHistory' | 'experience'> {
  id: string;
  firstName: string;
  lastName: string;
  rating?: number;
  reviewCount?: number;
  servicesOffered?: string[];
  educationHistory?: { institution: string; degree: string; year: string }[];
  experience?: { position: string; hospital: string; duration: string }[];
}

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const doctorId = params?.doctorId as string;

  // Fetch doctor profile and availability
  const {
    data: doctorData,
    isLoading: doctorLoading,
    error: doctorError,
  } = useDoctorProfile(doctorId) as {
    data?: { success: boolean; doctor: DoctorPublicProfile };
    isLoading: boolean;
    error: unknown;
  };
  const {
    data: availabilityData,
    isLoading: availabilityLoading,
    error: availabilityError,
  } = useDoctorAvailability(doctorId) as {
    data?: {
      success: boolean;
      availability: { weeklySchedule: Record<string, TimeSlot[]>; blockedDates: string[] };
    };
    isLoading: boolean;
    error: unknown;
  };
  const bookAppointmentMutation = useBookAppointment();
  const availableSlotsMutation = useAvailableSlots();

  // State variables
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(
    AppointmentType.IN_PERSON
  );
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<
    Array<{ startTime: string; endTime: string }>
  >([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectableDates, setSelectableDates] = useState<Date[]>([]);

  // Generate dates for the next 14 days
  const generateDates = () => {
    const dates = [];
    const currentDate = new Date();

    for (let i = 1; i <= 14; i++) {
      const date = addDays(currentDate, i);
      dates.push(date);
    }

    return dates;
  };

  const allDates = generateDates();

  // Determine which dates are actually available based on doctor's schedule and blocked dates
  useEffect(() => {
    if (availabilityData?.success) {
      const { weeklySchedule, blockedDates } = availabilityData.availability;

      // Filter dates that have slots in weekly schedule and are not blocked
      const availableDates = allDates.filter(date => {
        const dayOfWeek = format(date, 'EEEE').toLowerCase();
        const hasSchedule = weeklySchedule[dayOfWeek] && weeklySchedule[dayOfWeek].length > 0;

        // Check if date is in blocked dates
        const formattedDate = format(date, 'yyyy-MM-dd');
        const isBlocked = blockedDates.some(blockedDate => {
          return blockedDate.includes(formattedDate);
        });

        return hasSchedule && !isBlocked;
      });

      setSelectableDates(availableDates);
    }
  }, [availabilityData]);

  // Update to get available slots from the API when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !doctorId) return;

      setSlotsLoading(true);
      setError(null);

      try {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        logInfo('Fetching available slots', { doctorId, date: formattedDate });

        const result = await availableSlotsMutation.mutateAsync({
          doctorId,
          date: formattedDate,
        });

        if (result.success) {
          if (!result.slots || !Array.isArray(result.slots)) {
            setError('Invalid response format from server. Please try again later.');
            logError('Invalid slots response format', { doctorId, date: formattedDate, result });
            setAvailableTimeSlots([]);
          } else if (result.slots.length === 0) {
            setAvailableTimeSlots([]);
            setError(
              `No available appointment slots for ${formatDate(selectedDate)}. This could be because the doctor's schedule is full or they don't have office hours on this day. Please select another date.`
            );
            logInfo('No slots available', { doctorId, date: formattedDate });
          } else {
            setAvailableTimeSlots(result.slots);
            setError(null);
            logInfo('Slots loaded successfully', {
              doctorId,
              date: formattedDate,
              count: result.slots.length,
            });
          }
        } else {
          const errorMessage = result.error || 'Unknown error';
          setError(`Failed to load available slots: ${errorMessage}`);
          logError('Failed to fetch available slots', {
            doctorId,
            date: formattedDate,
            error: errorMessage,
          });
          setAvailableTimeSlots([]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(
          `Error loading available time slots: ${errorMessage}. Please try again later or select a different date.`
        );
        logError('Error in fetchAvailableSlots', {
          error: err,
          doctorId,
          date: format(selectedDate, 'yyyy-MM-dd'),
        });
        setAvailableTimeSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    if (selectedDate && doctorId) {
      fetchAvailableSlots();

      // Reset selected time slot when date changes
      setSelectedTimeSlot(null);
      setSelectedEndTime(null);
    }
    // Only run this effect when the date or doctorId changes, not on every availableSlotsMutation change
  }, [selectedDate, doctorId]);

  // Check if a date is selectable
  const isDateSelectable = (date: Date) => {
    return selectableDates.some(
      selectableDate => format(selectableDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, 'EEE, MMM d, yyyy');
  };

  // Handle booking submission
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTimeSlot || !selectedEndTime) {
      setError('Please select a date and time for your appointment');
      return;
    }

    setError(null);

    try {
      const result = await bookAppointmentMutation.mutateAsync({
        doctorId,
        appointmentDate: selectedDate.toISOString(),
        startTime: selectedTimeSlot,
        endTime: selectedEndTime,
        reason,
        appointmentType: appointmentType,
      });

      if (result.success) {
        setSuccess(true);
        setError(null);
        logInfo('appointment', {
          action: 'book-appointment-success',
          doctorId,
          patientId: user?.uid,
          date: selectedDate.toISOString(),
          time: selectedTimeSlot,
        });

        logValidation(
          '4.11',
          'success',
          'Book appointment function fully operational with real data'
        );

        // Redirect to appointments page with justBooked parameter
        setTimeout(() => {
          router.push('/patient/appointments?justBooked=1');
        }, 1500);
      } else {
        setError(result.error || 'Failed to book appointment');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred while booking your appointment';
      setError(errorMessage);
      logError('Error in handleBookAppointment', err);
    }
  };

  const isLoading = doctorLoading || availabilityLoading;
  const doctor = doctorData?.success ? doctorData.doctor : null;

  if (doctorError || availabilityError) {
    return (
      <Alert variant="error">
        {doctorError instanceof Error
          ? doctorError.message
          : String(doctorError || availabilityError)}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Book Appointment</h1>
        <Link href={`/doctor-profile/${doctorId}`}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Profile
          </Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Info Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : doctor ? (
              <>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                    {doctor.profilePictureUrl ? (
                      <Image
                        src={doctor.profilePictureUrl as string}
                        alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                        className="h-12 w-12 rounded-full object-cover"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {typeof doctor.firstName === 'string' ? doctor.firstName[0] : ''}
                        {typeof doctor.lastName === 'string' ? doctor.lastName[0] : ''}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      Dr. {doctor.firstName ?? ''} {doctor.lastName ?? ''}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {doctor.specialty ?? ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {doctor.location && (
                    <div className="flex items-start text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 mr-2 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-300">
                        {doctor.location ?? ''}
                      </span>
                    </div>
                  )}
                  {doctor.consultationFee !== null && doctor.consultationFee !== undefined && (
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-300">
                        Consultation Fee: ${doctor.consultationFee}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-slate-500">
                Doctor information not available
              </div>
            )}

            {/* Selected appointment summary */}
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
                  {allDates.map((date, index) => {
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
                <Card className="p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">2. Select a Time Slot</h2>

                  {slotsLoading ? (
                    <div className="py-8 flex justify-center">
                      <Spinner />
                    </div>
                  ) : availableTimeSlots.length > 0 ? (
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
                <Button
                  type="submit"
                  disabled={!selectedDate || !selectedTimeSlot || bookAppointmentMutation.isPending}
                  isLoading={bookAppointmentMutation.isPending}
                >
                  Book Appointment
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
