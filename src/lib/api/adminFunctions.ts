/**
 * Admin Functions
 *
 * Functions only accessible to admin users
 */

import type { z } from 'zod';
import { UserType, VerificationStatus, NotificationType } from '@/types/enums';
import { trackPerformance } from '@/lib/performance';
import { logInfo, logError } from '@/lib/logger';
import { 
  getUsers, 
  saveUsers,
  getDoctors,
  saveDoctors,
  getAppointments,
  getNotifications,
  saveNotifications
} from '@/lib/localDb';
import { generateId, nowIso } from '@/lib/localApiCore';
import type { ResultOk, ResultErr } from '@/lib/localApiCore';
import type { UserProfileSchema, DoctorProfileSchema, Appointment, Notification } from '@/types/schemas';

/**
 * Admin verify a doctor
 */
export async function adminVerifyDoctor(ctx: {
  uid: string;
  role: UserType;
  doctorId: string;
  status: string | VerificationStatus;
  notes?: string;
}): Promise<ResultOk<{ message: string }> | ResultErr> {
  logInfo('adminVerifyDoctor called', {
    uid: ctx.uid,
    role: ctx.role,
    doctorId: ctx.doctorId,
    status: ctx.status,
    notes: ctx.notes,
  });

  // Only admin can verify doctors
  if (ctx.role !== UserType.ADMIN) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    // Validate status value
    let verificationStatus: VerificationStatus;
    if (Object.values(VerificationStatus).includes(ctx.status as VerificationStatus)) {
      verificationStatus = ctx.status as VerificationStatus;
    } else {
      return { success: false, error: `Invalid verification status: ${ctx.status}` };
    }

    const timestamp = nowIso();

    // Get all doctors
    const doctors = await getDoctors();

    // Find the doctor by ID
    const doctorIndex = doctors.findIndex(d => d.userId === ctx.doctorId || d.userId === ctx.doctorId);

    if (doctorIndex === -1) {
      return { success: false, error: 'Doctor not found' };
    }

    // Update verification status
    const doctor = { ...doctors[doctorIndex] };

    // Only update if status is different
    if (doctor.verificationStatus !== verificationStatus) {
      doctor.verificationStatus = verificationStatus;

      // Add notes if provided
      if (ctx.notes) {
        doctor.verificationNotes = ctx.notes;
      }

      doctor.updatedAt = timestamp;

      // Update in array
      doctors[doctorIndex] = doctor;

      // Save to database
      await saveDoctors(doctors);

      // Create notification for the doctor
      const notifications = await getNotifications();

      const newNotification: Notification = {
        id: generateId(),
        userId: doctor.userId,
        title: 'Verification Status Updated',
        message: `Your verification status has been updated to ${verificationStatus.toLowerCase()}. ${ctx.notes ? `Notes: ${ctx.notes}` : ''}`,
        isRead: false,
        createdAt: timestamp,
        type: NotificationType.VERIFICATION_STATUS_CHANGE,
        relatedId: doctor.userId,
      };

      notifications.push(newNotification);
      await saveNotifications(notifications);

      logInfo(`Doctor ${ctx.doctorId} verification status updated to ${verificationStatus}`);

      return {
        success: true,
        message: `Doctor verification status updated to ${verificationStatus}`,
      };
    } else {
      return {
        success: true,
        message: `Doctor verification status was already ${verificationStatus}`,
      };
    }
  } catch (error) {
    logError('Error updating doctor verification status', error);
    return { success: false, error: 'Failed to update doctor verification status' };
  }
}

/**
 * Admin get all users
 */
export async function adminGetAllUsers(ctx: {
  uid: string;
  role: UserType;
}): Promise<ResultOk<{ users: z.infer<typeof UserProfileSchema>[] }> | ResultErr> {
  const perf = trackPerformance('adminGetAllUsers');

  try {
    const { uid, role } = ctx;

    logInfo('adminGetAllUsers called', { uid, role });

    // Only admins can access this endpoint
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized. Only admins can access this endpoint.' };
    }

    const users = await getUsers();

    return { success: true, users };
  } catch (e) {
    logError('adminGetAllUsers failed', e);
    return { success: false, error: 'Error fetching all users' };
  } finally {
    perf.stop();
  }
}

/**
 * Admin get all doctors
 */
export async function adminGetAllDoctors(ctx: { uid: string; role: UserType }): Promise<
  | ResultOk<{
      doctors: (z.infer<typeof DoctorProfileSchema> & {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      })[];
    }>
  | ResultErr
> {
  const perf = trackPerformance('adminGetAllDoctors');

  try {
    const { uid, role } = ctx;

    logInfo('adminGetAllDoctors called', { uid, role });

    // Only admins can access this endpoint
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized. Only admins can access this endpoint.' };
    }

    const doctors = await getDoctors();
    const users = await getUsers();

    // Join doctor profiles with user info
    const enrichedDoctors = doctors.map(doctor => {
      const user = users.find(u => u.id === doctor.userId);
      return {
        ...doctor,
        id: doctor.userId, // Use userId as the id
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        // Convert education and servicesOffered to strings if they're arrays
        education: Array.isArray(doctor.education)
          ? JSON.stringify(doctor.education)
          : doctor.education || '',
        servicesOffered: Array.isArray(doctor.servicesOffered)
          ? doctor.servicesOffered.join(', ')
          : doctor.servicesOffered || '',
      };
    });

    return { success: true, doctors: enrichedDoctors };
  } catch (e) {
    logError('adminGetAllDoctors failed', e);
    return { success: false, error: 'Error fetching doctors' };
  } finally {
    perf.stop();
  }
}

/**
 * Admin get user detail
 */
export async function adminGetUserDetail(ctx: {
  uid: string;
  role: UserType;
  userId: string;
}): Promise<
  | ResultOk<{
      success: boolean;
      user: Partial<z.infer<typeof UserProfileSchema>> & { 
        doctorProfile?: Partial<z.infer<typeof DoctorProfileSchema>> | null 
      };
      hasData: boolean;
    }>
  | ResultErr
> {
  logInfo('adminGetUserDetail called', { uid: ctx.uid, role: ctx.role, userId: ctx.userId });

  // Only admins can access this endpoint
  if (ctx.role !== UserType.ADMIN) {
    return { success: false, error: 'Unauthorized. Only admins can access this endpoint.' };
  }

  try {
    const users = await getUsers();
    const user = users.find(u => u.id === ctx.userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // For doctors, fetch their profile data
    if (user.userType === UserType.DOCTOR) {
      const doctors = await getDoctors();
      const doctorProfile = doctors.find(d => d.userId === ctx.userId);

      if (doctorProfile) {
        // Return user with doctor profile
        return {
          success: true,
          hasData: true,
          user: {
            ...user,
            doctorProfile: {
              ...doctorProfile,
              verificationStatus: doctorProfile.verificationStatus || 'pending'
            }
          }
        };
      }
    }

    // Return user without doctor profile for non-doctors or if doctor profile not found
    return {
      success: true,
      hasData: true,
      user: {
        ...user,
        doctorProfile: null
      }
    };
  } catch (error) {
    logError('adminGetUserDetail failed', error);
    return { success: false, error: 'Error fetching user details' };
  }
}

/**
 * Admin: Update a user's account status
 */
export async function adminUpdateUserStatus(
  ctx: { uid: string; role: UserType },
  payload: {
    userId: string;
    status: string;
    reason?: string;
  }
): Promise<ResultOk<{ success: true }> | ResultErr> {
  const perf = trackPerformance('adminUpdateUserStatus');

  try {
    const { uid, role } = ctx;
    const { userId, status, reason } = payload;

    logInfo('adminUpdateUserStatus called', { uid, role, userId, status, reason });

    // Validate admin role
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Only admins can update user status' };
    }

    // Validate status value
    const validStatuses = ['active', 'suspended', 'deactivated'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: 'Invalid status value' };
    }

    // Update user status
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      logError('User not found', { userId });
      return { success: false, error: 'User not found' };
    }

    // Update the user status
    users[userIndex].isActive = status === 'active';
    users[userIndex].updatedAt = nowIso();

    await saveUsers(users);

    // Create notification for the user
    const now = nowIso();
    const notifications = await getNotifications();
    const userNotification: Notification = {
      id: `notif-${generateId()}`,
      userId,
      title: 'Account Status Update',
      message:
        status === 'active'
          ? 'Your account has been activated.'
          : `Your account has been ${status}. ${reason || ''}`,
      type: NotificationType.ACCOUNT_STATUS_CHANGE,
      isRead: false,
      createdAt: now,
      relatedId: null,
    };
    notifications.push(userNotification as Notification);
    await saveNotifications(notifications);

    return { success: true };
  } catch (e) {
    logError('adminUpdateUserStatus failed', e);
    return { success: false, error: 'Error updating user status' };
  } finally {
    perf.stop();
  }
}

/**
 * Admin: Create a new user account
 */
export async function adminCreateUser(
  ctx: { uid: string; role: UserType },
  userData: {
    email: string;
    firstName: string;
    lastName: string;
    userType: UserType;
    isActive?: boolean;
    // Patient-specific fields
    dateOfBirth?: string;
    gender?: string;
    bloodType?: string;
    medicalHistory?: string;
    // Doctor-specific fields
    specialty?: string;
    licenseNumber?: string;
    yearsOfExperience?: number;
  }
): Promise<ResultOk<{ userId: string }> | ResultErr> {
  const perf = trackPerformance('adminCreateUser');

  try {
    const { uid, role } = ctx;

    logInfo('adminCreateUser called', { uid, role, userData });

    // Validate admin role
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Only admins can create users' };
    }

    // Basic validation
    if (!userData.email || !userData.firstName || !userData.lastName || !userData.userType) {
      return { success: false, error: 'Missing required fields' };
    }

    // Check if email already exists
    const users = await getUsers();
    if (users.some(u => u.email === userData.email)) {
      return { success: false, error: 'Email already in use' };
    }

    // Create a new user ID
    const newUserId = generateId();
    const now = nowIso();

    // Create the user record
    const newUser = {
      id: newUserId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      userType: userData.userType,
      isActive: userData.isActive ?? true,
      emailVerified: true, // Auto-verified for admin-created accounts
      phoneVerified: false,
      phone: null,
      createdAt: now,
      updatedAt: now,
      profilePictureUrl: null,
    };

    // Save the user
    await saveUsers([...users, newUser]);

    // Add appropriate profile based on user type
    if (userData.userType === UserType.DOCTOR) {
      const doctors = await getDoctors();
      await saveDoctors([
        ...doctors,
        {
          id: newUserId,
          userId: newUserId,
          specialty: userData.specialty || '',
          licenseNumber: userData.licenseNumber || '',
          yearsOfExperience: userData.yearsOfExperience || 0,
          bio: null,
          verificationStatus: VerificationStatus.PENDING,
          verificationNotes: null,
          adminNotes: '',
          education: null,
          servicesOffered: null,
          location: null,
          languages: ['English'],
          consultationFee: 0,
          profilePictureUrl: null,
          profilePicturePath: null,
          licenseDocumentUrl: null,
          licenseDocumentPath: null,
          certificateUrl: null,
          certificatePath: null,
          educationHistory: [],
          experience: [],
          weeklySchedule: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          },
          timezone: 'UTC',
          blockedDates: [],
          createdAt: now,
          updatedAt: now,
          // Add missing fields based on DoctorProfileSchema
          rating: 0,
          reviewCount: 0,
        },
      ]);
    }

    return { success: true, userId: newUserId };
  } catch (e) {
    logError('adminCreateUser failed', e);
    return { success: false, error: 'Error creating user' };
  } finally {
    perf.stop();
  }
}

/**
 * Admin get all appointments
 */
export async function adminGetAllAppointments(ctx: {
  uid: string;
  role: UserType;
}): Promise<ResultOk<{ appointments: Appointment[] }> | ResultErr> {
  const perf = trackPerformance('adminGetAllAppointments');

  try {
    const { uid, role } = ctx;

    logInfo('adminGetAllAppointments called', { uid, role });

    // Only admins can access this endpoint
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized. Only admins can access this endpoint.' };
    }

    const appointments = await getAppointments();

    // Sort appointments by date and time (most recent first)
    appointments.sort((a, b) => {
      const dateA = `${a.appointmentDate}T${a.startTime}`;
      const dateB = `${b.appointmentDate}T${b.startTime}`;

      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return { success: true, appointments };
  } catch (e) {
    logError('adminGetAllAppointments failed', e);
    return { success: false, error: 'Error fetching appointments' };
  } finally {
    perf.stop();
  }
}

/**
 * Admin: Update a user's profile information
 */
export async function adminUpdateUserProfile(
  ctx: { uid: string; role: UserType },
  payload: {
    userId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    accountStatus?: string;
  }
): Promise<ResultOk<{ success: true }> | ResultErr> {
  const perf = trackPerformance('adminUpdateUserProfile');

  try {
    const { uid, role } = ctx;
    const { userId, firstName, lastName, email, phone, address, accountStatus } = payload;

    logInfo('adminUpdateUserProfile called', { uid, role, ...payload });

    // Validate admin role
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Only admins can update user profiles' };
    }

    // Update user information
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      logError('User not found', { userId });
      return { success: false, error: 'User not found' };
    }

    // Update fields that are provided
    const user = { ...users[userIndex] };
    
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) {
      // @ts-expect-error -- Some user types might have address field, use type assertion if needed
      user.address = address;
    }
    if (accountStatus !== undefined) {
      // Handle status updates
      const validStatuses = ['active', 'suspended', 'deactivated'];
      if (!validStatuses.includes(accountStatus)) {
        return { success: false, error: 'Invalid status value' };
      }
      user.isActive = accountStatus === 'active';
    }

    user.updatedAt = nowIso();

    // Save the updated user
    users[userIndex] = user;
    await saveUsers(users);

    // Create a notification for the user
    const now = nowIso();
    const notifications = await getNotifications();
    const userNotification: Notification = {
      id: `notif-${generateId()}`,
      userId,
      title: 'Profile Updated',
      message: 'Your profile information has been updated by an administrator.',
      type: NotificationType.ACCOUNT_STATUS_CHANGE,
      isRead: false,
      createdAt: now,
      relatedId: null,
    };
    notifications.push(userNotification as Notification);
    await saveNotifications(notifications);

    return { success: true };
  } catch (e) {
    logError('adminUpdateUserProfile failed', e);
    return { success: false, error: 'Error updating user profile' };
  } finally {
    perf.stop();
  }
}

/**
 * Get a doctor by ID with detailed information for admin view
 */
export async function adminGetDoctorById(
  ctx: { uid: string; role: UserType; doctorId: string }
): Promise<ResultOk<{ 
  doctor: z.infer<typeof DoctorProfileSchema> & { 
    id: string; 
    firstName: string; 
    lastName: string; 
    email: string;
  }
}> | ResultErr> {
  const perf = trackPerformance('adminGetDoctorById');

  try {
    const { uid, role, doctorId } = ctx;

    logInfo('adminGetDoctorById called', { uid, role, doctorId });

    // Verify admin permissions
    if (role !== UserType.ADMIN) {
      logError('adminGetDoctorById: unauthorized', { uid, role });
      return { success: false, error: 'Unauthorized' };
    }

    // Get all doctors (already includes user data)
    const allDoctorsResponse = await adminGetAllDoctors({ uid, role });
    
    if (!allDoctorsResponse.success) {
      return { success: false, error: 'Failed to retrieve doctors' };
    }

    // Find specific doctor
    const doctor = allDoctorsResponse.doctors.find((doc) => doc.id === doctorId);

    if (!doctor) {
      logError('adminGetDoctorById: doctor not found', { doctorId });
      return { success: false, error: 'Doctor not found' };
    }

    return { success: true, doctor };
  } catch (e) {
    logError('adminGetDoctorById failed', e);
    return { success: false, error: 'Error retrieving doctor details' };
  } finally {
    perf.stop();
  }
} 