'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Calendar,
  ChevronRight,
  Clock,
  User,
  Filter,
  Search,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import dynamic from 'next/dynamic';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import AdminAppointmentsErrorBoundary from '@/components/error-boundaries/AdminAppointmentsErrorBoundary';
import { getUserFriendlyMessage } from '@/lib/errors/errorUtils';
import { ApiError, NetworkError, DataError, AppError } from '@/lib/errors/errorClasses';

import { AppointmentStatus } from '@/types/enums';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { 
  fetchAppointmentsWithCache, 
  generateAppointmentCacheKey, 
  invalidateAppointmentCache 
} from '@/lib/appointmentCacheUtils';

// Dynamically import the VirtualizedList component
const VirtualizedList = dynamic(() => import('@/components/VirtualizedList'), {
  ssr: false,
  loading: () => <div className="py-4"><Spinner /></div>
});

// Define the appointment interface
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
}

// Items per page for pagination (only used when not virtualizing)
const ITEMS_PER_PAGE = 10;

// Define a type for virtualized list visibility state with enhanced device detection
interface VirtualizedState {
  isVisible: boolean;
  hasRendered: boolean;
  isMobile: boolean;
  isTablet: boolean;
  itemSize: number;
  visibleStartIndex?: number;
  visibleEndIndex?: number;
}

/**
 * Admin Appointments Page with virtualization and caching for improved performance
 */
export default function AdminAppointmentsPage() {
  // Performance tracking
  const perfRef = useRef(trackPerformance('AdminAppointmentsPage'));
  
  // State for filters and pagination
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for virtualized list configuration
  const [virtualizedState, setVirtualizedState] = useState<VirtualizedState>({
    isVisible: false,
    hasRendered: false,
    isMobile: false,
    isTablet: false,
    itemSize: 100, // Default height of each appointment row in pixels
    visibleStartIndex: 0,
    visibleEndIndex: 0
  });
  
  // Reference to the virtualized list container
  const virtualizedRef = useRef<HTMLDivElement>(null);

  // State for cached appointments data
  const [cachedData, setCachedData] = useState<{ 
    data: Appointment[]; 
    fromCache: boolean 
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch appointments with caching support
  const fetchAppointmentsData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      // Generate cache key based on filters
      const cacheKey = generateAppointmentCacheKey(
        undefined, // No user filter for admin view
        statusFilter !== 'all' ? statusFilter : undefined,
        dateFilter && dateFilter !== 'all' ? { 
          start: dateFilter ? new Date(dateFilter) : undefined, 
          end: dateFilter ? new Date(dateFilter) : undefined 
        } : undefined
      );
      
      // Fetch with cache support
      const result = await fetchAppointmentsWithCache(
        async () => {
          // This is the actual fetch function that will be called when cache is invalid
          try {
            const response = await fetch('/api/admin/appointments');
            if (!response.ok) {
              // Create a more specific error with status code
              throw new ApiError(
                `Error fetching appointments: ${response.statusText}`,
                {
                  statusCode: response.status,
                  context: { endpoint: '/api/admin/appointments' }
                }
              );
            }
            const data = await response.json();
            return data.appointments || [];
          } catch (err) {
            // Rethrow with better context for the error monitoring system
            if (err instanceof ApiError) {
              throw err;
            }
            // Use NetworkError instead of ApiError for network issues
            throw new NetworkError('Failed to fetch appointments', {
              cause: err instanceof Error ? err : new Error(String(err)),
              context: { endpoint: '/api/admin/appointments' }
            });
          }
        },
        cacheKey,
        { forceRefresh, expiryTime: 2 * 60 * 1000 } // 2 minute cache expiry
      );
      
      // Cast the result to match our interface
      const typedResult = {
        data: result.data as Appointment[],
        fromCache: result.fromCache
      };
      
      setCachedData(typedResult);
      setError(null);
      
      // Log cache status
      logInfo('AdminAppointments:DataFetched', {
        fromCache: result.fromCache,
        count: result.data.length,
        filters: { statusFilter, dateFilter }
      });
      
    } catch (err) {
      // Create a properly categorized error
      let enhancedError: Error;
      
      if (err instanceof AppError) {
        // If it's already an AppError (ApiError, NetworkError, etc.), use it directly
        enhancedError = err;
      } else if (err instanceof Error) {
        // If it's a standard Error, wrap it in a DataError
        enhancedError = new DataError('Error loading appointments', {
          cause: err,
          context: {
            filters: { statusFilter, dateFilter },
            forceRefresh
          }
        });
      } else {
        // For unknown error types, create a DataError with the stringified error
        enhancedError = new DataError('Unknown error fetching appointments', {
          context: { rawError: String(err) }
        });
      }
      
      setError(enhancedError);
      
      // Log the error with appropriate context
      if (enhancedError instanceof AppError) {
        logError('AdminAppointments:FetchError', { 
          message: enhancedError.message,
          category: enhancedError.category,
          context: enhancedError.context
        });
      } else {
        logError('AdminAppointments:FetchError', { 
          message: enhancedError.message
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, dateFilter]);
  
  // Initial data fetch
  useEffect(() => {
    fetchAppointmentsData(false);
    
    // Set up refresh interval (every 5 minutes)
    const refreshInterval = setInterval(() => {
      fetchAppointmentsData(true);
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(refreshInterval);
      // Clean up performance tracking
      perfRef.current.stop();
    };
  }, [fetchAppointmentsData]);
  
  // Extract appointments from the cached data
  const appointments = useMemo(() => {
    if (!cachedData) return [];
    return cachedData.data || [];
  }, [cachedData]);
  
  const totalAppointments = useMemo(() => {
    if (!cachedData) return 0;
    return cachedData.data.length;
  }, [cachedData]);
  
  const totalPages = Math.ceil(totalAppointments / ITEMS_PER_PAGE);

  // Client-side filtering for date and complex status cases (like 'scheduled')
  const filteredAppointments = useMemo(() => {
    if (!appointments.length) return [];
    
    return appointments.filter((appointment) => {
      // Filter by status
      let passesStatusFilter = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'scheduled') {
          // 'scheduled' is a special case that includes multiple statuses
          passesStatusFilter = [
            AppointmentStatus.CONFIRMED, 
            AppointmentStatus.PENDING
          ].includes(appointment.status as AppointmentStatus);
        } else {
          passesStatusFilter = appointment.status === statusFilter;
        }
      }
      
      // Filter by date
      let passesDateFilter = true;
      if (dateFilter !== 'all') {
        const appointmentDate = new Date(appointment.appointmentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        
        switch (dateFilter) {
          case 'today':
            passesDateFilter = appointmentDate >= today && appointmentDate < tomorrow;
            break;
          case 'tomorrow':
            const tomorrowEnd = new Date(tomorrow);
            tomorrowEnd.setDate(tomorrow.getDate() + 1);
            passesDateFilter = appointmentDate >= tomorrow && appointmentDate < tomorrowEnd;
            break;
          case 'week':
            passesDateFilter = appointmentDate >= today && appointmentDate < nextWeek;
            break;
          case 'month':
            passesDateFilter = appointmentDate >= today && appointmentDate < nextMonth;
            break;
          default:
            // Custom date filter - exact match
            if (dateFilter) {
              const filterDate = new Date(dateFilter);
              const nextDay = new Date(filterDate);
              nextDay.setDate(filterDate.getDate() + 1);
              passesDateFilter = appointmentDate >= filterDate && appointmentDate < nextDay;
            }
        }
      }
      
      // Filter by search query (patient name, doctor name, or appointment ID)
      let passesSearchFilter = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        passesSearchFilter = 
          appointment.patientName.toLowerCase().includes(query) ||
          appointment.doctorName.toLowerCase().includes(query) ||
          appointment.id.toLowerCase().includes(query);
      }
      
      return passesStatusFilter && passesDateFilter && passesSearchFilter;
    });
  }, [appointments, statusFilter, dateFilter, searchQuery]);
  
  // Pagination logic for non-virtualized view
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAppointments.slice(startIndex, endIndex);
  }, [filteredAppointments, currentPage]);
  
  // Determine which appointments to display based on virtualization state
  const appointmentsToDisplay = useMemo(() => {
    return virtualizedState.isVisible ? filteredAppointments : paginatedAppointments;
  }, [filteredAppointments, paginatedAppointments, virtualizedState.isVisible]);
  
  // Debounce function to prevent excessive resize handling
  const debounce = useCallback(<F extends (...args: any[]) => any>(
    func: F, 
    wait: number
  ): ((...args: Parameters<F>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<F>) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }, []);
  
  // Enhanced device detection with precise breakpoints
  const checkDeviceType = useCallback(() => {
    const width = window.innerWidth;
    const isMobile = width < 640; // sm breakpoint
    const isTablet = width >= 640 && width < 1024; // md to lg breakpoint
    
    // Adjust item size based on device type
    const itemSize = isMobile ? 140 : (isTablet ? 120 : 100);
    
    // Determine if we should use virtualization based on device and data size
    const shouldUseVirtualization = filteredAppointments.length > 20;
    
    setVirtualizedState(prev => ({
      ...prev,
      isMobile,
      isTablet,
      itemSize,
      isVisible: shouldUseVirtualization
    }));
    
    logInfo('AdminAppointments:DeviceDetection', {
      width,
      isMobile,
      isTablet,
      itemSize,
      useVirtualization: shouldUseVirtualization
    });
  }, [filteredAppointments.length]);
  
  // Handle window resize with debouncing
  useEffect(() => {
    const debouncedResize = debounce(() => {
      checkDeviceType();
    }, 250);
    
    // Initial check
    checkDeviceType();
    
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
    };
  }, [checkDeviceType, debounce]);
  
  // Handle virtualized list item rendering
  const handleItemsRendered = useCallback(({
    visibleStartIndex,
    visibleStopIndex
  }: {
    visibleStartIndex: number;
    visibleStopIndex: number;
    overscanStartIndex: number;
    overscanStopIndex: number;
  }) => {
    setVirtualizedState(prev => ({
      ...prev,
      hasRendered: true,
      visibleStartIndex,
      visibleEndIndex: visibleStopIndex
    }));
    
    // Log performance metrics for large lists
    if (filteredAppointments.length > 50) {
      const visibleCount = visibleStopIndex - visibleStartIndex + 1;
      logInfo('AdminAppointments:VirtualizedRendering', {
        visibleItems: visibleCount,
        totalItems: filteredAppointments.length,
        visibleRatio: `${Math.round((visibleCount / filteredAppointments.length) * 100)}%`
      });
    }
  }, [filteredAppointments.length]);
  
  // Pagination handlers
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);
  
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);
  
  // Refresh data handler
  const handleRefresh = useCallback(() => {
    fetchAppointmentsData(true);
  }, [fetchAppointmentsData]);
  
  // Status filter handler
  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);
  
  // Date filter handler
  const handleDateFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);
  
  // Search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  }, []);
  
  // Render appointment row for virtualized list
  const renderAppointmentRow = useCallback((appointment: Appointment, index: number, style: React.CSSProperties) => {
    return (
      <div style={style} key={appointment.id}>
        <AppointmentRow appointment={appointment} />
      </div>
    );
  }, []);
  
  // Optimized AppointmentRow component with memoization to prevent unnecessary re-renders
  const AppointmentRowBase = ({ appointment }: { appointment: Appointment }) => {
    // Format the date
    const formattedDate = useMemo(() => {
      return appointment.startTime
        ? format(new Date(appointment.startTime), 'MMM d, yyyy')
        : 'N/A';
    }, [appointment.startTime]);
    
    // Format the time
    const formattedTime = useMemo(() => {
      if (!appointment.startTime || !appointment.endTime) return 'N/A';
      
      const start = format(new Date(appointment.startTime), 'h:mm a');
      const end = format(new Date(appointment.endTime), 'h:mm a');
      return `${start} - ${end}`;
    }, [appointment.startTime, appointment.endTime]);
    
    // Determine status badge color
    const statusColor = useMemo(() => {
      switch (appointment.status) {
        case AppointmentStatus.CONFIRMED:
          return 'green';
        case AppointmentStatus.PENDING:
          return 'yellow';
        case AppointmentStatus.CANCELLED:
          return 'red';
        case AppointmentStatus.COMPLETED:
          return 'blue';
        case AppointmentStatus.NO_SHOW:
          return 'gray';
        default:
          return 'gray';
      }
    }, [appointment.status]);
    
    return (
      <Card className="mb-3 p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{appointment.patientName}</h3>
            <div className="flex items-center text-gray-600 mt-1">
              <User className="h-4 w-4 mr-1" />
              <span className="text-sm">Dr. {appointment.doctorName}</span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-sm italic">{appointment.doctorSpecialty}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center mt-2">
              <div className="flex items-center text-gray-600 mr-4">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="text-sm">{formattedDate}</span>
              </div>
              <div className="flex items-center text-gray-600 mt-1 sm:mt-0">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm">{formattedTime}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end mt-3 md:mt-0">
            <Badge color={statusColor} className="mb-2">
              {appointment.status}
            </Badge>
            <Link href={`/admin/appointments/${appointment.id}`}>
              <Button size="sm" variant="outline" className="flex items-center">
                <span>View Details</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  };
  
  // Create a memoized version of the component
  const AppointmentRow = React.memo(AppointmentRowBase, (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Only re-render if important properties change
    return (
      prevProps.appointment.id === nextProps.appointment.id &&
      prevProps.appointment.status === nextProps.appointment.status &&
      prevProps.appointment.startTime === nextProps.appointment.startTime &&
      prevProps.appointment.endTime === nextProps.appointment.endTime
    );
  });
  
  // Wrap the entire component with AdminAppointmentsErrorBoundary
  return (
    <AdminAppointmentsErrorBoundary componentName="AdminAppointmentsPage">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Appointments</h1>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className="flex items-center"
              disabled={isLoading}
            >
              {isLoading ? <Spinner className="mr-2" size="sm" /> : null}
              Refresh
            </Button>
            <Link href="/admin/appointments/new">
              <Button className="w-full sm:w-auto">New Appointment</Button>
            </Link>
          </div>
        </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-gray-700 font-medium">Filters:</span>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Select 
                label="Status" 
                value={statusFilter} 
                onChange={handleStatusFilterChange}
                className="w-full"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value={AppointmentStatus.CONFIRMED}>Confirmed</option>
                <option value={AppointmentStatus.PENDING}>Pending</option>
                <option value={AppointmentStatus.CANCELLED}>Cancelled</option>
                <option value={AppointmentStatus.COMPLETED}>Completed</option>
                <option value={AppointmentStatus.NO_SHOW}>No Show</option>
              </Select>
            </div>
            
            <div>
              <Select 
                label="Date" 
                value={dateFilter} 
                onChange={handleDateFilterChange}
                className="w-full"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">Next 7 Days</option>
                <option value="month">Next 30 Days</option>
              </Select>
            </div>
            
            <div className="sm:col-span-2">
              <div className="relative">
                <Input
                  label="Search"
                  placeholder="Search by patient or doctor name"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10"
                />
                <Search className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Error message with enhanced error display */}
      {error && (
        <ErrorDisplay 
          error={error}
          message={getUserFriendlyMessage(error)}
          severity="error"
          category={error instanceof AppError ? error.category : 'unknown'}
          onRetry={handleRefresh}
          helpText="You can try refreshing the data or check your network connection."
          className="mb-4"
        />
      )}
      
      {/* Loading state */}
      {isLoading && !cachedData && (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      
      {/* No results */}
      {!isLoading && filteredAppointments.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="flex flex-col items-center">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No appointments found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              There are no appointments matching your current filters. Try changing your filters or create a new appointment.
            </p>
            <Link href="/admin/appointments/new">
              <Button>Create New Appointment</Button>
            </Link>
          </div>
        </div>
      )}
      
      {/* Appointments list */}
      {!isLoading && filteredAppointments.length > 0 && (
        <div>
          {/* Cache status indicator */}
          {cachedData?.fromCache && (
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                Cached
              </span>
              Showing cached data. 
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2 text-blue-600 hover:text-blue-800"
                onClick={handleRefresh}
              >
                Refresh
              </Button>
            </div>
          )}
          
          {/* Appointments count */}
          <div className="text-sm text-gray-500 mb-4">
            Showing {filteredAppointments.length} appointments
            {virtualizedState.isVisible && (
              <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                Virtualized
              </span>
            )}
          </div>
          
          {/* Virtualized list */}
          {virtualizedState.isVisible ? (
            <div ref={virtualizedRef} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <VirtualizedList
                items={filteredAppointments}
                itemSize={virtualizedState.itemSize}
                height={Math.min(600, filteredAppointments.length * virtualizedState.itemSize)}
                overscanCount={5}
                onItemsRendered={handleItemsRendered}
                renderItem={renderAppointmentRow}
                itemKey={(index) => filteredAppointments[index].id}
                className="w-full"
              />
            </div>
          ) : (
            /* Regular list with pagination */
            <div className="space-y-4">
              {paginatedAppointments.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} />
              ))}
              
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </AdminAppointmentsErrorBoundary>
  );
}
