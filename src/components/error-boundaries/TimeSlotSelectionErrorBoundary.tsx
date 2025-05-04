'use client';

import React, { useEffect } from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Clock, RefreshCw, Calendar, HelpCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { errorMonitor } from '@/lib/errorMonitoring';
import { ErrorCategory } from '@/components/ui/ErrorDisplay';
import { useRouter } from 'next/navigation';

interface TimeSlotError extends Error {
  code?: string;
  details?: {
    date?: string;
    doctorId?: string;
    [key: string]: any;
  };
}

/**
 * Time Slot Selection Error Fallback UI
 * A specialized UI for time slot selection-related errors
 */
const TimeSlotSelectionErrorFallback: React.FC<{ 
  error: TimeSlotError | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  const router = useRouter();
  
  // Report error to monitoring service
  useEffect(() => {
    if (error) {
      errorMonitor.captureException(error, {
        component: 'TimeSlotSelection',
        severity: 'warning',
        category: 'appointment' as ErrorCategory,
        action: 'time_slot_selection',
        details: error.details || {}
      });
    }
  }, [error]);

  // Determine specific error message based on the error code
  const getErrorMessage = () => {
    if (!error) return 'We couldn\'t load available time slots.';
    
    switch(error.code) {
      case 'NO_SLOTS_AVAILABLE':
        return 'No time slots are available for the selected date.';
      case 'DATE_IN_PAST':
        return 'The selected date is in the past. Please choose a future date.';
      case 'DOCTOR_UNAVAILABLE':
        return 'The doctor is not available on the selected date.';
      case 'LOADING_FAILED':
        return 'We couldn\'t load the time slots due to a technical issue.';
      case 'INVALID_DATE_RANGE':
        return 'The selected date is outside the allowed booking range.';
      default:
        return error.message || 'We couldn\'t load available time slots.';
    }
  };

  return (
    <div className="p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 flex-shrink-0">
          <Clock className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-medium mb-2">
            Time Slot Selection Issue
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm">
            {getErrorMessage()}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={resetError}
              variant="primary"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                // If we have error details with a doctorId, use it
                const doctorId = error?.details?.doctorId;
                if (doctorId) {
                  router.push(`/book-appointment/${doctorId}`);
                } else {
                  resetError();
                }
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Choose Another Date
            </Button>
            <Button
              variant="ghost"
              size="sm"
              as="a"
              href="/help/booking-time-slots"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * TimeSlotSelectionErrorBoundary - Error boundary specifically for time slot selection
 * 
 * This component provides specialized error handling for the time slot selection
 * part of the booking workflow, which is often a point of failure when slots
 * become unavailable or there are doctor schedule changes.
 * 
 * @example
 * <TimeSlotSelectionErrorBoundary>
 *   <TimeSlotSelector date={selectedDate} doctorId={doctorId} />
 * </TimeSlotSelectionErrorBoundary>
 */
export default function TimeSlotSelectionErrorBoundary({ 
  children,
  componentName = 'TimeSlotSelectionComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <TimeSlotSelectionErrorFallback error={null} resetError={() => {}} />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 