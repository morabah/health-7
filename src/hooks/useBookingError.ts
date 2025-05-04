'use client';

import { useCallback } from 'react';
import { errorMonitor } from '@/lib/errorMonitoring';
import { ErrorCategory } from '@/components/ui/ErrorDisplay';

// Error code types for booking process
export type BookingErrorCode = 
  // Time slot errors
  | 'NO_SLOTS_AVAILABLE'
  | 'DATE_IN_PAST'
  | 'DOCTOR_UNAVAILABLE'
  | 'LOADING_FAILED'
  | 'INVALID_DATE_RANGE'
  | 'SLOT_UNAVAILABLE'
  // Payment errors
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_INSUFFICIENT_FUNDS'
  | 'PAYMENT_CARD_EXPIRED'
  | 'PAYMENT_PROCESSING_ERROR'
  | 'PAYMENT_GATEWAY_ERROR'
  | 'PAYMENT_VALIDATION_ERROR'
  | 'APPOINTMENT_ALREADY_PAID'
  // Generic booking errors
  | 'BOOKING_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'BOOKING_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED';

// Base booking error class with required properties for our error boundaries
export class BookingError extends Error {
  code: BookingErrorCode;
  details?: Record<string, any>;

  constructor(
    message: string, 
    code: BookingErrorCode, 
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
    this.details = details;
    
    // Ensures proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BookingError.prototype);
  }
}

/**
 * Custom hook for handling booking-specific errors
 * 
 * Provides methods to throw standardized booking errors that will be
 * properly handled by our specialized error boundaries
 */
export function useBookingError() {
  /**
   * Throws a time slot selection error
   */
  const throwTimeSlotError = useCallback((
    code: Extract<BookingErrorCode, 
      | 'NO_SLOTS_AVAILABLE'
      | 'DATE_IN_PAST'
      | 'DOCTOR_UNAVAILABLE'
      | 'LOADING_FAILED'
      | 'INVALID_DATE_RANGE'
      | 'SLOT_UNAVAILABLE'
    >,
    message: string,
    details?: { 
      date?: string;
      doctorId?: string;
      [key: string]: any;
    }
  ) => {
    // Log the error first
    errorMonitor.captureException(new Error(message), {
      component: 'TimeSlotSelection',
      severity: 'warning',
      category: 'appointment' as ErrorCategory,
      action: 'time_slot_selection',
      details
    });
    
    // Then throw the error to be caught by the boundary
    throw new BookingError(message, code, details);
  }, []);

  /**
   * Throws a payment processing error
   */
  const throwPaymentError = useCallback((
    code: Extract<BookingErrorCode, 
      | 'PAYMENT_DECLINED'
      | 'PAYMENT_INSUFFICIENT_FUNDS'
      | 'PAYMENT_CARD_EXPIRED'
      | 'PAYMENT_PROCESSING_ERROR'
      | 'PAYMENT_GATEWAY_ERROR'
      | 'PAYMENT_VALIDATION_ERROR'
      | 'APPOINTMENT_ALREADY_PAID'
    >,
    message: string,
    details?: { 
      transactionId?: string;
      appointmentId?: string;
      paymentMethod?: string;
      amount?: number;
      [key: string]: any;
    }
  ) => {
    // Log the error first
    errorMonitor.captureException(new Error(message), {
      component: 'BookingPayment',
      severity: 'error',
      category: 'api' as ErrorCategory,
      action: 'process_payment',
      details
    });
    
    // Then throw the error to be caught by the boundary
    throw new BookingError(message, code, details);
  }, []);

  /**
   * Throws a general booking workflow error
   */
  const throwBookingError = useCallback((
    code: BookingErrorCode,
    message: string,
    details?: Record<string, any>
  ) => {
    // Log the error first
    errorMonitor.captureException(new Error(message), {
      component: 'BookingWorkflow',
      severity: 'error',
      category: 'appointment' as ErrorCategory,
      action: 'book_appointment',
      details
    });
    
    // Then throw the error to be caught by the boundary
    throw new BookingError(message, code, details);
  }, []);

  return {
    throwTimeSlotError,
    throwPaymentError,
    throwBookingError,
    BookingError,
  };
}

export default useBookingError; 