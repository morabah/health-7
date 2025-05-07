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
import { 
  AdminVerifyDoctorSchema, 
  AdminUpdateUserSchema,
  AdminCreateUserSchema,
  AdminUpdateUserStatusSchema,
  AdminGetUserDetailSchema,
  AdminGetAllUsersSchema,
  AdminGetAllDoctorsSchema,
  AdminGetAllAppointmentsSchema,
  AdminGetDoctorByIdSchema
} from '@/types/schemas';

/**
 * Admin verify a doctor
 */
export async function adminVerifyDoctor(
  ctx: { uid: string; role: UserType },
  payload: {
    doctorId: string;
    verificationStatus: VerificationStatus;
    verificationNotes?: string;
  }
): Promise<ResultOk<{ message: string }> | ResultErr> {
  const perf = trackPerformance('adminVerifyDoctor');
  
  try {
    const { uid, role } = ctx;
    
    logInfo('adminVerifyDoctor called', {
      uid,
      role,
      ...payload
    });

    // Only admin can verify doctors
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate with schema
    const validationResult = AdminVerifyDoctorSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`
      };
    }

    const { doctorId, verificationStatus, verificationNotes } = validationResult.data;
    const timestamp = nowIso();

    // Get all doctors
    const doctors = await getDoctors();

    // Find the doctor by ID
    const doctorIndex = doctors.findIndex(d => d.userId === doctorId);

    if (doctorIndex === -1) {
      return { success: false, error: 'Doctor not found' };
    }

    // Update verification status
    const doctor = { ...doctors[doctorIndex] };

    // Only update if status is different
    if (doctor.verificationStatus !== verificationStatus) {
      doctor.verificationStatus = verificationStatus;

      // Add notes if provided
      if (verificationNotes) {
        doctor.verificationNotes = verificationNotes;
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
        message: `Your verification status has been updated to ${verificationStatus.toLowerCase()}. ${verificationNotes ? `Notes: ${verificationNotes}` : ''}`,
        isRead: false,
        createdAt: timestamp,
        type: NotificationType.VERIFICATION_STATUS_CHANGE,
        relatedId: doctor.userId,
      };

      notifications.push(newNotification);
      await saveNotifications(notifications);

      logInfo(`Doctor ${doctorId} verification status updated to ${verificationStatus}`);

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
  } finally {
    perf.stop();
  }
}

/**
 * Admin get all users
 */
export async function adminGetAllUsers(
  ctx: { uid: string; role: UserType },
  payload: {
    page?: number;
    limit?: number;
    filter?: string;
    status?: string;
  } = {}
): Promise<ResultOk<{ users: z.infer<typeof UserProfileSchema>[] }> | ResultErr> {
  const perf = trackPerformance('adminGetAllUsers');

  try {
    const { uid, role } = ctx;

    logInfo('adminGetAllUsers called', { uid, role, ...payload });

    // Only admins can access this endpoint
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized. Only admins can access this endpoint.' };
    }

    // Validate with schema
    const validationResult = AdminGetAllUsersSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`
      };
    }

    const { page = 1, limit = 10, filter, status = 'all' } = validationResult.data;

    const users = await getUsers();

    // Apply filters
    let filteredUsers = [...users];

    // Filter by status if provided
    if (status && status !== 'all') {
      const isActive = status === 'active';
      filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
    }

    // Filter by search term if provided
    if (filter) {
      const searchTerm = filter.toLowerCase();
      filteredUsers = filteredUsers.filter(
        user =>
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          (user.email && user.email.toLowerCase().includes(searchTerm))
      );
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(start, start + limit);

    return { success: true, users: paginatedUsers };
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
export async function adminGetAllDoctors(
  ctx: { uid: string; role: UserType },
  payload: {
    page?: number;
    limit?: number;
    filter?: string;
    verificationStatus?: VerificationStatus;
  } = {}
): Promise<
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

    logInfo('adminGetAllDoctors called', { uid, role, ...payload });

    // Only admins can access this endpoint
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized. Only admins can access this endpoint.' };
    }

    // Validate with schema
    const validationResult = AdminGetAllDoctorsSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`
      };
    }

    const { page = 1, limit = 10, filter, verificationStatus } = validationResult.data;

    const doctors = await getDoctors();
    const users = await getUsers();

    // Join doctor profiles with user info
    let enrichedDoctors = doctors.map(doctor => {
      const user = users.find(u => u.id === doctor.userId) || {
        id: doctor.userId, 
        firstName: 'Unknown', 
        lastName: 'User',
        email: ''
      };
      
      return {
        ...doctor,
        id: doctor.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email || '',
      };
    });

    // Apply filters if provided
    if (verificationStatus) {
      enrichedDoctors = enrichedDoctors.filter(
        doctor => doctor.verificationStatus === verificationStatus
      );
    }

    if (filter) {
      const searchTerm = filter.toLowerCase();
      enrichedDoctors = enrichedDoctors.filter(
        doc =>
          doc.firstName.toLowerCase().includes(searchTerm) ||
          doc.lastName.toLowerCase().includes(searchTerm) ||
          (doc.email && doc.email.toLowerCase().includes(searchTerm)) ||
          (doc.specialty && doc.specialty.toLowerCase().includes(searchTerm))
      );
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const paginatedDoctors = enrichedDoctors.slice(start, start + limit);

    return { success: true, doctors: paginatedDoctors };
  } catch (e) {
    logError('adminGetAllDoctors failed', e);
    return { success: false, error: 'Error fetching all doctors' };
  } finally {
    perf.stop();
  }
}

/**
 * Admin get user detail
 */
export async function adminGetUserDetail(
  ctx: { uid: string; role: UserType },
  payload: { userId: string }
): Promise<
  | ResultOk<{
      success: boolean;
      user: Partial<z.infer<typeof UserProfileSchema>> & { 
        doctorProfile?: Partial<z.infer<typeof DoctorProfileSchema>> | null 
      };
      hasData: boolean;
    }>
  | ResultErr
> {
  const perf = trackPerformance('adminGetUserDetail');

  try {
    const { uid, role } = ctx;
    
    logInfo('adminGetUserDetail called', { uid, role, userId: payload.userId });

    // Only admins can access this endpoint
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized. Only admins can access this endpoint.' };
    }

    // Validate with Zod schema
    const validationResult = AdminGetUserDetailSchema.safeParse(payload);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: `Invalid request: ${validationResult.error.format()}` 
      };
    }

    const { userId } = validationResult.data;

    const users = await getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // For doctors, fetch their profile data
    if (user.userType === UserType.DOCTOR) {
      const doctors = await getDoctors();
      const doctorProfile = doctors.find(d => d.userId === userId);

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
  } finally {
    perf.stop();
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

    logInfo('adminUpdateUserStatus called', { uid, role, ...payload });

    // Validate admin role
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Only admins can update user status' };
    }

    // Validate payload with Zod schema
    const validationResult = AdminUpdateUserStatusSchema.safeParse(payload);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: `Invalid request: ${validationResult.error.format()}` 
      };
    }

    const { userId, status, reason } = validationResult.data;

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

    // Validate the user data with Zod schema
    const validationResult = AdminCreateUserSchema.safeParse(userData);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: `Invalid user data: ${validationResult.error.format()}` 
      };
    }

    const validatedData = validationResult.data;

    // Check if email already exists
    const users = await getUsers();
    if (users.some(u => u.email === validatedData.email)) {
      return { success: false, error: 'Email already in use' };
    }

    // Create a new user ID
    const newUserId = generateId();
    const now = nowIso();

    // Create the user record
    const newUser = {
      id: newUserId,
      email: validatedData.email,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      userType: validatedData.userType,
      isActive: validatedData.isActive ?? true,
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
    if (validatedData.userType === UserType.DOCTOR) {
      const doctors = await getDoctors();
      await saveDoctors([
        ...doctors,
        {
          id: newUserId,
          userId: newUserId,
          specialty: validatedData.specialty || '',
          licenseNumber: validatedData.licenseNumber || '',
          yearsOfExperience: validatedData.yearsOfExperience || 0,
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
export async function adminGetAllAppointments(
  ctx: { uid: string; role: UserType },
  payload: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    patientId?: string;
  } = {}
): Promise<ResultOk<{ appointments: Appointment[] }> | ResultErr> {
  const perf = trackPerformance('adminGetAllAppointments');

  try {
    const { uid, role } = ctx;

    logInfo('adminGetAllAppointments called', { uid, role, ...payload });

    // Only admins can access this endpoint
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized. Only admins can access this endpoint.' };
    }

    // Validate with schema
    const validationResult = AdminGetAllAppointmentsSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`
      };
    }

    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate, 
      doctorId, 
      patientId 
    } = validationResult.data;

    const appointments = await getAppointments();

    // Apply filters
    let filteredAppointments = [...appointments];

    if (status) {
      filteredAppointments = filteredAppointments.filter(a => a.status === status);
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredAppointments = filteredAppointments.filter(a => {
        const appointmentDate = new Date(a.appointmentDate);
        return appointmentDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredAppointments = filteredAppointments.filter(a => {
        const appointmentDate = new Date(a.appointmentDate);
        return appointmentDate <= end;
      });
    }

    if (doctorId) {
      filteredAppointments = filteredAppointments.filter(a => a.doctorId === doctorId);
    }

    if (patientId) {
      filteredAppointments = filteredAppointments.filter(a => a.patientId === patientId);
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const paginatedAppointments = filteredAppointments.slice(start, start + limit);

    return { success: true, appointments: paginatedAppointments };
  } catch (e) {
    logError('adminGetAllAppointments failed', e);
    return { success: false, error: 'Error fetching all appointments' };
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

    logInfo('adminUpdateUserProfile called', { uid, role, ...payload });

    // Validate admin role
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Only admins can update user profiles' };
    }

    // Validate with Zod schema
    const validationResult = AdminUpdateUserSchema.safeParse(payload);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: `Invalid request: ${validationResult.error.format()}` 
      };
    }

    const validatedData = validationResult.data;
    const { userId } = validatedData;

    // Update user information
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      logError('User not found', { userId });
      return { success: false, error: 'User not found' };
    }

    // Update fields that are provided
    const user = { ...users[userIndex] };
    
    if (validatedData.firstName !== undefined) user.firstName = validatedData.firstName;
    if (validatedData.lastName !== undefined) user.lastName = validatedData.lastName;
    if (validatedData.email !== undefined) user.email = validatedData.email;
    if (validatedData.phone !== undefined) user.phone = validatedData.phone;
    if (validatedData.address !== undefined) {
      // @ts-expect-error -- Some user types might have address field, use type assertion if needed
      user.address = validatedData.address;
    }
    if (validatedData.accountStatus !== undefined) {
      user.isActive = validatedData.accountStatus === 'active';
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
      type: NotificationType.PROFILE_UPDATE,
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
 * Admin: Get doctor by ID
 */
export async function adminGetDoctorById(
  ctx: { uid: string; role: UserType },
  payload: { doctorId: string }
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
    const { uid, role } = ctx;

    logInfo('adminGetDoctorById called', { uid, role, ...payload });

    // Only admin can access this endpoint
    if (role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized. Only admins can access this endpoint.' };
    }

    // Validate with schema
    const validationResult = AdminGetDoctorByIdSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`
      };
    }

    // Extract validated data
    const { doctorId } = validationResult.data;

    // Get data from database
    const doctors = await getDoctors();
    const users = await getUsers();

    // Find doctor
    const doctor = doctors.find(d => d.userId === doctorId);
    if (!doctor) {
      return { success: false, error: 'Doctor not found' };
    }

    // Find user info
    const user = users.find(u => u.id === doctorId);
    if (!user) {
      return { success: false, error: 'User not found for doctor' };
    }

    // Combine doctor and user data
    const result = {
      ...doctor,
      id: doctorId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
    };

    return { success: true, doctor: result };
  } catch (e) {
    logError('adminGetDoctorById failed', e);
    return { success: false, error: 'Error fetching doctor' };
  } finally {
    perf.stop();
  }
} 