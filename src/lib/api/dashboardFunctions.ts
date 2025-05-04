/**
 * Dashboard Functions
 *
 * Functions for retrieving dashboard statistics for different user types
 */

import { UserType, VerificationStatus } from '@/types/enums';
import { trackPerformance } from '@/lib/performance';
import { logInfo, logError } from '@/lib/logger';
import { 
  getAppointments, 
  getDoctors, 
  getNotifications,
  getUsers 
} from '@/lib/localDb';
import type { ResultOk, ResultErr } from '@/lib/localApiCore';
import type { Appointment, Notification } from '@/types/schemas';

/**
 * Get dashboard stats for the current user
 */
export async function getMyDashboardStats(ctx: { uid: string; role: UserType }): Promise<
  | ResultOk<{
      upcomingCount: number;
      pastCount: number;
      notifUnread: number;
      adminStats?: {
        totalPatients: number;
        totalDoctors: number;
        pendingVerifications: number;
      };
    }>
  | ResultErr
> {
  const perf = trackPerformance('getMyDashboardStats');

  try {
    const { uid, role } = ctx;

    logInfo('getMyDashboardStats called', { uid, role });

    // Get appointments
    const appointments = await getAppointments();
    let myAppointments: Appointment[];

    if (role === UserType.PATIENT) {
      myAppointments = appointments.filter(a => a.patientId === uid);
    } else if (role === UserType.DOCTOR) {
      myAppointments = appointments.filter(a => a.doctorId === uid);
    } else if (role === UserType.ADMIN) {
      // Admins see all appointments
      myAppointments = appointments;
    } else {
      // Default case, should never happen
      myAppointments = [];
    }

    // Get notifications
    const notifications = await getNotifications();
    const myNotifications = notifications.filter(n => n.userId === uid);
    const unreadCount = myNotifications.filter(n => !n.isRead).length;

    // Calculate upcomingCount: appointments that are in future and not cancelled
    const now = new Date();
    const upcomingCount = myAppointments.filter(a => {
      // Handle different date formats
      const appointmentDate = a.appointmentDate.includes('T')
        ? new Date(a.appointmentDate)
        : new Date(`${a.appointmentDate}T${a.startTime}`);

      const status = a.status.toLowerCase();
      return appointmentDate > now && status !== 'canceled';
    }).length;

    // Calculate pastCount: appointments that are in past or completed
    const pastCount = myAppointments.filter(a => {
      // Handle different date formats
      const appointmentDate = a.appointmentDate.includes('T')
        ? new Date(a.appointmentDate)
        : new Date(`${a.appointmentDate}T${a.startTime}`);

      const status = a.status.toLowerCase();
      return appointmentDate < now || status === 'completed';
    }).length;

    // For admin users, get additional stats
    let adminStats =
      role === UserType.ADMIN
        ? {
            totalPatients: 0,
            totalDoctors: 0,
            pendingVerifications: 0,
          }
        : undefined;

    if (role === UserType.ADMIN) {
      const users = await getUsers();
      const doctors = await getDoctors();

      const totalPatients = users.filter(u => u.userType === UserType.PATIENT).length;
      const totalDoctors = doctors.length;
      const pendingVerifications = doctors.filter(
        d => d.verificationStatus === VerificationStatus.PENDING
      ).length;

      adminStats = {
        totalPatients,
        totalDoctors,
        pendingVerifications,
      };
    }

    return {
      success: true,
      upcomingCount,
      pastCount,
      notifUnread: unreadCount,
      adminStats,
    };
  } catch (e) {
    logError('getMyDashboardStats failed', e);
    return { success: false, error: 'Error fetching dashboard stats' };
  } finally {
    perf.stop();
  }
} 