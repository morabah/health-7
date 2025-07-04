'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import { CalendarDays, Clock, Check, MapPin, Video, AlertOctagon, CheckCircle } from 'lucide-react';
import { logError, logInfo } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { useDoctorProfile, useDoctorAvailability, useBookAppointment } from '@/data/sharedLoaders';
import { format } from 'date-fns';
import { AppointmentType } from '@/types/enums';
import Image from 'next/image';
import type { TimeSlot } from '@/types/schemas';
import { BookAppointmentSchema } from '@/types/schemas';
import {
  BookingWorkflowErrorBoundary,
  TimeSlotSelectionErrorBoundary,
} from '@/components/error-boundaries';
import useBookingError from '@/hooks/useBookingError';
import { callApi } from '@/lib/apiClient';
import {
  SlotUnavailableError,
  ValidationError,
  AuthError,
  ApiError,
  AppointmentError,
} from '@/lib/errors/errorClasses';
import { UserType } from '@/types/enums';
import { BookAppointmentPreloader } from '@/lib/preloadStrategies';
import enhancedCache, { CacheCategory } from '@/lib/cacheManager';
import { trackPerformance } from '@/lib/performance';
import { useQueryClient } from '@tanstack/react-query';

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
    blockedDates: string[];
  };
}

interface BookAppointmentParams {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  reason?: string;
  patientId: string; // Make patientId required for the mock API
}

// Define BookingResult type to fix the error
interface BookingResult {
  success: boolean;
  error?: string;
  appointmentId?: string;
}

interface BookAppointmentResponse {
  success: boolean;
  error?: string;
  message?: string;
  appointment?: {
    id?: string;
    patientId?: string;
    patientName?: string;
    doctorId?: string;
    doctorName?: string;
    doctorSpecialty?: string;
    appointmentDate?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
    reason?: string | null;
    notes?: string | null;
    appointmentType?: string;
    videoCallUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
  };
  data?: {
    appointment?: {
      id: string;
      [key: string]: any;
    };
  };
}

// Create a custom fallback UI specific to the booking page
const BookingErrorFallback = () => (
  <div className="container mx-auto px-4 py-8 max-w-4xl">
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 text-center">
      <AlertOctagon className="mx-auto mb-4 h-12 w-12 text-red-500" />
      <h2 className="text-xl font-bold mb-2">Unable to Load Booking Page</h2>
      <p className="mb-4 text-slate-600 dark:text-slate-300">
        We encountered an error while trying to load the doctor's appointment booking page. This
        could be due to network issues or the doctor may no longer be available.
      </p>
      <div className="flex justify-center space-x-4 mt-6">
        <Link href="/find-doctors">
          <Button variant="primary">Find Another Doctor</Button>
        </Link>
        <Button variant="outline" onClick={() => window.location.reload()}>
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
  const queryClient = useQueryClient();

  // Track performance
  const perfTracker = useRef(trackPerformance('BookAppointmentPage'));

  const doctorId = params?.doctorId ? String(params.doctorId) : '';
  const isMountedRef = useRef<boolean>(true);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(
    AppointmentType.IN_PERSON
  );
  const [reason, setReason] = useState<string>('');
  const [allDates, setAllDates] = useState<Date[]>([]);
  const [selectableDates, setSelectableDates] = useState<Date[]>([]);
  const [calendarGrid, setCalendarGrid] = useState<(Date | null)[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<
    Array<{ startTime: string; endTime: string }>
  >([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [didInitialPreload, setDidInitialPreload] = useState<boolean>(false);

  // Add a cache for date slots to prevent redundant API calls
  const cachedSlots = useRef<Record<string, Array<{ startTime: string; endTime: string }>>>({});

  // Reason for visit section with proper state variables
  const [isEmergency, setIsEmergency] = useState(false);

  // Set up mount status tracking and preload data
  useEffect(() => {
    isMountedRef.current = true;

    // Track initial page load performance
    perfTracker.current.mark('preload-start');

    // Preload all doctor data in an optimized batch
    if (doctorId && !didInitialPreload) {
      const preloader = new BookAppointmentPreloader(doctorId, user?.uid, user?.role as UserType);

      preloader
        .preloadAll()
        .then(() => {
          if (isMountedRef.current) {
            setDidInitialPreload(true);
            perfTracker.current.mark('preload-complete');
          }
        })
        .catch(error => {
          logError('Error preloading doctor data', { error, doctorId });
        });
    }

    return () => {
      isMountedRef.current = false;
      // Record performance metrics
      perfTracker.current.stop();
    };
  }, [doctorId, user, didInitialPreload]);

  // Check if user is a patient at component load
  useEffect(() => {
    if (user && user.role !== UserType.PATIENT) {
      setRoleError('Only patients can book appointments. Please login with a patient account.');
    } else {
      setRoleError(null);
    }
  }, [user]);

  // Fetch doctor profile with proper typing
  const {
    data: doctorDataResponse,
    isLoading: isLoadingDoctor,
    error: doctorError,
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
    error: availabilityQueryError,
  } = useDoctorAvailability(doctorId) as {
    data: AvailabilityResponse | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const availability = availabilityDataResponse?.success
    ? availabilityDataResponse.availability
    : null;

  // Booking mutation
  const bookAppointmentMutation = useBookAppointment();

  const isLoading = isLoadingDoctor || isLoadingAvailability;

  // Log doctor fetch errors
  useEffect(() => {
    if (doctorError) {
      logError('Failed to fetch doctor profile', { doctorId, error: doctorError });
    }
    if (availabilityQueryError) {
      logError('Failed to fetch doctor availability', { doctorId, error: availabilityQueryError });
    }
  }, [doctorError, availabilityQueryError, doctorId]);

  // Handle successful booking
  useEffect(() => {
    if (bookAppointmentMutation.isSuccess) {
      if (isMountedRef.current) {
        setSuccess(true);
        perfTracker.current.mark('booking-success');
      }

      // Use a variable to track timeout
      const redirectTimeout = setTimeout(() => {
        // Check if component is still mounted before redirecting
        if (isMountedRef.current) {
          router.push('/patient/appointments?justBooked=1');
        }
      }, 3000);

      // Clean up the timeout if the component unmounts
      return () => {
        clearTimeout(redirectTimeout);
      };
    }
  }, [bookAppointmentMutation.isSuccess, router]);

  // Generate calendar grid with proper date positioning
  const generateDates = useCallback(() => {
    perfTracker.current.mark('generating-dates');

    // Don't proceed if component is unmounted
    if (!isMountedRef.current) return;

    const dates: (Date | null)[] = []; // null represents empty calendar cells
    const availableDates: Date[] = [];
    const actualDates: Date[] = []; // For tracking actual date objects
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get doctor's availability
    const weeklySchedule = availability?.weeklySchedule || {};
    const blockedDates = new Set(availability?.blockedDates || []);

    // Generate dates for the next 14 days
    const futureDates: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      futureDates.push(date);
    }

    // Create calendar grid - start with the first date's week
    const firstDate = futureDates[0];
    const startOfWeek = new Date(firstDate);
    startOfWeek.setDate(firstDate.getDate() - firstDate.getDay()); // Go to Sunday

    // Generate calendar grid (3 weeks should be enough for 14 days)
    for (let i = 0; i < 21; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      // Check if this date is in our future dates list
      const isFutureDate = futureDates.some(futureDate => 
        date.getFullYear() === futureDate.getFullYear() &&
        date.getMonth() === futureDate.getMonth() &&
        date.getDate() === futureDate.getDate()
      );

      if (isFutureDate) {
        dates.push(date);
        actualDates.push(date);

        // Check if this date is available in doctor's schedule
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        const dateStr = date.toISOString().split('T')[0];

        // Date is available if it's in weekly schedule and not in blocked dates
        if (weeklySchedule[dayName]?.length > 0 && !blockedDates.has(dateStr)) {
          availableDates.push(date);
        }
      } else {
        // Add null for empty calendar cells (past dates or future dates not in our range)
        dates.push(null);
      }
    }

    if (isMountedRef.current) {
      setAllDates(actualDates); // Only actual dates for other functions
      setSelectableDates(availableDates);
      setCalendarGrid(dates); // Grid with nulls for proper positioning

      // Auto-select the first available date if none is selected
      if (!selectedDate && availableDates.length > 0) {
        handleDateSelect(availableDates[0]);
      }

      perfTracker.current.mark('dates-generated');
    }
  }, [availability, selectedDate]);

  // Use effect to generate dates when availability data is loaded
  useEffect(() => {
    if (availability) {
      generateDates();
    }
  }, [availability, generateDates]);

  // Check if a date is selectable (available in doctor's schedule)
  const isDateSelectable = useCallback(
    (date: Date) => {
      return selectableDates.some(d => d.getTime() === date.getTime());
    },
    [selectableDates]
  );

  // Format a date for display
  const formatDate = (date: Date) => {
    return format(date, 'EEEE, MMMM d');
  };

  // Handle selecting a date
  const handleDateSelect = useCallback(
    async (date: Date) => {
      if (!isMountedRef.current) return;

      perfTracker.current.mark('date-select-start');
      setSelectedDate(date);
      setSelectedTimeSlot('');
      setSelectedEndTime('');
      setSlotsLoading(true);
      setAvailabilityError(null);

      try {
        // Format date as full ISO 8601 string (YYYY-MM-DDTHH:mm:ss.sssZ)
        const dateStr = date.toISOString();

        // Check our local cache first
        if (cachedSlots.current[dateStr]) {
          setAvailableTimeSlots(cachedSlots.current[dateStr]);
          setSlotsLoading(false);
          perfTracker.current.mark('slots-loaded-from-cache');
          return;
        }

        // Try getting from enhanced cache
        const cachedData = enhancedCache.get<Array<{ startTime: string; endTime: string }>>(
          CacheCategory.APPOINTMENTS,
          enhancedCache.createKey('slots', doctorId, dateStr)
        );

        if (cachedData) {
          if (isMountedRef.current) {
            setAvailableTimeSlots(cachedData);
            // Store in our local component cache
            cachedSlots.current[dateStr] = cachedData;
            setSlotsLoading(false);
            perfTracker.current.mark('slots-loaded-from-cache');
          }
          return;
        }

        // If not cached, fetch from API
        const response = await callApi<AvailableSlotsResponse>(
          'getAvailableSlots',
          user ? { uid: user.uid, role: user.role } : undefined,
          { doctorId, date: dateStr }
        );

        if (!isMountedRef.current) return;

        if (response.success && response.slots) {
          setAvailableTimeSlots(response.slots);
          // Cache the result for future use
          cachedSlots.current[dateStr] = response.slots;
          // Also cache in enhanced cache
          enhancedCache.set(
            CacheCategory.APPOINTMENTS,
            enhancedCache.createKey('slots', doctorId, dateStr),
            response.slots,
            { ttl: 5 * 60 * 1000, priority: 'high' }
          );
          perfTracker.current.mark('slots-loaded-from-api');
        } else {
          setAvailableTimeSlots([]);
          // If error, we still cache an empty array to prevent repeated failed calls
          cachedSlots.current[dateStr] = [];
          if (response.error) {
            // Ensure error is always a string
            let errorMsg =
              typeof response.error === 'string' ? response.error : JSON.stringify(response.error);
            setAvailabilityError(errorMsg);
            logError('Slot availability API error', {
              error: response.error,
              doctorId,
              date: dateStr,
            });
          }
        }
      } catch (error) {
        if (error instanceof SlotUnavailableError) {
          setAvailabilityError('No available time slots for this date.'); // Always a string
          logError('Slot unavailable error', { error, doctorId, date: date.toISOString() });
        } else if (error instanceof ApiError) {
          setAvailabilityError(`Error fetching time slots: ${error.message}`);
        } else {
          // Enhanced error extraction and logging
          let errorMsg = 'Failed to fetch available time slots. Please try again.';
          if (error && typeof error === 'object') {
            if ('message' in error && typeof (error as any).message === 'string') {
              errorMsg = (error as any).message;
            } else if ('error' in error && typeof (error as any).error === 'string') {
              errorMsg = (error as any).error;
            } else {
              // For dev/debugging, stringify the error object
              errorMsg = `Slot availability error: ${JSON.stringify(error)}`;
            }
          }
          setAvailabilityError(errorMsg);
          // Always log the full error object for debugging (per lesson learned)
          logError('Error fetching time slots', { error, doctorId, date: date.toISOString() });
        }
        // Set empty slots if there's an error
        setAvailableTimeSlots([]);
      } finally {
        setSlotsLoading(false);
        perfTracker.current.mark('date-select-complete');
      }
    },
    [doctorId, user]
  );

  // Handle selecting a time slot
  const handleTimeSlotSelect = (startTime: string, endTime: string) => {
    setSelectedTimeSlot(startTime);
    setSelectedEndTime(endTime);
    setFieldErrors({});
  };

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isMountedRef.current) return;

      perfTracker.current.mark('form-submit-start');

      // Reset error states
      setFieldErrors({});
      setFormError(null);
      setPaymentError(null);

      try {
        // Basic validation
        const errors: Record<string, string> = {};
        if (!selectedDate) errors.date = 'Please select a date';
        if (!selectedTimeSlot) errors.time = 'Please select a time slot';
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          return;
        }

        if (!user || !user.uid) {
          throw new AuthError('You must be logged in to book an appointment');
        }

        // Format date for API
        const [hours, minutes] = selectedTimeSlot!.split(':');
        const appointmentDateTime = new Date(selectedDate!);
        appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        const appointmentDate = appointmentDateTime.toISOString();

        // Ensure time formats strictly conform to HH:MM pattern required by the schema
        const formatTimeString = (timeString: string | undefined): string => {
          if (!timeString) {
            throw new ValidationError('Time slot is required');
          }

          // If already in HH:MM format, return as is
          if (/^\d{2}:\d{2}$/.test(timeString)) {
            return timeString;
          }

          try {
            // Parse the time parts
            const parts = timeString.split(':');
            if (parts.length !== 2) {
              throw new ValidationError(`Invalid time format: ${timeString}. Must be HH:MM`);
            }

            const hours = parseInt(parts[0], 10);
            const minutes = parseInt(parts[1], 10);

            // Validate hour and minute values
            if (isNaN(hours) || hours < 0 || hours > 23) {
              throw new ValidationError(`Invalid hours value: ${parts[0]}. Must be 00-23`);
            }

            if (isNaN(minutes) || minutes < 0 || minutes > 59) {
              throw new ValidationError(`Invalid minutes value: ${parts[1]}. Must be 00-59`);
            }

            // Format with padding
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          } catch (error) {
            if (error instanceof ValidationError) {
              throw error;
            }
            throw new ValidationError(`Invalid time format: ${timeString}. Must be HH:MM`);
          }
        };

        const formattedStartTime = formatTimeString(selectedTimeSlot!);
        const formattedEndTime = formatTimeString(selectedEndTime!);

        // Log the formatted times for debugging
        console.log('Formatted times:', {
          original: { start: selectedTimeSlot, end: selectedEndTime },
          formatted: { start: formattedStartTime, end: formattedEndTime },
        });

        // Prepare booking payload
        const bookingPayload: BookAppointmentParams = {
          doctorId,
          appointmentDate,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          appointmentType,
          reason: reason.trim() || undefined,
          patientId: user.uid, // Add patientId for the mock API
        };

        // Perform pre-validation checks before using Zod
        if (!bookingPayload.doctorId) {
          setFormError('Doctor ID is required');
          setFieldErrors({ doctorId: 'Doctor ID is required' });
          return;
        }

        if (!bookingPayload.startTime || !bookingPayload.endTime) {
          setFormError('Start and end times are required');
          setFieldErrors({ time: 'Please select a valid time slot' });
          return;
        }

        // Explicitly check the time format against the regex pattern
        const timeFormatRegex = /^\d{2}:\d{2}$/;
        if (!timeFormatRegex.test(bookingPayload.startTime)) {
          setFormError(`Invalid start time format: ${bookingPayload.startTime}. Must be HH:MM`);
          setFieldErrors({ time: 'Invalid start time format (HH:MM)' });
          logError('Time format validation failed', { startTime: bookingPayload.startTime });
          return;
        }

        if (!timeFormatRegex.test(bookingPayload.endTime)) {
          setFormError(`Invalid end time format: ${bookingPayload.endTime}. Must be HH:MM`);
          setFieldErrors({ time: 'Invalid end time format (HH:MM)' });
          logError('Time format validation failed', { endTime: bookingPayload.endTime });
          return;
        }

        // Validate appointment data on client using Zod schema before API call
        const validation = BookAppointmentSchema.safeParse(bookingPayload);
        if (!validation.success) {
          setFormError('Please check your appointment details and try again.');
          const flatErrors = validation.error.flatten().fieldErrors;
          setFieldErrors(flatErrors as Record<string, string>);
          logError('Zod validation failed', { errors: flatErrors, payload: bookingPayload });
          return;
        }

        // Log successful validation
        logInfo('Appointment validation successful', { payload: bookingPayload });
        // Add more detailed logging
        logInfo('About to call bookAppointment API', { bookingPayload });
        // Add patientId to the booking payload
        bookAppointmentMutation.mutate(
          {
            ...bookingPayload,
            patientId: user.uid, // Add the authenticated user's ID as patientId
          } as any, // Type assertion to bypass TypeScript error for now
          {
            onSuccess: (data: BookAppointmentResponse) => {
              if (!isMountedRef.current) return;

              // Log the raw API response for debugging
              console.log('Raw API Response:', JSON.stringify(data, null, 2));
              logInfo('Received bookAppointment response', {
                data,
                hasSuccess: 'success' in data,
                hasAppointment: 'appointment' in data,
                hasError: 'error' in data,
                keys: Object.keys(data),
              });

              // Handle the API response
              if (data.success && data.appointment) {
                perfTracker.current.mark('booking-api-success');
                logInfo('Booking successful', {
                  appointmentId: data.appointment.id,
                  appointment: data.appointment,
                });
                // Invalidate queries to refresh appointments list
                queryClient.invalidateQueries({ queryKey: ['appointments', user.uid] });
                // Show success message
                setFormError('');
                setSuccess(true);
              } else if (data.error) {
                // Handle API-level errors
                logError('Booking API returned error', {
                  error: data.error,
                  message: data.message,
                });
                setFormError(data.message || data.error);
              } else {
                // Handle unexpected or empty response format
                const errorMessage =
                  data && typeof data === 'object' && Object.keys(data).length > 0
                    ? 'Received an unexpected response format from the server.'
                    : 'The server returned an empty response. Please try again.';

                logError('Booking API returned unexpected response', {
                  response: data,
                  responseType: typeof data,
                  responseKeys:
                    data && typeof data === 'object' ? Object.keys(data) : 'not-an-object',
                });

                setFormError(errorMessage);
              }
            },
            onError: (error: Error) => {
              if (!isMountedRef.current) return;

              logError('BookAppointment API error', {
                errorType: error.constructor.name,
                error:
                  error instanceof Error
                    ? {
                        message: error.message,
                        stack: error.stack,
                      }
                    : error,
                payload: bookingPayload,
              });

              // Improved error handling for different error types
              if (error instanceof SlotUnavailableError) {
                setFormError('This time slot is no longer available. Please select another time.');
              } else if (error instanceof ValidationError) {
                setFormError('Please check your appointment details and try again.');
              } else if (error instanceof AppointmentError) {
                setFormError(error.message);
              } else if (error instanceof ApiError) {
                setFormError(`Service error: ${error.message}`);
              } else {
                setFormError('Failed to book appointment. Please try again later.');
              }
            },
          }
        );
      } catch (error: unknown) {
        if (!isMountedRef.current) return;
        // Improved error handling for different error types
        if (error instanceof SlotUnavailableError) {
          setFormError('This time slot is no longer available. Please select another time.');
        } else if (error instanceof AuthError) {
          setFormError('You must be logged in to book an appointment.');
          setTimeout(() => {
            if (isMountedRef.current) {
              router.push('/auth/login');
            }
          }, 2000);
        } else if (error instanceof ValidationError) {
          setFormError(error.message);
        } else if (error instanceof AppointmentError) {
          setFormError(error.message);
        } else if (error instanceof ApiError) {
          setFormError(`Service error: ${error.message}`);
        } else {
          setFormError('Failed to book appointment. Please try again later.');
          logError('Unhandled booking error', {
            error: error instanceof Error ? error.message : JSON.stringify(error),
            stack: error instanceof Error ? error.stack : 'No stack trace available',
            doctorId,
          });
        }
        perfTracker.current.mark('booking-api-error');
      } finally {
        perfTracker.current.mark('form-submit-complete');
      }
    },
    [
      bookAppointmentMutation,
      doctorId,
      selectedDate,
      selectedTimeSlot,
      selectedEndTime,
      appointmentType,
      reason,
      user,
      router,
    ]
  );

  // Memoize UI elements for better performance
  const DoctorInfoSection = useMemo(() => {
    if (isLoadingDoctor) {
      return (
        <div className="animate-pulse">
          <div className="w-full h-40 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4"></div>
          <div className="w-4/5 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
          <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      );
    }

    if (doctorError || !doctor) {
      return (
        <Alert variant="error">Failed to load doctor information. Please try again later.</Alert>
      );
    }

    return (
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
            Book an Appointment
          </h1>
        </div>

        <div className="p-5">
          <div className="flex flex-col md:flex-row gap-5">
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-sm mx-auto md:mx-0">
              <Image
                src={doctor.profilePictureUrl || '/images/default-doctor.png'}
                alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white text-center md:text-left">
                    Dr. {doctor.firstName} {doctor.lastName}
                  </h2>

                  {doctor.specialty && (
                    <p className="text-primary-600 dark:text-primary-400 font-medium text-sm mt-1 text-center md:text-left">
                      {doctor.specialty}
                    </p>
                  )}
                </div>

                {doctor.rating !== undefined && (
                  <div className="flex items-center justify-center md:justify-start mt-2 md:mt-0">
                    <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded-md text-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-medium">{doctor.rating.toFixed(1)}</span>
                      {doctor.reviewCount && (
                        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                          ({doctor.reviewCount})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {doctor.location && (
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4 mr-2 text-slate-500 flex-shrink-0" />
                    <span>{doctor.location}</span>
                  </div>
                )}

                {doctor.consultationFee !== undefined && (
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2 text-slate-500 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        ${doctor.consultationFee.toFixed(2)}
                      </span>
                      per visit
                    </span>
                  </div>
                )}

                {Array.isArray(doctor.servicesOffered) && doctor.servicesOffered.length > 0 && (
                  <div className="flex items-start text-sm text-slate-600 dark:text-slate-400 sm:col-span-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2 text-slate-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span>
                      {Array.isArray(doctor.servicesOffered)
                        ? doctor.servicesOffered.slice(0, 3).join(', ')
                        : doctor.servicesOffered}
                      {Array.isArray(doctor.servicesOffered) && doctor.servicesOffered.length > 3
                        ? '...'
                        : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700 text-sm">
            <p className="text-slate-600 dark:text-slate-300">
              Please select a date and time to schedule your appointment with Dr. {doctor.lastName}.
            </p>
          </div>
        </div>
      </Card>
    );
  }, [doctor, doctorError, isLoadingDoctor]);

  // Memoize the dates section
  const DatesSection = useMemo(() => {
    if (isLoadingAvailability) {
      return (
        <div className="animate-pulse mt-6">
          <div className="w-1/3 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="flex overflow-x-auto gap-2 pb-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="min-w-[100px] h-20 bg-slate-200 dark:bg-slate-700 rounded-lg"
              ></div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <Card className="mt-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/10 dark:to-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center">
              <CalendarDays className="w-6 h-6 mr-3 text-primary" />
              Select Date
            </h2>
            {selectedDate && (
              <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-lg shadow-sm border">
                <div className="text-sm font-medium text-primary">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Enhanced Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              className="p-3 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-all duration-200 hover:scale-105 group"
              aria-label="Previous week"
              onClick={() => {
                if (allDates.length > 0) {
                  const previousWeekStart = new Date(allDates[0]);
                  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
                  // This is a placeholder - real implementation would need to fetch previous week dates
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="text-lg font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-lg">
              {allDates.length > 0 && format(allDates[0], 'MMMM yyyy')}
            </div>

            <button
              type="button"
              className="p-3 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-all duration-200 hover:scale-105 group"
              aria-label="Next week"
              onClick={() => {
                if (allDates.length > 0) {
                  const nextWeekStart = new Date(allDates[allDates.length - 1]);
                  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
                  // This is a placeholder - real implementation would need to fetch next week dates
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Enhanced Days grid header */}
          <div className="grid grid-cols-7 text-center text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          {/* Enhanced calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarGrid.map((date, index) => {
              if (!date) {
                // Empty calendar cell
                return (
                  <div 
                    key={`empty-${index}`} 
                    className="h-16 w-full"
                  />
                );
              }

              const isAvailable = isDateSelectable(date);
              const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
              const isToday = new Date().toDateString() === date.toDateString();
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => isAvailable && handleDateSelect(date)}
                  disabled={!isAvailable || isPast}
                  aria-selected={
                    selectedDate?.toDateString() === date.toDateString() ? 'true' : undefined
                  }
                  aria-label={`Select date ${format(date, 'EEEE, MMMM d, yyyy')}`}
                  className={`
                    relative p-3 rounded-xl flex flex-col items-center justify-center h-16 w-full
                    transition-all duration-200 transform font-medium text-sm
                    ${
                      isSelected
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg scale-105 ring-2 ring-primary/30'
                        : isAvailable && !isPast
                          ? 'hover:bg-primary/10 dark:hover:bg-primary/20 text-slate-900 dark:text-white hover:scale-105 border-2 border-transparent hover:border-primary/30 bg-white dark:bg-slate-700 shadow-sm'
                          : isPast
                            ? 'text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 cursor-not-allowed opacity-50'
                            : 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 cursor-not-allowed border-2 border-dashed border-slate-200 dark:border-slate-600'
                    }
                  `}
                >
                  <span className="text-base font-semibold">{format(date, 'd')}</span>
                  
                  {/* Enhanced indicators */}
                  {isToday && !isSelected && (
                    <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  )}
                  
                  {isAvailable && !isPast && !isSelected && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400"></div>
                  )}

                  {/* Day of week hint for small screens */}
                  <span className="text-xs text-current opacity-70 sm:hidden">
                    {format(date, 'E')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Enhanced legend with better styling */}
          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-600 dark:text-slate-400 mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600"></div>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gradient-to-br from-primary to-primary/80"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-white dark:bg-slate-700 border-2 border-primary/30 relative">
                <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-green-400 -translate-y-0.5 translate-x-0.5"></div>
              </div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary animate-pulse"></div>
              <span>Today</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }, [calendarGrid, selectedDate, isLoadingAvailability, isDateSelectable, handleDateSelect]);

  // Enhanced time slots section
  const TimeSlotsSection = useMemo(() => {
    if (!selectedDate) {
      return null;
    }

    // Group slots by time period (morning, afternoon, evening)
    const morningSlots: typeof availableTimeSlots = [];
    const afternoonSlots: typeof availableTimeSlots = [];
    const eveningSlots: typeof availableTimeSlots = [];

    availableTimeSlots.forEach(slot => {
      const hour = parseInt(slot.startTime.split(':')[0], 10);

      if (hour < 12) {
        morningSlots.push(slot);
      } else if (hour < 17) {
        afternoonSlots.push(slot);
      } else {
        eveningSlots.push(slot);
      }
    });

    const renderTimeBlock = (slot: (typeof availableTimeSlots)[0]) => {
      const isSelected = selectedTimeSlot === slot.startTime;
      
      return (
        <button
          key={`${slot.startTime}-${slot.endTime}`}
          type="button"
          onClick={() => handleTimeSlotSelect(slot.startTime, slot.endTime)}
          disabled={false}
          className={`
            group relative p-4 rounded-xl border-2 transition-all duration-200 transform
            ${
              isSelected
                ? 'bg-gradient-to-br from-primary to-primary/80 border-primary text-white shadow-lg scale-105 ring-2 ring-primary/30'
                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 hover:scale-105 shadow-sm hover:shadow-md'
            }
          `}
          aria-label={`Select time slot ${slot.startTime} to ${slot.endTime}`}
          aria-selected={isSelected}
          aria-disabled={false}
        >
          <div className="flex flex-col items-center">
            <span className="font-semibold text-lg">{slot.startTime}</span>
            <span className="text-xs opacity-70 mt-1">
              {slot.endTime}
            </span>
          </div>
          
          {/* Selected indicator */}
          {isSelected && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </button>
      );
    };

    const renderTimeSlotSection = (
      title: string,
      slots: typeof availableTimeSlots,
      icon: React.ReactNode,
      bgColor: string
    ) => {
      if (slots.length === 0) return null;

      return (
        <div className="mb-8">
          <div className={`flex items-center mb-4 p-3 rounded-lg ${bgColor}`}>
            <div className="w-8 h-8 mr-3 flex-shrink-0 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-sm">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {slots.length} slot{slots.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-labelledby={`time-slots-${title.toLowerCase()}`}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          >
            {slots.map(renderTimeBlock)}
          </div>
        </div>
      );
    };

    return (
      <Card className="mt-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center">
            <Clock className="w-6 h-6 mr-3 text-primary" />
            Select Time
            {selectedDate && (
              <span className="ml-3 text-base font-normal text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 px-3 py-1 rounded-full">
                {format(selectedDate, 'MMMM d')}
              </span>
            )}
          </h2>
          {selectedTimeSlot && (
            <div className="mt-2 text-sm text-primary font-medium">
              Selected: {selectedTimeSlot} - {selectedEndTime}
            </div>
          )}
        </div>

        <div className="p-6">
          {slotsLoading ? (
            <div className="animate-pulse space-y-8">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg mr-3"></div>
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                ))}
              </div>
            </div>
          ) : availableTimeSlots.length > 0 ? (
            <div>
              {renderTimeSlotSection(
                'Morning',
                morningSlots,
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>,
                'bg-amber-50 dark:bg-amber-900/20'
              )}

              {renderTimeSlotSection(
                'Afternoon',
                afternoonSlots,
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>,
                'bg-orange-50 dark:bg-orange-900/20'
              )}

              {renderTimeSlotSection(
                'Evening',
                eveningSlots,
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>,
                'bg-indigo-50 dark:bg-indigo-900/20'
              )}

              {morningSlots.length === 0 &&
                afternoonSlots.length === 0 &&
                eveningSlots.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 p-4 rounded-full mb-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      No available slots
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                      This date is fully booked. Please select another date from the calendar above.
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <div className="py-8">
              <Alert variant={availabilityError ? 'error' : 'warning'} className="mb-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {availabilityError || 'No available time slots for this date. Please try another date.'}
                </div>
              </Alert>
            </div>
          )}
        </div>
      </Card>
    );
  }, [
    selectedDate,
    slotsLoading,
    availableTimeSlots,
    selectedTimeSlot,
    fieldErrors.time,
    availabilityError,
    handleTimeSlotSelect,
  ]);

  // Memoize the appointment type section
  const AppointmentTypeSection = useMemo(() => {
    return (
      <Card className="mt-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <h2
            id="appointment-type-heading"
            className="text-lg font-medium text-slate-800 dark:text-white flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            Appointment Type
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Select the type of appointment you'd like to schedule with Dr.{' '}
            {doctor?.lastName || 'the doctor'}.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div role="radiogroup" aria-labelledby="appointment-type-heading" className="contents">
              <button
                type="button"
                onClick={() => setAppointmentType(AppointmentType.VIDEO)}
                className={`
                  relative p-4 rounded-md border transition-all
                  ${
                    appointmentType === AppointmentType.VIDEO
                      ? 'bg-primary/5 border-primary text-primary-700 dark:text-primary-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                  }
                `}
                role="radio"
                aria-checked={appointmentType === AppointmentType.VIDEO}
                aria-label="Video Visit"
              >
                <div className="flex items-start">
                  <div
                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center mr-3
                    ${
                      appointmentType === AppointmentType.VIDEO
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }
                  `}
                  >
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 dark:text-white">Video Visit</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Connect from anywhere through secure video chat
                    </p>
                  </div>
                  {appointmentType === AppointmentType.VIDEO && (
                    <span className="absolute top-3 right-3 text-primary">
                      <Check className="h-5 w-5" />
                    </span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAppointmentType(AppointmentType.IN_PERSON)}
                className={`
                  relative p-4 rounded-md border transition-all
                  ${
                    appointmentType === AppointmentType.IN_PERSON
                      ? 'bg-primary/5 border-primary text-primary-700 dark:text-primary-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                  }
                `}
                role="radio"
                aria-checked={appointmentType === AppointmentType.IN_PERSON}
                aria-label="In-Person Visit"
              >
                <div className="flex items-start">
                  <div
                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center mr-3
                    ${
                      appointmentType === AppointmentType.IN_PERSON
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }
                  `}
                  >
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 dark:text-white">In-Person Visit</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Visit the clinic for a face-to-face appointment
                    </p>
                  </div>
                  {appointmentType === AppointmentType.IN_PERSON && (
                    <span className="absolute top-3 right-3 text-primary">
                      <Check className="h-5 w-5" />
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  }, [appointmentType, setAppointmentType, doctor]);

  // Role error
  if (roleError) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="border-0 overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center">
                <AlertOctagon className="h-12 w-12" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Access Restricted</h2>
            <p className="text-center text-white/90 text-sm">Patient account required</p>
          </div>

          <div className="p-6">
            <div className="mb-6 text-slate-700 dark:text-slate-300">{roleError}</div>

            <div className="text-center space-y-3">
              <Link href="/auth/login">
                <Button variant="primary" className="w-full py-3 shadow-md">
                  Login as Patient
                </Button>
              </Link>

              <Link href="/auth/register/patient">
                <Button variant="outline" className="w-full">
                  Register as Patient
                </Button>
              </Link>

              <Link href="/">
                <Button variant="ghost" className="w-full">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Success state UI
  if (success) {
    return (
      <div className="max-w-md mx-auto px-4">
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 text-white">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center mb-2">Appointment Confirmed</h2>
            <p className="text-center text-white/90 text-sm">
              Your appointment has been successfully scheduled
            </p>
          </div>

          <div className="p-6">
            {doctor && (
              <div className="flex items-center gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 mb-5">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm flex-shrink-0">
                  <Image
                    src={doctor.profilePictureUrl || '/images/default-doctor.png'}
                    alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    Dr. {doctor.firstName} {doctor.lastName}
                  </h3>
                  {doctor.specialty && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{doctor.specialty}</p>
                  )}
                </div>
              </div>
            )}

            {selectedDate && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                  Appointment Details
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800/60">
                    <CalendarDays className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Date</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800/60">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {selectedTimeSlot} - {selectedEndTime}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Time</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800/60">
                    {appointmentType === AppointmentType.IN_PERSON ? (
                      <MapPin className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Video className="w-5 h-5 text-slate-400" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {appointmentType === AppointmentType.IN_PERSON
                          ? 'In-Person Visit'
                          : 'Video Consultation'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Type</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 mt-6">
              <Link href="/patient/appointments">
                <Button variant="primary" className="w-full py-2.5">
                  View My Appointments
                </Button>
              </Link>

              <Link href="/">
                <Button variant="outline" className="w-full py-2.5">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-10">
      {/* Doctor Info */}
      {DoctorInfoSection}

      {/* Date Selection */}
      {DatesSection}

      {/* Time Slot Selection */}
      <TimeSlotSelectionErrorBoundary>{TimeSlotsSection}</TimeSlotSelectionErrorBoundary>

      {/* Appointment Type */}
      {AppointmentTypeSection}

      {/* Reason for Visit */}
      <Card className="mt-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-medium text-slate-800 dark:text-white flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Reason for Visit
          </h2>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Please describe your symptoms or reason for this appointment
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe your symptoms or reason for booking this appointment"
              rows={4}
              className={
                fieldErrors.reason ? 'border-red-500 focus:border-red-500 focus:ring-red-400' : ''
              }
            />
            {fieldErrors.reason && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.reason}</p>
            )}
          </div>

          <div>
            <label className="flex items-center" htmlFor="emergency-checkbox">
              <input
                id="emergency-checkbox"
                type="checkbox"
                checked={isEmergency}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setIsEmergency(e.target.checked)
                }
                className="h-4 w-4 text-primary focus:ring-primary border-slate-300 dark:border-slate-600 rounded"
              />
              <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                This is urgent (within 24-48 hours)
              </span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-6">
              If you're experiencing a medical emergency, please call emergency services
              immediately.
            </p>
          </div>
        </div>
      </Card>

      {/* Submit & Error Section */}
      <div className="flex flex-col space-y-3">
        {formError && (
          <Alert variant="error" className="mb-3">
            {formError}
          </Alert>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full py-3"
          isLoading={bookAppointmentMutation.isPending}
          disabled={
            bookAppointmentMutation.isPending ||
            slotsLoading ||
            isLoadingDoctor ||
            isLoadingAvailability
          }
        >
          {bookAppointmentMutation.isPending ? 'Booking Appointment...' : 'Confirm Appointment'}
        </Button>

        <div className="text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            By booking this appointment, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/cancellation-policy" className="text-primary hover:underline">
              Cancellation Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </form>
  );
}

// Export with error boundary
export default function BookAppointmentPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center text-sm mb-1">
          <Link
            href="/"
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
          >
            Home
          </Link>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 mx-2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link
            href="/find-doctors"
            className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
          >
            Find Doctors
          </Link>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 mx-2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 dark:text-slate-300">Book Appointment</span>
        </div>
      </div>

      <BookingWorkflowErrorBoundary componentName="BookAppointmentPage">
        <React.Suspense
          fallback={
            <div className="space-y-8">
              {/* Header skeleton */}
              <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
                <div className="h-16 bg-slate-200 dark:bg-slate-700 w-full animate-pulse"></div>
                <div className="p-6 flex flex-col md:flex-row gap-6">
                  <div className="w-32 h-32 md:w-48 md:h-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                  <div className="flex-1 space-y-4">
                    <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date selection skeleton */}
              <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700 p-4">
                  <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
                <div className="p-6">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {Array(7)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className="min-w-[84px] h-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"
                        ></div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Time slots skeleton */}
              <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700 p-4">
                  <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {Array(8)
                        .fill(0)
                        .map((_, i) => (
                          <div
                            key={i}
                            className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"
                          ></div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <BookAppointmentPageContent />
        </React.Suspense>
      </BookingWorkflowErrorBoundary>
    </div>
  );
}
