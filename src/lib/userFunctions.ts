/**
 * User Functions
 *
 * Functions for user authentication, registration, and profile management
 */

import type { z } from 'zod';
import { UserType, Gender, BloodType, VerificationStatus } from '@/types/enums';
import { trackPerformance } from './performance';
import { logInfo, logWarn, logError } from './logger';
import { getUsers, saveUsers, getPatients, savePatients, getDoctors, saveDoctors } from './localDb';
import { generateId, nowIso, sleep, userPasswords, RegisterSchema } from './localApiCore';
import type { ResultOk, ResultErr } from './localApiCore';
import { SignInSchema } from '@/types/schemas';
import type {
  UserProfile,
  PatientProfile,
  UserProfileSchema,
  PatientProfileSchema,
  DoctorProfileSchema,
} from '@/types/schemas';

// Import getMockDoctorProfileFn type to match its actual signature if needed
// Or adjust its usage. For now, assume getMockDoctorProfile expects (ctx, payload)

let getMockDoctorProfileFn:
  | ((
      ctx: { uid: string; role: UserType } | undefined,
      payload: { userId: string }
    ) => Promise<ResultOk<z.infer<typeof DoctorProfileSchema> & { id: string }> | ResultErr>)
  | null = null;

/**
 * Register a new user (patient or doctor)
 */
export async function registerUser(
  raw: unknown
): Promise<ResultOk<{ userId: string }> | ResultErr> {
  const perf = trackPerformance('registerUser');
  try {
    /* 1  validate payload */
    const parsed = RegisterSchema.safeParse(raw);
    if (!parsed.success) {
      // Return detailed validation error
      return { success: false, error: 'Invalid registration data', details: parsed.error.format() };
    }
    // Strictly type input for patient/doctor profile creation
    type RegisterInput = z.infer<typeof RegisterSchema> & {
      dateOfBirth?: string | null;
      gender?: Gender | null;
      bloodType?: BloodType | null;
      medicalHistory?: string | null;
      specialty?: string;
      licenseNumber?: string;
      yearsOfExperience?: number;
    };
    const data = parsed.data as RegisterInput;

    /* 2  email must be unique */
    const users = await getUsers();
    if (users.some(u => u.email?.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: 'Email already in use' };
    }

    /* 3  assemble objects */
    const uid = generateId();
    const timestamp = nowIso();

    // Store the password in our development password store
    // In a real app, this would be hashed before storage
    userPasswords[data.email.toLowerCase()] = data.password;

    const base: z.infer<typeof UserProfileSchema> & { id: string } = {
      id: uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      userType: data.userType,
      isActive: data.userType === UserType.PATIENT, // doctors stay inactive—awaiting verification
      emailVerified: false,
      phoneVerified: false,
      phone: null, // Only include phone once
      createdAt: timestamp,
      updatedAt: timestamp,
      profilePictureUrl: null,
    };

    await saveUsers([...(await getUsers()), base]);
    if (data.userType === UserType.PATIENT) {
      const patientProfile = {
        userId: uid,
        dateOfBirth: data.dateOfBirth ?? null,
        gender: (data.gender as Gender) ?? Gender.OTHER,
        bloodType: (data.bloodType as BloodType) ?? null,
        medicalHistory: data.medicalHistory ?? null,
        id: `patient-${uid}`, // Add id field
        address: null,
      };

      await savePatients([...(await getPatients()), patientProfile]);
    } else {
      await saveDoctors([
        ...(await getDoctors()),
        {
          userId: uid,
          specialty: data.specialty ?? '',
          licenseNumber: data.licenseNumber ?? '',
          yearsOfExperience: data.yearsOfExperience ?? 0,
          verificationStatus: VerificationStatus.PENDING,
          blockedDates: [],
          weeklySchedule: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          },
          educationHistory: [],
          experience: [],
          bio: null,
          verificationNotes: null,
          adminNotes: undefined,
          profilePictureUrl: null,
          profilePicturePath: null,
          licenseDocumentUrl: null,
          licenseDocumentPath: null,
          certificateUrl: null,
          certificatePath: null,
          servicesOffered: null,
          location: null,
          education: null,
          languages: [],
          consultationFee: null,
          timezone: 'UTC',
          createdAt: timestamp,
          updatedAt: timestamp,
          rating: 0,
          reviewCount: 0,
          id: `doctor-${uid}`,
        },
      ]);
    }

    logInfo('registerUser: account created', { uid, role: data.userType });
    return { success: true, userId: uid };
  } catch (e) {
    logError('registerUser failed', e);
    return { success: false, error: 'Internal error during registration' };
  } finally {
    perf.stop();
  }
}

/**
 * Get mock patient profile for test users
 */
export async function getMockPatientProfile(
  userId: string
): Promise<z.infer<typeof PatientProfileSchema> & { id: string }> {
  const uniqueId = `patient-${userId.includes('test') ? userId.split('-')[2] : generateId()}`;

  return {
    id: uniqueId,
    userId,
    dateOfBirth: '1990-01-01',
    gender: Gender.MALE,
    bloodType: BloodType.O_POSITIVE,
    medicalHistory: null,
    address: null,
  };
}

/**
 * Get mock user profile for test users
 */
export async function getMockUserProfile(
  userId: string,
  role: UserType
): Promise<z.infer<typeof UserProfileSchema> & { id: string }> {
  const timestamp = new Date().toISOString();

  return {
    id: userId,
    email: `${userId}@example.com`,
    firstName: 'Test',
    lastName: role === UserType.PATIENT ? 'Patient' : role === UserType.DOCTOR ? 'Doctor' : 'Admin',
    phone: null,
    userType: role,
    isActive: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    profilePictureUrl: null,
  };
}

/**
 * Handle special development-time admin login
 */
async function handleDevAdminLogin(
  email: string,
  password: string
): Promise<ResultOk<{
  user: { id: string; email: string | null };
  userProfile: z.infer<typeof UserProfileSchema> & { id: string };
  roleProfile: null;
}> | null> {
  const normalizedEmail = email.toLowerCase();
  const trimmedPassword = password.trim();

  if (
    normalizedEmail === 'admin@example.com' &&
    (trimmedPassword === 'Targo2000!' || trimmedPassword === 'password123')
  ) {
    logInfo('Admin auto-login detected, creating/logging in admin user if needed');
    const users = await getUsers();
    let adminUser = users.find(
      u => u.email === 'admin@example.com' && u.userType === UserType.ADMIN
    );

    if (!adminUser) {
      const adminUserId = 'admin-' + generateId();
      adminUser = {
        id: adminUserId,
        email: 'admin@example.com',
        firstName: 'System',
        lastName: 'Admin',
        userType: UserType.ADMIN,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        phone: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        profilePictureUrl: null,
      };
      await saveUsers([...users, adminUser]);
      logInfo('Admin user auto-created.', { userId: adminUser.id });
    }

    return {
      success: true,
      user: { id: adminUser.id, email: adminUser.email },
      userProfile: adminUser,
      roleProfile: null, // Admin has no specific patient/doctor role profile
    };
  }

  return null;
}

/**
 * Load or create a mock doctor profile for development
 */
async function loadOrCreateMockDoctorProfile(
  userId: string,
  doctors: Array<z.infer<typeof DoctorProfileSchema> & { id: string }>
): Promise<(z.infer<typeof DoctorProfileSchema> & { id: string }) | null> {
  logInfo('Auto-creating missing doctor profile for dev/test user', { userId });

  if (!getMockDoctorProfileFn) {
    try {
      const doctorModule = await import('./api/doctorFunctions');
      getMockDoctorProfileFn = doctorModule.getMockDoctorProfile;
    } catch (e) {
      logError('Failed to lazy-load getMockDoctorProfile function', e);
      return null;
    }
  }

  if (typeof getMockDoctorProfileFn === 'function') {
    try {
      const mockProfileResult = await getMockDoctorProfileFn(undefined, { userId });
      if (mockProfileResult.success) {
        const { ...profileData } = mockProfileResult;
        const doctorProfile = profileData as z.infer<typeof DoctorProfileSchema> & { id: string };
        await saveDoctors([...doctors, doctorProfile]);
        return doctorProfile;
      } else {
        logError('Failed to get mock doctor profile data', mockProfileResult.error);
      }
    } catch (e) {
      logError('Error calling getMockDoctorProfileFn', e);
    }
  }

  return null;
}

/**
 * Sign in a user with email and password
 */
export async function signIn(rawPayload: unknown): Promise<
  | ResultOk<{
      user: { id: string; email: string | null };
      userProfile: z.infer<typeof UserProfileSchema> & { id: string };
      roleProfile:
        | (z.infer<typeof PatientProfileSchema> & { id: string })
        | (z.infer<typeof DoctorProfileSchema> & { id: string })
        | null;
    }>
  | ResultErr
> {
  const perf = trackPerformance('signIn');

  try {
    // Parse input for standard login or dev login paths
    let rawEmail: string | null = null;
    let rawPassword: string | null = null;

    if (typeof rawPayload === 'object' && rawPayload !== null) {
      // Using type guard to safely access properties
      const payload = rawPayload as Record<string, unknown>;
      if ('email' in payload && typeof payload.email === 'string') {
        rawEmail = payload.email;
      }
      if ('password' in payload && typeof payload.password === 'string') {
        rawPassword = payload.password;
      }
    }

    // Handle special development-time admin login
    if (rawEmail && rawPassword) {
      const adminResult = await handleDevAdminLogin(rawEmail, rawPassword);
      if (adminResult) {
        return adminResult;
      }
    }

    // Validate payload for standard login
    const parsedPayload = SignInSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      return {
        success: false,
        error: 'Invalid sign-in data',
        details: parsedPayload.error.format(),
      };
    }

    // Use validated email and password from here onwards for standard flow
    const validatedEmail = parsedPayload.data.email;
    const validatedPassword = parsedPayload.data.password;

    logInfo('signIn attempt', { email: validatedEmail });

    // Find user
    const users = await getUsers();
    const user = users.find(u => u.email?.toLowerCase() === validatedEmail.toLowerCase());

    if (!user) {
      logWarn('Login attempt: email not found', { email: validatedEmail });
      return { success: false, error: 'Invalid email or password' }; // Generic error
    }

    // Validate password
    const storedPassword = userPasswords[validatedEmail.toLowerCase()];
    const defaultDevPasswords = ['password123', 'password', 'Targo2000!']; // Common dev passwords

    if (storedPassword !== validatedPassword && !defaultDevPasswords.includes(validatedPassword)) {
      logWarn('Login attempt: incorrect password', { email: validatedEmail });
      return { success: false, error: 'Invalid email or password' }; // Generic error
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is inactive' };
    }

    // Get role profile
    const roleProfile = await getRoleProfileForUser(user);

    logInfo('signIn: successful', { uid: user.id, role: user.userType });
    return {
      success: true,
      user: { id: user.id, email: user.email },
      userProfile: user,
      roleProfile,
    };
  } catch (e) {
    logError('signIn failed', e);
    return { success: false, error: 'Internal error during sign-in' };
  } finally {
    perf.stop();
  }
}

/**
 * Get the role-specific profile for a user
 */
async function getRoleProfileForUser(
  user: z.infer<typeof UserProfileSchema> & { id: string }
): Promise<
  | (z.infer<typeof PatientProfileSchema> & { id: string })
  | (z.infer<typeof DoctorProfileSchema> & { id: string })
  | null
> {
  const isTestUser = user.email?.endsWith('@example.com') || user.email?.includes('test');

  if (user.userType === UserType.PATIENT) {
    const patients = await getPatients();
    let patientData = patients.find(p => p.userId === user.id);

    if (!patientData && isTestUser) {
      // Auto-create mock patient profile for test users
      const mockPatient = await getMockPatientProfile(user.id);
      await savePatients([...patients, mockPatient]);
      patientData = mockPatient;
    }

    if (patientData) {
      return {
        ...patientData,
        id: patientData.id || `patient-${user.id}`,
      };
    }

    logWarn('getRoleProfileForUser: Patient profile not found', { userId: user.id });
    return null;
  } else if (user.userType === UserType.DOCTOR) {
    const doctors = await getDoctors();
    let doctorData = doctors.find(d => d.userId === user.id);

    if (!doctorData && isTestUser) {
      // Auto-create mock doctor profile for test users
      const mockDoctorProfile = await loadOrCreateMockDoctorProfile(user.id, doctors);

      if (mockDoctorProfile) {
        doctorData = mockDoctorProfile;
      }
    }

    if (doctorData) {
      return {
        ...doctorData,
        id: doctorData.id || `doctor-${user.id}`,
      };
    }

    logWarn('getRoleProfileForUser: Doctor profile not found', { userId: user.id });
    return null;
  }

  // Admin users have no role profile
  return null;
}

/**
 * Get a user profile by UID - directly exported for AuthContext
 * Returns the user profile along with role-specific profile data
 */
export async function getMyUserProfile(ctx: { uid: string; role: UserType }): Promise<
  | ResultOk<{
      userProfile: z.infer<typeof UserProfileSchema> & { id: string };
      roleProfile:
        | (z.infer<typeof PatientProfileSchema> & { id: string })
        | (z.infer<typeof DoctorProfileSchema> & { id: string })
        | null;
    }>
  | ResultErr
> {
  const perf = trackPerformance('getMyUserProfile');
  try {
    await sleep(200); // simulate network request

    logInfo('getMyUserProfile', { uid: ctx.uid, role: ctx.role });

    // Handle test user auto-generation
    if (ctx.uid.startsWith('test-')) {
      const mockUser = await getMockUserProfile(ctx.uid, ctx.role);
      let roleProfile:
        | (z.infer<typeof PatientProfileSchema> & { id: string })
        | (z.infer<typeof DoctorProfileSchema> & { id: string })
        | null = null;

      if (ctx.role === UserType.PATIENT) {
        roleProfile = await getMockPatientProfile(ctx.uid);
      } else if (ctx.role === UserType.DOCTOR) {
        // Try to get mock doctor profile
        try {
          if (!getMockDoctorProfileFn) {
            const doctorModule = await import('./api/doctorFunctions');
            getMockDoctorProfileFn = doctorModule.getMockDoctorProfile;
          }

          if (getMockDoctorProfileFn) {
            const mockProfileResult = await getMockDoctorProfileFn(undefined, { userId: ctx.uid });
            if (mockProfileResult.success) {
              const { ...profileData } = mockProfileResult;
              roleProfile = profileData as z.infer<typeof DoctorProfileSchema> & { id: string };
              if (!roleProfile.id) {
                roleProfile.id = `doctor-${ctx.uid}`;
              }
            }
          }
        } catch (e) {
          logError('Failed to load doctor mock profile, using fallback', e);
          // Create fallback doctor profile if loading fails
          roleProfile = {
            userId: ctx.uid,
            specialty: 'General Medicine',
            licenseNumber: 'TEMP12345',
            yearsOfExperience: 1,
            verificationStatus: VerificationStatus.PENDING,
            blockedDates: [],
            weeklySchedule: {
              monday: [],
              tuesday: [],
              wednesday: [],
              thursday: [],
              friday: [],
              saturday: [],
              sunday: [],
            },
            rating: 0,
            reviewCount: 0,
            bio: null,
            verificationNotes: null,
            adminNotes: '',
            languages: ['English'],
            location: null,
            education: null,
            servicesOffered: null,
            consultationFee: 100,
            profilePictureUrl: null,
            profilePicturePath: null,
            licenseDocumentUrl: null,
            licenseDocumentPath: null,
            certificateUrl: null,
            certificatePath: null,
            educationHistory: [],
            experience: [],
            timezone: 'UTC',
            createdAt: nowIso(),
            updatedAt: nowIso(),
            id: `doctor-${ctx.uid}`,
          };
        }
      }

      return {
        success: true,
        userProfile: mockUser,
        roleProfile,
      };
    }

    // Rest of function remains unchanged
    const users = await getUsers();
    const userProfile = users.find(u => u.id === ctx.uid);

    if (!userProfile) {
      logError('getMyUserProfile failed: User not found', { uid: ctx.uid });
      return { success: false, error: 'User not found' };
    }

    // Get role-specific profile
    let roleProfile = null;
    if (ctx.role === UserType.PATIENT) {
      const patients = await getPatients();
      const patientData = patients.find(p => p.userId === ctx.uid);

      // If profile found, ensure it has an id
      if (patientData) {
        roleProfile = {
          ...patientData,
          id: `patient-${ctx.uid}`,
        };
      } else {
        // If no profile found, generate a patient profile with an ID
        roleProfile = {
          userId: ctx.uid,
          gender: Gender.OTHER,
          bloodType: null,
          dateOfBirth: null,
          medicalHistory: null,
          address: null,
          id: `patient-${ctx.uid}`,
        };
      }
    } else if (ctx.role === UserType.DOCTOR) {
      const doctors = await getDoctors();
      const doctorData = doctors.find(d => d.userId === ctx.uid);

      // If profile found, ensure it has an id
      if (doctorData) {
        roleProfile = {
          ...doctorData,
          id: `doctor-${ctx.uid}`,
        };
      } else {
        // If no profile found, generate a doctor profile with an ID
        roleProfile = {
          userId: ctx.uid,
          specialty: '',
          licenseNumber: '',
          yearsOfExperience: 0,
          verificationStatus: VerificationStatus.PENDING,
          blockedDates: [],
          weeklySchedule: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          },
          rating: 0,
          reviewCount: 0,
          bio: null,
          verificationNotes: null,
          adminNotes: '',
          languages: ['English'],
          location: null,
          education: null,
          servicesOffered: null,
          consultationFee: 0,
          profilePictureUrl: null,
          profilePicturePath: null,
          licenseDocumentUrl: null,
          licenseDocumentPath: null,
          certificateUrl: null,
          certificatePath: null,
          educationHistory: [],
          experience: [],
          timezone: 'UTC',
          createdAt: nowIso(),
          updatedAt: nowIso(),
          id: `doctor-${ctx.uid}`,
        };
      }
    }

    return {
      success: true,
      userProfile,
      roleProfile,
    };
  } catch (e) {
    logError('getMyUserProfile failed', e);
    return { success: false, error: 'Failed to load user profile' };
  } finally {
    perf.stop();
  }
}

/**
 * Update a user's profile including role-specific data
 */
export type UpdateProfileInput = Partial<z.infer<typeof UserProfileSchema>> &
  Partial<z.infer<typeof PatientProfileSchema>> &
  Partial<z.infer<typeof DoctorProfileSchema>>;
export async function updateMyUserProfile(
  ctx: { uid: string; role: UserType },
  data: UpdateProfileInput
): Promise<ResultOk<{ updated: boolean }> | ResultErr> {
  const perf = trackPerformance('updateMyUserProfile');
  try {
    const { uid, role } = ctx;

    // Ensure data is an object to avoid "Cannot convert undefined or null to object" error
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid profile data provided' };
    }

    logInfo('updateMyUserProfile called', { uid, role, dataKeys: Object.keys(data) });

    if (!uid) {
      return { success: false, error: 'User ID is required' };
    }

    // First update the basic user profile
    let hasChanges = false;

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === uid);

    if (userIndex === -1) {
      logError('User not found', { uid });
      return { success: false, error: 'User not found' };
    }

    // Updates allowed on base profile
    const allowedBaseUpdates: (keyof z.infer<typeof UserProfileSchema>)[] = [
      'firstName',
      'lastName',
      'phone',
      'profilePictureUrl',
    ];

    // Create updated user object
    const user = users[userIndex];

    allowedBaseUpdates.forEach(field => {
      if (data[field] !== undefined && data[field] !== user[field]) {
        // Use type assertion with Record
        (user as Record<string, unknown>)[field] = data[field];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      user.updatedAt = nowIso();
      users[userIndex] = user;
    }

    await saveUsers(users);

    // Then update the role-specific profile if needed
    if (role === UserType.PATIENT) {
      const patients = await getPatients();
      const patientIndex = patients.findIndex(p => p.userId === uid);

      if (patientIndex === -1) {
        logError('Patient profile not found', { uid });
        return { success: false, error: 'Patient profile not found' };
      }

      // Updates allowed on patient profile
      const allowedPatientUpdates: (keyof z.infer<typeof PatientProfileSchema>)[] = [
        'dateOfBirth',
        'gender',
        'bloodType',
        'medicalHistory',
        'address',
      ];

      // Create updated patient object
      const patient = patients[patientIndex];

      allowedPatientUpdates.forEach(field => {
        if (data[field] !== undefined && data[field] !== patient[field]) {
          // Use type assertion with Record
          (patient as Record<string, unknown>)[field] = data[field];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        patients[patientIndex] = patient;
      }

      await savePatients(patients);
    } else if (role === UserType.DOCTOR) {
      const doctors = await getDoctors();
      const doctorIndex = doctors.findIndex(d => d.userId === uid);

      if (doctorIndex === -1) {
        logError('Doctor profile not found', { uid });
        return { success: false, error: 'Doctor profile not found' };
      }

      // Updates allowed on doctor profile
      const allowedDoctorUpdates: (keyof z.infer<typeof DoctorProfileSchema>)[] = [
        'specialty',
        'bio',
        'education',
        'location',
        'languages',
        'consultationFee',
        'profilePictureUrl',
        'licenseNumber',
      ];

      // Create updated doctor object
      const doctor = doctors[doctorIndex];

      allowedDoctorUpdates.forEach(field => {
        if (data[field] !== undefined && data[field] !== doctor[field]) {
          // Use type assertion with Record
          (doctor as Record<string, unknown>)[field] = data[field];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        doctors[doctorIndex] = doctor;
      }

      await saveDoctors(doctors);
    }

    return { success: true, updated: hasChanges };
  } catch (e) {
    logError('updateMyUserProfile failed', e);
    return { success: false, error: 'Error updating profile' };
  } finally {
    perf.stop();
  }
}

/**
 * Get a patient's profile for doctors or admins
 */
export async function getPatientProfile(
  ctx: { uid: string; role: UserType },
  payload: { patientId: string }
): Promise<
  | ResultOk<{
      userProfile: UserProfile;
      roleProfile: PatientProfile & { id: string };
    }>
  | ResultErr
> {
  const perf = trackPerformance('getPatientProfile');
  try {
    const { uid, role } = ctx;
    const { patientId } = payload;

    logInfo('getPatientProfile called', { uid, role, patientId });

    // Validate access: only doctors and admins can view other patient profiles
    if (role !== UserType.DOCTOR && role !== UserType.ADMIN) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!patientId) {
      return { success: false, error: 'Patient ID is required' };
    }

    // Get patient user data
    const users = await getUsers();
    const user = users.find(u => u.id === patientId);

    if (!user) {
      return { success: false, error: 'Patient not found' };
    }

    // Verify it's actually a patient
    if (user.userType !== UserType.PATIENT) {
      return { success: false, error: 'The specified user is not a patient' };
    }

    // Get patient profile data
    const patients = await getPatients();
    const patientProfile = patients.find(p => p.userId === patientId);

    if (!patientProfile) {
      return { success: false, error: 'Patient profile not found' };
    }

    // Add id property as required by return type
    const patientWithId = {
      ...patientProfile,
      id: `patient-${patientId}`,
    };

    return {
      success: true,
      userProfile: user as UserProfile,
      roleProfile: patientWithId,
    };
  } catch (error) {
    logError('getPatientProfile failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get patient profile',
    };
  } finally {
    perf.stop();
  }
}
