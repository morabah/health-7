'use client';

/**
 * Mock API functions for appointment operations
 * Uses local database to simulate backend behavior
 */

import { z } from 'zod';
import type { Appointment } from '@/types/schemas';
import { AppointmentStatus, AppointmentType } from '@/types/enums';
import { getDoctors, getAppointments, saveAppointments, getUsers } from '@/lib/localDb';
import {
  isSlotAvailable,
  hasAppointmentConflict,
  getAvailableSlotsForDate,
} from '@/utils/availabilityUtils';
import { logInfo, logError } from '@/lib/logger';
import { 
  BookAppointmentSchema,
  MockGetAvailableTimeSlotsSchema,
  MockGetDoctorScheduleSchema
} from '@/types/schemas';

// Extended BookAppointment type for mock API purposes
interface MockBookAppointmentPayload extends z.infer<typeof BookAppointmentSchema> {
  patientId: string;
}

/**
 * Books a new appointment after validating availability
 * This is a mock implementation that simulates the Cloud Function
 */
export async function bookAppointment(
  payload: MockBookAppointmentPayload
): Promise<{ success: boolean; appointmentId?: string; message?: string }> {
  try {
    // Validate the payload with Zod using the central schema
    const validationResult = BookAppointmentSchema.safeParse(payload);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      logError(`Invalid appointment booking payload: ${errorMessage}`, payload);
      return { success: false, message: `Validation failed: ${errorMessage}` };
    }

    const { doctorId, appointmentDate, startTime, endTime, reason, appointmentType } =
      validationResult.data;
    
    // For mock API, we need the patientId from the payload
    const patientId = payload.patientId;

    // Get doctor profile to check availability
    const doctors = await getDoctors();
    const doctor = doctors.find(d => d.userId === doctorId);

    if (!doctor) {
      logError(`Doctor not found: ${doctorId}`);
      return { success: false, message: 'Doctor not found' };
    }

    // Get doctor user profile for name
    const users = await getUsers();
    const doctorUser = users.find(u => u.id === doctorId);

    if (!doctorUser) {
      logError(`Doctor user not found: ${doctorId}`);
      return { success: false, message: 'Doctor user not found' };
    }

    // Also get patient user for name
    const patientUser = users.find(u => u.id === patientId);

    // Get existing appointments to check for conflicts
    const existingAppointments = await getAppointments();

    // Check if doctor is available for this slot
    const isAvailable = isSlotAvailable(doctor, appointmentDate, startTime, endTime);

    if (!isAvailable) {
      logError(`Doctor ${doctorId} is not available at the requested time`, {
        doctorId,
        appointmentDate,
        startTime,
        endTime,
      });
      return { success: false, message: 'The selected time slot is not available' };
    }

    // Check for appointment conflicts
    const hasConflict = hasAppointmentConflict(
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      existingAppointments
    );

    if (hasConflict) {
      logError(`Appointment conflict for doctor ${doctorId}`, {
        doctorId,
        appointmentDate,
        startTime,
        endTime,
      });
      return { success: false, message: 'This time slot is already booked' };
    }

    // Generate appointment ID
    const appointmentId = `appt-${Math.random().toString(36).substring(2, 11)}`;

    // Create appointment object
    const now = new Date().toISOString();
    const newAppointment: Appointment = {
      id: appointmentId,
      patientId,
      doctorId,
      patientName: patientUser
        ? `${patientUser.firstName} ${patientUser.lastName}`
        : 'Patient Name',
      doctorName: `Dr. ${doctorUser.firstName} ${doctorUser.lastName}`,
      doctorSpecialty: doctor.specialty,
      appointmentDate,
      startTime,
      endTime,
      status: AppointmentStatus.PENDING, // Fixed the SCHEDULED to PENDING which exists in enum
      reason: reason || null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      appointmentType,
      videoCallUrl: appointmentType === AppointmentType.VIDEO ? 'https://video-call-link.example.com' : null,
    };

    // Save the appointment
    await saveAppointments([...existingAppointments, newAppointment]);

    logInfo(`Appointment successfully booked`, { appointmentId });

    // Return success
    return {
      success: true,
      appointmentId,
      message: 'Appointment successfully booked',
    };
  } catch (error) {
    logError('Error booking appointment', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
}

/**
 * Gets available time slots for a doctor on a specific date
 * This is a mock implementation that simulates the Cloud Function
 */
export async function getAvailableTimeSlots(payload: { doctorId: string, date: string }) {
  try {
    // Validate with schema
    const validationResult = MockGetAvailableTimeSlotsSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        message: `Invalid request: ${validationResult.error.format()}`
      };
    }

    const { doctorId, date } = validationResult.data;

    // Get doctor profile
    const doctors = await getDoctors();
    const doctor = doctors.find(d => d.userId === doctorId);

    if (!doctor) {
      return { success: false, message: 'Doctor not found' };
    }

    // Get existing appointments
    const appointments = await getAppointments();

    // Get available slots
    const availableSlots = getAvailableSlotsForDate(doctor, date, appointments);

    return {
      success: true,
      slots: availableSlots,
    };
  } catch (error) {
    logError('Error getting available time slots', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
}

/**
 * Gets doctor's weekly schedule
 * This is a mock implementation that simulates the Cloud Function
 */
export async function getDoctorSchedule(payload: { doctorId: string, startDate: string, endDate?: string }) {
  try {
    // Validate with schema
    const validationResult = MockGetDoctorScheduleSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        message: `Invalid request: ${validationResult.error.format()}`
      };
    }

    const { doctorId } = validationResult.data;

    // Get doctor profile
    const doctors = await getDoctors();
    const doctor = doctors.find(d => d.userId === doctorId);

    if (!doctor) {
      return { success: false, message: 'Doctor not found' };
    }

    return {
      success: true,
      schedule: doctor.weeklySchedule,
      blockedDates: doctor.blockedDates,
    };
  } catch (error) {
    logError('Error getting doctor schedule', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
}
