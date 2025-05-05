'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useDoctorProfile, useDoctorAvailability, useBookAppointment } from '@/data/sharedLoaders';
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
import useBookingError, { BookingError, BookingErrorCode } from '@/hooks/useBookingError';
import { callApi } from '@/lib/apiClient';
import { SlotUnavailableError, ValidationError, AuthError, ApiError, AppointmentError } from '@/lib/errors';
import { UserType } from '@/types/enums';

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
  const { BookingError } = useBookingError();
  
  const doctorId = params?.doctorId ? String(params.doctorId) : '';
  const isMountedRef = useRef<boolean>(true);

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
  const [roleError, setRoleError] = useState<string | null>(null);

  // Set up mount status tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check if user is a patient at component load
  useEffect(() => {
    if (user && user.role !== UserType.PATIENT) {
      setRoleError("Only patients can book appointments. Please login with a patient account.");
    } else {
      setRoleError(null);
    }
  }, [user]);

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
      if (isMountedRef.current) {
        setSuccess(true);
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

  // Generate dates for the next 14 days, marking which ones are available
  const generateDates = useCallback(() => {
    // Don't proceed if component is unmounted
    if (!isMountedRef.current) return;
    
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

    // Only update state if component is still mounted
    if (isMountedRef.current) {
      setAllDates(dates);
      setSelectableDates(availableDates);

      // If we have available dates, pre-select the first one
      if (availableDates.length > 0 && !selectedDate) {
        setSelectedDate(availableDates[0]);
      }
    }
  }, [availability, selectedDate, isMountedRef]);

  // Generate selectable dates based on availability
  useEffect(() => {
    generateDates();
  }, [availabilityDataResponse, generateDates]);

  // Fetch available time slots for the selected date
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDate || !isMountedRef.current) return;
    
    try {
      // Show loading indicator
      setSlotsLoading(true);
      setAvailableTimeSlots([]);
      
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Create a request cache key for performance monitoring
      const requestId = `slots_${doctorId}_${formattedDate}_${Date.now()}`;
      
      logInfo('Fetching available slots', {
        doctorId,
        date: formattedDate,
        requestId
      });
      
      const response = await callApi<AvailableSlotsResponse>(
        'getAvailableSlots',
        { doctorId, date: formattedDate }
      );
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      
      if (response.success && response.slots && Array.isArray(response.slots)) {
        setAvailableTimeSlots(response.slots);
        
        // If no slots are available, provide a user-friendly error
        if (response.slots.length === 0) {
          throw new BookingError('No available appointment slots for this date', 'NO_SLOTS_AVAILABLE', { doctorId, date: formattedDate });
        }
        
        logInfo('Successfully fetched slots', {
          doctorId,
          date: formattedDate,
          slotCount: response.slots.length,
          requestId
        });
      } else {
        // Handle the case when API returns success: false
        logError('Failed to fetch available slots', {
          doctorId,
          date: formattedDate,
          error: response.error || 'Unknown error',
          requestId
        });
        
        throw new BookingError('Failed to load available time slots', 'LOADING_FAILED', { doctorId, date: formattedDate });
      }
    } catch (error) {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      
      // Log the error
      logError('Error fetching available slots', {
        doctorId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        error
      });
      
      // If it's already a BookingError (thrown by throwTimeSlotError), just rethrow
      if (error instanceof BookingError) {
        throw error;
      }
      
      // Otherwise, create a standardized error
      throw new BookingError(error instanceof Error ? error.message : 'Failed to load available time slots', 'LOADING_FAILED', { doctorId, date: format(selectedDate, 'yyyy-MM-dd') });
    } finally {
      if (isMountedRef.current) {
        setSlotsLoading(false);
      }
    }
  }, [doctorId, selectedDate, isMountedRef, BookingError]);

  // On date selection, fetch available time slots
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, fetchAvailableSlots]);

  // Check if a date is selectable
  const isDateSelectable = (date: Date) => {
    return selectableDates.some(d => d.toDateString() === date.toDateString());
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  // Handle appointment booking
  const handleBookAppointment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isMountedRef.current) return;
    
    if (!user) {
      throw new AuthError('You must be logged in to book an appointment', {
        code: 'UNAUTHORIZED',
        context: { doctorId },
        retryable: false
      });
      return;
    }
    
    // Add role check here to prevent booking attempts
    if (user.role !== UserType.PATIENT) {
      setRoleError('Only patients can book appointments. Please login with a patient account.');
      
      throw new AppointmentError('Only patients can book appointments. Please login with a patient account.', {
        code: 'PATIENT_ONLY',
        context: { doctorId, userRole: user.role },
        retryable: false,
        severity: 'warning'
      });
      return;
    }
    
    if (!selectedDate || !selectedTimeSlot) {
      throw new ValidationError('Please select a date and time for your appointment', {
        code: 'APPOINTMENT_VALIDATION_ERROR',
        validationIssues: {
          date: !selectedDate ? ['Date is required'] : [],
          time: !selectedTimeSlot ? ['Time slot is required'] : []
        },
        context: { doctorId, date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null }
      });
      return;
    }
    
    try {
      // Prepare the appointment data
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const endTime = selectedEndTime || selectedTimeSlot; // Fallback if somehow endTime wasn't set
      
      // Create a booking context for tracking
      const bookingContext = {
        doctorId,
        date: formattedDate,
        startTime: selectedTimeSlot,
        endTime,
        appointmentType,
        hasReason: Boolean(reason.trim()),
        timestamp: new Date().toISOString()
      };
      
      logInfo('Booking appointment', bookingContext);
      
      // Prepare the appointment data
      const appointmentData: BookAppointmentParams = {
        doctorId,
        appointmentDate: formattedDate,
        startTime: selectedTimeSlot,
        endTime,
        appointmentType,
        reason: reason.trim() || undefined
      };
      
      // Check for potential booking conflicts by re-verifying slot availability
      const verifyResponse = await callApi<AvailableSlotsResponse>(
        'getAvailableSlots',
        { doctorId, date: formattedDate }
      );
      
      // Check if component is still mounted
      if (!isMountedRef.current) return;
      
      if (!verifyResponse.success || !verifyResponse.slots) {
        throw new ApiError('Could not verify appointment slot availability', {
          code: 'SLOT_VERIFICATION_FAILED',
          retryable: true,
          context: bookingContext,
          severity: 'warning'
        });
        return;
      }
      
      // Find if our selected slot still exists
      const slotStillAvailable = verifyResponse.slots.some(
        slot => slot.startTime === selectedTimeSlot && slot.endTime === endTime
      );
      
      if (!slotStillAvailable) {
        throw new SlotUnavailableError('This time slot is no longer available. Please select another time.', {
          code: 'SLOT_UNAVAILABLE',
          context: bookingContext,
          retryable: true,
          severity: 'warning'
        });
        return;
      }
      
      // Call the booking mutation
      const result = await bookAppointmentMutation.mutateAsync(appointmentData);
      
      // Check if component is still mounted
      if (!isMountedRef.current) return;
      
      // Define the expected mutation result type
      interface BookingResult {
        success: boolean;
        error?: string;
        appointmentId?: string;
      }
      
      // Type guard to check if result is a valid booking result
      const isBookingResult = (value: unknown): value is BookingResult => 
        typeof value === 'object' && 
        value !== null && 
        'success' in value;
      
      if (isBookingResult(result) && result.success) {
        if (isMountedRef.current) {
          setSuccess(true);
        }
        
        logInfo('Appointment booked successfully', {
          ...bookingContext,
          appointmentId: result.appointmentId || 'unknown'
        });
      } else {
        const errorMessage = isBookingResult(result) && result.error
          ? result.error
          : 'Failed to book appointment';
        
        // Determine the appropriate error class based on error details
        if (errorMessage.includes('already booked') || errorMessage.includes('conflict')) {
          throw new AppointmentError(errorMessage, {
            code: 'APPOINTMENT_CONFLICT',
            context: bookingContext,
            retryable: true,
            severity: 'warning'
          });
        } else if (errorMessage.includes('limit')) {
          throw new AppointmentError(errorMessage, {
            code: 'APPOINTMENT_LIMIT_EXCEEDED',
            context: bookingContext,
            retryable: false,
            severity: 'warning'
          });
        } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
          throw new ValidationError(errorMessage, {
            code: 'APPOINTMENT_VALIDATION_ERROR',
            validationIssues: {
              appointment: ['Invalid appointment data']
            },
            context: bookingContext
          });
        } else if (errorMessage.includes('unauthorized') || errorMessage.includes('permission')) {
          throw new AuthError(errorMessage, {
            code: 'APPOINTMENT_UNAUTHORIZED',
            context: bookingContext,
            retryable: false
          });
        } else {
          throw new ApiError(errorMessage, {
            code: 'APPOINTMENT_BOOKING_FAILED',
            context: bookingContext,
            retryable: true
          });
        }
      }
    } catch (error) {
      // Log the error first
      logError('Error booking appointment', {
        doctorId,
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        time: selectedTimeSlot,
        error
      });
      
      // If it's already one of our specialized error classes, just rethrow
      if (error instanceof AppointmentError || 
          error instanceof ValidationError || 
          error instanceof SlotUnavailableError || 
          error instanceof AuthError ||
          error instanceof ApiError) {
        throw error;
      }
      
      // Otherwise, wrap it in a standardized AppointmentError
      throw new AppointmentError(
        error instanceof Error ? error.message : 'Failed to book appointment',
        {
          code: 'APPOINTMENT_BOOKING_ERROR',
          context: {
            doctorId,
            date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
            time: selectedTimeSlot,
            originalError: error
          },
          retryable: true
        }
      );
    }
  }, [
    doctorId, 
    user, 
    selectedDate, 
    selectedTimeSlot, 
    selectedEndTime, 
    appointmentType, 
    reason, 
    isMountedRef, 
    bookAppointmentMutation
  ]);

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

      {/* Role error message */}
      {roleError && (
        <Alert variant="error" className="mb-6">
          <AlertOctagon className="h-4 w-4 mr-2" />
          {roleError}
        </Alert>
      )}

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

              {/* Details Form */}
              <div className="mt-4 bg-white dark:bg-slate-800 rounded-md shadow p-4">
                <h3 className="font-semibold text-lg mb-4">Appointment Details</h3>
                
                <div className="space-y-4">
                  {/* Appointment Type */}
                  <div>
                    <label htmlFor="appointment-type" className="block text-sm font-medium mb-1">
                      Appointment Type
                    </label>
                    <select
                      id="appointment-type"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      value={appointmentType}
                      onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                    >
                      {Object.values(AppointmentType).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Reason for Visit */}
                  <div>
                    <label htmlFor="appointment-reason" className="block text-sm font-medium mb-1">
                      Reason for Visit (Optional)
                    </label>
                    <textarea
                      id="appointment-reason"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      placeholder="Please describe your symptoms or reason for this appointment"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
              </div>

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
