/**
 * Server-side local file database utilities for development mode.
 * Provides functions to save/read JSON data to/from the local_db directory.
 * 
 * IMPORTANT: This file should only be imported by server components or API routes.
 */

import fs from 'fs/promises';
import path from 'path';
import type { 
  UserProfile, 
  PatientProfile, 
  DoctorProfile, 
  Appointment, 
  Notification 
} from '../types/schemas';

// Constants
export const DB_DIR = path.join(process.cwd(), 'local_db');

/**
 * Ensures the local_db directory exists
 */
async function ensureDbDirExists() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating local_db directory:', err);
    throw err;
  }
}

/**
 * Saves data to a JSON file in the local_db directory
 */
async function saveToJson<T>(filename: string, data: T): Promise<void> {
  await ensureDbDirExists();
  const filePath = path.join(DB_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Data saved to ${filePath}`);
}

/**
 * Reads data from a JSON file in the local_db directory
 */
export async function readFromJson<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(DB_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.warn(`File not found: ${filename}`);
      return null;
    }
    console.error(`Error reading ${filename}:`, err);
    throw err;
  }
}

/**
 * Saves user profiles to users.json
 */
export async function saveUsers(users: UserProfile[]): Promise<void> {
  await saveToJson('users.json', users);
}

/**
 * Saves patient profiles to patients.json
 */
export async function savePatients(patients: PatientProfile[]): Promise<void> {
  await saveToJson('patients.json', patients);
}

/**
 * Saves doctor profiles to doctors.json
 */
export async function saveDoctors(doctors: DoctorProfile[]): Promise<void> {
  await saveToJson('doctors.json', doctors);
}

/**
 * Saves appointments to appointments.json
 */
export async function saveAppointments(appointments: Appointment[]): Promise<void> {
  await saveToJson('appointments.json', appointments);
}

/**
 * Saves notifications to notifications.json
 */
export async function saveNotifications(notifications: Notification[]): Promise<void> {
  await saveToJson('notifications.json', notifications);
}

/**
 * Reads user profiles from users.json
 */
export async function getUsers(): Promise<UserProfile[]> {
  return await readFromJson<UserProfile[]>('users.json') || [];
}

/**
 * Reads patient profiles from patients.json
 */
export async function getPatients(): Promise<PatientProfile[]> {
  return await readFromJson<PatientProfile[]>('patients.json') || [];
}

/**
 * Reads doctor profiles from doctors.json
 */
export async function getDoctors(): Promise<DoctorProfile[]> {
  return await readFromJson<DoctorProfile[]>('doctors.json') || [];
}

/**
 * Reads appointments from appointments.json
 */
export async function getAppointments(): Promise<Appointment[]> {
  return await readFromJson<Appointment[]>('appointments.json') || [];
}

/**
 * Reads notifications from notifications.json
 */
export async function getNotifications(): Promise<Notification[]> {
  return await readFromJson<Notification[]>('notifications.json') || [];
} 