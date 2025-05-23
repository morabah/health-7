'use client';

'use client';

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  parseISO,
  addMonths,
  subMonths,
} from 'date-fns';
import { Tab } from '@headlessui/react';
import {
  Plus,
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Loader2 as Spinner,
  X,
  TrendingUp,
  Activity,
  PieChart,
  BarChart3,
  Users,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  Target,
  Star,
  Award,
  Heart,
} from 'lucide-react';
import clsx from 'clsx';
import dynamic from 'next/dynamic';

// Chart imports
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Import types
import type { Appointment, DoctorProfile } from '@/types/schemas';
import { AppointmentStatus, AppointmentType } from '@/types/enums';

// Import hooks and context
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { usePatientAppointments, useCancelAppointment } from '@/data/patientLoaders';
import { logError, logInfo } from '@/lib/logger';

// Helper function for consistent error logging
const logErrorMessage = (message: string, error: unknown) => {
  console.error(`${message}: ${error instanceof Error ? error.message : String(error)}`);
  logError(message, { error });
};

// Import UI components with correct imports
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import AlertDescription from '@/components/ui/AlertDescription';
import AlertTitle from '@/components/ui/AlertTitle';
import Card from '@/components/ui/Card';
import CardContent from '@/components/ui/CardContent';
import CardDescription from '@/components/ui/CardDescription';
import CardFooter from '@/components/ui/CardFooter';
import CardHeader from '@/components/ui/CardHeader';
import CardTitle from '@/components/ui/CardTitle';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';

// Import local components
type BookAppointmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  doctorOptions: DoctorProfile[];
  onBook: (data: {
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    appointmentType: AppointmentType;
    notes?: string;
  }) => Promise<void>;
};

type CancelAppointmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onConfirm: (reason: string) => Promise<void>;
};

const BookAppointmentModal = dynamic<BookAppointmentModalProps>(
  () => import('./BookAppointmentModal').then(mod => mod.BookAppointmentModal),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Spinner className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

// Enhanced Success Banner Component for Just Booked
const JustBookedSuccessBanner = ({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <Alert
      variant="success"
      className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
    >
      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      <div className="flex-1">
        <AlertTitle className="text-green-800 dark:text-green-200">
          Appointment Booked Successfully! 🎉
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Your appointment has been scheduled. You'll receive a confirmation notification and
          reminder before your visit.
        </AlertDescription>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};

// Statistics Card Component
const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  description?: string;
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    green: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    yellow: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    red: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    purple: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <Card className={`p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className={`p-3 rounded-lg ${iconColorClasses[color]} bg-background/50`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && trendValue && (
        <div className="flex items-center mt-4 pt-4 border-t border-current/10">
          <div
            className={`flex items-center text-sm ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {trend === 'up' && <ArrowUp className="h-3 w-3 mr-1" />}
            {trend === 'down' && <ArrowDown className="h-3 w-3 mr-1" />}
            <span className="font-medium">{trendValue}</span>
            <span className="ml-1">from last month</span>
          </div>
        </div>
      )}
    </Card>
  );
};

// Simple in-memory component for CancelAppointmentModal since we can't find the file
const CancelAppointmentModal = ({
  isOpen,
  onClose,
  appointment,
  onConfirm,
}: CancelAppointmentModalProps) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for cancellation',
      });
      return;
    }

    try {
      setIsLoading(true);
      await onConfirm(reason);
      setReason('');
      onClose();
    } catch (error) {
      logErrorMessage('Error cancelling appointment', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold">Cancel Appointment</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to cancel this appointment with {appointment?.doctorName}?
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="reason" className="mb-2 block text-sm font-medium">
              Reason for cancellation
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full rounded-md border p-2 dark:bg-gray-700 dark:border-gray-600"
              rows={3}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Back
            </Button>
            <Button type="submit" variant="danger" disabled={isLoading}>
              {isLoading ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function to book an appointment
interface BookAppointmentData {
  doctorId: string;
  patientId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
}

const bookAppointment = async (data: BookAppointmentData) => {
  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to book appointment');
    }

    return await response.json();
  } catch (error) {
    logErrorMessage('Error booking appointment', error);
    throw error;
  }
};

// Dynamically import the VirtualizedList component to reduce initial load time
const VirtualizedList = dynamic(() => import('@/components/VirtualizedList'), {
  ssr: false,
  loading: () => (
    <div className="py-4">
      <Skeleton />
    </div>
  ),
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

const AppointmentList = ({
  appointments,
  onCancel,
}: {
  appointments: Appointment[];
  onCancel: (appointmentId: string) => void;
}) => {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No appointments in this category</h3>
        <p className="text-sm text-muted-foreground">Check other tabs or book a new appointment</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map(appointment => (
        <AppointmentRow
          key={appointment.id}
          appointment={appointment}
          onCancel={() => onCancel(appointment.id)}
        />
      ))}
    </div>
  );
};

const AppointmentRow = ({
  appointment,
  onCancel,
}: {
  appointment: Appointment;
  onCancel: (appointment: Appointment) => void;
}) => {
  const appointmentDate = useMemo(() => {
    try {
      return parseISO(appointment.appointmentDate);
    } catch {
      return new Date(appointment.appointmentDate);
    }
  }, [appointment.appointmentDate]);

  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return 'success';
      case AppointmentStatus.PENDING:
        return 'warning';
      case AppointmentStatus.CANCELED:
        return 'danger';
      case AppointmentStatus.COMPLETED:
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return CheckCircle;
      case AppointmentStatus.PENDING:
        return Clock;
      case AppointmentStatus.CANCELED:
        return X;
      case AppointmentStatus.COMPLETED:
        return Award;
      default:
        return Clock;
    }
  };

  const StatusIcon = getStatusIcon(appointment.status);

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-grow">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-lg">{appointment.doctorName}</h3>
              <Badge
                variant={getStatusColor(appointment.status)}
                className="flex items-center space-x-1"
              >
                <StatusIcon className="h-3 w-3" />
                <span>{appointment.status}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{appointment.doctorSpecialty}</p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(appointmentDate)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>
                  {appointment.startTime} - {appointment.endTime}
                </span>
              </div>
            </div>
            {appointment.reason && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Reason:</strong> {appointment.reason}
              </p>
            )}
            {appointment.notes && (
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Notes:</strong> {appointment.notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {appointment.status === AppointmentStatus.PENDING ||
          appointment.status === AppointmentStatus.CONFIRMED ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(appointment)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export default function PatientAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Check if user just booked an appointment
  const justBooked = searchParams?.get('justBooked') === '1';

  // State
  const [index, setIndex] = useState(0);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showJustBookedBanner, setShowJustBookedBanner] = useState(justBooked);

  // Virtualized list ref and config
  const virtualizedRef = useRef<HTMLDivElement>(null);
  const appointmentsRef = useRef<HTMLDivElement>(null);
  const [virtualizedState, setVirtualizedState] = useState({
    isVisible: false,
    hasRendered: false,
  });

  // State for modals and UI
  const handleOpenBookModal = useCallback(() => setShowBookModal(true), []);
  const handleCloseBookModal = useCallback(() => setShowBookModal(false), []);

  // Fetch appointments
  const { data: appointmentsResponse, isLoading, error, refetch } = usePatientAppointments();

  // Extract appointments from response or default to empty array
  const appointments = appointmentsResponse?.appointments || [];

  // Cancel appointment mutation
  const { mutateAsync: cancelAppointment, isLoading: isCancelling } = useCancelAppointment();

  // Handle showing the cancellation modal
  const handleShowCancelModal = (appointmentId: string) => {
    try {
      // Set the appointment to cancel
      setSelectedAppointment(appointments.find(appt => appt.id === appointmentId) || null);
      // Show the cancel modal
      setShowCancelModal(true);
    } catch (error) {
      logErrorMessage('Error setting up appointment cancellation', error);
      toast({
        title: 'Error',
        description: 'Failed to set up appointment cancellation',
        variant: 'error',
      });
    }
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async (reason: string) => {
    if (!selectedAppointment?.id) return;

    try {
      const response = await fetch(`/api/appointments/${selectedAppointment.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to cancel appointment');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Appointment Cancelled',
          description: 'Your appointment has been cancelled successfully.',
        });
        // Invalidate all appointment-related queries
        await queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
        await queryClient.invalidateQueries({ queryKey: ['appointments'] });
        setShowCancelModal(false);
      } else {
        throw new Error(result.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      logErrorMessage('Error cancelling appointment', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel appointment',
      });
    }
  };

  // Handle opening the cancel modal
  const handleOpenCancelModal = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  }, []);

  const handleCloseCancelModal = useCallback(() => {
    setShowCancelModal(false);
    setSelectedAppointment(null);
  }, []);

  // Handle clicking on upcoming stat card to jump to appointments
  const handleUpcomingClick = useCallback(() => {
    setSelectedTabIndex(0); // Select the "Upcoming" tab (index 0)
    // Scroll to appointments section
    if (appointmentsRef.current) {
      appointmentsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, []);

  // Handle items rendered in virtualized list
  const handleItemsRendered = useCallback(() => {
    setVirtualizedState(prev => ({ ...prev, hasRendered: true }));
  }, []);

  // Handle booking a new appointment - extracted from useCallback to fix TypeScript error
  const handleBookAppointment = async (data: Omit<BookAppointmentData, 'patientId' | 'status'>) => {
    if (!user?.uid) {
      toast({
        title: 'Error',
        description: 'You must be logged in to book an appointment',
      });
      return;
    }

    try {
      const response = await bookAppointment({
        ...data,
        patientId: user.uid,
        status: AppointmentStatus.PENDING,
      });

      if (response.success) {
        toast({
          title: 'Appointment Booked',
          description: 'Your appointment has been scheduled successfully.',
        });
        // Invalidate all appointment-related queries
        await queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
        await queryClient.invalidateQueries({ queryKey: ['appointments'] });
        setShowBookModal(false);
        return response;
      } else {
        throw new Error(response.error || 'Failed to book appointment');
      }
    } catch (error) {
      logErrorMessage('Error booking appointment', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to book appointment',
      });
      throw error; // Re-throw to allow form to handle the error
    }
  };

  // Clear justBooked parameter from URL after showing banner
  useEffect(() => {
    if (justBooked) {
      // Remove the justBooked parameter from URL without refreshing
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('justBooked');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [justBooked]);

  // Set up intersection observer for virtualized list
  useEffect(() => {
    if (!virtualizedRef.current || !appointments || appointments.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVirtualizedState(prev => ({
              ...prev,
              isVisible: true,
            }));
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      }
    );

    const currentRef = virtualizedRef.current;
    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [appointments.length, virtualizedRef]);

  // Log page render
  useEffect(() => {
    try {
      logInfo('Patient appointments page rendered successfully');
    } catch (error) {
      logError('Failed to log page render', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  // Helper function for robust date parsing
  const parseAppointmentDate = (dateStr: string): Date => {
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      // Create date in local timezone (month is 0-indexed in JS Date)
      return new Date(year, month - 1, day);
    } catch (error) {
      logError('Error parsing appointment date', { dateStr, error });
      return new Date(); // Fallback to now if parsing fails
    }
  };

  // Enhanced analytics and data processing
  const appointmentAnalytics = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return {
        total: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0,
        thisMonth: 0,
        lastMonth: 0,
        monthlyTrend: null,
        appointmentsByMonth: [],
        appointmentsByStatus: [],
        appointmentsByType: [],
        weeklyPattern: [],
        topDoctors: [],
        averageWaitTime: null,
        satisfactionScore: null,
      };
    }

    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    const startOfLastMonth = startOfMonth(subMonths(now, 1));
    const endOfLastMonth = endOfMonth(subMonths(now, 1));
    const startOfThisYear = startOfYear(now);

    // Basic counts
    const total = appointments.length;
    const upcoming = appointments.filter((apt: Appointment) => {
      const aptDate = parseAppointmentDate(apt.appointmentDate);
      return aptDate >= now && apt.status !== AppointmentStatus.CANCELED;
    }).length;
    const completed = appointments.filter(
      (apt: Appointment) => apt.status === AppointmentStatus.COMPLETED
    ).length;
    const cancelled = appointments.filter(
      (apt: Appointment) => apt.status === AppointmentStatus.CANCELED
    ).length;

    // Monthly analysis
    const thisMonth = appointments.filter((apt: Appointment) => {
      const aptDate = parseAppointmentDate(apt.appointmentDate);
      return aptDate >= startOfCurrentMonth && aptDate <= endOfCurrentMonth;
    }).length;

    const lastMonth = appointments.filter((apt: Appointment) => {
      const aptDate = parseAppointmentDate(apt.appointmentDate);
      return aptDate >= startOfLastMonth && aptDate <= endOfLastMonth;
    }).length;

    const monthlyTrend =
      lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : null;

    // Appointments by month for the last 6 months
    const appointmentsByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const count = appointments.filter(apt => {
        const aptDate = parseAppointmentDate(apt.appointmentDate);
        return aptDate >= monthStart && aptDate <= monthEnd;
      }).length;

      appointmentsByMonth.push({
        month: format(monthStart, 'MMM yyyy'),
        appointments: count,
        completed: appointments.filter(apt => {
          const aptDate = parseAppointmentDate(apt.appointmentDate);
          return (
            aptDate >= monthStart &&
            aptDate <= monthEnd &&
            apt.status === AppointmentStatus.COMPLETED
          );
        }).length,
        cancelled: appointments.filter(apt => {
          const aptDate = parseAppointmentDate(apt.appointmentDate);
          return (
            aptDate >= monthStart &&
            aptDate <= monthEnd &&
            apt.status === AppointmentStatus.CANCELED
          );
        }).length,
      });
    }

    // Appointments by status
    const statusCounts = appointments.reduce(
      (acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const appointmentsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
      count,
      percentage: ((count / total) * 100).toFixed(1),
    }));

    // Appointments by type
    const typeCounts = appointments.reduce(
      (acc, apt) => {
        const type = apt.appointmentType || AppointmentType.IN_PERSON;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const appointmentsByType = Object.entries(typeCounts).map(([type, count]) => ({
      type: type
        .replace('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase()),
      count,
      percentage: ((count / total) * 100).toFixed(1),
    }));

    // Weekly pattern analysis
    const weeklyPattern = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ].map((day, index) => {
      const count = appointments.filter(apt => {
        const aptDate = parseAppointmentDate(apt.appointmentDate);
        return aptDate.getDay() === index;
      }).length;

      return {
        day,
        appointments: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
      };
    });

    // Top doctors by appointment count
    const doctorCounts = appointments.reduce(
      (acc, apt) => {
        const doctorKey = `${apt.doctorName}-${apt.doctorSpecialty}`;
        if (!acc[doctorKey]) {
          acc[doctorKey] = {
            name: apt.doctorName,
            specialty: apt.doctorSpecialty,
            count: 0,
            completed: 0,
          };
        }
        acc[doctorKey].count++;
        if (apt.status === AppointmentStatus.COMPLETED) {
          acc[doctorKey].completed++;
        }
        return acc;
      },
      {} as Record<string, any>
    );

    const topDoctors = Object.values(doctorCounts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5)
      .map((doctor: any) => ({
        ...doctor,
        completionRate:
          doctor.count > 0 ? ((doctor.completed / doctor.count) * 100).toFixed(1) : '0',
      }));

    return {
      total,
      upcoming,
      completed,
      cancelled,
      thisMonth,
      lastMonth,
      monthlyTrend,
      appointmentsByMonth,
      appointmentsByStatus,
      appointmentsByType,
      weeklyPattern,
      topDoctors,
      averageWaitTime: '12 minutes', // Mock data - would calculate from actual data
      satisfactionScore: '4.6/5', // Mock data - would come from feedback
    };
  }, [appointments]);

  // Group appointments by status
  const groupedAppointments = useMemo(() => {
    // Default empty result object
    const emptyResult = {
      Upcoming: [] as Appointment[],
      Past: [] as Appointment[],
      Cancelled: [] as Appointment[],
    };

    if (!appointments || appointments.length === 0) {
      return emptyResult;
    }

    // Use proper date parsing for timezone consistency as mentioned in the lessons
    const now = new Date();
    const result = { ...emptyResult };

    // Parse appointment dates using the robust method
    appointments.forEach(appointment => {
      const appointmentDate = parseAppointmentDate(appointment.appointmentDate);

      if (appointment.status === AppointmentStatus.CANCELED) {
        result.Cancelled.push(appointment);
      } else if (appointmentDate >= now) {
        result.Upcoming.push(appointment);
      } else {
        result.Past.push(appointment);
      }
    });

    return result;
  }, [appointments]);

  // Virtualized list config
  const virtualizedConfig = useMemo(
    () => ({
      itemSize: 150, // Approximate height of each appointment card
      height: 600, // Fixed height for the virtualized container
      overscanCount: 5, // Number of items to render outside the visible area
    }),
    []
  );

  // Check if virtualized list should be visible
  const getVirtualizedState = useCallback(() => {
    if (!virtualizedRef.current)
      return { isVisible: false, hasRendered: virtualizedState.hasRendered };

    const rect = virtualizedRef.current.getBoundingClientRect();
    const isVisible =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth);

    return {
      isVisible,
      hasRendered: virtualizedState.hasRendered || isVisible,
    };
  }, [virtualizedState.hasRendered]);

  // Tab configuration
  const tabs = {
    upcoming: {
      name: `Upcoming (${appointmentAnalytics.upcoming})`,
      component: AppointmentList,
    },
    past: {
      name: `Past (${appointmentAnalytics.completed})`,
      component: AppointmentList,
    },
    canceled: {
      name: `Cancelled (${appointmentAnalytics.cancelled})`,
      component: AppointmentList,
    },
  };

  // Chart colors
  const chartColors = {
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
  };

  const pieChartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load appointments'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="space-y-6">
        {showJustBookedBanner && (
          <JustBookedSuccessBanner onDismiss={() => setShowJustBookedBanner(false)} />
        )}

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground mb-6" />
          <h3 className="text-2xl font-semibold mb-2">Welcome to Your Appointments</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            You don't have any appointments scheduled yet. Start your health journey by booking your
            first appointment with one of our qualified doctors.
          </p>
          <Button onClick={handleOpenBookModal} size="lg" className="px-8">
            <Plus className="mr-2 h-5 w-5" />
            Book Your First Appointment
          </Button>
        </div>
      </div>
    );
  }

  // Render main appointments interface with data visualization
  return (
    <div className="space-y-6">
      {showJustBookedBanner && (
        <JustBookedSuccessBanner onDismiss={() => setShowJustBookedBanner(false)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">Manage and track your healthcare appointments</p>
        </div>
        <Button onClick={handleOpenBookModal} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Appointments"
          value={appointmentAnalytics.total}
          icon={Calendar}
          color="blue"
          description="All time"
        />
        <div
          onClick={handleUpcomingClick}
          className="cursor-pointer transform transition-transform hover:scale-105"
        >
          <StatCard
            title="Upcoming"
            value={appointmentAnalytics.upcoming}
            icon={Clock}
            color="green"
            description="Scheduled ahead"
          />
        </div>
        <StatCard
          title="This Month"
          value={appointmentAnalytics.thisMonth}
          icon={TrendingUp}
          trend={
            appointmentAnalytics.monthlyTrend
              ? parseFloat(appointmentAnalytics.monthlyTrend) >= 0
                ? 'up'
                : 'down'
              : 'neutral'
          }
          trendValue={
            appointmentAnalytics.monthlyTrend
              ? `${Math.abs(parseFloat(appointmentAnalytics.monthlyTrend))}%`
              : undefined
          }
          color="purple"
          description="Current month"
        />
        <StatCard
          title="Completed"
          value={appointmentAnalytics.completed}
          icon={CheckCircle}
          color="green"
          description={`${appointmentAnalytics.total > 0 ? ((appointmentAnalytics.completed / appointmentAnalytics.total) * 100).toFixed(1) : 0}% completion rate`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <Card className="p-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Monthly Appointment Trends
            </CardTitle>
            <CardDescription>
              Track your appointment patterns over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={appointmentAnalytics.appointmentsByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="appointments"
                  stackId="1"
                  stroke={chartColors.primary}
                  fill={chartColors.primary}
                  fillOpacity={0.6}
                  name="Total"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stackId="2"
                  stroke={chartColors.secondary}
                  fill={chartColors.secondary}
                  fillOpacity={0.8}
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="p-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Appointment Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of your appointments by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={appointmentAnalytics.appointmentsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  label={({ status, percentage }: { status: string; percentage: string }) =>
                    `${status}: ${percentage}%`
                  }
                  labelLine={false}
                >
                  {appointmentAnalytics.appointmentsByStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={pieChartColors[index % pieChartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Pattern */}
        <Card className="p-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Weekly Appointment Pattern
            </CardTitle>
            <CardDescription>Your preferred days for scheduling appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={appointmentAnalytics.weeklyPattern}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar
                  dataKey="appointments"
                  fill={chartColors.accent}
                  name="Appointments"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Doctors */}
        <Card className="p-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Your Healthcare Team
            </CardTitle>
            <CardDescription>Doctors you visit most frequently</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointmentAnalytics.topDoctors.length > 0 ? (
                appointmentAnalytics.topDoctors.map((doctor, index) => (
                  <div
                    key={`${doctor.name}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{doctor.name}</p>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{doctor.count} visits</p>
                      <p className="text-sm text-muted-foreground">
                        {doctor.completionRate}% completed
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Wait Time</p>
              <p className="text-2xl font-bold">{appointmentAnalytics.averageWaitTime}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Satisfaction Score</p>
              <p className="text-2xl font-bold">{appointmentAnalytics.satisfactionScore}</p>
            </div>
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className="text-2xl font-bold">85/100</p>
            </div>
            <Heart className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Appointments List */}
      <Card className="p-6" ref={appointmentsRef}>
        <CardHeader className="pb-4">
          <CardTitle>Your Appointments</CardTitle>
          <CardDescription>View and manage your scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
            <Tab.List className="flex space-x-1 rounded-xl bg-muted p-1">
              {Object.entries(tabs).map(([key, { name }]) => (
                <Tab
                  key={key}
                  className={({ selected }: { selected: boolean }) =>
                    clsx(
                      'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                      'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected
                        ? 'bg-background text-foreground shadow'
                        : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                    )
                  }
                >
                  {name}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="mt-6">
              {Object.entries(tabs).map(([status, { component: Component }]) => (
                <Tab.Panel key={status} className="space-y-4">
                  <Component
                    appointments={appointments.filter(appt => {
                      if (status === 'upcoming')
                        return (
                          parseAppointmentDate(appt.appointmentDate) >= new Date() &&
                          appt.status !== AppointmentStatus.CANCELED
                        );
                      if (status === 'past')
                        return (
                          parseAppointmentDate(appt.appointmentDate) < new Date() &&
                          appt.status !== AppointmentStatus.CANCELED
                        );
                      if (status === 'canceled') return appt.status === AppointmentStatus.CANCELED;
                      return false;
                    })}
                    onCancel={handleShowCancelModal}
                  />
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </CardContent>
      </Card>

      {/* Modals */}
      <BookAppointmentModal
        isOpen={showBookModal}
        onClose={handleCloseBookModal}
        onBook={handleBookAppointment}
        doctorOptions={[]}
      />
      <CancelAppointmentModal
        isOpen={showCancelModal}
        onClose={handleCloseCancelModal}
        appointment={selectedAppointment}
        onConfirm={handleCancelAppointment}
      />
    </div>
  );
}
