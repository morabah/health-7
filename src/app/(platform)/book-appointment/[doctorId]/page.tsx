'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { 
  CalendarDays, 
  Clock, 
  ChevronLeft, 
  CheckCircle,
  MapPin,
  VideoIcon
} from 'lucide-react';
import { logInfo } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';

// Mock doctor data
const mockDoctor = {
  id: 'doctor-123',
  firstName: 'Jane',
  lastName: 'Smith',
  specialty: 'Cardiology',
  location: '123 Medical Center, New York',
  fee: '$150',
  picture: null // Placeholder for image
};

// Mock available dates (next 5 days)
const generateAvailableDates = () => {
  const dates = [];
  const currentDate = new Date();
  
  for (let i = 1; i <= 5; i++) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() + i);
    dates.push(date);
  }
  
  return dates;
};

// Mock time slots
const mockTimeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'
];

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const doctorId = params?.doctorId as string;
  
  // State variables
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<'in-person' | 'video'>('in-person');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Available dates for this doctor
  const availableDates = generateAvailableDates();
  
  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Handle booking submission
  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTimeSlot) {
      return;
    }
    
    setIsLoading(true);
    
    // Log booking attempt
    logInfo('appointment', {
      action: 'book-appointment',
      doctorId,
      patientId: user?.id,
      date: selectedDate.toISOString(),
      time: selectedTimeSlot,
      type: appointmentType,
      reason
    });
    
    // Simulate API request
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      
      // Redirect to appointments page after short delay
      setTimeout(() => {
        router.push('/patient/appointments');
      }, 1500);
    }, 1000);
  };
  
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Info Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-4">
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                {/* Placeholder for doctor image */}
                <span className="text-lg font-bold">{mockDoctor.firstName[0]}{mockDoctor.lastName[0]}</span>
              </div>
              <div>
                <h3 className="font-semibold">Dr. {mockDoctor.firstName} {mockDoctor.lastName}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{mockDoctor.specialty}</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-start text-sm">
                <MapPin className="h-4 w-4 mt-0.5 mr-2 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">{mockDoctor.location}</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">Consultation Fee: {mockDoctor.fee}</span>
              </div>
            </div>
            
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
                    <span>{selectedTimeSlot}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    {appointmentType === 'in-person' ? (
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
                Your appointment with Dr. {mockDoctor.firstName} {mockDoctor.lastName} has been confirmed.
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Redirecting to your appointments...
              </p>
            </Card>
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
                      <div className="font-medium">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-xl font-bold">{date.getDate()}</div>
                      <div className="text-xs">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
                    </button>
                  ))}
                </div>
              </Card>
              
              {/* Time Slot Selection */}
              {selectedDate && (
                <Card className="p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">2. Select a Time Slot</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {mockTimeSlots.map((timeSlot, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`py-2 px-3 rounded-md border text-center transition-colors duration-200 ${
                          timeSlot === selectedTimeSlot
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                        }`}
                        onClick={() => setSelectedTimeSlot(timeSlot)}
                      >
                        {timeSlot}
                      </button>
                    ))}
                  </div>
                </Card>
              )}
              
              {/* Appointment Type & Reason */}
              {selectedDate && selectedTimeSlot && (
                <Card className="p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">3. Appointment Details</h2>
                  
                  <div className="mb-6">
                    <div id="appointment-type-label" className="block text-sm font-medium mb-2">Appointment Type</div>
                    <div className="flex flex-col sm:flex-row gap-3" aria-labelledby="appointment-type-label">
                      <button
                        type="button"
                        className={`flex items-center justify-center p-4 rounded-md border transition-colors duration-200 ${
                          appointmentType === 'in-person'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                        }`}
                        onClick={() => setAppointmentType('in-person')}
                      >
                        <MapPin className="h-5 w-5 mr-2" />
                        <span>In-person Visit</span>
                      </button>
                      
                      <button
                        type="button"
                        className={`flex items-center justify-center p-4 rounded-md border transition-colors duration-200 ${
                          appointmentType === 'video'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-slate-200 hover:border-primary/50 dark:border-slate-700'
                        }`}
                        onClick={() => setAppointmentType('video')}
                      >
                        <VideoIcon className="h-5 w-5 mr-2" />
                        <span>Video Consultation</span>
                      </button>
                    </div>
                  </div>
                  
                  <Textarea
                    id="reason"
                    label="Reason for Visit (Optional)"
                    placeholder="Briefly describe your symptoms or reason for the appointment..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                  
                  <div className="mt-6">
                    <Button
                      type="submit"
                      className="w-full"
                      isLoading={isLoading}
                    >
                      Book Appointment
                    </Button>
                  </div>
                </Card>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 