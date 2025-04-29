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
  saveNotifications
} from '@/lib/serverLocalDb';
import type { 
  PatientProfile, 
  DoctorProfile, 
  Appointment, 
  Notification
} from '@/types/schemas';

// Define interfaces with optional id property
interface PatientWithOptionalId extends PatientProfile {
  id?: string;
}

interface DoctorWithOptionalId extends DoctorProfile {
  id?: string;
}

interface AppointmentWithOptionalId extends Omit<Appointment, 'id'> {
  id?: string;
}

interface NotificationWithOptionalId extends Omit<Notification, 'id'> {
  id?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get('collection');
  
  if (!collection) {
    return NextResponse.json({ error: 'Collection parameter is required' }, { status: 400 });
  }
  
  try {
    let data = null;
    
    switch (collection) {
      case 'users':
        data = await getUsers();
        break;
      case 'patients':
        data = await getPatients();
        // Add id field to each patient based on userId
        data = (data as PatientWithOptionalId[]).map(patient => ({
          ...patient,
          id: patient.id || patient.userId // Prioritize existing id, fall back to userId
        }));
        break;
      case 'doctors':
        data = await getDoctors();
        // Add id field to each doctor based on userId
        data = (data as DoctorWithOptionalId[]).map(doctor => ({
          ...doctor,
          id: doctor.id || doctor.userId // Prioritize existing id, fall back to userId
        }));
        break;
      case 'appointments':
        data = await getAppointments();
        // Ensure each appointment has an id
        data = (data as AppointmentWithOptionalId[]).map((appointment, index) => ({
          ...appointment,
          id: appointment.id || `a-${index.toString().padStart(3, '0')}` // Generate a fallback id if needed
        }));
        break;
      case 'notifications':
        data = await getNotifications();
        // Ensure each notification has an id
        data = (data as NotificationWithOptionalId[]).map((notification, index) => ({
          ...notification,
          id: notification.id || `n-${index.toString().padStart(3, '0')}` // Generate a fallback id if needed
        }));
        break;
      default:
        return NextResponse.json({ error: 'Invalid collection name' }, { status: 400 });
    }
    
    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error(`Error fetching collection ${collection}:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid data format. Expected { data: [...] }' }, { status: 400 });
    }
    
    let success = false;
    
    switch (collection) {
      case 'users':
        await saveUsers(requestData.data);
        success = true;
        break;
      case 'patients':
        // Ensure each patient has an id field before saving
        const patientsWithIds = (requestData.data as PatientWithOptionalId[]).map(patient => ({
          ...patient,
          id: patient.id || patient.userId
        }));
        await savePatients(patientsWithIds);
        success = true;
        break;
      case 'doctors':
        // Ensure each doctor has an id field before saving
        const doctorsWithIds = (requestData.data as DoctorWithOptionalId[]).map(doctor => ({
          ...doctor,
          id: doctor.id || doctor.userId
        }));
        await saveDoctors(doctorsWithIds);
        success = true;
        break;
      case 'appointments':
        // Ensure each appointment has an id field before saving
        const appointmentsWithIds = (requestData.data as AppointmentWithOptionalId[]).map((appointment, index) => ({
          ...appointment,
          id: appointment.id || `a-${index.toString().padStart(3, '0')}`
        }));
        await saveAppointments(appointmentsWithIds);
        success = true;
        break;
      case 'notifications':
        // Ensure each notification has an id field before saving
        const notificationsWithIds = (requestData.data as NotificationWithOptionalId[]).map((notification, index) => ({
          ...notification,
          id: notification.id || `n-${index.toString().padStart(3, '0')}`
        }));
        await saveNotifications(notificationsWithIds);
        success = true;
        break;
      default:
        return NextResponse.json({ error: 'Invalid collection name' }, { status: 400 });
    }
    
    return NextResponse.json({ success });
  } catch (error: unknown) {
    console.error(`Error saving collection ${collection}:`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 