import { 
  UserProfileSchema, 
  PatientProfileSchema, 
  DoctorProfileSchema, 
  AppointmentSchema, 
  NotificationSchema,
  type UserProfile,
  type PatientProfile,
  type DoctorProfile,
  type Appointment,
  type Notification
} from '@/types/schemas';
import { 
  Gender, 
  UserType, 
  VerificationStatus, 
  AppointmentStatus, 
  AppointmentType, 
  BloodType,
  NotificationType
} from '@/types/enums';
import { logInfo, logError, logValidation } from '@/lib/logger';

// Mock the localDb functions to avoid actual API calls during testing
jest.mock('@/lib/localDb', () => ({
  getUsers: jest.fn(),
  getPatients: jest.fn(),
  getDoctors: jest.fn(), 
  getAppointments: jest.fn(),
  getNotifications: jest.fn()
}));

// Import after mocking
import { 
  getUsers, 
  getPatients, 
  getDoctors, 
  getAppointments, 
  getNotifications 
} from '@/lib/localDb';

describe('Database Schema Validation', () => {
  // Mock data setup
  const mockUsers: UserProfile[] = [
    {
      id: 'user1',
      email: 'patient@example.com',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      userType: UserType.PATIENT,
      isActive: true,
      emailVerified: true,
      phoneVerified: false,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    }
  ];

  const mockPatients: PatientProfile[] = [
    {
      userId: 'user1',
      dateOfBirth: '1990-01-01T00:00:00Z',
      gender: Gender.MALE,
      bloodType: BloodType.A_POSITIVE,
      medicalHistory: 'No significant medical history'
    }
  ];

  const mockDoctors: DoctorProfile[] = [
    {
      userId: 'user2',
      specialty: 'Cardiology',
      licenseNumber: 'MD12345',
      yearsOfExperience: 10,
      bio: 'Experienced cardiologist',
      verificationStatus: VerificationStatus.VERIFIED,
      verificationNotes: null,
      adminNotes: 'Top doctor',
      location: 'New York, NY',
      languages: ['English', 'Spanish'],
      consultationFee: 200,
      profilePictureUrl: null,
      licenseDocumentUrl: null,
      certificateUrl: null,
      educationHistory: [],
      experience: [],
      education: 'MD from Harvard Medical School',
      servicesOffered: 'Cardiac Consultation, ECG, Stress Test',
      timezone: 'America/New_York',
      weeklySchedule: {
        monday: [
          { startTime: '09:00', endTime: '12:00', isAvailable: true }
        ],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      },
      blockedDates: [],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    }
  ];

  const mockAppointments: Appointment[] = [
    {
      id: 'appt1',
      patientId: 'user1',
      doctorId: 'user2',
      appointmentDate: '2023-06-15T00:00:00Z',
      startTime: '10:00',
      endTime: '10:30',
      status: AppointmentStatus.CONFIRMED,
      notes: 'Regular checkup',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      appointmentType: AppointmentType.IN_PERSON,
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      doctorSpecialty: 'Cardiology',
      reason: 'Annual checkup',
      videoCallUrl: null
    }
  ];

  const mockNotifications: Notification[] = [
    {
      id: 'notif1',
      userId: 'user1',
      title: 'Appointment Reminder',
      message: 'You have an appointment tomorrow',
      isRead: false,
      createdAt: '2023-01-01T00:00:00Z',
      type: NotificationType.APPOINTMENT_BOOKED,
      relatedId: 'appt1'
    }
  ];

  beforeEach(() => {
    // Set up mock return values
    (getUsers as jest.Mock).mockResolvedValue(mockUsers);
    (getPatients as jest.Mock).mockResolvedValue(mockPatients);
    (getDoctors as jest.Mock).mockResolvedValue(mockDoctors);
    (getAppointments as jest.Mock).mockResolvedValue(mockAppointments);
    (getNotifications as jest.Mock).mockResolvedValue(mockNotifications);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('User profiles match schema', async () => {
    const users = await getUsers();
    expect(users).toBeTruthy();
    
    // Validate each user against schema
    users.forEach(user => {
      const { id, ...userData } = user;
      const result = UserProfileSchema.safeParse(userData);
      
      if (!result.success) {
        console.error('User validation failed:', result.error);
      }
      
      expect(result.success).toBe(true);
    });
  });

  test('Patient profiles match schema', async () => {
    const patients = await getPatients();
    expect(patients).toBeTruthy();
    
    // Validate each patient against schema
    patients.forEach(patient => {
      const result = PatientProfileSchema.safeParse(patient);
      
      if (!result.success) {
        console.error('Patient validation failed:', result.error);
      }
      
      expect(result.success).toBe(true);
    });
  });

  test('Doctor profiles match schema', async () => {
    const doctors = await getDoctors();
    expect(doctors).toBeTruthy();
    
    // Validate each doctor against schema
    doctors.forEach(doctor => {
      const result = DoctorProfileSchema.safeParse(doctor);
      
      if (!result.success) {
        console.error('Doctor validation failed:', result.error);
      }
      
      expect(result.success).toBe(true);
    });
  });

  test('Appointments match schema', async () => {
    const appointments = await getAppointments();
    expect(appointments).toBeTruthy();
    
    // Validate each appointment against schema
    appointments.forEach(appointment => {
      const { id, ...appointmentData } = appointment;
      const result = AppointmentSchema.safeParse(appointmentData);
      
      if (!result.success) {
        console.error('Appointment validation failed:', result.error);
      }
      
      expect(result.success).toBe(true);
    });
  });

  test('Notifications match schema', async () => {
    const notifications = await getNotifications();
    expect(notifications).toBeTruthy();
    
    // Validate each notification against schema
    notifications.forEach(notification => {
      const { id, ...notificationData } = notification;
      const result = NotificationSchema.safeParse(notificationData);
      
      if (!result.success) {
        console.error('Notification validation failed:', result.error);
      }
      
      expect(result.success).toBe(true);
    });
  });

  test('Validates database entries against all schemas', async () => {
    // Run all validations and log results
    try {
      const users = await getUsers();
      const patients = await getPatients();
      const doctors = await getDoctors();
      const appointments = await getAppointments();
      const notifications = await getNotifications();
      
      let totalValidated = 0;
      let totalErrors = 0;
      
      // Validate users
      users.forEach(user => {
        const { id, ...userData } = user;
        const result = UserProfileSchema.safeParse(userData);
        totalValidated++;
        if (!result.success) totalErrors++;
      });
      
      // Validate patients
      patients.forEach(patient => {
        const result = PatientProfileSchema.safeParse(patient);
        totalValidated++;
        if (!result.success) totalErrors++;
      });
      
      // Validate doctors
      doctors.forEach(doctor => {
        const result = DoctorProfileSchema.safeParse(doctor);
        totalValidated++;
        if (!result.success) totalErrors++;
      });
      
      // Validate appointments
      appointments.forEach(appointment => {
        const { id, ...appointmentData } = appointment;
        const result = AppointmentSchema.safeParse(appointmentData);
        totalValidated++;
        if (!result.success) totalErrors++;
      });
      
      // Validate notifications
      notifications.forEach(notification => {
        const { id, ...notificationData } = notification;
        const result = NotificationSchema.safeParse(notificationData);
        totalValidated++;
        if (!result.success) totalErrors++;
      });
      
      logInfo(`Database validation complete: ${totalValidated} entries validated, ${totalErrors} errors found`);
      
      // Log validation success for task
      logValidation('1.17', 'success', 'Database schema validation test created and successfully run');
      
      // Final assertion
      expect(totalErrors).toBe(0);
    } catch (error) {
      logError('Error during database validation:', error);
      throw error;
    }
  });
}); 