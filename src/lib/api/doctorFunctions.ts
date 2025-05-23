/**
 * Doctor Functions
 *
 * Functions for managing doctor profiles, searching, and availability
 */

import type { z } from 'zod';
import { UserType, VerificationStatus } from '@/types/enums';
import { trackPerformance } from '@/lib/performance';
import { logInfo, logError } from '@/lib/logger';
import { getDoctors, saveDoctors, getUsers } from '@/lib/localDb';
import { generateId, nowIso } from '@/lib/localApiCore';
import type { ResultOk, ResultErr } from '@/lib/localApiCore';
import type { DoctorProfileSchema } from '@/types/schemas';
import {
  FindDoctorsSchema,
  SetDoctorAvailabilitySchema,
  GetDoctorPublicProfileSchema,
  GetDoctorAvailabilitySchema,
  GetMockDoctorProfileSchema,
} from '@/types/schemas';

/**
 * Search for doctors based on criteria
 */
export async function findDoctors(
  ctx: { uid: string; role: UserType } | undefined,
  payload: {
    specialty?: string;
    location?: string;
    name?: string;
    page?: number;
    limit?: number;
  }
): Promise<
  | ResultOk<{
      doctors: Array<
        z.infer<typeof DoctorProfileSchema> & { id: string; firstName: string; lastName: string }
      >;
      total: number;
    }>
  | ResultErr
> {
  const perf = trackPerformance('findDoctors');

  try {
    const { uid, role } = ctx || { uid: 'anonymous', role: UserType.PATIENT };

    logInfo('findDoctors called', { uid, role, ...payload });

    // Validate with schema
    const validationResult = FindDoctorsSchema.safeParse({
      ...payload,
      pageNumber: payload?.page || 1,
      pageSize: payload?.limit || 10,
    });
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`,
      };
    }

    // Extract the validated data and map schema fields to expected function parameters
    const {
      specialty,
      location,
      searchTerm: name,
      pageNumber = 1,
      pageSize = 10,
    } = validationResult.data;
    const page = pageNumber;
    const limit = pageSize;

    // Get all doctors
    const doctors = await getDoctors();
    const users = await getUsers();

    // Only include verified doctors
    let filteredDoctors = doctors.filter(d => d.verificationStatus === VerificationStatus.VERIFIED);

    // Apply filters
    if (specialty) {
      filteredDoctors = filteredDoctors.filter(d =>
        d.specialty?.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    if (location) {
      filteredDoctors = filteredDoctors.filter(d =>
        d.location?.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Match by doctor name (need to join with user profiles)
    if (name) {
      const nameLower = name.toLowerCase();
      filteredDoctors = filteredDoctors.filter(d => {
        const user = users.find(u => u.id === d.userId);
        if (!user) return false;

        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        return fullName.includes(nameLower);
      });
    }

    // Calculate pagination
    const offset = (page - 1) * limit;
    const paginatedDoctors = filteredDoctors.slice(offset, offset + limit);

    // Enrich doctor profiles with user information
    const enrichedDoctors = paginatedDoctors.map(doctor => {
      const user = users.find(u => u.id === doctor.userId);
      return {
        ...doctor,
        id: doctor.userId, // Use userId as id for consistency
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
      };
    });

    return {
      success: true,
      doctors: enrichedDoctors,
      total: filteredDoctors.length,
    };
  } catch (e) {
    logError('findDoctors failed', e);
    return { success: false, error: 'Error searching for doctors' };
  } finally {
    perf.stop();
  }
}

/**
 * Get a doctor's public profile
 */
export async function getDoctorPublicProfile(
  ctx: { uid: string; role: UserType } | undefined,
  payload: { doctorId: string }
): Promise<
  | ResultOk<{
      doctor: z.infer<typeof DoctorProfileSchema> & {
        id: string;
        firstName: string;
        lastName: string;
      };
    }>
  | ResultErr
> {
  const perf = trackPerformance('getDoctorPublicProfile');

  try {
    const { uid, role } = ctx || { uid: 'anonymous', role: UserType.PATIENT };

    // Safely log doctorId with null checks
    logInfo('getDoctorPublicProfile called', {
      uid,
      role,
      doctorId: payload?.doctorId || 'undefined',
    });

    // Validate with schema
    const validationResult = GetDoctorPublicProfileSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`,
      };
    }

    const { doctorId } = validationResult.data;

    // Get doctor profile
    const doctors = await getDoctors();
    const doctor = doctors.find(d => d.userId === doctorId);

    if (!doctor) {
      return { success: false, error: 'Doctor not found' };
    }

    // Only show verified doctors (except to admins or the doctor themselves)
    if (
      doctor.verificationStatus !== VerificationStatus.VERIFIED &&
      role !== UserType.ADMIN &&
      uid !== doctorId
    ) {
      return { success: false, error: 'Doctor profile not available' };
    }

    // Get user profile for name
    const users = await getUsers();
    const user = users.find(u => u.id === doctorId);

    if (!user) {
      return { success: false, error: 'Doctor user profile not found' };
    }

    // Return enriched doctor profile
    return {
      success: true,
      doctor: {
        ...doctor,
        id: doctor.userId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  } catch (e) {
    logError('getDoctorPublicProfile failed', e);
    return { success: false, error: 'Error fetching doctor profile' };
  } finally {
    perf.stop();
  }
}

/**
 * Set doctor availability
 */
export async function setDoctorAvailability(
  ctx: { uid: string; role: UserType },
  payload: {
    weeklySchedule: {
      monday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
      tuesday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
      wednesday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
      thursday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
      friday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
      saturday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
      sunday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
    };
    blockedDates?: string[];
    timezone?: string;
  }
): Promise<ResultOk<{ success: true }> | ResultErr> {
  const perf = trackPerformance('setDoctorAvailability');

  try {
    const { uid, role } = ctx;

    logInfo('setDoctorAvailability called', { uid, role });

    // Only doctors can set their availability
    if (role !== UserType.DOCTOR) {
      return { success: false, error: 'Only doctors can set availability' };
    }

    // Validate with schema
    const validationResult = SetDoctorAvailabilitySchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`,
      };
    }

    const { weeklySchedule, blockedDates, timezone } = validationResult.data;

    // Get doctor profile
    const doctors = await getDoctors();
    const doctorIndex = doctors.findIndex(d => d.userId === uid);

    if (doctorIndex === -1) {
      return { success: false, error: 'Doctor profile not found' };
    }

    // Update availability
    const doctor = { ...doctors[doctorIndex] };

    if (weeklySchedule) {
      doctor.weeklySchedule = weeklySchedule;
    }

    if (blockedDates) {
      doctor.blockedDates = blockedDates;
    }

    if (timezone) {
      doctor.timezone = timezone;
    }

    doctor.updatedAt = nowIso();
    doctors[doctorIndex] = doctor;

    // Save to database
    await saveDoctors(doctors);

    return { success: true };
  } catch (e) {
    logError('setDoctorAvailability failed', e);
    return { success: false, error: 'Error updating availability' };
  } finally {
    perf.stop();
  }
}

/**
 * Get doctor availability
 */
export async function getDoctorAvailability(
  ctx: { uid: string; role: UserType },
  payload: { doctorId: string }
): Promise<
  | ResultOk<{
      availability: {
        weeklySchedule: {
          monday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
          tuesday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
          wednesday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
          thursday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
          friday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
          saturday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
          sunday: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
        };
        blockedDates: string[];
        timezone: string;
      };
    }>
  | ResultErr
> {
  const perf = trackPerformance('getDoctorAvailability');

  try {
    const { uid, role } = ctx;

    logInfo('getDoctorAvailability called', { uid, role, doctorId: payload.doctorId });

    // Validate with schema
    const validationResult = GetDoctorAvailabilitySchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`,
      };
    }

    const { doctorId } = validationResult.data;

    // Get doctor profile
    const doctors = await getDoctors();
    const doctor = doctors.find(d => d.userId === doctorId);

    if (!doctor) {
      return { success: false, error: 'Doctor not found' };
    }

    // Initialize availability if not present
    const weeklySchedule = doctor.weeklySchedule || {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    const blockedDates = doctor.blockedDates || [];
    const timezone = doctor.timezone || 'UTC';

    return {
      success: true,
      availability: {
        weeklySchedule,
        blockedDates,
        timezone,
      },
    };
  } catch (e) {
    logError('getDoctorAvailability failed', e);
    return { success: false, error: 'Error fetching doctor availability' };
  } finally {
    perf.stop();
  }
}

/**
 * Get mock doctor profile for testing
 */
export async function getMockDoctorProfile(
  ctx: { uid: string; role: UserType } | undefined,
  payload: { userId: string }
): Promise<ResultOk<z.infer<typeof DoctorProfileSchema> & { id: string }> | ResultErr> {
  const perf = trackPerformance('getMockDoctorProfile');

  try {
    logInfo('getMockDoctorProfile called', { uid: ctx?.uid, role: ctx?.role, ...payload });

    // Validate with schema
    const validationResult = GetMockDoctorProfileSchema.safeParse(payload);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid request: ${validationResult.error.format()}`,
      };
    }

    const { userId } = validationResult.data;
    const uniqueId = `doctor-${userId.includes('test') ? userId.split('-')[2] : generateId()}`;
    const timestamp = nowIso();

    const mockProfile = {
      id: uniqueId,
      userId,
      specialty: 'General Medicine',
      licenseNumber: 'MOCK12345',
      yearsOfExperience: 5,
      verificationStatus: VerificationStatus.VERIFIED,
      bio: 'This is a mock doctor profile for testing',
      verificationNotes: null,
      adminNotes: '',
      profilePictureUrl: null,
      profilePicturePath: null,
      licenseDocumentUrl: null,
      licenseDocumentPath: null,
      certificateUrl: null,
      certificatePath: null,
      education: 'Medical University, MD (2010)',
      servicesOffered: 'General checkups, Vaccinations, Minor procedures',
      location: 'New York, NY',
      languages: ['English', 'Spanish'],
      consultationFee: 150,
      rating: 4.8,
      reviewCount: 24,
      weeklySchedule: {
        monday: [
          { startTime: '09:00', endTime: '12:00', isAvailable: true },
          { startTime: '13:00', endTime: '17:00', isAvailable: true },
        ],
        tuesday: [
          { startTime: '09:00', endTime: '12:00', isAvailable: true },
          { startTime: '13:00', endTime: '17:00', isAvailable: true },
        ],
        wednesday: [
          { startTime: '09:00', endTime: '12:00', isAvailable: true },
          { startTime: '13:00', endTime: '17:00', isAvailable: true },
        ],
        thursday: [
          { startTime: '09:00', endTime: '12:00', isAvailable: true },
          { startTime: '13:00', endTime: '17:00', isAvailable: true },
        ],
        friday: [
          { startTime: '09:00', endTime: '12:00', isAvailable: true },
          { startTime: '13:00', endTime: '17:00', isAvailable: true },
        ],
        saturday: [],
        sunday: [],
      },
      educationHistory: [
        {
          institution: 'Medical University',
          degree: 'Doctor of Medicine',
          field: 'Medicine',
          startYear: 2006,
          endYear: 2010,
          isOngoing: false,
          description: 'Graduated with honors',
        },
      ],
      experience: [
        {
          position: 'Resident Physician',
          organization: 'City Hospital',
          startYear: 2010,
          endYear: 2014,
          isOngoing: false,
          description: 'Completed residency in internal medicine',
        },
        {
          position: 'General Practitioner',
          organization: 'Health Clinic',
          startYear: 2014,
          endYear: null,
          isOngoing: true,
          description: 'Primary care physician',
        },
      ],
      timezone: 'America/New_York',
      blockedDates: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    perf.stop();
    return { success: true, ...mockProfile };
  } catch (error) {
    logError('getMockDoctorProfile failed', error);
    perf.stop();
    return { success: false, error: 'Failed to generate mock doctor profile' };
  }
}
