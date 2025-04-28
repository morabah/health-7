'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { 
  CalendarDays, 
  Clock, 
  ChevronLeft, 
  CheckCircle,
  MapPin,
  VideoIcon,
  Calendar
} from 'lucide-react';
import { logInfo, logValidation } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { useDoctorProfile, useDoctorAvailability } from '@/data/sharedLoaders';
import { useBookAppointment } from '@/data/sharedLoaders';
import { format, parseISO, addDays } from 'date-fns';
import { AppointmentType } from '@/types/enums';

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const doctorId = params?.doctorId as string;
  
  // Fetch doctor profile and availability
  const { data: doctorData, isLoading: doctorLoading, error: doctorError } = useDoctorProfile(doctorId);
  const { data: availabilityData, isLoading: availabilityLoading, error: availabilityError } = useDoctorAvailability(doctorId);
  const bookAppointmentMutation = useBookAppointment();
  
  // State variables
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(AppointmentType.IN_PERSON);
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generate available dates (next 14 days)
  const generateAvailableDates = () => {
    const dates = [];
    const currentDate = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = addDays(currentDate, i);
      dates.push(date);
    }
    
    return dates;
  };
  
  const availableDates = generateAvailableDates();
  
  // Get available time slots for selected date
  const getAvailableTimeSlots = () => {
    if (!selectedDate || !availabilityData?.success) return [];
    
    const { availability } = availabilityData;
    const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase();
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    // Check if date is blocked
    if (availability.blockedDates && availability.blockedDates.includes(dateString)) {
      return [];
    }
    
    // Get slots for the day
    if (availability.weeklySchedule && availability.weeklySchedule[dayOfWeek]) {
      return availability.weeklySchedule[dayOfWeek]
        .filter((slot: any) => slot.isAvailable)
        .map((slot: any) => ({
          startTime: slot.startTime,
          endTime: slot.endTime
        }));
    }
    
    return [];
  };
  
  const availableTimeSlots = getAvailableTimeSlots();
  
  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, 'EEE, MMM d, yyyy');
  };
  
  // Handle booking submission
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTimeSlot || !selectedEndTime) {
      setError('Please select a date and time for your appointment');
      return;
    }
    
    try {
      const result = await bookAppointmentMutation.mutateAsync({
        doctorId,
        appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedTimeSlot,
        endTime: selectedEndTime,
        reason,
        appointmentType: appointmentType
      });
      
      if (result.success) {
        setSuccess(true);
        setError(null);
        logInfo('appointment', {
          action: 'book-appointment-success',
          doctorId,
          patientId: user?.uid,
          date: selectedDate.toISOString(),
          time: selectedTimeSlot
        });
        
        logValidation('4.11', 'success', 'Book appointment function fully operational with real data');
        
        // Redirect to appointments page after short delay
        setTimeout(() => {
          router.push('/patient/appointments');
        }, 1500);
      } else {
        setError(result.error || 'Failed to book appointment');
      }
    } catch (err) {
      setError('An error occurred while booking your appointment');
      console.error('Error booking appointment:', err);
    }
  };
  
  const isLoading = doctorLoading || availabilityLoading;
  const doctor = doctorData?.success ? doctorData.doctor : null;
  
  useEffect(() => {
    // Reset selected time slot when date changes
    setSelectedTimeSlot(null);
    setSelectedEndTime(null);
  }, [selectedDate]);
  
  if (doctorError || availabilityError) {
    return (
      <Alert variant="error">
        {doctorError || availabilityError}
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Book Appointment</h1>
        <Link href={`/doctor-profile/${doctorId}`}>
          <Button variant="outline" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Profile
          </Button>
        </Link>
      </div>
      
      {error && <Alert variant="error">{error}</Alert>}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Info Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : doctor ? (
              <>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                    {doctor.profilePictureUrl ? (
                      <img 
                        src={doctor.profilePictureUrl} 
                        alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">Dr. {doctor.firstName} {doctor.lastName}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.specialty}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {doctor.location && (
                    <div className="flex items-start text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 mr-2 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-300">{doctor.location}</span>
                    </div>
                  )}
                  {doctor.consultationFee && (
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-300">
                        Consultation Fee: ${doctor.consultationFee}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-slate-500">
                Doctor information not available
              </div>
            )}
            
            {/* Selected appointment summary */}
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
                    <span>{selectedTimeSlot} - {selectedEndTime}</span>
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
                Your appointment with Dr. {doctor?.firstName} {doctor?.lastName} has been confirmed.
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Redirecting to your appointments...
              </p>
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
                  {availableDates.map((date, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`p-3 rounded-md border text-center transition-colors duration-200 ${
                        selectedDate && date.toDateString() === selectedDate.toDateString()
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="font-medium">{format(date, 'EEE')}</div>
                      <div className="text-xl font-bold">{format(date, 'd')}</div>
                      <div className="text-xs">{format(date, 'MMM')}</div>
                    </button>
                  ))}
                </div>
              </Card>
              
              {/* Time Slot Selection */}
              {selectedDate && (
                <Card className="p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">2. Select a Time Slot</h2>
                  {availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {availableTimeSlots.map((slot, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`py-2 px-3 rounded-md border text-center transition-colors duration-200 ${
                            slot.startTime === selectedTimeSlot
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                          }`}
                          onClick={() => {
                            setSelectedTimeSlot(slot.startTime);
                            setSelectedEndTime(slot.endTime);
                          }}
                        >
                          {slot.startTime}
                        </button>
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
              )}
              
              {/* Appointment Type & Reason */}
              {selectedDate && selectedTimeSlot && (
                <Card className="p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">3. Appointment Details</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Appointment Type</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            className="h-4 w-4 text-primary border-slate-300"
                            checked={appointmentType === AppointmentType.IN_PERSON}
                            onChange={() => setAppointmentType(AppointmentType.IN_PERSON)}
                          />
                          <span className="ml-2 text-sm">In-person Visit</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            className="h-4 w-4 text-primary border-slate-300"
                            checked={appointmentType === AppointmentType.VIDEO}
                            onChange={() => setAppointmentType(AppointmentType.VIDEO)}
                          />
                          <span className="ml-2 text-sm">Video Consultation</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Reason for Visit (Optional)
                      </label>
                      <Textarea
                        id="reason"
                        rows={3}
                        placeholder="Describe your symptoms or reason for the appointment"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!selectedDate || !selectedTimeSlot || bookAppointmentMutation.isPending}
                  isLoading={bookAppointmentMutation.isPending}
                >
                  Book Appointment
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 