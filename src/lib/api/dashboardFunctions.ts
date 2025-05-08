/**
 * Dashboard Functions
 *
 * Functions for retrieving dashboard statistics for different user types
 */

import type { z } from 'zod';
import { UserType, VerificationStatus } from '@/types/enums';
import { trackPerformance } from '@/lib/performance';
import { logInfo, logError } from '@/lib/logger';
import { getAppointments, getDoctors, getNotifications, getUsers } from '@/lib/localDb';
import type { ResultOk, ResultErr } from '@/lib/localApiCore';
import { GetMyDashboardStatsSchema, AdminGetDashboardDataSchema } from '@/types/schemas';
import type { Appointment, DoctorProfileSchema } from '@/types/schemas';

/**
 * Get dashboard stats for the current user
 */
export async function getMyDashboardStats(
  ctx: { uid: string; role: UserType },
  payload: Record<string, never> = {}
): Promise<
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

    // Validate with schema
    const validationResult = GetMyDashboardStatsSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`,
      };
    }

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
    logInfo('Date comparison using now:', { 
      now: now.toISOString(), 
      appointments: myAppointments.length,
      sampleAppointmentDates: myAppointments.slice(0, 5).map(a => ({
        id: a.id,
        date: a.appointmentDate,
        status: a.status
      }))
    });
    
    const upcomingCount = myAppointments.filter(a => {
      // Handle different date formats
      const appointmentDate = a.appointmentDate.includes('T')
        ? new Date(a.appointmentDate)
        : new Date(`${a.appointmentDate}T${a.startTime}`);

      const status = a.status.toLowerCase();
      const isInFuture = appointmentDate > now;
      const isNotCanceled = status !== 'canceled';
      const isUpcoming = isInFuture && isNotCanceled;
      
      // Debug log
      logInfo(`Appointment evaluation for upcoming count:`, {
        id: a.id,
        date: a.appointmentDate,
        appointmentParsedDate: appointmentDate.toISOString(),
        status,
        isInFuture,
        isNotCanceled,
        isUpcoming
      });
      
      return isUpcoming;
    }).length;
    
    logInfo('Dashboard stats calculated:', { upcomingCount, uid, role });

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

      const totalPatients = users.filter(u => u.userType === UserType.PATIENT).length;
      const totalDoctors = users.filter(u => u.userType === UserType.DOCTOR).length;

      const allDoctorProfiles = await getDoctors();
      const pendingVerifications = allDoctorProfiles.filter(
        (d: z.infer<typeof DoctorProfileSchema>) =>
          d.verificationStatus === VerificationStatus.PENDING
      ).length;

      adminStats = {
        totalPatients,
        totalDoctors,
        pendingVerifications,
      };
    }

    const baseReturnData: ResultOk<{ upcomingCount: number; pastCount: number; notifUnread: number; }> = {
      success: true,
      upcomingCount,
      pastCount,
      notifUnread: unreadCount,
    };

    return role === UserType.ADMIN
      ? { ...baseReturnData, adminStats }
      : baseReturnData;
  } catch (e) {
    logError('getMyDashboardStats failed', e);
    return { success: false, error: 'Error fetching dashboard stats' };
  } finally {
    perf.stop();
  }
}

/**
 * Get dashboard data for admin users
 */
export async function adminGetDashboardData(
  ctx: { uid: string; role: UserType },
  payload: Record<string, never> = {}
): Promise<
  | ResultOk<{
      adminStats: {
        totalUsers: number;
        totalPatients: number;
        totalDoctors: number;
        pendingVerifications: number;
      };
    }>
  | ResultErr
> {
  const perf = trackPerformance('adminGetDashboardData');

  try {
    const { uid, role } = ctx;

    logInfo('adminGetDashboardData called', { uid, role });

    // Validate with schema
    const validationResult = AdminGetDashboardDataSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`,
      };
    }

    // Verify admin role
    if (role !== UserType.ADMIN) {
      return {
        success: false,
        error: 'Only administrators can access this data',
      };
    }

    const users = await getUsers();
    console.log(`[dashboardFunctions.ts] Total users fetched: ${users.length}`);
    const doctorUsers = users.filter(u => u.userType === UserType.DOCTOR);
    console.log(
      `[dashboardFunctions.ts] Users identified as DOCTOR (${doctorUsers.length}):`,
      doctorUsers.map(u => ({ id: u.id, email: u.email, type: u.userType }))
    );

    const totalUsers = users.length;
    const totalPatients = users.filter(u => u.userType === UserType.PATIENT).length;
    const totalDoctors = doctorUsers.length;

    const allDoctorProfiles = await getDoctors();
    const pendingVerifications = allDoctorProfiles.filter(
      (d: z.infer<typeof DoctorProfileSchema>) =>
        d.verificationStatus === VerificationStatus.PENDING
    ).length;

    const adminStats = {
      totalUsers,
      totalPatients,
      totalDoctors,
      pendingVerifications,
    };

    console.log('[dashboardFunctions.ts] adminGetDashboardData calculated stats:', adminStats);

    return {
      success: true,
      adminStats,
    };
  } catch (e) {
    logError('adminGetDashboardData failed', e);
    return { success: false, error: 'Error fetching admin dashboard data' };
  } finally {
    perf.stop();
  }
}
