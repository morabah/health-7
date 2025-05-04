/**
 * Appointment Functions
 *
 * Functions for managing appointments between patients and doctors
 */

import { z } from 'zod';
import { UserType, AppointmentStatus, NotificationType, AppointmentType, VerificationStatus } from '@/types/enums';
import { trackPerformance } from '@/lib/performance';
import { logInfo, logError } from '@/lib/logger';
import { 
  getAppointments, 
  saveAppointments,
  getPatients,
  getDoctors,
  getUsers,
  getNotifications,
  saveNotifications
} from '@/lib/localDb';
import { generateId, nowIso } from '@/lib/localApiCore';
import { getAvailableSlotsForDate } from '@/utils/availabilityUtils';

import type { ResultOk, ResultErr } from '@/lib/localApiCore';
import type { Appointment, Notification } from '@/types/schemas';

/**
 * Book an appointment with a doctor
 */
export async function bookAppointment(
  context: { uid: string; role: UserType },
  payload: {
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    reason?: string;
    appointmentType?: AppointmentType;
  }
): Promise<ResultOk<{ success: true; appointment: Appointment }> | ResultErr> {
  const perf = trackPerformance('bookAppointment');

  try {
    const { uid, role } = context;

    // Validate with Zod schema
    const validationSchema = z.object({
      doctorId: z.string().min(1, 'Doctor ID is required'),
      appointmentDate: z.string().min(1, 'Appointment date is required'),
      startTime: z.string().min(1, 'Start time is required'),
      endTime: z.string().min(1, 'End time is required'),
      reason: z.string().optional(),
      appointmentType: z.nativeEnum(AppointmentType).optional(),
    });

    const result = validationSchema.safeParse(payload);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid booking data: ${result.error.message}`,
      };
    }

    // Validate user is authenticated and has correct role
    if (!uid) {
      return { success: false, error: 'User not authenticated' };
    }

    if (role !== UserType.PATIENT) {
      return { success: false, error: 'Only patients can book appointments' };
    }

    // Check required parameters
    const { doctorId, appointmentDate, startTime, endTime, reason, appointmentType } = payload;

    if (!doctorId || !appointmentDate || !startTime || !endTime) {
      return { success: false, error: 'Missing required appointment details' };
    }

    // Check doctor exists
    const doctors = await getDoctors();
    const doctor = doctors.find(d => d.userId === doctorId);
    if (!doctor) {
      return { success: false, error: `Doctor with ID ${doctorId} not found` };
    }

    // Check doctor is verified
    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      return { success: false, error: 'Doctor is not verified' };
    }

    // Get patient profile
    const patients = await getPatients();
    const patient = patients.find(p => p.userId === uid);
    if (!patient) {
      return { success: false, error: 'Patient profile not found' };
    }

    // Get user profiles for patient and doctor
    const userProfiles = await getUsers();
    const patientUser = userProfiles.find(u => u.id === uid);
    const doctorUser = userProfiles.find(u => u.id === doctorId);

    // Compose names safely
    const patientName = patientUser
      ? `${patientUser.firstName} ${patientUser.lastName}`
      : 'Unknown Patient';
    const doctorName = doctorUser
      ? `${doctorUser.firstName} ${doctorUser.lastName}`
      : 'Unknown Doctor';
    const doctorSpecialty = doctor.specialty || '';

    // Compose Appointment object with correct types
    const appointment: Appointment = {
      id: generateId(),
      patientId: uid,
      patientName,
      doctorId,
      doctorName,
      doctorSpecialty,
      appointmentDate,
      startTime,
      endTime,
      status: AppointmentStatus.PENDING,
      reason: reason ?? null,
      notes: null,
      appointmentType: appointmentType ?? AppointmentType.IN_PERSON,
      videoCallUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to local db
    const appointments = await getAppointments();
    appointments.push(appointment);
    await saveAppointments(appointments);

    // Create notification for doctor and patient
    const notifications = await getNotifications();

    // Doctor notification
    const doctorNotification: Notification = {
      id: `notif-${generateId()}`,
      userId: doctorId,
      title: 'New Appointment',
      message: `${patientName} has booked an appointment on ${appointmentDate} at ${startTime}`,
      type: NotificationType.APPOINTMENT_BOOKED,
      isRead: false,
      createdAt: nowIso(),
      relatedId: appointment.id,
    };
    notifications.push(doctorNotification);

    // Patient notification
    const patientNotification: Notification = {
      id: `notif-${generateId()}`,
      userId: uid,
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${doctorName} on ${appointmentDate} at ${startTime} has been booked.`,
      type: NotificationType.APPOINTMENT_BOOKED,
      isRead: false,
      createdAt: nowIso(),
      relatedId: appointment.id,
    };
    notifications.push(patientNotification);

    // Save notifications
    await saveNotifications(notifications);

    // Return full appointment object in response
    return {
      success: true,
      appointment,
    };
  } catch (error) {
    logError('bookAppointment failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to book appointment',
    };
  } finally {
    perf.stop();
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
  ctx: { uid: string; role: UserType },
  payload: {
    appointmentId: string;
    reason?: string;
  }
): Promise<ResultOk<{ success: true; appointment: Appointment }> | ResultErr> {
  const perf = trackPerformance('cancelAppointment');

  try {
    const { uid, role } = ctx;
    const { appointmentId, reason } = payload;

    // Validate with Zod schema
    const validationSchema = z.object({
      appointmentId: z.string().min(1, 'Appointment ID is required'),
      reason: z.string().optional(),
    });

    const result = validationSchema.safeParse(payload);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid cancellation data: ${result.error.message}`,
      };
    }

    logInfo('cancelAppointment called', { uid, role, appointmentId, reason });

    // Get all appointments
    const appointments = await getAppointments();

    // Find the appointment to cancel
    const appointmentIndex = appointments.findIndex(a => a.id === appointmentId);

    if (appointmentIndex === -1) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointments[appointmentIndex];

    // Check permissions - only the patient, doctor of the appointment, or admin can cancel
    const canCancel =
      role === UserType.ADMIN ||
      (role === UserType.PATIENT && appointment.patientId === uid) ||
      (role === UserType.DOCTOR && appointment.doctorId === uid);

    if (!canCancel) {
      return { success: false, error: 'You are not authorized to cancel this appointment' };
    }

    // Can only cancel pending or confirmed appointments
    if (![AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status)) {
      return {
        success: false,
        error: `Cannot cancel an appointment with status: ${appointment.status}`,
      };
    }

    // Get the canceler's name for the notification
    let canceledBy = 'Unknown';
    const users = await getUsers();

    if (role === UserType.ADMIN) {
      canceledBy = 'Admin';
    } else {
      const user = users.find(u => u.id === uid);
      if (user) {
        canceledBy = `${user.firstName} ${user.lastName}`;
      }
    }

    // Update the appointment
    appointment.status = AppointmentStatus.CANCELED;
    if (reason) appointment.notes = `Canceled - ${reason}`;
    appointment.updatedAt = nowIso();

    // Save updated appointment
    appointments[appointmentIndex] = appointment;
    await saveAppointments(appointments);

    // Create notifications for both parties
    const notifications = await getNotifications();
    
    if (role === UserType.PATIENT) {
      // Patient canceled, notify doctor
      const doctorNotification: Notification = {
        id: `notif-${generateId()}`,
        userId: appointment.doctorId,
        title: 'Appointment Canceled',
        message: `${canceledBy} has canceled the appointment scheduled for ${appointment.appointmentDate} at ${appointment.startTime}${reason ? ` - Reason: ${reason}` : ''}.`,
        type: NotificationType.APPOINTMENT_CANCELED,
        isRead: false,
        createdAt: nowIso(),
        relatedId: appointment.id,
      };
      notifications.push(doctorNotification);
    } else if (role === UserType.DOCTOR) {
      // Doctor canceled, notify patient
      const patientNotification: Notification = {
        id: `notif-${generateId()}`,
        userId: appointment.patientId,
        title: 'Appointment Canceled by Doctor',
        message: `Dr. ${canceledBy} has canceled your appointment scheduled for ${appointment.appointmentDate} at ${appointment.startTime}${reason ? ` - Reason: ${reason}` : ''}.`,
        type: NotificationType.APPOINTMENT_CANCELED,
        isRead: false,
        createdAt: nowIso(),
        relatedId: appointment.id,
      };
      notifications.push(patientNotification);
    } else if (role === UserType.ADMIN) {
      // Admin canceled, notify both patient and doctor
      const patientNotification: Notification = {
        id: `notif-${generateId()}`,
        userId: appointment.patientId,
        title: 'Appointment Canceled by Admin',
        message: `Your appointment with ${appointment.doctorName} scheduled for ${appointment.appointmentDate} at ${appointment.startTime} has been canceled by an administrator${reason ? ` - Reason: ${reason}` : ''}.`,
        type: NotificationType.APPOINTMENT_CANCELED,
        isRead: false,
        createdAt: nowIso(),
        relatedId: appointment.id,
      };

      const doctorNotification: Notification = {
        id: `notif-${generateId()}`,
        userId: appointment.doctorId,
        title: 'Appointment Canceled by Admin',
        message: `Your appointment with ${appointment.patientName} scheduled for ${appointment.appointmentDate} at ${appointment.startTime} has been canceled by an administrator${reason ? ` - Reason: ${reason}` : ''}.`,
        type: NotificationType.APPOINTMENT_CANCELED,
        isRead: false,
        createdAt: nowIso(),
        relatedId: appointment.id,
      };

      notifications.push(patientNotification);
      notifications.push(doctorNotification);
    }

    await saveNotifications(notifications);

    return { success: true, appointment };
  } catch (e) {
    logError('cancelAppointment failed', e);
    return { success: false, error: 'Error canceling appointment' };
  } finally {
    perf.stop();
  }
}

/**
 * Complete an appointment (doctor only)
 */
export async function completeAppointment(
  ctx: { uid: string; role: UserType },
  payload: {
    appointmentId: string;
    notes?: string;
  }
): Promise<ResultOk<{ success: true; appointment: Appointment }> | ResultErr> {
  const perf = trackPerformance('completeAppointment');

  try {
    const { uid, role } = ctx;
    const { appointmentId, notes } = payload;

    // Validate with Zod schema
    const validationSchema = z.object({
      appointmentId: z.string().min(1, 'Appointment ID is required'),
      notes: z.string().optional(),
    });

    const result = validationSchema.safeParse(payload);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid completion data: ${result.error.message}`,
      };
    }

    logInfo('completeAppointment called', { uid, role, appointmentId, notes });

    // Only doctors can complete appointments
    if (role !== UserType.DOCTOR) {
      return { success: false, error: 'Only doctors can mark appointments as completed' };
    }

    // Get all appointments
    const appointments = await getAppointments();

    // Find the appointment to complete
    const appointmentIndex = appointments.findIndex(a => a.id === appointmentId);

    if (appointmentIndex === -1) {
      return { success: false, error: 'Appointment not found' };
    }

    const appointment = appointments[appointmentIndex];

    // Check permissions - only the doctor of the appointment can mark it complete
    if (appointment.doctorId !== uid) {
      return { success: false, error: 'You are not authorized to complete this appointment' };
    }

    // Can only complete confirmed appointments
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      return {
        success: false,
        error: `Cannot complete an appointment with status: ${appointment.status}`,
      };
    }

    // Update appointment
    appointment.status = AppointmentStatus.COMPLETED;
    if (notes) appointment.notes = notes;
    appointment.updatedAt = nowIso();

    appointments[appointmentIndex] = appointment;
    await saveAppointments(appointments);

    // Create notification for patient
    const notifications = await getNotifications();
    const patientNotification: Notification = {
      id: `notif-${generateId()}`,
      userId: appointment.patientId,
      title: 'Appointment Completed',
      message: `Your appointment with ${appointment.doctorName} on ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.startTime} has been marked as completed.`,
      type: NotificationType.APPOINTMENT_COMPLETED,
      isRead: false,
      createdAt: nowIso(),
      relatedId: appointmentId,
    };
    notifications.push(patientNotification);
    await saveNotifications(notifications);

    return { success: true, appointment };
  } catch (e) {
    logError('completeAppointment failed', e);
    return { success: false, error: 'Error completing appointment' };
  } finally {
    perf.stop();
  }
}

/**
 * Get appointments for the current user
 */
export async function getMyAppointments(ctx: {
  uid: string;
  role: UserType;
}): Promise<ResultOk<{ appointments: Appointment[] }> | ResultErr> {
  const perf = trackPerformance('getMyAppointments');

  try {
    const { uid, role } = ctx;

    logInfo('getMyAppointments called', { uid, role });

    const appointments = await getAppointments();

    // Filter appointments based on role
    let myAppointments: Appointment[];

    if (role === UserType.PATIENT) {
      myAppointments = appointments.filter(a => a.patientId === uid);
    } else if (role === UserType.DOCTOR) {
      myAppointments = appointments.filter(a => a.doctorId === uid);
    } else if (role === UserType.ADMIN) {
      // Admins can see all appointments
      myAppointments = appointments;
    } else {
      // Default case, should never happen
      myAppointments = [];
    }

    // Sort appointments by date and time (most recent first)
    myAppointments.sort((a, b) => {
      const dateA = `${a.appointmentDate}T${a.startTime}`;
      const dateB = `${b.appointmentDate}T${b.startTime}`;

      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return { success: true, appointments: myAppointments };
  } catch (e) {
    logError('getMyAppointments failed', e);
    return { success: false, error: 'Error fetching appointments' };
  } finally {
    perf.stop();
  }
}

/**
 * Get detailed information about a specific appointment
 */
export async function getAppointmentDetails(
  ctx: { uid: string; role: UserType },
  payload: { appointmentId: string }
): Promise<ResultOk<{ appointment: Appointment }> | ResultErr> {
  const perf = trackPerformance('getAppointmentDetails');

  try {
    const { uid, role } = ctx;
    const { appointmentId } = payload;

    // Simple validation instead of using zod
    if (!appointmentId) {
      return {
        success: false,
        error: 'Appointment ID is required',
      };
    }

    logInfo('getAppointmentDetails called', { uid, role, appointmentId });

    // Get all appointments
    const appointments = await getAppointments();

    // Find the specific appointment
    let appointment: Appointment | undefined;

    if (role === UserType.ADMIN) {
      // Admins can view any appointment
      appointment = appointments.find(a => a.id === appointmentId);
    } else if (role === UserType.DOCTOR) {
      // Doctors can only view their own appointments
      appointment = appointments.find(a => a.id === appointmentId && a.doctorId === uid);
    } else if (role === UserType.PATIENT) {
      // Patients can only view their own appointments
      appointment = appointments.find(a => a.id === appointmentId && a.patientId === uid);
    }

    if (!appointment) {
      return {
        success: false,
        error: 'Appointment not found or you do not have permission to view it',
      };
    }

    return { success: true, appointment };
  } catch (e) {
    logError('getAppointmentDetails failed', e);
    return { success: false, error: 'Error fetching appointment details' };
  } finally {
    perf.stop();
  }
}

/**
 * Get available appointment slots for a doctor on a specific date
 */
export async function getAvailableSlots(
  ctx: { uid: string; role: UserType },
  payload: { doctorId: string; date: string }
): Promise<
  | ResultOk<{ slots: Array<{ startTime: string; endTime: string; isAvailable: boolean }> }>
  | ResultErr
> {
  const perf = trackPerformance('getAvailableSlots');

  try {
    // Validate context first - this is essential for authorization
    if (!ctx || typeof ctx !== 'object') {
      logError('getAvailableSlots - Invalid context', { ctx });
      return { success: false, error: 'Invalid authentication context' };
    }

    const { uid, role } = ctx;

    if (!uid || typeof uid !== 'string') {
      logError('getAvailableSlots - Missing uid in context', { ctx });
      return { success: false, error: 'User ID is required' };
    }

    if (!role) {
      logError('getAvailableSlots - Missing role in context', { uid, ctx });
      return { success: false, error: 'User role is required' };
    }

    // Minimize logging to prevent console freeze
    // Only log core info, not full payload
    logInfo('getAvailableSlots called', {
      uid: uid.substring(0, 6) + '...',
      role,
      doctorId: payload?.doctorId,
    });

    // Validate required parameters
    if (!payload || typeof payload !== 'object') {
      logError('getAvailableSlots - Missing payload', { uid, role });
      return { success: false, error: 'Missing payload data' };
    }

    if (!payload.doctorId) {
      logError('getAvailableSlots - Missing doctorId', { uid, role, payload });
      return { success: false, error: 'Doctor ID is required' };
    }

    if (!payload.date) {
      logError('getAvailableSlots - Missing date', { uid, role, doctorId: payload.doctorId });
      return { success: false, error: 'Date is required' };
    }

    // Validate date format
    try {
      const dateObj = new Date(payload.date);
      if (isNaN(dateObj.getTime())) {
        logError('getAvailableSlots - Invalid date format', {
          uid,
          role,
          doctorId: payload.doctorId,
          date: payload.date,
        });
        return { success: false, error: 'Invalid date format. Use YYYY-MM-DD or ISO date format.' };
      }
    } catch (dateError) {
      logError('getAvailableSlots - Date parsing error', {
        uid,
        role,
        doctorId: payload.doctorId,
        date: payload.date,
        error: dateError,
      });
      return { success: false, error: 'Invalid date format' };
    }

    // Extract validated data
    const { doctorId, date } = payload;

    // Get doctor profile
    try {
      const doctors = await getDoctors();

      // Try to find doctor by userId first
      let doctor = doctors.find(d => d.userId === doctorId);

      if (!doctor) {
        logError('getAvailableSlots - Doctor not found', { uid, role, doctorId });
        return { success: false, error: 'Doctor not found' };
      }

      // Check if doctor is verified
      if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
        logError('getAvailableSlots - Doctor not verified', {
          uid,
          role,
          doctorId,
          status: doctor.verificationStatus,
        });
        return { success: false, error: 'Doctor is not verified' };
      }

      // Get existing appointments
      const appointments = await getAppointments();

      // Find appointments for this doctor
      const doctorAppointments = appointments.filter(
        a => a.doctorId === doctorId && a.status !== AppointmentStatus.CANCELED
      );

      // Safely calculate available slots
      try {
        // Make sure doctor has the required properties to generate slots
        if (!doctor.weeklySchedule) {
          logInfo('getAvailableSlots - Initializing empty schedule', { doctorId });
          // Initialize with empty default schedule if needed
          doctor.weeklySchedule = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          };
        }

        if (!doctor.blockedDates) {
          doctor.blockedDates = [];
        }

        // Generate available slots
        const availableSlots = getAvailableSlotsForDate(doctor, date, doctorAppointments);

        logInfo('getAvailableSlots - Slots generated successfully', {
          doctorId,
          date,
          slotCount: availableSlots.length,
        });

        return { success: true, slots: availableSlots };
      } catch (slotError) {
        logError('Error calculating slots', {
          error: slotError,
          doctorId,
          date,
          hasWeeklySchedule: !!doctor.weeklySchedule,
          hasBlockedDates: !!doctor.blockedDates,
        });
        return { success: false, error: 'Error calculating available slots' };
      }
    } catch (dbError) {
      logError('getAvailableSlots - Database error', {
        error: dbError,
        doctorId,
        date,
      });
      return { success: false, error: 'Error accessing doctor data' };
    }
  } catch (e) {
    logError('getAvailableSlots failed', e);
    return { success: false, error: 'Error fetching available slots' };
  } finally {
    perf.stop();
  }
} 