/**
 * Utility functions for checking doctor availability
 * Used for appointment booking and validation
 */

import type { TimeSlot, DoctorProfile, Appointment } from '@/types/schemas';
import { format, parseISO } from 'date-fns';

/**
 * Converts a date string to YYYY-MM-DD format for comparison
 */
export function formatDateForComparison(dateString: string): string {
  // Handle ISO strings
  try {
    const date = parseISO(dateString);
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error parsing date:', error);
    return '';
  }
}

/**
 * Gets the day of the week (0-6, where 0 is Sunday) from a date string
 */
export function getDayOfWeek(dateString: string): number {
  try {
    const date = parseISO(dateString);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return -1;
    }

    return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  } catch (error) {
    console.error('Error parsing date:', error);
    return -1;
  }
}

/**
 * Checks if a date is in the doctor's blockedDates array
 */
export function isDateBlocked(dateString: string, blockedDates: string[] = []): boolean {
  // Convert the date string to YYYY-MM-DD format for comparison
  const dateToCheck = formatDateForComparison(dateString);

  return blockedDates.some(blockedDate => {
    const blockedDateFormatted = formatDateForComparison(blockedDate);
    return dateToCheck === blockedDateFormatted;
  });
}

/**
 * Maps day number to day name in weeklySchedule
 */
export function getDayName(dayNumber: number): string {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayNumber >= 0 && dayNumber <= 6 ? dayNames[dayNumber] : '';
}

/**
 * Checks if a time slot falls within an available time range
 */
export function isTimeInRange(
  startTime: string,
  endTime: string,
  availableSlot: TimeSlot
): boolean {
  return (
    availableSlot.isAvailable &&
    startTime >= availableSlot.startTime &&
    endTime <= availableSlot.endTime
  );
}

/**
 * Checks if a specific time slot on a specific date is available for a doctor
 */
export function isSlotAvailable(
  doctorProfile: DoctorProfile,
  appointmentDate: string,
  startTime: string,
  endTime: string
): boolean {
  // Check if doctor exists
  if (!doctorProfile) return false;

  // Check if the date is blocked
  if (isDateBlocked(appointmentDate, doctorProfile.blockedDates)) {
    return false;
  }

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = getDayOfWeek(appointmentDate);

  // Get day name
  const dayName = getDayName(dayOfWeek) as keyof typeof doctorProfile.weeklySchedule;

  // Get available slots for that day
  const dailySchedule: TimeSlot[] = doctorProfile.weeklySchedule?.[dayName] || [];

  // Check if the requested time slot falls within any available slot
  return dailySchedule.some(slot => isTimeInRange(startTime, endTime, slot));
}

/**
 * Checks if a slot conflicts with existing appointments
 */
export function hasAppointmentConflict(
  doctorId: string,
  appointmentDate: string,
  startTime: string,
  endTime: string,
  existingAppointments: Appointment[]
): boolean {
  // Filter appointments for this doctor on this date
  const appointmentsForDoctorOnDate = existingAppointments.filter(
    appointment =>
      appointment.doctorId === doctorId &&
      formatDateForComparison(appointment.appointmentDate) ===
        formatDateForComparison(appointmentDate)
  );

  // Check for time conflicts
  return appointmentsForDoctorOnDate.some(appointment => {
    // Time ranges overlap if:
    // - new start time is before existing end time AND
    // - new end time is after existing start time
    return startTime < appointment.endTime && endTime > appointment.startTime;
  });
}

/**
 * Gets all available time slots for a doctor on a specific date,
 * taking into account their weekly schedule, blocked dates, and existing appointments
 */
export function getAvailableSlotsForDate(
  doctorProfile: DoctorProfile,
  dateString: string,
  existingAppointments: Appointment[],
  slotDurationMinutes: number = 30
): TimeSlot[] {
  // Check if date is blocked
  if (isDateBlocked(dateString, doctorProfile.blockedDates)) {
    return [];
  }

  // Get day of week and corresponding schedule
  const dayOfWeek = getDayOfWeek(dateString);
  const dayName = getDayName(dayOfWeek) as keyof typeof doctorProfile.weeklySchedule;
  const dailySchedule: TimeSlot[] = doctorProfile.weeklySchedule?.[dayName] || [];

  if (dailySchedule.length === 0) {
    return []; // No slots available on this day
  }

  // Generate available time slots based on the schedule
  const availableSlots: TimeSlot[] = [];

  dailySchedule.forEach(scheduleBlock => {
    if (!scheduleBlock.isAvailable) return;

    // Convert HH:MM strings to minutes for easier calculation
    const startMinutes = timeStringToMinutes(scheduleBlock.startTime);
    const endMinutes = timeStringToMinutes(scheduleBlock.endTime);

    // Generate slots at regular intervals
    for (
      let slotStart = startMinutes;
      slotStart + slotDurationMinutes <= endMinutes;
      slotStart += slotDurationMinutes
    ) {
      const slotStartTime = minutesToTimeString(slotStart);
      const slotEndTime = minutesToTimeString(slotStart + slotDurationMinutes);

      // Check if this slot conflicts with any existing appointments
      const hasConflict = hasAppointmentConflict(
        doctorProfile.userId,
        dateString,
        slotStartTime,
        slotEndTime,
        existingAppointments
      );

      if (!hasConflict) {
        availableSlots.push({
          startTime: slotStartTime,
          endTime: slotEndTime,
          isAvailable: true,
        });
      }
    }
  });

  return availableSlots;
}

/**
 * Converts a time string (HH:MM) to minutes since midnight
 */
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to a time string (HH:MM)
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
