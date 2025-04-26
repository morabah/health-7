/**
 * Script to seed the local file database with diverse and Zod-validated mock data.
 * Populates the local_db directory with JSON files for all major entity types.
 * 
 * IMPORTANT: This script must be run directly with Node.js, not in the browser.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { z } from 'zod';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Create a simple version of the localDb utilities for the script
const DB_DIR = path.join(PROJECT_ROOT, 'local_db');

// Add a note that these functions are for server-side use only
console.log('IMPORTANT: This script is for server-side use only and cannot be run in the browser.');

/**
 * Ensures the local_db directory exists
 */
async function ensureDbDirExists() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    return true;
  } catch (err) {
    console.error('Error creating local_db directory:', err);
    throw err;
  }
}

/**
 * Saves data to a JSON file in the local_db directory
 */
async function saveToJson(filename, data) {
  await ensureDbDirExists();
  const filePath = path.join(DB_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Data saved to ${filePath}`);
}

/**
 * Functions to save each type of data
 */
async function saveUsers(users) {
  await saveToJson('users.json', users);
}

async function savePatients(patients) {
  await saveToJson('patients.json', patients);
}

async function saveDoctors(doctors) {
  await saveToJson('doctors.json', doctors);
}

async function saveAppointments(appointments) {
  await saveToJson('appointments.json', appointments);
}

async function saveNotifications(notifications) {
  await saveToJson('notifications.json', notifications);
}

// Import enums directly instead of dynamically
const UserType = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  ADMIN: 'ADMIN'
};

const VerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  MORE_INFO_REQUIRED: 'MORE_INFO_REQUIRED'
};

const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW'
};

const AppointmentType = {
  InPerson: 'InPerson',
  Video: 'Video'
};

const Gender = {
  Male: 'Male',
  Female: 'Female',
  Other: 'Other'
};

// Create basic Zod schemas for validation
const isoDateTimeStringSchema = z.string().datetime();

const UserProfileSchema = z.object({
  email: z.string().email().nullable(),
  phone: z.string().nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  userType: z.enum(['PATIENT', 'DOCTOR', 'ADMIN']),
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  createdAt: isoDateTimeStringSchema,
  updatedAt: isoDateTimeStringSchema
});

const PatientProfileSchema = z.object({
  userId: z.string().min(1),
  dateOfBirth: isoDateTimeStringSchema.nullable().optional(),
  gender: z.enum(['Male', 'Female', 'Other']),
  bloodType: z.string().max(5).nullable().optional(),
  medicalHistory: z.string().max(2000).nullable().optional()
});

const EducationEntrySchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  startYear: z.number().int().min(1900).max(new Date().getFullYear()),
  endYear: z.number().int().min(1900).max(new Date().getFullYear() + 10).nullable().optional(),
  isOngoing: z.boolean().optional().default(false),
  description: z.string().max(500).optional()
});

const ExperienceEntrySchema = z.object({
  organization: z.string().min(1),
  position: z.string().min(1),
  location: z.string().optional(),
  startYear: z.number().int().min(1900).max(new Date().getFullYear()),
  endYear: z.number().int().min(1900).max(new Date().getFullYear() + 10).nullable().optional(),
  isOngoing: z.boolean().optional().default(false),
  description: z.string().max(1000).optional()
});

const TimeSlotSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isAvailable: z.boolean().default(true)
});

const WeeklyScheduleSchema = z.object({
  monday: z.array(TimeSlotSchema).optional().default([]),
  tuesday: z.array(TimeSlotSchema).optional().default([]),
  wednesday: z.array(TimeSlotSchema).optional().default([]),
  thursday: z.array(TimeSlotSchema).optional().default([]),
  friday: z.array(TimeSlotSchema).optional().default([]),
  saturday: z.array(TimeSlotSchema).optional().default([]),
  sunday: z.array(TimeSlotSchema).optional().default([])
});

const DoctorProfileSchema = z.object({
  userId: z.string().min(1),
  specialty: z.string().min(1).default('General Practice'),
  licenseNumber: z.string().min(1),
  yearsOfExperience: z.number().int().min(0).default(0),
  bio: z.string().max(2000).nullable(),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'MORE_INFO_REQUIRED']).default('PENDING'),
  verificationNotes: z.string().nullable(),
  adminNotes: z.string().optional(),
  location: z.string().nullable(),
  languages: z.array(z.string()).nullable(),
  consultationFee: z.number().min(0).nullable(),
  profilePictureUrl: z.string().url().nullable(),
  licenseDocumentUrl: z.string().url().nullable(),
  certificateUrl: z.string().url().nullable(),
  educationHistory: z.array(EducationEntrySchema).optional().default([]),
  experience: z.array(ExperienceEntrySchema).optional().default([]),
  weeklySchedule: WeeklyScheduleSchema.optional(),
  blockedDates: z.array(isoDateTimeStringSchema).optional().default([]),
  createdAt: isoDateTimeStringSchema,
  updatedAt: isoDateTimeStringSchema
});

const AppointmentSchema = z.object({
  patientId: z.string().min(1),
  patientName: z.string().optional(),
  doctorId: z.string().min(1),
  doctorName: z.string().optional(),
  doctorSpecialty: z.string().optional(),
  appointmentDate: isoDateTimeStringSchema,
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  reason: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  createdAt: isoDateTimeStringSchema,
  updatedAt: isoDateTimeStringSchema,
  appointmentType: z.enum(['InPerson', 'Video']).optional().default('InPerson')
});

const NotificationSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  isRead: z.boolean().default(false),
  createdAt: isoDateTimeStringSchema,
  type: z.string().default('system'),
  relatedId: z.string().nullable().optional()
});

// Current timestamp for all date fields
const now = new Date().toISOString();
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

// Define User IDs for consistent references
const patientUserId = 'test-patient-verified-001';
const doctorPendingId = 'test-doctor-pending-002';
const doctorVerifiedId = 'test-doctor-verified-003';
const doctorRejectedId = 'test-doctor-rejected-004';
const adminUserId = 'test-admin-005';
const inactiveUserId = 'test-inactive-user-006';
const unverifiedUserId = 'test-unverified-user-007';

// Raw Mock Data: Users
const rawMockUsers = [
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
const rawMockPatients = [
  {
    userId: patientUserId,
    dateOfBirth: new Date('1985-05-15').toISOString(),
    gender: Gender.Female,
    bloodType: 'A+',
    medicalHistory: 'No significant medical history. Allergic to penicillin.'
  },
  {
    userId: unverifiedUserId,
    dateOfBirth: new Date('1990-10-20').toISOString(),
    gender: Gender.Male,
    bloodType: 'O-',
    medicalHistory: null
  },
  {
    userId: inactiveUserId,
    dateOfBirth: new Date('1978-03-03').toISOString(),
    gender: Gender.Other,
    bloodType: 'B+',
    medicalHistory: 'Hypertension. Regular medication: Lisinopril 10mg daily.'
  }
];

// Updated Raw Mock Data: Doctors - with more detailed and realistic weekly schedules
const rawMockDoctors = [
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
      }
    ],
    weeklySchedule: {
      // Full day on Monday
      monday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true },
        { startTime: '13:00', endTime: '17:00', isAvailable: true }
      ],
      // Half day on Tuesday
      tuesday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true }
      ],
      // Half day on Wednesday
      wednesday: [
        { startTime: '13:00', endTime: '17:00', isAvailable: true }
      ],
      // Full day on Thursday with lunch break
      thursday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true },
        { startTime: '13:00', endTime: '17:00', isAvailable: true }
      ],
      // Not available on Friday (day off)
      friday: [],
      // Weekend hours on Saturday morning
      saturday: [
        { startTime: '09:00', endTime: '12:00', isAvailable: true }
      ],
      // Not available on Sunday (day off)
      sunday: []
    },
    // More realistic blocked dates (upcoming holidays, vacation, conferences)
    blockedDates: [
      // Next month vacation (5 days)
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10).toISOString(),
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 11).toISOString(),
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 12).toISOString(),
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 13).toISOString(),
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 14).toISOString(),
      // Medical conference
      new Date(new Date().getFullYear(), new Date().getMonth() + 2, 15).toISOString(),
      new Date(new Date().getFullYear(), new Date().getMonth() + 2, 16).toISOString()
    ],
    createdAt: now,
    updatedAt: now
  },
  {
    userId: doctorVerifiedId,
    specialty: 'Cardiology',
    licenseNumber: 'MD67890-V',
    yearsOfExperience: 12,
    bio: 'Cardiologist specializing in preventive cardiology.',
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
      }
    ],
    weeklySchedule: {
      // Mornings only on Monday, Wednesday, Friday
      monday: [
        { startTime: '08:00', endTime: '12:00', isAvailable: true }
      ],
      // Full day on Tuesday
      tuesday: [
        { startTime: '08:00', endTime: '12:00', isAvailable: true },
        { startTime: '13:00', endTime: '17:00', isAvailable: true }
      ],
      wednesday: [
        { startTime: '08:00', endTime: '12:00', isAvailable: true }
      ],
      // Full day on Thursday with a different schedule
      thursday: [
        { startTime: '08:00', endTime: '12:00', isAvailable: true },
        { startTime: '13:00', endTime: '17:00', isAvailable: true }
      ],
      friday: [
        { startTime: '08:00', endTime: '12:00', isAvailable: true }
      ],
      // Not available on weekends
      saturday: [],
      sunday: []
    },
    // A few blocked dates
    blockedDates: [
      // Next week conference
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7).toISOString(),
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 8).toISOString(),
      new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 9).toISOString(),
      // Some random day off next month
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString()
    ],
    createdAt: lastWeek,
    updatedAt: now
  },
  {
    userId: doctorRejectedId,
    specialty: 'Neurology',
    licenseNumber: 'MD11223-R',
    yearsOfExperience: 8,
    bio: 'Neurologist with expertise in headache disorders.',
    verificationStatus: VerificationStatus.REJECTED,
    verificationNotes: 'License number could not be verified.',
    location: 'Chicago, IL',
    languages: ['English', 'German'],
    consultationFee: 200,
    profilePictureUrl: 'https://example.com/profile-pictures/doctor-rejected.jpg',
    licenseDocumentUrl: 'https://example.com/documents/license-rejected.pdf',
    certificateUrl: 'https://example.com/documents/certificate-rejected.pdf',
    educationHistory: [],
    // Since this doctor is rejected, they shouldn't have any available slots
    weeklySchedule: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    },
    blockedDates: [],
    createdAt: lastWeek,
    updatedAt: now
  }
];

// Helper function to get day of week from a date
function getDayOfWeek(dateString) {
  return new Date(dateString).getDay(); // 0 = Sunday, 1 = Monday, etc.
}

// Helper function to check if a date is in blockedDates
function isDateBlocked(dateString, blockedDates) {
  // Convert the date string to YYYY-MM-DD format for comparison
  const dateToCheck = dateString.split('T')[0];
  
  return blockedDates.some(blockedDate => {
    const blockedDateFormatted = blockedDate.split('T')[0];
    return dateToCheck === blockedDateFormatted;
  });
}

// Helper function to check if a slot is available in the doctor's schedule
function isSlotAvailable(doctorId, appointmentDate, startTime, endTime) {
  const doctor = rawMockDoctors.find(d => d.userId === doctorId);
  
  if (!doctor) return false;
  
  // Check if the date is blocked
  if (isDateBlocked(appointmentDate, doctor.blockedDates)) {
    return false;
  }
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = getDayOfWeek(appointmentDate);
  
  // Map day number to day name in weeklySchedule
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  // Get available slots for that day
  const availableSlots = doctor.weeklySchedule[dayName] || [];
  
  // Check if the requested time slot falls within any available slot
  return availableSlots.some(slot => {
    return slot.isAvailable && 
           startTime >= slot.startTime && 
           endTime <= slot.endTime;
  });
}

// Updated Raw Mock Data: Appointments
// Now we ensure all appointments align with doctor's availability
const rawMockAppointments = [
  {
    id: 'appt-completed-001',
    patientId: patientUserId,
    patientName: 'Sarah Patient',
    doctorId: doctorVerifiedId,
    doctorName: 'Dr. Emma Verified',
    doctorSpecialty: 'Cardiology',
    // Last week Monday morning (should match doctor's Monday availability)
    appointmentDate: new Date(
      new Date(lastWeek).getFullYear(),
      new Date(lastWeek).getMonth(),
      new Date(lastWeek).getDate() - new Date(lastWeek).getDay() + 1 // Monday of last week
    ).toISOString(),
    startTime: '09:00',
    endTime: '09:30',
    status: AppointmentStatus.COMPLETED,
    reason: 'Annual heart checkup',
    notes: "Patient's heart function normal. No concerns at this time.",
    createdAt: lastWeek,
    updatedAt: now,
    appointmentType: AppointmentType.InPerson
  },
  {
    id: 'appt-upcoming-002',
    patientId: patientUserId,
    patientName: 'Sarah Patient',
    doctorId: doctorVerifiedId,
    doctorName: 'Dr. Emma Verified',
    doctorSpecialty: 'Cardiology',
    // Next week Tuesday morning (should match doctor's Tuesday availability)
    appointmentDate: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() - new Date().getDay() + 9 // Next Tuesday
    ).toISOString(),
    startTime: '10:00',
    endTime: '10:30',
    status: AppointmentStatus.SCHEDULED,
    reason: 'Follow-up on medication',
    notes: null,
    createdAt: now,
    updatedAt: now,
    appointmentType: AppointmentType.InPerson
  },
  {
    id: 'appt-upcoming-003',
    patientId: patientUserId,
    patientName: 'Sarah Patient',
    doctorId: doctorPendingId, // Using the pending doctor
    doctorName: 'Dr. James Pending',
    doctorSpecialty: 'General Practice',
    // Next week Thursday (should match doctor's Thursday availability)
    appointmentDate: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() - new Date().getDay() + 11 // Next Thursday
    ).toISOString(),
    startTime: '14:00',
    endTime: '14:30',
    status: AppointmentStatus.SCHEDULED,
    reason: 'Seasonal allergies',
    notes: null,
    createdAt: now,
    updatedAt: now,
    appointmentType: AppointmentType.Video
  }
];

// Verify all appointments match doctor availability
rawMockAppointments.forEach(appointment => {
  const isAvailable = isSlotAvailable(
    appointment.doctorId,
    appointment.appointmentDate,
    appointment.startTime,
    appointment.endTime
  );
  
  if (!isAvailable) {
    console.warn(`[SEEDING WARNING] Appointment ${appointment.id} scheduled at a time when doctor ${appointment.doctorId} is not available.`);
  }
});

// Raw Mock Data: Notifications
const rawMockNotifications = [
  {
    id: 'notif-appt-booked-001',
    userId: patientUserId,
    title: 'Appointment Confirmed',
    message: 'Your appointment with Dr. Emma Verified has been confirmed.',
    isRead: false,
    createdAt: now,
    type: 'appointment_booked',
    relatedId: 'appt-upcoming-002'
  },
  {
    id: 'notif-system-003',
    userId: patientUserId,
    title: 'Welcome to Health App',
    message: 'Thank you for registering. Complete your profile to get the most out of our services.',
    isRead: true,
    createdAt: lastWeek,
    type: 'system',
    relatedId: null
  }
];

/**
 * Validates raw mock data against a Zod schema and prepares it for JSON storage.
 */
function validateAndPrepareData(
  collectionName,
  rawData,
  schema
) {
  console.log(`Validating ${rawData.length} items for ${collectionName}...`);
  const validData = [];
  let invalidCount = 0;
  
  for (const item of rawData) {
    const { id, ...itemData } = item;
    // Validate data portion against schema
    const validation = schema.safeParse(itemData);
    
    if (validation.success) {
      // Add ID back to the validated data object
      validData.push({ ...validation.data, id });
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
function validateAndPrepareNestedData(
  collectionName,
  rawData,
  schema
) {
  console.log(`Validating ${rawData.length} items for ${collectionName}...`);
  const validData = [];
  let invalidCount = 0;
  
  for (const item of rawData) {
    // Validate entire item against schema
    const validation = schema.safeParse(item);
    
    if (validation.success) {
      validData.push(validation.data);
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
    } catch (err) {
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