import type { Appointment } from './schemas';

/**
 * Response type for cancel appointment API
 */
export interface CancelAppointmentResponse {
  success: boolean;
  error?: string;
  appointment?: Appointment;
}

/**
 * Response type for book appointment API
 */
export interface BookAppointmentResponse {
  success: boolean;
  error?: string;
  appointmentId?: string;
}

/**
 * Parameters for booking an appointment
 */
export interface BookAppointmentParams {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: string;
  notes?: string;
  patientId: string;
}

/**
 * Base API response type
 */
export interface BaseApiResponse {
  success: boolean;
  error?: string;
}

/**
 * Generic API response with data
 */
export interface ApiResponse<T> extends BaseApiResponse {
  data?: T;
}

/**
 * Error response type
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
