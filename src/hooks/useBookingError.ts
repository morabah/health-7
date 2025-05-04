'use client';

import { useCallback } from 'react';
import { logError } from '@/lib/logger';
import type { ErrorCategory } from '@/components/ui/ErrorDisplay';
import { 
  AppError, 
  AppointmentError, 
  SlotUnavailableError,
  ValidationError 
} from '@/lib/errors';

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

// Base booking error class that extends our AppError
export class BookingError extends AppointmentError {
  code: BookingErrorCode;

  constructor(
    message: string, 
    code: BookingErrorCode, 
    details?: Record<string, unknown>
  ) {
    super(message, {
      code: code,
      context: details || {},
      retryable: isBookingErrorRetryable(code),
      severity: getBookingErrorSeverity(code),
      appointmentId: details?.appointmentId as string | undefined
    });
    
    this.code = code;
    
    // Ensures proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BookingError.prototype);
  }
}

/**
 * Determine if a booking error is retryable
 */
function isBookingErrorRetryable(code: BookingErrorCode): boolean {
  switch (code) {
    // Retryable errors
    case 'LOADING_FAILED':
    case 'NETWORK_ERROR':
    case 'PAYMENT_PROCESSING_ERROR':
    case 'PAYMENT_GATEWAY_ERROR':
      return true;
      
    // Non-retryable errors  
    case 'NO_SLOTS_AVAILABLE':
    case 'DATE_IN_PAST':
    case 'DOCTOR_UNAVAILABLE':
    case 'INVALID_DATE_RANGE':
    case 'SLOT_UNAVAILABLE':
    case 'PAYMENT_DECLINED':
    case 'PAYMENT_INSUFFICIENT_FUNDS':
    case 'PAYMENT_CARD_EXPIRED':
    case 'PAYMENT_VALIDATION_ERROR':
    case 'APPOINTMENT_ALREADY_PAID':
    case 'BOOKING_CONFLICT':
    case 'VALIDATION_ERROR':
    case 'BOOKING_LIMIT_EXCEEDED':
    case 'UNAUTHORIZED':
      return false;
  }
}

/**
 * Determine severity based on booking error code
 */
function getBookingErrorSeverity(code: BookingErrorCode): 'error' | 'warning' | 'info' {
  switch (code) {
    // Critical errors
    case 'PAYMENT_PROCESSING_ERROR':
    case 'PAYMENT_GATEWAY_ERROR':
    case 'BOOKING_CONFLICT':
    case 'NETWORK_ERROR':
      return 'error';
    
    // User-fixable issues
    case 'VALIDATION_ERROR':
    case 'DATE_IN_PAST':
    case 'INVALID_DATE_RANGE':
    case 'PAYMENT_VALIDATION_ERROR':
    case 'PAYMENT_CARD_EXPIRED':
    case 'PAYMENT_INSUFFICIENT_FUNDS':
    case 'PAYMENT_DECLINED':
    case 'UNAUTHORIZED':
      return 'warning';
    
    // Informational issues
    case 'NO_SLOTS_AVAILABLE':
    case 'DOCTOR_UNAVAILABLE':
    case 'SLOT_UNAVAILABLE':
    case 'BOOKING_LIMIT_EXCEEDED':
    case 'APPOINTMENT_ALREADY_PAID':
    case 'LOADING_FAILED':
      return 'info';
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
      slotDateTime?: string;
      [key: string]: unknown;
    }
  ) => {
    logError('Time slot selection error', {
      code,
      message,
      ...details
    });
    
    // For slot unavailable errors, use the specialized class
    if (code === 'SLOT_UNAVAILABLE') {
      throw new SlotUnavailableError(message, {
        context: details,
        slotDateTime: details?.slotDateTime || details?.date
      });
    }
    
    // For validation errors
    if (code === 'INVALID_DATE_RANGE' || code === 'DATE_IN_PAST') {
      throw new ValidationError(message, {
        context: {
          ...details,
          errorCode: code
        },
        validationIssues: { 
          date: [message] 
        }
      });
    }
    
    // For other time slot errors
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
      [key: string]: unknown;
    }
  ) => {
    logError('Payment processing error', {
      code,
      message,
      ...details
    });
    
    // For validation errors
    if (code === 'PAYMENT_VALIDATION_ERROR') {
      throw new ValidationError(message, {
        context: {
          ...details,
          errorCode: code
        },
        validationIssues: { 
          payment: [message] 
        }
      });
    }
    
    // For other payment errors
    throw new BookingError(message, code, details);
  }, []);

  /**
   * Throws a general booking workflow error
   */
  const throwBookingError = useCallback((
    code: BookingErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) => {
    logError('Booking error', {
      code,
      message,
      ...details
    });
    
    // For slot unavailable errors, use the specialized class
    if (code === 'SLOT_UNAVAILABLE') {
      throw new SlotUnavailableError(message, {
        context: details,
        slotDateTime: details?.slotDateTime as string || details?.date as string
      });
    }
    
    // For validation errors
    if (code === 'VALIDATION_ERROR') {
      throw new ValidationError(message, {
        context: {
          ...details,
          errorCode: code
        }
      });
    }
    
    // For booking conflicts
    if (code === 'BOOKING_CONFLICT') {
      throw new AppointmentError(message, {
        code: code,
        context: details || {},
        appointmentId: details?.appointmentId as string
      });
    }
    
    // For other booking errors
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