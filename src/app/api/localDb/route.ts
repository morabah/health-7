import { NextResponse } from 'next/server';
import {
  getUsers,
  getPatients,
  getDoctors,
  getAppointments,
  getNotifications,
  saveUsers,
  savePatients,
  saveDoctors,
  saveAppointments,
  saveNotifications,
} from '@/lib/serverLocalDb';
import type {
  UserProfile, // Assuming this already includes id: string
  PatientProfile as BasePatientProfile,
  DoctorProfile as BaseDoctorProfile,
  Appointment as BaseAppointment,
  Notification as BaseNotification,
} from '@/types/schemas';

// Opt out of caching for this route
export const dynamic = 'force-dynamic';

// Define intermediate types for data possibly missing an 'id' before processing
// Omit 'id' from base if it exists and conflicts, then allow optional id
type PatientData = Omit<BasePatientProfile, 'id'> & { id?: string; userId: string };
type DoctorData = Omit<BaseDoctorProfile, 'id'> & { id?: string; userId: string };
type AppointmentData = Omit<BaseAppointment, 'id'> & { id?: string };
type NotificationData = Omit<BaseNotification, 'id'> & { id?: string };

// Define a union type for the possible structures of 'data'
type CollectionData =
  | UserProfile[]
  | PatientData[]
  | DoctorData[]
  | AppointmentData[]
  | NotificationData[];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get('collection');

  if (!collection) {
    return NextResponse.json({ error: 'Collection parameter is required' }, { status: 400 });
  }

  try {
    let data: CollectionData | null = null; // Changed from 'any' to the new union type

    switch (collection) {
      case 'users':
        data = await getUsers();
        break;
      case 'patients':
        const patients = await getPatients();
        // Add id field to each patient based on userId
        data = (patients as PatientData[]).map(patient => ({
          ...patient,
          id: patient.id || patient.userId, // Prioritize existing id, fall back to userId
        }));
        break;
      case 'doctors':
        const doctors = await getDoctors();
        // Add id field to each doctor based on userId
        data = (doctors as DoctorData[]).map(doctor => ({
          ...doctor,
          id: doctor.id || doctor.userId, // Prioritize existing id, fall back to userId
        }));
        break;
      case 'appointments':
        const appointments = await getAppointments();
        // Ensure each appointment has an id
        data = (appointments as AppointmentData[]).map((appointment, index) => ({
          ...appointment,
          id: appointment.id || `a-${index.toString().padStart(3, '0')}`, // Generate a fallback id if needed
        }));
        break;
      case 'notifications':
        const notifications = await getNotifications();
        // Ensure each notification has an id
        data = (notifications as NotificationData[]).map((notification, index) => ({
          ...notification,
          id: notification.id || `n-${index.toString().padStart(3, '0')}`, // Generate a fallback id if needed
        }));
        break;
      default:
        return NextResponse.json({ error: 'Invalid collection name' }, { status: 400 });
    }

    // After mapping, data should conform to the Base types which include the mandatory 'id'
    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error(`Error fetching collection ${collection}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get('collection');

  if (!collection) {
    return NextResponse.json({ error: 'Collection parameter is required' }, { status: 400 });
  }

  try {
    const requestData = await request.json();

    if (!requestData.data || !Array.isArray(requestData.data)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected { data: [...] }' },
        { status: 400 }
      );
    }

    let success = false;

    switch (collection) {
      case 'users':
        // Assuming UserProfile already has id: string
        await saveUsers(requestData.data as UserProfile[]);
        success = true;
        break;
      case 'patients':
        // Ensure each patient has an id field before saving
        const patientsWithIds = (requestData.data as PatientData[]).map(patient => ({
          ...patient,
          id: patient.id || patient.userId,
        }));
        await savePatients(patientsWithIds as BasePatientProfile[]); // Cast back to base type for saving
        success = true;
        break;
      case 'doctors':
        // Ensure each doctor has an id field before saving
        const doctorsWithIds = (requestData.data as DoctorData[]).map(doctor => ({
          ...doctor,
          id: doctor.id || doctor.userId,
        }));
        await saveDoctors(doctorsWithIds as BaseDoctorProfile[]); // Cast back to base type for saving
        success = true;
        break;
      case 'appointments':
        // Ensure each appointment has an id field before saving
        const appointmentsWithIds = (requestData.data as AppointmentData[]).map(
          (appointment, index) => ({
            ...appointment,
            id: appointment.id || `a-${index.toString().padStart(3, '0')}`,
          })
        );
        await saveAppointments(appointmentsWithIds as BaseAppointment[]); // Cast back to base type for saving
        success = true;
        break;
      case 'notifications':
        // Ensure each notification has an id field before saving
        const notificationsWithIds = (requestData.data as NotificationData[]).map(
          (notification, index) => ({
            ...notification,
            id: notification.id || `n-${index.toString().padStart(3, '0')}`,
          })
        );
        await saveNotifications(notificationsWithIds as BaseNotification[]); // Cast back to base type for saving
        success = true;
        break;
      default:
        return NextResponse.json({ error: 'Invalid collection name' }, { status: 400 });
    }

    return NextResponse.json({ success });
  } catch (error: unknown) {
    console.error(`Error saving collection ${collection}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
