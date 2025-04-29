/**
 * Script to seed the local file database with diverse and Zod-validated mock data.
 * Populates the local_db directory with JSON files for all major entity types.
 */

import fs from 'fs/promises';
import path from 'path';
import { faker } from '@faker-js/faker';

// Local DB Utils
import { DB_DIR } from '../src/lib/serverLocalDb';

// All Zod Schemas 
import { 
  UserProfileSchema, 
  PatientProfileSchema, 
  DoctorProfileSchema, 
  AppointmentSchema, 
  NotificationSchema 
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

// For Firebase emulator write-through
import { initAdminApp } from '../src/lib/emulatorAdmin';

// TypeScript Types (for type annotations only)
import type { Appointment, Notification } from '../src/types/schemas';

// Utilities for generating consistent data
faker.seed(42);
const iso = (days = 0) => new Date(Date.now() + days * 86_400_000).toISOString();
const PASSWORD_HASH = 'Password123!'; // plain for mock DB only

// Generic function to write data to collection
export async function writeCollection<T>(name: string, data: T[]): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  const filePath = path.join(DB_DIR, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Wrote ${data.length} items to ${name}.json`);
}

// Generate Users (10 total) with IDs
const users = Array.from({ length: 10 }).map((_, i) => {
  const isDoctor = i < 7;
  return {
    ...UserProfileSchema.parse({
      email: `user${i}@demo.health`,
      phone: `+201000000${i}${i}`,
      password: PASSWORD_HASH,
      firstName: faker.person.firstName(isDoctor ? 'male' : 'female'),
      lastName: faker.person.lastName(),
      userType: isDoctor ? UserType.DOCTOR : UserType.PATIENT,
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: iso(-faker.number.int({ min: 10, max: 100 })),
      updatedAt: iso(),
    }),
    id: `u-${i.toString().padStart(3, '0')}`,
    userId: `u-${i.toString().padStart(3, '0')}` // Adding userId for reference
  };
});

// Split into Doctors & Patients
const patientUsers = users.slice(7);      // 3 patients
const doctorUsers = users.slice(0, 7);    // 7 doctors

// Doctor profiles – different verificationStatus & schedules
const weekTemplates = [
  { mon: ['09:00', '17:00'], tue: [''], wed: ['09:00', '12:00'], thu: [''], fri: ['09:00', '15:00'], sat: [], sun: [] },
  { mon: ['14:00', '20:00'], tue: [], wed: ['14:00', '20:00'], thu: [], fri: [], sat: ['10:00', '14:00'], sun: [] },
];

function buildSchedule(template: Record<string, string[]>): Record<string, { startTime: string; endTime: string; isAvailable: boolean }[]> {
  const schedule: Record<string, { startTime: string; endTime: string; isAvailable: boolean }[]> = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };
  for (const [shortDay, slots] of Object.entries(template)) {
    let day: string;
    switch (shortDay) {
      case 'mon': day = 'monday'; break;
      case 'tue': day = 'tuesday'; break;
      case 'wed': day = 'wednesday'; break;
      case 'thu': day = 'thursday'; break;
      case 'fri': day = 'friday'; break;
      case 'sat': day = 'saturday'; break;
      case 'sun': day = 'sunday'; break;
      default: continue;
    }
    schedule[day] = slots[0]
      ? [{ startTime: slots[0], endTime: slots[1] || slots[0], isAvailable: true }]
      : [];
  }
  return schedule;
}

const doctors = doctorUsers.map((u, idx) => {
  const doctorData = DoctorProfileSchema.parse({
    userId: u.id,
    specialty: faker.helpers.arrayElement(['Cardiology', 'Dermatology', 'Neurology']),
    licenseNumber: faker.string.alphanumeric({ length: 10 }),
    yearsOfExperience: faker.number.int({ min: 2, max: 25 }),
    verificationStatus:
      idx === 0 ? VerificationStatus.PENDING :
      idx === 1 ? VerificationStatus.REJECTED :
      VerificationStatus.VERIFIED,
    consultationFee: faker.number.int({ min: 300, max: 800 }),
    bio: faker.lorem.paragraph(2),
    verificationNotes: idx === 1 ? 'License information could not be verified' : null,
    adminNotes: idx < 2 ? 'Pending review' : 'Approved',
    location: 'Cairo, Egypt',
    languages: ['English', 'Arabic'],
    profilePictureUrl: null,
    licenseDocumentUrl: null,
    certificateUrl: null,
    educationHistory: [],
    experience: [],
    timezone: 'Africa/Cairo',
    weeklySchedule: buildSchedule(weekTemplates[idx % weekTemplates.length]),
    blockedDates: [iso(60 + idx)],
    education: 'MBBS – Cairo University',
    servicesOffered: 'General consultation',
    createdAt: iso(-30),
    updatedAt: iso(),
  });
  
  // Explicitly add id to ensure schema compliance
  return {
    ...doctorData,
    id: u.id // Ensure id is always present and matches userId
  };
});

// Patient profiles
const patients = patientUsers.map((u, idx) => {
  const patientData = PatientProfileSchema.parse({
    userId: u.id,
    dateOfBirth: iso(-10_000 - idx * 1000),
    gender: idx === 0 ? Gender.FEMALE : Gender.MALE,
    bloodType: faker.helpers.arrayElement([
      BloodType.A_POSITIVE, 
      BloodType.B_POSITIVE, 
      BloodType.O_POSITIVE
    ]),
    medicalHistory: idx === 0 ? 'Allergic to penicillin' : null,
  });
  
  // Explicitly add id to ensure schema compliance
  return {
    ...patientData,
    id: u.id // Ensure id is always present and matches userId
  };
});

// Appointments – past & future, various statuses
const appointments: Array<Appointment & { id: string }> = [
  AppointmentSchema.parse({
    id: 'a-001',
    patientId: patientUsers[0].id,
    doctorId: doctorUsers[2].id,
    appointmentDate: iso(3),
    startTime: '09:30',
    endTime: '10:00',
    status: AppointmentStatus.PENDING,
    appointmentType: AppointmentType.IN_PERSON,
    reason: 'Check-up',
    notes: null,
    patientName: `${patientUsers[0].firstName} ${patientUsers[0].lastName}`,
    doctorName: `Dr. ${doctorUsers[2].firstName} ${doctorUsers[2].lastName}`,
    doctorSpecialty: doctors[2].specialty,
    videoCallUrl: null,
    createdAt: iso(),
    updatedAt: iso(),
  }) as Appointment & { id: string },
  AppointmentSchema.parse({
    id: 'a-002',
    patientId: patientUsers[1].id,
    doctorId: doctorUsers[2].id,
    appointmentDate: iso(-14),
    startTime: '14:00',
    endTime: '14:30',
    status: AppointmentStatus.COMPLETED,
    appointmentType: AppointmentType.VIDEO,
    videoCallUrl: 'https://meet.demo/abc',
    reason: 'Skin rash',
    notes: 'Prescribed ointment',
    patientName: `${patientUsers[1].firstName} ${patientUsers[1].lastName}`,
    doctorName: `Dr. ${doctorUsers[2].firstName} ${doctorUsers[2].lastName}`,
    doctorSpecialty: doctors[2].specialty,
    createdAt: iso(-20),
    updatedAt: iso(-13),
  }) as Appointment & { id: string },
  AppointmentSchema.parse({
    id: 'a-003',
    patientId: patientUsers[2].id,
    doctorId: doctorUsers[5].id,
    appointmentDate: iso(5),
    startTime: '10:00',
    endTime: '10:30',
    status: AppointmentStatus.CONFIRMED,
    appointmentType: AppointmentType.IN_PERSON,
    videoCallUrl: null,
    reason: 'Annual physical',
    notes: null,
    patientName: `${patientUsers[2].firstName} ${patientUsers[2].lastName}`,
    doctorName: `Dr. ${doctorUsers[5].firstName} ${doctorUsers[5].lastName}`,
    doctorSpecialty: doctors[5].specialty,
    createdAt: iso(-2),
    updatedAt: iso(-1),
  }) as Appointment & { id: string },
  AppointmentSchema.parse({
    id: 'a-004',
    patientId: patientUsers[0].id,
    doctorId: doctorUsers[3].id,
    appointmentDate: iso(-7),
    startTime: '11:30',
    endTime: '12:00',
    status: AppointmentStatus.CANCELED,
    appointmentType: AppointmentType.VIDEO,
    videoCallUrl: 'https://meet.demo/xyz',
    reason: 'Headache consultation',
    notes: 'Cancelled by patient',
    patientName: `${patientUsers[0].firstName} ${patientUsers[0].lastName}`,
    doctorName: `Dr. ${doctorUsers[3].firstName} ${doctorUsers[3].lastName}`,
    doctorSpecialty: doctors[3].specialty,
    createdAt: iso(-10),
    updatedAt: iso(-7),
  }) as Appointment & { id: string },
];

// Notifications
const notifications: Array<Notification & { id: string }> = [
  NotificationSchema.parse({
    id: 'n-001',
    userId: doctorUsers[2].userId,
    title: 'New appointment',
    message: `You have a new appointment with ${patientUsers[0].firstName} ${patientUsers[0].lastName} on ${new Date(iso(3)).toLocaleDateString()}.`,
    isRead: false,
    createdAt: iso(),
    type: NotificationType.APPOINTMENT_BOOKED,
    relatedId: 'a-001'
  }) as Notification & { id: string },
  NotificationSchema.parse({
    id: 'n-002',
    userId: patientUsers[0].userId,
    title: 'Appointment confirmed',
    message: `Your appointment with Dr. ${doctorUsers[2].firstName} ${doctorUsers[2].lastName} for ${new Date(iso(3)).toLocaleDateString()} is pending confirmation.`,
    isRead: false,
    createdAt: iso(),
    type: NotificationType.APPOINTMENT_BOOKED,
    relatedId: 'a-001'
  }) as Notification & { id: string },
  NotificationSchema.parse({
    id: 'n-003',
    userId: patientUsers[1].userId,
    title: 'Welcome!',
    message: 'Thanks for joining Health Appointment.',
    isRead: true,
    createdAt: iso(-1),
    type: NotificationType.SYSTEM_ALERT,
    relatedId: null
  }) as Notification & { id: string },
  NotificationSchema.parse({
    id: 'n-004',
    userId: doctorUsers[0].userId,
    title: 'Verification pending',
    message: 'Your doctor profile is under review. We will notify you once verified.',
    isRead: false,
    createdAt: iso(-5),
    type: NotificationType.OTHER,
    relatedId: doctorUsers[0].userId
  }) as Notification & { id: string },
  NotificationSchema.parse({
    id: 'n-005',
    userId: patientUsers[2].userId,
    title: 'Appointment confirmed',
    message: `Your appointment with Dr. ${doctorUsers[5].firstName} ${doctorUsers[5].lastName} on ${new Date(iso(5)).toLocaleDateString()} is confirmed.`,
    isRead: true,
    createdAt: iso(-1),
    type: NotificationType.APPOINTMENT_BOOKED,
    relatedId: 'a-003'
  }) as Notification & { id: string },
];

async function seedLocalDatabase() {
  console.log('🌱 Starting seeding...');
  
  // Write to files one by one to avoid type issues
  await writeCollection('users', users);
  await writeCollection('patients', patients);
  await writeCollection('doctors', doctors);
  await writeCollection('appointments', appointments);
  await writeCollection('notifications', notifications);
  
  console.log('✅ All collections written to flat-file JSON');
  
  // Firebase emulator (if flag set)
  if (process.env.WRITE_TO_EMULATOR === 'true') {
    console.log('📝 Writing to Firebase emulator...');
    try {
      const db = initAdminApp(); // returns Firestore admin instance pointed at localhost
      
      // Process each collection separately
      const processCollection = async <T extends { id?: string; userId?: string }>(name: string, data: T[]) => {
        const batch = db.batch();
        data.forEach(entity => {
          // Use the id or userId as the document ID, fallback to a random string if both are missing
          const docId = String(entity.id || entity.userId || faker.string.uuid());
          batch.set(db.collection(name).doc(docId), entity);
        });
        await batch.commit();
        console.log(`✅ Wrote ${data.length} items to Firestore collection: ${name}`);
      };
      
      // Write each collection to Firestore
      await processCollection('users', users);
      await processCollection('patients', patients);
      await processCollection('doctors', doctors);
      await processCollection('appointments', appointments);
      await processCollection('notifications', notifications);
    } catch (error) {
      console.error('❌ Error writing to Firebase emulator:', error);
    }
  }
  
  // Add validation log
  const { logValidation } = await import('../src/lib/logger');
  logValidation('2.8c', 'success', 'Seed script now generates 10 users (7 doctors, 3 patients) plus related data, Zod-validated and ready for file DB & emulator.');
  
  console.log('🌱 Seeding finished.');
}

// Run the seeding function
seedLocalDatabase().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
}); 