/**
 * Script to seed the local file database with diverse and Zod-validated mock data.
 * Populates the local_db directory with JSON files for all major entity types.
 */

import fs from 'fs/promises';
import type { z } from 'zod';

// Local DB Utils
import { 
  saveUsers, 
  savePatients, 
  saveDoctors, 
  saveAppointments, 
  saveNotifications 
} from '../src/lib/localDb';
import { DB_DIR } from '../src/lib/serverLocalDb';

// All Zod Schemas 
import { 
  UserProfileSchema, 
  PatientProfileSchema, 
  DoctorProfileSchema, 
  AppointmentSchema, 
  NotificationSchema 
} from '../src/types/schemas';

// TypeScript Types
import type { 
  UserProfile, 
  PatientProfile, 
  DoctorProfile, 
  Appointment, 
  Notification
} from '../src/types/schemas';

// Enums
import { 
  UserType, 
  VerificationStatus, 
  AppointmentStatus, 
  AppointmentType, 
  Gender,
  BloodType,
  NotificationType
} from '../src/types/enums';

// Define User IDs for consistent references
const patientUserId = 'test-patient-verified-001';
const doctorPendingId = 'test-doctor-pending-002';
const doctorVerifiedId = 'test-doctor-verified-003';
const doctorRejectedId = 'test-doctor-rejected-004';
const adminUserId = 'test-admin-005';
const inactiveUserId = 'test-inactive-user-006';
const unverifiedUserId = 'test-unverified-user-007';

// Current timestamp for all date fields
const now = new Date().toISOString();
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

// Raw Mock Data: Users
const rawMockUsers: Array<Partial<UserProfile> & { id: string }> = [
  {
    id: patientUserId,
    email: 'patient@example.com',
    phone: '+12025550191',
    firstName: 'Sarah',
    lastName: 'Patient',
    userType: UserType.PATIENT,
    isActive: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: doctorPendingId,
    email: 'doctor.pending@example.com',
    phone: '+12025550192',
    firstName: 'James',
    lastName: 'Pending',
    userType: UserType.DOCTOR,
    isActive: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: doctorVerifiedId,
    email: 'doctor.verified@example.com',
    phone: '+12025550193',
    firstName: 'Emma',
    lastName: 'Verified',
    userType: UserType.DOCTOR,
    isActive: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: lastWeek,
    updatedAt: now
  },
  {
    id: doctorRejectedId,
    email: 'doctor.rejected@example.com',
    phone: '+12025550194',
    firstName: 'Robert',
    lastName: 'Rejected',
    userType: UserType.DOCTOR,
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    createdAt: lastWeek,
    updatedAt: now
  },
  {
    id: adminUserId,
    email: 'admin@example.com',
    phone: '+12025550195',
    firstName: 'Admin',
    lastName: 'User',
    userType: UserType.ADMIN,
    isActive: true,
    emailVerified: true,
    phoneVerified: true,
    createdAt: lastWeek,
    updatedAt: now
  },
  {
    id: inactiveUserId,
    email: 'inactive@example.com',
    phone: '+12025550196',
    firstName: 'Inactive',
    lastName: 'User',
    userType: UserType.PATIENT,
    isActive: false,
    emailVerified: true,
    phoneVerified: true,
    createdAt: lastWeek,
    updatedAt: now
  },
  {
    id: unverifiedUserId,
    email: 'unverified@example.com',
    phone: '+12025550197',
    firstName: 'Unverified',
    lastName: 'User',
    userType: UserType.PATIENT,
    isActive: true,
    emailVerified: false,
    phoneVerified: false,
    createdAt: now,
    updatedAt: now
  }
];

// Raw Mock Data: Patients
const rawMockPatients: Array<Partial<PatientProfile> & { userId: string }> = [
  {
    userId: patientUserId,
    dateOfBirth: new Date('1985-05-15').toISOString(),
    gender: Gender.FEMALE,
    bloodType: BloodType.A_POSITIVE,
    medicalHistory: 'No significant medical history. Allergic to penicillin.'
  },
  {
    userId: unverifiedUserId,
    dateOfBirth: new Date('1990-10-20').toISOString(),
    gender: Gender.MALE,
    bloodType: BloodType.O_NEGATIVE,
    medicalHistory: null
  },
  {
    userId: inactiveUserId,
    dateOfBirth: new Date('1978-03-03').toISOString(),
    gender: Gender.OTHER,
    bloodType: BloodType.B_POSITIVE,
    medicalHistory: 'Hypertension. Regular medication: Lisinopril 10mg daily.'
  }
];

// Raw Mock Data: Doctors
const rawMockDoctors: Array<Partial<DoctorProfile> & { userId: string }> = [
  {
    userId: doctorPendingId,
    specialty: 'General Practice',
    licenseNumber: 'MD12345-P',
    yearsOfExperience: 5,
    bio: 'General practitioner with focus on preventive care and family medicine.',
    verificationStatus: VerificationStatus.PENDING,
    verificationNotes: 'Awaiting license verification.',
    location: 'New York, NY',
    languages: ['English', 'Spanish'],
    consultationFee: 150,
    profilePictureUrl: 'https://example.com/profile-pictures/doctor-pending.jpg',
    licenseDocumentUrl: 'https://example.com/documents/license-pending.pdf',
    certificateUrl: 'https://example.com/documents/certificate-pending.pdf',
    educationHistory: [
      {
        institution: 'University of Medicine',
        degree: 'Doctor of Medicine',
        field: 'Medicine',
        startYear: 2010,
        endYear: 2014,
        isOngoing: false,
        description: 'Graduated with honors.'
      },
      {
        institution: 'State University',
        degree: 'Bachelor of Science',
        field: 'Biology',
        startYear: 2006,
        endYear: 2010,
        isOngoing: false,
        description: 'Pre-medical studies with research focus on immunology.'
      }
    ],
    experience: [
      {
        organization: 'City Hospital',
        position: 'Resident Physician',
        location: 'New York, NY',
        startYear: 2014,
        endYear: 2018,
        isOngoing: false,
        description: 'Completed residency in family medicine.'
      },
      {
        organization: 'Family Care Clinic',
        position: 'General Practitioner',
        location: 'New York, NY',
        startYear: 2018,
        endYear: null,
        isOngoing: true,
        description: 'Providing comprehensive primary care to patients of all ages.'
      }
    ],
    weeklySchedule: {
      monday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true },
        { startTime: '13:00', endTime: '17:00', isAvailable: true }
      ],
      tuesday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true },
        { startTime: '13:00', endTime: '17:00', isAvailable: true }
      ],
      wednesday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true }
      ],
      thursday: [
        { startTime: '13:00', endTime: '17:00', isAvailable: true }
      ],
      friday: [
        { startTime: '09:00', endTime: '15:00', isAvailable: true }
      ],
      saturday: [],
      sunday: []
    },
    blockedDates: [
      new Date('2025-07-04').toISOString(),
      new Date('2025-12-25').toISOString()
    ],
    createdAt: now,
    updatedAt: now
  },
  {
    userId: doctorVerifiedId,
    specialty: 'Cardiology',
    licenseNumber: 'MD67890-V',
    yearsOfExperience: 12,
    bio: 'Cardiologist specializing in preventive cardiology and heart disease management.',
    verificationStatus: VerificationStatus.VERIFIED,
    verificationNotes: 'All credentials verified.',
    location: 'Boston, MA',
    languages: ['English', 'French'],
    consultationFee: 250,
    profilePictureUrl: 'https://example.com/profile-pictures/doctor-verified.jpg',
    licenseDocumentUrl: 'https://example.com/documents/license-verified.pdf',
    certificateUrl: 'https://example.com/documents/certificate-verified.pdf',
    educationHistory: [
      {
        institution: 'Harvard Medical School',
        degree: 'Doctor of Medicine',
        field: 'Medicine',
        startYear: 2005,
        endYear: 2009,
        isOngoing: false,
        description: 'Graduated with distinction.'
      },
      {
        institution: 'Yale University',
        degree: 'Bachelor of Science',
        field: 'Biochemistry',
        startYear: 2001,
        endYear: 2005,
        isOngoing: false,
        description: 'Summa cum laude'
      }
    ],
    experience: [
      {
        organization: 'Mass General Hospital',
        position: 'Cardiology Fellow',
        location: 'Boston, MA',
        startYear: 2009,
        endYear: 2012,
        isOngoing: false,
        description: 'Completed fellowship in cardiovascular medicine.'
      },
      {
        organization: 'Boston Heart Center',
        position: 'Attending Cardiologist',
        location: 'Boston, MA',
        startYear: 2012,
        endYear: null,
        isOngoing: true,
        description: 'Specializing in preventive cardiology and heart disease management.'
      }
    ],
    weeklySchedule: {
      monday: [
        { startTime: '08:00', endTime: '12:00', isAvailable: true },
        { startTime: '13:00', endTime: '16:00', isAvailable: true }
      ],
      tuesday: [
        { startTime: '08:00', endTime: '12:00', isAvailable: true }
      ],
      wednesday: [],
      thursday: [
        { startTime: '08:00', endTime: '12:00', isAvailable: true },
        { startTime: '13:00', endTime: '16:00', isAvailable: true }
      ],
      friday: [
        { startTime: '13:00', endTime: '17:00', isAvailable: true }
      ],
      saturday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true }
      ],
      sunday: []
    },
    blockedDates: [
      new Date('2025-06-15').toISOString(),
      new Date('2025-06-16').toISOString(),
      new Date('2025-12-24').toISOString(),
      new Date('2025-12-25').toISOString()
    ],
    createdAt: lastWeek,
    updatedAt: now
  },
  {
    userId: doctorRejectedId,
    specialty: 'Neurology',
    licenseNumber: 'MD11223-R',
    yearsOfExperience: 8,
    bio: 'Neurologist with expertise in headache disorders and neurodegenerative diseases.',
    verificationStatus: VerificationStatus.REJECTED,
    verificationNotes: 'License number could not be verified in the state database.',
    location: 'Chicago, IL',
    languages: ['English', 'German'],
    consultationFee: 200,
    profilePictureUrl: 'https://example.com/profile-pictures/doctor-rejected.jpg',
    licenseDocumentUrl: 'https://example.com/documents/license-rejected.pdf',
    certificateUrl: 'https://example.com/documents/certificate-rejected.pdf',
    educationHistory: [
      {
        institution: 'University of Chicago Medical School',
        degree: 'Doctor of Medicine',
        field: 'Medicine',
        startYear: 2008,
        endYear: 2012,
        isOngoing: false,
        description: ''
      }
    ],
    experience: [
      {
        organization: 'Chicago Medical Center',
        position: 'Neurology Resident',
        location: 'Chicago, IL',
        startYear: 2012,
        endYear: 2016,
        isOngoing: false,
        description: 'Completed residency in neurology.'
      },
      {
        organization: 'Midwest Neurology Associates',
        position: 'Neurologist',
        location: 'Chicago, IL',
        startYear: 2016,
        endYear: null,
        isOngoing: true,
        description: 'Specializing in headache disorders and neurodegenerative diseases.'
      }
    ],
    weeklySchedule: {
      monday: [
        { startTime: '10:00', endTime: '14:00', isAvailable: true },
        { startTime: '15:00', endTime: '18:00', isAvailable: true }
      ],
      tuesday: [
        { startTime: '10:00', endTime: '14:00', isAvailable: true },
        { startTime: '15:00', endTime: '18:00', isAvailable: true }
      ],
      wednesday: [
        { startTime: '10:00', endTime: '14:00', isAvailable: true }
      ],
      thursday: [],
      friday: [
        { startTime: '10:00', endTime: '16:00', isAvailable: true }
      ],
      saturday: [],
      sunday: []
    },
    blockedDates: [],
    createdAt: lastWeek,
    updatedAt: now
  }
];

// Raw Mock Data: Appointments
const rawMockAppointments: Array<Partial<Appointment> & { id: string }> = [
  {
    id: 'appt-completed-001',
    patientId: patientUserId,
    patientName: 'Sarah Patient',
    doctorId: doctorVerifiedId,
    doctorName: 'Dr. Emma Verified',
    doctorSpecialty: 'Cardiology',
    appointmentDate: lastWeek,
    startTime: '09:00',
    endTime: '09:30',
    status: AppointmentStatus.COMPLETED,
    reason: 'Annual heart checkup',
    notes: "Patient's heart function normal. No concerns at this time. Follow up in 1 year.",
    createdAt: lastWeek,
    updatedAt: now,
    appointmentType: AppointmentType.IN_PERSON
  },
  {
    id: 'appt-upcoming-002',
    patientId: patientUserId,
    patientName: 'Sarah Patient',
    doctorId: doctorVerifiedId,
    doctorName: 'Dr. Emma Verified',
    doctorSpecialty: 'Cardiology',
    appointmentDate: nextWeek,
    startTime: '10:00',
    endTime: '10:30',
    status: AppointmentStatus.SCHEDULED,
    reason: 'Follow-up on medication',
    notes: null,
    createdAt: now,
    updatedAt: now,
    appointmentType: AppointmentType.IN_PERSON
  },
  {
    id: 'appt-cancelled-003',
    patientId: patientUserId,
    patientName: 'Sarah Patient',
    doctorId: doctorPendingId,
    doctorName: 'Dr. James Pending',
    doctorSpecialty: 'General Practice',
    appointmentDate: lastWeek,
    startTime: '11:00',
    endTime: '11:30',
    status: AppointmentStatus.CANCELLED,
    reason: 'Flu symptoms',
    notes: null,
    createdAt: lastWeek,
    updatedAt: lastWeek,
    appointmentType: AppointmentType.IN_PERSON
  },
  {
    id: 'appt-video-004',
    patientId: unverifiedUserId,
    patientName: 'Unverified User',
    doctorId: doctorVerifiedId,
    doctorName: 'Dr. Emma Verified',
    doctorSpecialty: 'Cardiology',
    appointmentDate: nextWeek,
    startTime: '13:00',
    endTime: '13:30',
    status: AppointmentStatus.SCHEDULED,
    reason: 'Initial consultation',
    notes: null,
    createdAt: now,
    updatedAt: now,
    appointmentType: AppointmentType.VIDEO
  }
];

// Raw Mock Data: Notifications
const rawMockNotifications: Array<Partial<Notification> & { id: string }> = [
  {
    id: 'notif-appt-booked-001',
    userId: patientUserId,
    title: 'Appointment Confirmed',
    message: 'Your appointment with Dr. Emma Verified on ' + new Date(nextWeek).toLocaleDateString() + ' at 10:00 AM has been confirmed.',
    isRead: false,
    createdAt: now,
    type: NotificationType.APPOINTMENT_BOOKED,
    relatedId: 'appt-upcoming-002'
  },
  {
    id: 'notif-appt-reminder-002',
    userId: patientUserId,
    title: 'Appointment Reminder',
    message: 'Reminder: You have an appointment with Dr. Emma Verified tomorrow at 10:00 AM.',
    isRead: true,
    createdAt: lastWeek,
    type: NotificationType.APPOINTMENT_BOOKED,
    relatedId: 'appt-completed-001'
  },
  {
    id: 'notif-system-003',
    userId: patientUserId,
    title: 'Welcome to Health App',
    message: 'Thank you for registering. Complete your profile to get the most out of our services.',
    isRead: true,
    createdAt: lastWeek,
    type: NotificationType.SYSTEM_ALERT,
    relatedId: null
  },
  {
    id: 'notif-doctor-verification-004',
    userId: doctorPendingId,
    title: 'Verification In Progress',
    message: 'Your doctor verification is in progress. We will notify you once the review is complete.',
    isRead: false,
    createdAt: now,
    type: NotificationType.OTHER,
    relatedId: null
  },
  {
    id: 'notif-doctor-approved-005',
    userId: doctorVerifiedId,
    title: 'Verification Approved',
    message: 'Congratulations! Your doctor verification has been approved. You can now begin accepting appointments.',
    isRead: true,
    createdAt: lastWeek,
    type: NotificationType.VERIFICATION_APPROVED,
    relatedId: null
  },
  {
    id: 'notif-doctor-rejected-006',
    userId: doctorRejectedId,
    title: 'Verification Rejected',
    message: 'Your doctor verification has been rejected. Please review the verification notes and resubmit your application with the correct information.',
    isRead: false,
    createdAt: now,
    type: NotificationType.OTHER,
    relatedId: null
  }
];

/**
 * Validates raw mock data against a Zod schema and prepares it for JSON storage.
 * Keeps dates as ISO strings for JSON compatibility.
 * 
 * @param collectionName The name of the collection for logging purposes
 * @param rawData Array of raw data objects with ID field
 * @param schema Zod schema to validate against (excluding ID field)
 * @returns Array of validated objects with ID field reattached
 */
function validateAndPrepareData<TRaw extends { id: string }, TSchema extends z.ZodType<any>>(
  collectionName: string,
  rawData: TRaw[],
  schema: TSchema
): Array<z.infer<TSchema> & { id: string }> {
  console.log(`Validating ${rawData.length} items for ${collectionName}...`);
  const validData: Array<z.infer<TSchema> & { id: string }> = [];
  let invalidCount = 0;
  
  for (const item of rawData) {
    const { id, ...itemData } = item;
    // Validate data portion against schema
    const validation = schema.safeParse(itemData);
    
    if (validation.success) {
      // Add ID back to the validated data object (which now has defaults/transformations applied by Zod)
      validData.push({ ...(validation.data as object), id } as z.infer<TSchema> & { id: string });
    } else {
      invalidCount++;
      console.error(`[SEEDING ERROR] Zod validation failed for ${collectionName} item ID ${id}:`, validation.error.format());
    }
  }
  
  if (invalidCount > 0) {
    console.warn(`[SEEDING WARNING] ${invalidCount} documents failed validation for ${collectionName}.`);
  }
  
  console.log(`Validation complete for ${collectionName}: ${validData.length} valid documents prepared.`);
  return validData;
}

/**
 * Special case for validating patient and doctor profiles which don't have an id field but use userId
 */
function validateAndPrepareNestedData<
  TRaw extends { userId: string },
  TSchema extends z.ZodType<any>
>(
  collectionName: string,
  rawData: TRaw[],
  schema: TSchema
): Array<z.infer<TSchema>> {
  console.log(`Validating ${rawData.length} items for ${collectionName}...`);
  const validData: Array<z.infer<TSchema>> = [];
  let invalidCount = 0;
  
  for (const item of rawData) {
    // Validate entire item against schema
    const validation = schema.safeParse(item);
    
    if (validation.success) {
      validData.push(validation.data as z.infer<TSchema>);
    } else {
      invalidCount++;
      console.error(`[SEEDING ERROR] Zod validation failed for ${collectionName} item userId ${item.userId}:`, validation.error.format());
    }
  }
  
  if (invalidCount > 0) {
    console.warn(`[SEEDING WARNING] ${invalidCount} documents failed validation for ${collectionName}.`);
  }
  
  console.log(`Validation complete for ${collectionName}: ${validData.length} valid documents prepared.`);
  return validData;
}

/**
 * Main function to seed the local database with mock data
 */
async function seedLocalDatabase() {
  console.log('\n--- Seeding Local File DB ---\n');
  
  try {
    // Optional: Clear Existing Data
    try {
      await fs.rm(DB_DIR, { recursive: true, force: true });
      console.log('Cleared existing local_db directory.');
    } catch (err: any) {
      console.warn('Could not clear local_db:', err.message);
    }
    
    // Validate & Save Users
    const usersToSeed = validateAndPrepareData('users', rawMockUsers, UserProfileSchema);
    await saveUsers(usersToSeed);
    console.log(`Saved ${usersToSeed.length} users to local_db.`);
    
    // Validate & Save Patients
    const patientsToSeed = validateAndPrepareNestedData('patients', rawMockPatients, PatientProfileSchema);
    await savePatients(patientsToSeed);
    console.log(`Saved ${patientsToSeed.length} patients to local_db.`);
    
    // Validate & Save Doctors
    const doctorsToSeed = validateAndPrepareNestedData('doctors', rawMockDoctors, DoctorProfileSchema);
    await saveDoctors(doctorsToSeed);
    console.log(`Saved ${doctorsToSeed.length} doctors to local_db.`);
    
    // Validate & Save Appointments
    const appointmentsToSeed = validateAndPrepareData('appointments', rawMockAppointments, AppointmentSchema);
    await saveAppointments(appointmentsToSeed);
    console.log(`Saved ${appointmentsToSeed.length} appointments to local_db.`);
    
    // Validate & Save Notifications
    const notificationsToSeed = validateAndPrepareData('notifications', rawMockNotifications, NotificationSchema);
    await saveNotifications(notificationsToSeed);
    console.log(`Saved ${notificationsToSeed.length} notifications to local_db.`);
    
    console.log('\n--- Local File DB Seeding Completed Successfully ---\n');
    
    // Add validation log entry for CMS
    console.log("To confirm in CMS, execute: logValidation('2.8', 'success', 'Local file database seeded with diverse and Zod-validated mock data.');");
    
  } catch (error) {
    console.error('Error seeding local database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedLocalDatabase().catch(console.error); 