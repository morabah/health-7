'use client';

/**
 * Local file database utilities for development mode.
 * Provides functions to fetch JSON data from the local_db API endpoint.
 */

import type { 
  UserProfile, 
  PatientProfile, 
  DoctorProfile, 
  Appointment, 
  Notification 
} from '../types/schemas';
import { logError, logInfo } from '@/lib/logger';

/**
 * Generic function to fetch collection data from the local DB API
 */
async function fetchCollectionData<T>(collection: string): Promise<T[]> {
  try {
    const response = await fetch(`/api/localDb?collection=${collection}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error fetching ${collection}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    logError(`Error fetching ${collection}:`, error);
    return [];
  }
}

/**
 * Generic function to save collection data through API
 */
async function saveCollectionData<T>(collection: string, data: T[]): Promise<boolean> {
  try {
    const response = await fetch(`/api/localDb?collection=${collection}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error saving ${collection}`);
    }
    
    logInfo(`Saved ${data.length} items to ${collection}`);
    return true;
  } catch (error) {
    logError(`Error saving ${collection}:`, error);
    return false;
  }
}

/**
 * Reads user profiles from users.json
 */
export async function getUsers(): Promise<UserProfile[]> {
  return await fetchCollectionData<UserProfile>('users');
}

/**
 * Saves user profiles to users.json
 */
export async function saveUsers(users: UserProfile[]): Promise<boolean> {
  return await saveCollectionData<UserProfile>('users', users);
}

/**
 * Reads patient profiles from patients.json
 */
export async function getPatients(): Promise<PatientProfile[]> {
  return await fetchCollectionData<PatientProfile>('patients');
}

/**
 * Saves patient profiles to patients.json
 */
export async function savePatients(patients: PatientProfile[]): Promise<boolean> {
  return await saveCollectionData<PatientProfile>('patients', patients);
}

/**
 * Reads doctor profiles from doctors.json
 */
export async function getDoctors(): Promise<DoctorProfile[]> {
  return await fetchCollectionData<DoctorProfile>('doctors');
}

/**
 * Saves doctor profiles to doctors.json
 */
export async function saveDoctors(doctors: DoctorProfile[]): Promise<boolean> {
  return await saveCollectionData<DoctorProfile>('doctors', doctors);
}

/**
 * Reads appointments from appointments.json
 */
export async function getAppointments(): Promise<Appointment[]> {
  return await fetchCollectionData<Appointment>('appointments');
}

/**
 * Saves appointments to appointments.json
 */
export async function saveAppointments(appointments: Appointment[]): Promise<boolean> {
  return await saveCollectionData<Appointment>('appointments', appointments);
}

/**
 * Reads notifications from notifications.json
 */
export async function getNotifications(): Promise<Notification[]> {
  return await fetchCollectionData<Notification>('notifications');
}

/**
 * Saves notifications to notifications.json
 */
export async function saveNotifications(notifications: Notification[]): Promise<boolean> {
  return await saveCollectionData<Notification>('notifications', notifications);
} 