/**
 * Doctor Functions
 *
 * Functions for managing doctor profiles, searching, and availability
 */

import { z } from 'zod';
import { UserType, VerificationStatus } from '@/types/enums';
import { trackPerformance } from '@/lib/performance';
import { logInfo, logError } from '@/lib/logger';
import { 
  getDoctors, 
  saveDoctors,
  getUsers
} from '@/lib/localDb';
import { generateId, nowIso } from '@/lib/localApiCore';
import type { ResultOk, ResultErr } from '@/lib/localApiCore';
import type { DoctorProfileSchema } from '@/types/schemas';

/**
 * Search for doctors based on criteria
 */
export async function findDoctors(
  ctx: { uid: string; role: UserType },
  payload: {
    specialty?: string;
    location?: string;
    name?: string;
    page?: number;
    limit?: number;
  }
): Promise<
  | ResultOk<{
      doctors: Array<z.infer<typeof DoctorProfileSchema> & { id: string; firstName: string; lastName: string }>;
      total: number;
    }>
  | ResultErr
> {
  const perf = trackPerformance('findDoctors');

  try {
    const { uid, role } = ctx;
    const { specialty, location, name, page = 1, limit = 10 } = payload;

    logInfo('findDoctors called', { uid, role, specialty, location, name, page, limit });

    // Get all doctors
    const doctors = await getDoctors();
    const users = await getUsers();

    // Only include verified doctors
    let filteredDoctors = doctors.filter(d => d.verificationStatus === VerificationStatus.VERIFIED);

    // Apply filters
    if (specialty) {
      filteredDoctors = filteredDoctors.filter(
        d => d.specialty?.toLowerCase().includes(specialty.toLowerCase())
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
  ctx: { uid: string; role: UserType },
  payload?: { doctorId: string }
): Promise<
  | ResultOk<{
      doctor: z.infer<typeof DoctorProfileSchema> & { id: string; firstName: string; lastName: string };
    }>
  | ResultErr
> {
  const perf = trackPerformance('getDoctorPublicProfile');

  try {
    const { uid, role } = ctx;
    
    // Check if payload exists, if not return error
    if (!payload) {
      logError('getDoctorPublicProfile failed: payload is undefined');
      return { success: false, error: 'Missing required doctor ID' };
    }
    
    const { doctorId } = payload;

    // Additional validation
    if (!doctorId) {
      logError('getDoctorPublicProfile failed: doctorId is undefined or empty');
      return { success: false, error: 'Doctor ID is required' };
    }

    logInfo('getDoctorPublicProfile called', { uid, role, doctorId });

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
  }
): Promise<ResultOk<{ success: true }> | ResultErr> {
  const perf = trackPerformance('setDoctorAvailability');

  try {
    const { uid, role } = ctx;
    const { weeklySchedule, blockedDates } = payload;

    logInfo('setDoctorAvailability called', { uid, role });

    // Only doctors can set their availability
    if (role !== UserType.DOCTOR) {
      return { success: false, error: 'Only doctors can set availability' };
    }

    // Get doctor profile
    const doctors = await getDoctors();
    const doctorIndex = doctors.findIndex(d => d.userId === uid);

    if (doctorIndex === -1) {
      return { success: false, error: 'Doctor profile not found' };
    }

    // Update availability
    const doctor = { ...doctors[doctorIndex] };
    doctor.weeklySchedule = weeklySchedule;

    if (blockedDates) {
      doctor.blockedDates = blockedDates;
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
  payload?: { doctorId: string }
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
      }
    }>
  | ResultErr
> {
  const perf = trackPerformance('getDoctorAvailability');

  try {
    const { uid, role } = ctx;
    
    // Allow doctors to view their own availability without passing doctorId
    let doctorId: string;
    
    if (!payload) {
      // If there's no payload but the user is a doctor, use their own ID
      if (role === UserType.DOCTOR) {
        doctorId = uid;
        logInfo('getDoctorAvailability: doctor viewing own availability', { uid, role });
      } else {
        logError('getDoctorAvailability failed: payload is undefined');
        return { success: false, error: 'Missing required doctor ID' };
      }
    } else {
      // Use the provided doctorId from payload
      doctorId = payload.doctorId;
      
      // Additional validation for payload-provided doctorId
      if (!doctorId) {
        logError('getDoctorAvailability failed: doctorId is undefined or empty');
        return { success: false, error: 'Doctor ID is required' };
      }
    }

    logInfo('getDoctorAvailability called', { uid, role, doctorId });

    // Get doctor profile
    const doctors = await getDoctors();
    const doctor = doctors.find(d => d.userId === doctorId);

    if (!doctor) {
      return { success: false, error: 'Doctor not found' };
    }

    // Create default schedule with isAvailable property
    const defaultSchedule = {
      monday: [] as Array<{ startTime: string; endTime: string; isAvailable: boolean }>,
      tuesday: [] as Array<{ startTime: string; endTime: string; isAvailable: boolean }>,
      wednesday: [] as Array<{ startTime: string; endTime: string; isAvailable: boolean }>,
      thursday: [] as Array<{ startTime: string; endTime: string; isAvailable: boolean }>,
      friday: [] as Array<{ startTime: string; endTime: string; isAvailable: boolean }>,
      saturday: [] as Array<{ startTime: string; endTime: string; isAvailable: boolean }>,
      sunday: [] as Array<{ startTime: string; endTime: string; isAvailable: boolean }>,
    };

    // Return availability with proper types and wrapped in an 'availability' object
    return {
      success: true,
      availability: {
        weeklySchedule: doctor.weeklySchedule || defaultSchedule,
        blockedDates: doctor.blockedDates || [],
      }
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
  userId: string
): Promise<z.infer<typeof DoctorProfileSchema> & { id: string }> {
  const uniqueId = `doctor-${userId.includes('test') ? userId.split('-')[2] : generateId()}`;
  const timestamp = nowIso();

  return {
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
      monday: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }, { startTime: '13:00', endTime: '17:00', isAvailable: true }],
      tuesday: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }, { startTime: '13:00', endTime: '17:00', isAvailable: true }],
      wednesday: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }, { startTime: '13:00', endTime: '17:00', isAvailable: true }],
      thursday: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }, { startTime: '13:00', endTime: '17:00', isAvailable: true }],
      friday: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }, { startTime: '13:00', endTime: '17:00', isAvailable: true }],
      saturday: [],
      sunday: []
    },
    educationHistory: [
      {
        institution: 'Medical University',
        degree: 'Doctor of Medicine',
        field: 'Medicine',
        startYear: 2006,
        endYear: 2010,
        isOngoing: false,
        description: 'Graduated with honors'
      }
    ],
    experience: [
      {
        position: 'Resident Physician',
        organization: 'City Hospital',
        startYear: 2010,
        endYear: 2014,
        isOngoing: false,
        description: 'Completed residency in internal medicine'
      },
      {
        position: 'General Practitioner',
        organization: 'Health Clinic',
        startYear: 2014,
        endYear: null,
        isOngoing: true,
        description: 'Primary care physician'
      }
    ],
    timezone: 'America/New_York',
    blockedDates: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
} 