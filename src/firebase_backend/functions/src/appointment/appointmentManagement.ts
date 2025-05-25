/**
 * Appointment Management Cloud Functions
 * 
 * This module contains Cloud Functions for managing appointment lifecycle,
 * including completion, cancellation, and status updates.
 */

import * as functions from 'firebase-functions/v2/https';
import { db, FieldValue } from '../config/firebaseAdmin';
import { CompleteAppointmentSchema } from '../shared/schemas';
import { logInfo, logWarn, logError } from '../shared/logger';
import { trackPerformance } from '../shared/performance';
import { AppointmentStatus, NotificationType } from '../types/enums';

// Local type definitions (Firebase Functions rootDir restriction)
interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  appointmentDate: any; // Firestore Timestamp or ISO string
  startTime: string;
  endTime: string;
  status: string;
  reason?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
  appointmentType?: string;
  videoCallUrl?: string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: any;
  type: string;
  relatedId?: string;
}

/**
 * Cloud Function: completeAppointment
 * 
 * Allows an authenticated Doctor to mark one of their scheduled appointments as 'COMPLETED'
 * in the live Development Cloud Firestore and optionally add completion notes.
 * 
 * @param data - The appointment completion data
 * @param data.appointmentId - The ID of the appointment to complete
 * @param data.notes - Optional completion notes (PHI)
 * @param context - The Firebase Functions context with authentication
 * 
 * @returns Promise<{success: boolean}> - Success response
 * 
 * @throws HttpsError
 * - 'unauthenticated': User must be authenticated
 * - 'invalid-argument': Invalid data provided
 * - 'not-found': Appointment not found
 * - 'permission-denied': User not authorized to complete this appointment
 * - 'failed-precondition': Appointment cannot be completed in current status
 * - 'internal': Internal server error
 * 
 * @example
 * ```typescript
 * const result = await callApi('completeAppointment', {
 *   appointmentId: 'appt_123',
 *   notes: 'Patient responded well to treatment'
 * });
 * ```
 */
export const completeAppointment = functions.onCall(async (request) => {
  const perf = trackPerformance('completeAppointmentCallable');
  
  try {
    logInfo('completeAppointment function triggered');

    // Authentication Check
    if (!request.auth) {
      logWarn('completeAppointment: Unauthenticated request');
      perf.stop();
      throw new functions.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const doctorId = request.auth.uid;
    logInfo('completeAppointment: Processing request', { doctorId });

    // Zod Input Validation
    const validationResult = CompleteAppointmentSchema.safeParse(request.data);
    if (!validationResult.success) {
      logWarn('completeAppointment: Invalid input data', { 
        errors: validationResult.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
      perf.stop();
      throw new functions.HttpsError('invalid-argument', 'Invalid data provided for completing appointment.');
    }

    const { appointmentId, notes } = validationResult.data;
    logInfo('completeAppointment: Input validated', { appointmentId, hasNotes: !!notes });

    // Fetch Appointment
    const apptRef = db.collection('appointments').doc(appointmentId);
    const apptSnap = await apptRef.get();

    // Check Existence
    if (!apptSnap.exists) {
      logWarn('completeAppointment: Appointment not found', { appointmentId });
      perf.stop();
      throw new functions.HttpsError('not-found', 'Appointment not found.');
    }

    const apptData = apptSnap.data() as Appointment;
    logInfo('completeAppointment: Appointment fetched', { 
      appointmentId, 
      currentStatus: apptData.status,
      doctorId: apptData.doctorId,
      patientId: apptData.patientId
    });

    // Authorization Check
    if (apptData.doctorId !== doctorId) {
      logWarn('completeAppointment: Unauthorized access attempt', { 
        appointmentId, 
        requestingDoctorId: doctorId, 
        appointmentDoctorId: apptData.doctorId 
      });
      perf.stop();
      throw new functions.HttpsError('permission-denied', 'You are not authorized to complete this appointment.');
    }

    // Status Check
    const validStatuses = [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING];
    if (!validStatuses.includes(apptData.status as AppointmentStatus)) {
      logWarn('completeAppointment: Invalid appointment status for completion', { 
        appointmentId, 
        currentStatus: apptData.status,
        validStatuses 
      });
      perf.stop();
      throw new functions.HttpsError(
        'failed-precondition', 
        `Appointment in status '${apptData.status}' cannot be completed.`
      );
    }

    // Update Firestore Document
    await apptRef.update({
      status: AppointmentStatus.COMPLETED,
      notes: notes || apptData.notes || null, // Preserve existing notes if new ones not provided
      updatedAt: FieldValue.serverTimestamp(),
    });

    logInfo('completeAppointment: Appointment updated successfully', { 
      appointmentId, 
      doctorId, 
      notes: notes ? '*** MASKED ***' : null // PHI masking in logs
    });

    // Create Notification for Patient
    const notificationRef = db.collection('notifications').doc(); // Auto-ID
    
    // Format appointment date for notification
    let appointmentDateStr = 'your scheduled date';
    try {
      if (apptData.appointmentDate) {
        // Handle both Firestore Timestamp and ISO string formats
        const date = typeof apptData.appointmentDate === 'string' 
          ? new Date(apptData.appointmentDate)
          : (apptData.appointmentDate as any).toDate();
        appointmentDateStr = date.toLocaleDateString();
      }
    } catch (error) {
      logWarn('completeAppointment: Error formatting appointment date', { error });
    }

    const patientNotification: Omit<Notification, 'id' | 'createdAt'> = {
      userId: apptData.patientId,
      title: 'Appointment Completed',
      message: `Your appointment with Dr. ${apptData.doctorName || 'your doctor'} on ${appointmentDateStr} has been marked as completed.`,
      type: NotificationType.APPOINTMENT_COMPLETED,
      isRead: false,
      relatedId: appointmentId,
    };

    await notificationRef.set({ 
      ...patientNotification, 
      createdAt: FieldValue.serverTimestamp() 
    });

    logInfo('completeAppointment: Patient notification created', { 
      notificationId: notificationRef.id, 
      patientId: apptData.patientId 
    });

    perf.stop();
    return { success: true };

  } catch (error: any) {
    // Error Handling
    logError('completeAppointment: Function execution failed', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });

    // If it's already an HttpsError, re-throw it
    if (error.code && error.message && typeof error.code === 'string') {
      perf.stop();
      throw error;
    }

    // Otherwise, throw a generic internal error
    perf.stop();
    throw new functions.HttpsError('internal', 'Failed to complete appointment due to an internal error.');
  }
}); 