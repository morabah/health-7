'use client';
import React, { useEffect, useState, Fragment, useRef, useMemo, useCallback } from 'react';
import { AppointmentError, ApiError } from '@/lib/errors/errorClasses';
import { logError, logInfo } from '@/lib/logger';
import { Tab } from '@headlessui/react';
import clsx from 'clsx';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { Clock, User, X, CheckCircle } from 'lucide-react';
import { logValidation } from '@/lib/logger';
import { usePatientAppointments, useCancelAppointment } from '@/data/patientLoaders';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppointmentStatus } from '@/types/enums';
import { format } from 'date-fns';
import type { Appointment } from '@/types/schemas';
import Link from 'next/link';
import CancelAppointmentModal from '@/components/patient/CancelAppointmentModal';
import AppointmentErrorBoundary from '@/components/error-boundaries/AppointmentErrorBoundary';
import { useRenderPerformance, trackPerformance } from '@/lib/performance';
import dynamic from 'next/dynamic';

// Dynamically import the VirtualizedList component to reduce initial load time
const VirtualizedList = dynamic(() => import('@/components/ui/VirtualizedList'), {
  ssr: false,
  loading: () => <div className="py-4"><Spinner /></div>
});

// Define interfaces for API responses
interface AppointmentsResponse {
  success: boolean;
  error?: string;
  appointments?: Appointment[];
}

interface CancelAppointmentResponse {
  success: boolean;
  error?: string;
  appointment?: Appointment;
}

const tabs = ['Upcoming', 'Past', 'Cancelled'] as const;
const statusMap = {
  [AppointmentStatus.PENDING]: 'Pending',
  [AppointmentStatus.CONFIRMED]: 'Confirmed',
  [AppointmentStatus.CANCELED]: 'Cancelled',
  [AppointmentStatus.COMPLETED]: 'Completed',
  [AppointmentStatus.RESCHEDULED]: 'Rescheduled',
};

const statusColor: Record<
  string,
  'success' | 'default' | 'warning' | 'info' | 'danger' | 'pending'
> = {
  [AppointmentStatus.PENDING]: 'pending',
  [AppointmentStatus.CONFIRMED]: 'info',
  [AppointmentStatus.CANCELED]: 'danger',
  [AppointmentStatus.COMPLETED]: 'success',
  [AppointmentStatus.RESCHEDULED]: 'warning',
};

/**
 * Appointment row component
 */
const AppointmentRow = ({
  appointment,
  onCancel,
}: {
  appointment: Appointment;
  onCancel: (appointment: Appointment) => void;
}) => {
  const isPast = new Date(appointment.appointmentDate) < new Date();
  const isUpcoming = !isPast && appointment.status !== AppointmentStatus.CANCELED;

  return (
    <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 p-4">
      <div>
        <h3 className="font-semibold">{appointment.doctorName}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{appointment.doctorSpecialty}</p>
        <p className="text-sm mt-1">
          {format(new Date(appointment.appointmentDate), 'PPP')} at {appointment.startTime}
        </p>
        {appointment.reason && (
          <p className="text-sm mt-1 text-slate-600 dark:text-slate-300">
            Reason: {appointment.reason}
          </p>
        )}
      </div>

      <div className="mt-3 sm:mt-0 sm:ml-4 flex flex-col items-start sm:items-end gap-2">
        <Badge variant={statusColor[appointment.status] || 'default'}>
          {statusMap[appointment.status] || 'Unknown'}
        </Badge>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            as={Link}
            href={`/patient/appointments/${appointment.id}`}
          >
            <User size={14} className="mr-1" />
            Details
          </Button>
          {isUpcoming && (
            <>
              <Button size="sm" variant="secondary">
                <Clock size={14} className="mr-1" />
                Reschedule
              </Button>
              <Button size="sm" variant="danger" onClick={() => onCancel(appointment)}>
                <X size={14} className="mr-1" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

/**
 * Patient Appointments Page
 * Displays patient appointments in tabbed view (Upcoming, Past, Cancelled)
 * with real data from API
 */
export default function PatientAppointments() {
  return (
    <AppointmentErrorBoundary componentName="PatientAppointmentsPage">
      <PatientAppointmentsContent />
    </AppointmentErrorBoundary>
  );
}

/**
 * Patient Appointments Content Component
 * Separated to allow error boundary to work properly
 */
function PatientAppointmentsContent() {
  // Track component rendering performance with 50ms threshold
  useRenderPerformance('PatientAppointmentsContent', 50);

  const [index, setIndex] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  
  // Add state for virtualization
  const [virtualizedState, setVirtualizedState] = useState({
    isVisible: false,
    hasRendered: false
  });
  
  // Track if we're on a mobile device for responsive adjustments
  const [isMobile, setIsMobile] = useState(false);
  
  // Reference for the virtualized container
  const virtualizedRef = useRef<HTMLDivElement>(null);
  
  // Performance tracking
  const perfRef = useRef(trackPerformance('PatientAppointmentsPage'));
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: appointmentsData, isLoading, error, refetch } = usePatientAppointments();

  const cancelMutation = useCancelAppointment();

  // Check for justBooked parameter
  // Detect mobile devices and handle resize events
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Set virtualized list as visible after initial render
    const timer = setTimeout(() => {
      setVirtualizedState(prev => ({
        ...prev,
        isVisible: true
      }));
    }, 100);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
    };
  }, []);

  // These will be defined after filteredAppointments is declared

  useEffect(() => {
    try {
      const justBooked = searchParams?.get('justBooked');
      if (justBooked === '1') {
        setShowBookingSuccess(true);
        // Remove the parameter from URL after a short delay
        setTimeout(() => {
          router.replace('/patient/appointments');
        }, 3000);
      }
    } catch (error) {
      // Standardized error handling for URL parameter processing
      logError('Error processing URL parameters', { 
        error, 
        searchParams: searchParams?.toString() 
      });
    }
  }, [searchParams, router]);

  // Filter appointments based on tab
  const appointments = React.useMemo(() => {
    if (!appointmentsData) return [];
    
    // Safely cast and extract appointments using standardized pattern
    const response = appointmentsData as AppointmentsResponse;
    if (response?.success) {
      return response.appointments || [];
    } else if (response?.error) {
      // Log but don't throw - we'll handle this with empty state UI
      logError('Error loading appointments', { error: response.error });
      return [];
    }
    return [];
  }, [appointmentsData]);

  // Memoize filtered appointments to prevent recomputing on every render
  const filteredAppointments = React.useMemo(() => {
    // Get current time once for all filter operations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return {
      Upcoming: appointments.filter((a: Appointment) => {
        const isStatusOk =
          a.status === AppointmentStatus.PENDING ||
          a.status === AppointmentStatus.CONFIRMED ||
          a.status === AppointmentStatus.RESCHEDULED;

        if (!isStatusOk) {
          return false; // Don't log details if status doesn't match
        }

        const appointmentDateObj = new Date(a.appointmentDate);
        const startOfAppointmentDay = new Date(
          appointmentDateObj.getFullYear(),
          appointmentDateObj.getMonth(),
          appointmentDateObj.getDate()
        );

        let isUpcoming = false;
        if (startOfAppointmentDay > startOfToday) {
          isUpcoming = true; // Future date
        } else if (startOfAppointmentDay.getTime() === startOfToday.getTime()) {
          // Same day, compare times
          isUpcoming = appointmentDateObj >= now;
        } else {
          isUpcoming = false; // Past date
        }

        return isUpcoming;
      }),
      Past: appointments.filter((a: Appointment) => {
        // For 'Past', if the appointment date (day) is before today, it's past.
        // If it's today, but the time has passed, it's also past.
        // Completed appointments are always past.
        if (a.status === AppointmentStatus.COMPLETED) return true;
        if (a.status === AppointmentStatus.CANCELED) return false; // Handled by Cancelled tab

        const appointmentDateObj = new Date(a.appointmentDate);
        const startOfAppointmentDay = new Date(
          appointmentDateObj.getFullYear(),
          appointmentDateObj.getMonth(),
          appointmentDateObj.getDate()
        );

        if (startOfAppointmentDay < startOfToday) return true; // Definitely past day
        if (startOfAppointmentDay > startOfToday) return false; // Future day, not past
        // Same day, check time
        return appointmentDateObj < now;
      }),
      Cancelled: appointments.filter((a: Appointment) => a.status === AppointmentStatus.CANCELED),
    };
  }, [appointments]); // Only recompute when appointments change
  
  // Memoize the virtualized list configuration to prevent unnecessary re-renders
  const virtualizedConfig = useMemo(() => ({
    itemSize: isMobile ? 180 : 140, // Height of each appointment card
    height: Math.min(isMobile ? 500 : 600, filteredAppointments[tabs[index]].length * (isMobile ? 180 : 140), 600), // Limit max height
    overscanCount: isMobile ? 2 : 3, // Fewer overscan items on mobile to save memory
  }), [isMobile, filteredAppointments, index]);
  
  // Track when items are rendered in the virtualized list
  const handleItemsRendered = useCallback((info: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    if (filteredAppointments[tabs[index]].length > 20) {
      logInfo('VirtualizedList items rendered', {
        visibleRange: `${info.visibleStartIndex}-${info.visibleStopIndex}`,
        overscanRange: `${info.overscanStartIndex}-${info.overscanStopIndex}`,
        visibleCount: info.visibleStopIndex - info.visibleStartIndex + 1,
        totalItems: filteredAppointments[tabs[index]].length
      });
    }
  }, [filteredAppointments, index]);
  
  // Log performance metrics for large datasets
  useEffect(() => {
    if (filteredAppointments[tabs[index]].length > 20) {
      logInfo('PatientAppointmentsPage performance', {
        totalAppointments: appointments.length,
        filteredAppointments: filteredAppointments[tabs[index]].length,
        activeTab: tabs[index],
        isVirtualized: filteredAppointments[tabs[index]].length > 10
      });
    }
    
    return () => {
      perfRef.current.stop();
    };
  }, [appointments.length, filteredAppointments, index]);

  // Handle opening cancel modal
  const handleOpenCancelModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async (appointmentId: string, reason: string) => {
    try {
      const result = (await cancelMutation.mutateAsync({
        appointmentId,
        reason,
      })) as CancelAppointmentResponse;

      if (!result.success) {
        throw new AppointmentError(result.error || 'Failed to cancel appointment', { appointmentId });
      }

      setShowCancelModal(false);
      refetch(); // Explicitly refetch after cancellation
    } catch (error) {
      // Enhanced error handling following booking form pattern
      if (error instanceof AppointmentError) {
        logError('Appointment cancellation error', { error, appointmentId, reason });
        throw error; // Preserve the specific error type
      } else if (error instanceof ApiError) {
        logError('API error during appointment cancellation', { error, appointmentId });
        throw new AppointmentError(`Service error: ${error.message}`, { appointmentId });
      } else {
        // For unexpected errors, enhance with context
        const errorMessage = error instanceof Error ? error.message : 'Failed to cancel appointment';
        logError('Unexpected error during appointment cancellation', { error, appointmentId });
        throw new AppointmentError(errorMessage, { appointmentId });
      }
    }
  };

  useEffect(() => {
    // Add validation that the appointments page is working correctly
    try {
      logValidation(
        'patient-appointments-page-render',
        'success',
        'Patient appointments page rendered successfully'
      );
    } catch (error) {
      // Standardized error logging
      logError('Failed to log validation', { 
        error, 
        component: 'PatientAppointmentsContent' 
      });
    }
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 dark:text-white">My Appointments</h1>

      {/* Booking Success Message */}
      {showBookingSuccess && (
        <Alert variant="success" className="mb-6">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>Your appointment has been booked successfully!</span>
          </div>
        </Alert>
      )}

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        appt={selectedAppointment}
        onConfirm={handleCancelAppointment}
      />

      <Tab.Group selectedIndex={index} onChange={setIndex}>
        <Tab.List className="flex gap-1 rounded-lg bg-primary/10 p-1 mb-6">
          {tabs.map(tab => (
            <Tab as={Fragment} key={tab}>
              {({ selected }) => (
                <button
                  className={clsx(
                    'w-full rounded-lg py-2.5 text-sm font-medium transition-colors duration-200 ease-in-out',
                    selected
                      ? 'bg-white dark:bg-slate-800 shadow text-primary'
                      : 'text-primary/70 hover:bg-white/[0.12]'
                  )}
                >
                  {tab}{' '}
                  {filteredAppointments[tab]?.length > 0 && `(${filteredAppointments[tab].length})`}
                </button>
              )}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : error ? (
            <Alert variant="error" className="my-4">
              Error loading appointments: {error instanceof Error ? error.message : String(error)}
            </Alert>
          ) : (
            tabs.map(tab => (
              <Tab.Panel key={tab} className="rounded-xl bg-white dark:bg-slate-800 p-3">
                {filteredAppointments[tab].length > 0 ? (
                  filteredAppointments[tab].length > 10 ? (
                    // Use virtualized list for better performance with many appointments
                    <div 
                      ref={virtualizedRef}
                      aria-label={`${tab} appointments list containing ${filteredAppointments[tab].length} appointments`}
                    >
                      {/* Show a loading state until the virtualized list is visible */}
                      {!virtualizedState.isVisible && (
                        <div className="py-4 text-center">
                          <Spinner />
                          <p className="text-sm text-slate-500 mt-2">Preparing appointments...</p>
                        </div>
                      )}
                      
                      {/* Only render the virtualized list when it should be visible */}
                      {virtualizedState.isVisible && (
                        <div 
                          className={`transition-opacity duration-300 ${virtualizedState.hasRendered ? 'opacity-100' : 'opacity-0'}`}
                          onLoad={() => {
                            // Mark as rendered after first load
                            setVirtualizedState(prev => ({ ...prev, hasRendered: true }));
                          }}
                        >
                          <VirtualizedList
                            items={filteredAppointments[tab]}
                            itemSize={virtualizedConfig.itemSize}
                            height={virtualizedConfig.height}
                            overscanCount={virtualizedConfig.overscanCount}
                            onItemsRendered={handleItemsRendered}
                            renderItem={(appointment, index, style) => (
                              <div 
                                style={style} 
                                key={(appointment as Appointment).id}
                                role="listitem"
                                aria-label={`Appointment with ${(appointment as Appointment).doctorName}`}
                              >
                                <AppointmentRow 
                                  appointment={appointment as Appointment} 
                                  onCancel={handleOpenCancelModal} 
                                />
                              </div>
                            )}
                            itemKey={(index) => (filteredAppointments[tab][index] as Appointment).id}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    // Use standard rendering for small lists
                    filteredAppointments[tab].map((appointment: Appointment) => (
                      <AppointmentRow
                        key={appointment.id}
                        appointment={appointment}
                        onCancel={handleOpenCancelModal}
                      />
                    ))
                  )
                ) : (
                  <p className="py-10 text-center text-slate-500">
                    No {tab.toLowerCase()} appointments.
                  </p>
                )}
              </Tab.Panel>
            ))
          )}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
