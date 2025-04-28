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
        break;
      case 'doctors':
        data = await getDoctors();
        break;
      case 'appointments':
        data = await getAppointments();
        break;
      case 'notifications':
        data = await getNotifications();
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
        await savePatients(requestData.data);
        success = true;
        break;
      case 'doctors':
        await saveDoctors(requestData.data);
        success = true;
        break;
      case 'appointments':
        await saveAppointments(requestData.data);
        success = true;
        break;
      case 'notifications':
        await saveNotifications(requestData.data);
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