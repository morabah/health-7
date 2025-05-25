import { AppointmentType } from '@/types/enums';
import type { TimeSlot } from '@/types/schemas';

/**
 * Doctor Profile Types
 */
export interface DoctorPublicProfile {
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

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface AvailableSlotsResponse {
  success: boolean;
  error?: string;
  slots: Array<{ startTime: string; endTime: string }>;
}

export interface DoctorProfileResponse {
  success: boolean;
  error?: string;
  doctor: DoctorPublicProfile;
}

export interface AvailabilityResponse {
  success: boolean;
  error?: string;
  availability: {
    weeklySchedule: Record<string, TimeSlot[]>;
    blockedDates: string[];
  };
}

/**
 * Booking Request Types
 */
export interface BookAppointmentParams {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  reason?: string;
  patientId: string;
}

export interface BookingResult {
  success: boolean;
  error?: string;
  appointmentId?: string;
}

export interface BookAppointmentResponse {
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

/**
 * Component Props Types
 */
export interface DoctorProfileHeaderProps {
  doctor: DoctorPublicProfile | null;
  isLoading: boolean;
  error?: string | null;
}

export interface DateSelectorProps {
  selectedDate: Date | null;
  availableDates: Date[];
  onDateSelect: (date: Date) => void;
  isLoading: boolean;
}

export interface TimeSlotGridProps {
  selectedDate: Date | null;
  selectedTimeSlot: string;
  selectedEndTime: string;
  availableTimeSlots: Array<{ startTime: string; endTime: string }>;
  onTimeSlotSelect: (startTime: string, endTime: string) => void;
  isLoading: boolean;
}

export interface AppointmentTypeSelectorProps {
  selectedType: AppointmentType;
  onTypeChange: (type: AppointmentType) => void;
  consultationFee?: number;
}

export interface BookingFormProps {
  reason: string;
  onReasonChange: (reason: string) => void;
  isEmergency: boolean;
  onEmergencyChange: (isEmergency: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  error?: string | null;
  fieldErrors: Record<string, string>;
}

export interface BookingSummaryProps {
  doctor: DoctorPublicProfile | null;
  selectedDate: Date | null;
  selectedTimeSlot: string;
  selectedEndTime: string;
  appointmentType: AppointmentType;
  reason: string;
  isEmergency: boolean;
}

/**
 * Hook State Types
 */
export interface BookingState {
  selectedDate: Date | null;
  selectedTimeSlot: string;
  selectedEndTime: string;
  appointmentType: AppointmentType;
  reason: string;
  isEmergency: boolean;
  allDates: Date[];
  selectableDates: Date[];
  calendarGrid: (Date | null)[];
  availableTimeSlots: Array<{ startTime: string; endTime: string }>;
  slotsLoading: boolean;
  success: boolean;
  fieldErrors: Record<string, string>;
  formError: string | null;
  paymentError: string | null;
  availabilityError: string | null;
}

export interface BookingActions {
  setSelectedDate: (date: Date | null) => void;
  setSelectedTimeSlot: (slot: string) => void;
  setSelectedEndTime: (time: string) => void;
  setAppointmentType: (type: AppointmentType) => void;
  setReason: (reason: string) => void;
  setIsEmergency: (isEmergency: boolean) => void;
  handleDateSelect: (date: Date) => void;
  handleTimeSlotSelect: (startTime: string, endTime: string) => void;
  clearErrors: () => void;
}

/**
 * Time Slot Types
 */
export interface TimeSlotGroup {
  title: string;
  slots: Array<{ startTime: string; endTime: string }>;
  icon: React.ReactNode;
  bgColor: string;
}

export interface CalendarDate {
  date: Date;
  isAvailable: boolean;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
} 