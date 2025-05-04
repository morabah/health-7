/**
 * User Functions
 *
 * Functions for user authentication, registration, and profile management
 */

import type { z } from 'zod';
import { UserType, Gender, BloodType, VerificationStatus } from '@/types/enums';
import { trackPerformance } from './performance';
import { logInfo, logWarn, logError } from './logger';
import { 
  getUsers, 
  saveUsers,
  getPatients,
  savePatients,
  getDoctors,
  saveDoctors
} from './localDb';
import { generateId, nowIso, sleep, userPasswords, RegisterSchema } from './localApiCore';
import type { ResultOk, ResultErr } from './localApiCore';
import type { 
  UserProfileSchema, 
  PatientProfileSchema, 
  DoctorProfileSchema
} from '@/types/schemas';
import type { 
  UserProfile, 
  PatientProfile
} from '@/types/schemas';

// Import getMockDoctorProfile directly to avoid circular dependency
let getMockDoctorProfileFn: ((userId: string) => Promise<z.infer<typeof DoctorProfileSchema> & { id: string }>) | null = null;

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
      return { success: false, error: 'Invalid registration data' };
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
      
      await savePatients([
        ...(await getPatients()),
        patientProfile,
      ]);
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
 * Sign in a user with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<
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
    /* 1  log and validate */
    logInfo('signIn attempt', { email });

    /* 2  find user in users.json */
    const users = await getUsers();
    const userMatch = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Special case for admin@example.com auto-creation
    if (
      email === 'admin@example.com' &&
      (password === 'Targo2000!' || password === 'password123')
    ) {
      logInfo('Admin auto-login detected, creating admin user if needed');

      // If admin user doesn't exist yet, create one
      if (!userMatch) {
        const adminUserId = 'admin-' + generateId();
        const adminUser = {
          id: adminUserId,
          userId: adminUserId,
          email: 'admin@example.com',
          firstName: 'System',
          lastName: 'Admin',
          userType: UserType.ADMIN,
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          phone: null,
          profilePictureUrl: null
        };

        // Save the admin user to the database
        await saveUsers([...users, adminUser]);

        // Return success with the admin user
        return {
          success: true,
          user: { id: adminUserId, email: adminUser.email },
          userProfile: adminUser,
          roleProfile: null,
        };
      }

      // If admin user already exists, continue with normal flow
    }

    if (!userMatch) {
      logWarn('Login attempt: email not found', { email });
      return { success: false, error: 'Invalid email or password' };
    }

    /* 3  validate password */
    const storedPassword = userPasswords[email.toLowerCase()];
    const defaultPasswords = ['password123', 'password', 'Targo2000!', 'Password123'];

    // Check if the password matches either the stored password or any of the default passwords
    if (storedPassword !== password && !defaultPasswords.includes(password)) {
      logWarn('Login attempt: incorrect password', { email });
      return { success: false, error: 'Invalid email or password' };
    }

    // Support automatic mock user generation in dev
    if (userMatch.userType === UserType.ADMIN && email === 'admin@example.com') {
      logInfo('Admin auto-login detected');
    }

    const uid = userMatch.id;

    /* 4  get role profile */
    let roleProfile:
      | (z.infer<typeof PatientProfileSchema> & { id: string })
      | (z.infer<typeof DoctorProfileSchema> & { id: string })
      | null = null;

    // Get profile details by role
    if (userMatch.userType === UserType.PATIENT) {
      const patients = await getPatients();
      const patientData = patients.find(p => p.userId === uid);
      
      // Ensure patient profile has an id
      if (patientData) {
        roleProfile = {
          ...patientData,
          id: `patient-${uid}`
        };
      }

      // Auto-create mock profile if missing
      if (!roleProfile) {
        logInfo('Auto-creating missing patient profile');
        roleProfile = await getMockPatientProfile(uid);
        await savePatients([...patients, roleProfile]);
      }
    } else if (userMatch.userType === UserType.DOCTOR) {
      const doctors = await getDoctors();
      let doctorProfile = doctors.find(d => d.userId === uid);

      // Auto-create mock profile if missing
      if (!doctorProfile) {
        logInfo('Auto-creating missing doctor profile');
        // Avoid circular dependencies by lazy-loading mock function
        if (!getMockDoctorProfileFn) {
          const doctorModule = await import('./api/doctorFunctions');
          getMockDoctorProfileFn = doctorModule.getMockDoctorProfile;
        }
        
        // Call the function once we have it
        if (typeof getMockDoctorProfileFn === 'function') {
          try {
            const mockProfile = await getMockDoctorProfileFn(uid);
            if (mockProfile) {
              doctorProfile = mockProfile;
              await saveDoctors([...doctors, doctorProfile]);
            }
          } catch (e) {
            logError('Failed to load mock doctor profile from function', e);
          }
        }
        
        // If we still don't have a profile, create a fallback
        if (!doctorProfile) {
          // Fallback if import fails
          doctorProfile = {
            userId: uid,
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
            id: `doctor-${uid}`,
          };
          await saveDoctors([...doctors, doctorProfile]);
        }
      } else if (!doctorProfile.id) {
        // Ensure existing doctor profile has an id
        doctorProfile = {
          ...doctorProfile,
          id: `doctor-${uid}`
        };
      }
      
      if (doctorProfile) {
        roleProfile = doctorProfile;
      }
    }

    return {
      success: true,
      user: { id: uid, email: userMatch.email },
      userProfile: userMatch,
      roleProfile,
    };
  } catch (e) {
    logError('signIn failed', e);
    return { success: false, error: 'Internal error during login' };
  } finally {
    perf.stop();
  }
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
      let roleProfile = null;

      if (ctx.role === UserType.PATIENT) {
        roleProfile = await getMockPatientProfile(ctx.uid);
      } else if (ctx.role === UserType.DOCTOR) {
        // Avoid circular dependencies by lazy-loading mock function
        if (!getMockDoctorProfileFn) {
          try {
            const doctorModule = await import('./api/doctorFunctions');
            getMockDoctorProfileFn = doctorModule.getMockDoctorProfile;
            const mockProfile = await getMockDoctorProfileFn(ctx.uid);
            if (mockProfile) {
              roleProfile = {
                ...mockProfile,
                id: `doctor-${ctx.uid}`
              };
            }
          } catch (e) {
            logError('Failed to load doctor mock profile, using fallback', e);
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
              id: `doctor-${ctx.uid}`
            };
          }
        } else {
          const mockProfile = await getMockDoctorProfileFn(ctx.uid);
          if (mockProfile) {
            roleProfile = {
              ...mockProfile,
              id: `doctor-${ctx.uid}`
            };
          }
        }
      }

      return {
        success: true,
        userProfile: mockUser,
        roleProfile,
      };
    }

    // Get actual user from DB
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
          id: `patient-${ctx.uid}`
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
          id: `patient-${ctx.uid}`
        };
      }
    } else if (ctx.role === UserType.DOCTOR) {
      const doctors = await getDoctors();
      const doctorData = doctors.find(d => d.userId === ctx.uid);
      
      // If profile found, ensure it has an id
      if (doctorData) {
        roleProfile = {
          ...doctorData,
          id: `doctor-${ctx.uid}`
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
          id: `doctor-${ctx.uid}`
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
): Promise<ResultOk<{
  userProfile: UserProfile;
  roleProfile: PatientProfile & { id: string };
}> | ResultErr> {
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
      id: `patient-${patientId}`
    };

    return {
      success: true,
      userProfile: user as UserProfile,
      roleProfile: patientWithId
    };
  } catch (error) {
    logError('getPatientProfile failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get patient profile'
    };
  } finally {
    perf.stop();
  }
} 