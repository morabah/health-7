/**
 * Appointment Functions
 *
 * Functions for managing appointments between patients and doctors
 */

// import { z } from 'zod'; // Removed unused import
import {
  UserType,
  AppointmentStatus,
  NotificationType,
  AppointmentType,
  VerificationStatus,
} from '@/types/enums';
import { trackPerformance } from '@/lib/performance';
import { logInfo, logError } from '@/lib/logger';
import {
  getAppointments,
  saveAppointments,
  getPatients,
  getDoctors,
  getUsers,
  getNotifications,
  saveNotifications,
} from '@/lib/localDb';
import { generateId, nowIso } from '@/lib/localApiCore';
import { getAvailableSlotsForDate } from '@/utils/availabilityUtils';

import type { ResultOk, ResultErr } from '@/lib/localApiCore';
import type { Appointment, Notification, DoctorProfile, TimeSlot } from '@/types/schemas';
import {
  BookAppointmentSchema,
  CancelAppointmentSchema,
  CompleteAppointmentSchema,
  GetAvailableSlotsSchema,
  GetAppointmentDetailsSchema,
  GetMyAppointmentsSchema,
} from '@/types/schemas';

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

    // Validate user is authenticated and has correct role FIRST
    if (!uid) {
      return { success: false, error: 'User not authenticated' };
    }

    if (role !== UserType.PATIENT) {
      return { success: false, error: 'Only patients can book appointments' };
    }

    // THEN Validate with Zod schema from central schema definitions
    const result = BookAppointmentSchema.safeParse(payload);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid booking data: ${result.error.format()}`,
      };
    }

    // Get validated payload data
    const { doctorId, appointmentDate, startTime, endTime, reason, appointmentType } = result.data;

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

    // Validate with Zod schema from central schema definitions
    const result = CancelAppointmentSchema.safeParse(payload);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid cancellation data: ${result.error.format()}`,
      };
    }

    // Get validated data
    const { appointmentId, reason } = result.data;

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
    // const { appointmentId, notes } = payload; // Delay destructuring

    logInfo('completeAppointment called', {
      uid,
      role,
      payload_appointmentId: payload.appointmentId,
      payload_notes: payload.notes,
    });

    // Only doctors can complete appointments (Initial Auth Check)
    if (role !== UserType.DOCTOR) {
      return { success: false, error: 'Only doctors can mark appointments as completed' };
    }

    // Validate with Zod schema from central schema definitions
    const result = CompleteAppointmentSchema.safeParse(payload);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid completion data: ${result.error.format()}`,
      };
    }
    const { appointmentId, notes } = result.data; // Destructure after validation

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
export async function getMyAppointments(
  ctx: { uid: string; role: UserType },
  payload: {
    status?: AppointmentStatus;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ResultOk<{ appointments: Appointment[] }> | ResultErr> {
  const perf = trackPerformance('getMyAppointments');

  try {
    const { uid, role } = ctx;

    // Validate with GetMyAppointmentsSchema from central schema repository
    const validationResult = GetMyAppointmentsSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${JSON.stringify(validationResult.error.issues)}`,
      };
    }

    // Get the validated data
    const filters = validationResult.data;

    logInfo('getMyAppointments called', { uid, role, filters });

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

    // Apply filters if provided
    if (filters.status) {
      if (filters.status === 'upcoming') {
        // Special handling for 'upcoming' filter - match the dashboard logic:
        // Future date+time AND not canceled
        const now = new Date();
        myAppointments = myAppointments.filter(a => {
          // Create a proper DateTime by combining date and start time
          const appointmentDate = a.appointmentDate.includes('T')
            ? new Date(a.appointmentDate)
            : new Date(`${a.appointmentDate}T${a.startTime}:00.000Z`);

          const status = a.status.toLowerCase();
          const isFuture = appointmentDate > now;
          const isNotCanceled = status !== 'canceled';

          // Log individual appointment check for debugging
          if (a.patientId === uid) {
            logInfo('Checking appointment for upcoming filter', {
              appointmentId: a.id,
              appointmentDateTime: appointmentDate.toISOString(),
              now: now.toISOString(),
              isFuture,
              isNotCanceled,
              status,
              willInclude: isFuture && isNotCanceled,
            });
          }

          return isFuture && isNotCanceled;
        });

        // Log the filter application for debugging
        logInfo('Applied special upcoming filter', {
          totalAppointments: appointments.length,
          filteredCount: myAppointments.length,
          uid,
          now: now.toISOString(),
        });
      } else {
        // Regular status filter
        myAppointments = myAppointments.filter(a => a.status === filters.status);
      }
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      myAppointments = myAppointments.filter(a => new Date(a.appointmentDate) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      myAppointments = myAppointments.filter(a => new Date(a.appointmentDate) <= endDate);
    }

    // Sort appointments by date and time (most recent first)
    myAppointments.sort((a, b) => {
      // appointmentDate is already YYYY-MM-DDTHH:mm:ss.sssZ
      return new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
    });

    // Apply pagination if provided
    if (filters.offset !== undefined || filters.limit !== undefined) {
      const offset = filters.offset || 0;
      const limit = filters.limit || myAppointments.length;
      myAppointments = myAppointments.slice(offset, offset + limit);
    }

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
    // const { appointmentId } = payload; // Delay destructuring payload until after validation

    logInfo('getAppointmentDetails called', {
      uid,
      role,
      payload_appointmentId: payload.appointmentId,
    });

    // Validate auth context first
    if (!uid || !role) {
      return { success: false, error: 'User authentication failed' };
    }

    // Then validate payload with Zod schema
    const result = GetAppointmentDetailsSchema.safeParse(payload);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid appointment details request: ${result.error.format()}`,
      };
    }
    const { appointmentId } = result.data; // Destructure after successful validation

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
 * Validates the authentication context for API calls
 */
export function validateAuthContext(ctx: { uid?: string; role?: UserType }): {
  isValid: boolean;
  error?: string;
  uid?: string;
  role?: UserType;
} {
  if (!ctx) {
    logError('API - Missing context object', {});
    return { isValid: false, error: 'Authentication context is required' };
  }

  const { uid, role } = ctx;

  // For prefetching scenarios (e.g., doctor search results hovering), we'll be more lenient
  // but still log the issue for monitoring (but only for unexpected cases)
  if (!uid || typeof uid !== 'string') {
    // Only log if this is an unexpected missing uid (not a deliberate anonymous/prefetch call)
    // Anonymous calls typically have uid set to 'anonymous', undefined context, or empty context object
    const isAnonymousCall =
      uid === 'anonymous' || ctx === undefined || Object.keys(ctx || {}).length === 0;

    if (process.env.NODE_ENV === 'development' && !isAnonymousCall) {
      logError('API - Missing uid in context', { ctx });
    }

    // Return with isValid=true but no uid/role for read-only, public endpoints like getAvailableSlots
    // This allows prefetching to work without authentication
    return {
      isValid: true,
      uid: uid || 'anonymous',
      role: role || UserType.PATIENT,
    };
  }

  if (!role) {
    if (process.env.NODE_ENV === 'development') {
      logError('API - Missing role in context', { uid, ctx });
    }
    // Default to PATIENT role if not provided
    return { isValid: true, uid, role: UserType.PATIENT };
  }

  return { isValid: true, uid, role };
}

/**
 * Retrieves and validates the doctor profile
 */
async function retrieveDoctorProfile(
  doctorId: string,
  uid: string,
  role: UserType
): Promise<{ success: boolean; doctor?: DoctorProfile; error?: string }> {
  try {
    const doctors = await getDoctors();
    const doctor = doctors.find(d => d.userId === doctorId);

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

    return { success: true, doctor };
  } catch (error) {
    logError('retrieveDoctorProfile - Database error', { error, doctorId });
    return { success: false, error: 'Error accessing doctor data' };
  }
}

/**
 * Retrieves doctor's appointments
 */
async function getDoctorAppointments(
  doctorId: string
): Promise<{ success: boolean; appointments?: Appointment[]; error?: string }> {
  try {
    const appointments = await getAppointments();
    const doctorAppointments = appointments.filter(
      a => a.doctorId === doctorId && a.status !== AppointmentStatus.CANCELED
    );
    return { success: true, appointments: doctorAppointments };
  } catch (error) {
    logError('getDoctorAppointments - Database error', { error, doctorId });
    return { success: false, error: 'Error retrieving doctor appointments' };
  }
}

/**
 * Ensures the doctor profile has required schedule properties
 */
function ensureDoctorScheduleProperties(doctor: DoctorProfile): DoctorProfile {
  const updatedDoctor = { ...doctor };

  if (!updatedDoctor.weeklySchedule) {
    // Initialize with empty default schedule if needed
    updatedDoctor.weeklySchedule = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };
  }

  if (!updatedDoctor.blockedDates) {
    updatedDoctor.blockedDates = [];
  }

  return updatedDoctor;
}

/**
 * Calculates available slots for a doctor on a date
 */
function calculateAvailableSlots(
  doctor: DoctorProfile,
  date: string,
  appointments: Appointment[]
): { success: boolean; slots?: TimeSlot[]; error?: string } {
  try {
    const preparedDoctor = ensureDoctorScheduleProperties(doctor);
    const availableSlots = getAvailableSlotsForDate(preparedDoctor, date, appointments);

    return {
      success: true,
      slots: availableSlots,
    };
  } catch (error) {
    logError('calculateAvailableSlots - Error', {
      error,
      doctorId: doctor.userId,
      date,
      hasWeeklySchedule: !!doctor.weeklySchedule,
      hasBlockedDates: !!doctor.blockedDates,
    });
    return { success: false, error: 'Error calculating available slots' };
  }
}

/**
 * Get available appointment slots for a doctor on a specific date
 */
export async function getAvailableSlots(
  ctx: { uid: string; role: UserType } | undefined,
  payload: { doctorId: string; date: string }
): Promise<
  | ResultOk<{ slots: Array<{ startTime: string; endTime: string; isAvailable: boolean }> }>
  | ResultErr
> {
  const perf = trackPerformance('getAvailableSlots');

  try {
    // Step 1: Validate authentication context - allow undefined for public access
    const contextValidation = validateAuthContext(ctx || {});
    if (!contextValidation.isValid) {
      return { success: false, error: contextValidation.error || 'Invalid authentication context' };
    }

    const { uid, role } = contextValidation;

    // Minimize logging to prevent console freeze
    logInfo('getAvailableSlots called', {
      uid: uid ? uid.substring(0, 6) + '...' : 'anonymous',
      role,
      doctorId: payload?.doctorId,
    });

    // Step 2: Validate payload with Zod schema from central schema definitions
    const result = GetAvailableSlotsSchema.safeParse(payload);
    if (!result.success) {
      return {
        success: false,
        // Always stringify error details for robust frontend display
        error: `Invalid slot availability request: ${JSON.stringify(result.error.format())}`,
      };
    }

    const { doctorId, date } = result.data;

    // Step 3: Retrieve and validate doctor profile
    const doctorResult = await retrieveDoctorProfile(
      doctorId,
      uid || 'anonymous',
      role || UserType.PATIENT
    );
    if (!doctorResult.success || !doctorResult.doctor) {
      return { success: false, error: doctorResult.error || 'Error retrieving doctor profile' };
    }

    // Step 4: Get doctor's existing appointments
    const appointmentsResult = await getDoctorAppointments(doctorId);
    if (!appointmentsResult.success || !appointmentsResult.appointments) {
      return { success: false, error: appointmentsResult.error || 'Error retrieving appointments' };
    }

    // Step 5: Calculate available slots
    const slotsResult = calculateAvailableSlots(
      doctorResult.doctor,
      date,
      appointmentsResult.appointments
    );

    if (!slotsResult.success || !slotsResult.slots) {
      return { success: false, error: slotsResult.error || 'Error calculating available slots' };
    }

    logInfo('getAvailableSlots - Slots generated successfully', {
      doctorId,
      date,
      slotCount: slotsResult.slots.length,
    });

    return { success: true, slots: slotsResult.slots };
  } catch (e) {
    logError('getAvailableSlots failed', e);
    return { success: false, error: 'Error fetching available slots' };
  } finally {
    perf.stop();
  }
}
