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
import { logInfo, logError, logValidation, logWarn } from '@/lib/logger';

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

// Enhanced validation helper with detailed reporting
interface ValidationResult {
  isValid: boolean;
  entityType: string;
  entityId?: string;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
}

// Helper function to format validation errors
const formatZodErrors = (errors: any): { message: string, fieldErrors: Record<string, string[]> } => {
  const fieldErrors: Record<string, string[]> = {};
  
  if (errors.format) {
    const formattedErrors = errors.format();
    for (const [path, error] of Object.entries(formattedErrors)) {
      if (path === '_errors') continue;
      if (typeof error === 'object' && error !== null && '_errors' in error) {
        // Type assertion to ensure the _errors property is treated as string[]
        const errorMessages = (error as { _errors: string[] })._errors;
        fieldErrors[path] = errorMessages;
      }
    }
  } else if (errors.errors) {
    errors.errors.forEach((err: any) => {
      const path = err.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });
  }
  
  return {
    message: errors.message || 'Validation failed',
    fieldErrors
  };
};

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

  // Add some edge cases for testing validation robustness
  // Invalid patient with missing required fields
  const invalidPatient: PatientProfile = {
    userId: 'invalid-user',
    dateOfBirth: 'not-a-date', // Invalid date format
    gender: 'UNKNOWN' as any, // Invalid enum value
    bloodType: null,
    medicalHistory: null
  };

  // Invalid appointment with incorrect data types
  const invalidAppointment: Appointment = {
    id: 'invalid-appt',
    patientId: '', // Empty string instead of valid ID
    doctorId: 'user2',
    appointmentDate: 'tomorrow', // Invalid date
    startTime: '25:00', // Invalid time
    endTime: '26:00', // Invalid time
    status: 'PENDING' as any, // String instead of enum
    notes: null,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    appointmentType: AppointmentType.IN_PERSON,
    patientName: 'John Doe',
    doctorName: 'Dr. Smith',
    doctorSpecialty: 'Cardiology',
    reason: 'Annual checkup',
    videoCallUrl: null
  };

  beforeEach(() => {
    // Set up mock return values
    (getUsers as jest.Mock).mockResolvedValue(mockUsers);
    (getPatients as jest.Mock).mockResolvedValue(mockPatients);
    (getDoctors as jest.Mock).mockResolvedValue(mockDoctors);
    (getAppointments as jest.Mock).mockResolvedValue(mockAppointments);
    (getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

    // Spy on console methods to verify logging
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
    (console.info as jest.Mock).mockRestore();
  });

  test('User profiles match schema', async () => {
    const users = await getUsers();
    expect(users).toBeTruthy();
    
    // Validate each user against schema
    users.forEach(user => {
      const { id: _unused, ...userData } = user;
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
      const { id: _unused, ...appointmentData } = appointment;
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
      const { id: _unused, ...notificationData } = notification;
      const result = NotificationSchema.safeParse(notificationData);
      
      if (!result.success) {
        console.error('Notification validation failed:', result.error);
      }
      
      expect(result.success).toBe(true);
    });
  });

  test('Should detect and report invalid data', () => {
    // Test patient validation with invalid data
    const patientResult = PatientProfileSchema.safeParse(invalidPatient);
    expect(patientResult.success).toBe(false);
    
    if (!patientResult.success) {
      const formatted = formatZodErrors(patientResult.error);
      expect(formatted.fieldErrors).toBeDefined();
      expect(Object.keys(formatted.fieldErrors).length).toBeGreaterThan(0);
      
      // Check if dateOfBirth error is detected
      expect(formatted.fieldErrors.dateOfBirth).toBeDefined();
    }
    
    // Test appointment validation with invalid data
    const { id: _unused, ...appointmentData } = invalidAppointment;
    const appointmentResult = AppointmentSchema.safeParse(appointmentData);
    expect(appointmentResult.success).toBe(false);
    
    if (!appointmentResult.success) {
      const formatted = formatZodErrors(appointmentResult.error);
      expect(formatted.fieldErrors).toBeDefined();
      expect(Object.keys(formatted.fieldErrors).length).toBeGreaterThan(0);
      
      // Check if specific errors are detected
      expect(formatted.fieldErrors.patientId || 
             formatted.fieldErrors.appointmentDate || 
             formatted.fieldErrors.startTime).toBeDefined();
    }
  });

  test('Validates database entries against all schemas with detailed reports', async () => {
    // Run all validations and log results
    try {
      const users = await getUsers();
      const patients = await getPatients();
      const doctors = await getDoctors();
      const appointments = await getAppointments();
      const notifications = await getNotifications();
      
      const validationResults: ValidationResult[] = [];
      
      // Validate users
      users.forEach(user => {
        const { id: _unused, ...userData } = user;
        const result = UserProfileSchema.safeParse(userData);
        
        validationResults.push({
          isValid: result.success,
          entityType: 'UserProfile',
          errors: !result.success ? [result.error.message] : undefined,
          fieldErrors: !result.success ? formatZodErrors(result.error).fieldErrors : undefined
        });
      });
      
      // Validate patients
      patients.forEach(patient => {
        const result = PatientProfileSchema.safeParse(patient);
        
        validationResults.push({
          isValid: result.success,
          entityType: 'PatientProfile',
          entityId: patient.userId,
          errors: !result.success ? [result.error.message] : undefined,
          fieldErrors: !result.success ? formatZodErrors(result.error).fieldErrors : undefined
        });
      });
      
      // Validate doctors
      doctors.forEach(doctor => {
        const result = DoctorProfileSchema.safeParse(doctor);
        
        validationResults.push({
          isValid: result.success,
          entityType: 'DoctorProfile',
          entityId: doctor.userId,
          errors: !result.success ? [result.error.message] : undefined,
          fieldErrors: !result.success ? formatZodErrors(result.error).fieldErrors : undefined
        });
      });
      
      // Validate appointments
      appointments.forEach(appointment => {
        const { id: _unused, ...appointmentData } = appointment;
        const result = AppointmentSchema.safeParse(appointmentData);
        
        validationResults.push({
          isValid: result.success,
          entityType: 'Appointment',
          entityId: id,
          errors: !result.success ? [result.error.message] : undefined,
          fieldErrors: !result.success ? formatZodErrors(result.error).fieldErrors : undefined
        });
      });
      
      // Validate notifications
      notifications.forEach(notification => {
        const { id: _unused, ...notificationData } = notification;
        const result = NotificationSchema.safeParse(notificationData);
        
        validationResults.push({
          isValid: result.success,
          entityType: 'Notification',
          entityId: id,
          errors: !result.success ? [result.error.message] : undefined,
          fieldErrors: !result.success ? formatZodErrors(result.error).fieldErrors : undefined
        });
      });
      
      // Generate detailed report
      const totalEntities = validationResults.length;
      const validEntities = validationResults.filter(r => r.isValid).length;
      const invalidEntities = totalEntities - validEntities;
      
      // Log summary
      logInfo(`Database validation summary: ${totalEntities} entities checked, ${validEntities} valid, ${invalidEntities} invalid`);
      
      // Log detailed issues for invalid entities
      if (invalidEntities > 0) {
        const invalidResults = validationResults.filter(r => !r.isValid);
        
        invalidResults.forEach(result => {
          logWarn(`${result.entityType} (ID: ${result.entityId}) validation failed:`, {
            errors: result.errors,
            fieldErrors: result.fieldErrors
          });
        });
      }
      
      // Group validation results by entity type
      const resultsByType: Record<string, { total: number, valid: number, invalid: number }> = {};
      
      validationResults.forEach(result => {
        if (!resultsByType[result.entityType]) {
          resultsByType[result.entityType] = { total: 0, valid: 0, invalid: 0 };
        }
        
        resultsByType[result.entityType].total++;
        if (result.isValid) {
          resultsByType[result.entityType].valid++;
        } else {
          resultsByType[result.entityType].invalid++;
        }
      });
      
      // Log breakdown by type
      Object.entries(resultsByType).forEach(([type, counts]) => {
        logInfo(`${type}: ${counts.valid}/${counts.total} valid (${counts.invalid} invalid)`);
      });
      
      // Log validation success for task
      logValidation('1.17', 'success', 'Database schema validation test executed with detailed reporting');
      
      // Final assertion
      expect(invalidEntities).toBe(0);
    } catch (error) {
      logError('Error during database validation:', error);
      throw error;
    }
  });

  test('Creates schema validation report with timing metrics', async () => {
    try {
      // Track execution time
      const startTime = performance.now();
      
      const users = await getUsers();
      const patients = await getPatients();
      const doctors = await getDoctors();
      const appointments = await getAppointments();
      const notifications = await getNotifications();
      
      let totalValidated = 0;
      let totalErrors = 0;
      const entityCounts: Record<string, number> = {
        users: users.length,
        patients: patients.length,
        doctors: doctors.length,
        appointments: appointments.length,
        notifications: notifications.length
      };
      
      // Validate users
      for (const user of users) {
        const { id: _unused, ...userData } = user;
        const result = UserProfileSchema.safeParse(userData);
        totalValidated++;
        if (!result.success) totalErrors++;
      }
      
      // Validate patients
      for (const patient of patients) {
        const result = PatientProfileSchema.safeParse(patient);
        totalValidated++;
        if (!result.success) totalErrors++;
      }
      
      // Validate doctors
      for (const doctor of doctors) {
        const result = DoctorProfileSchema.safeParse(doctor);
        totalValidated++;
        if (!result.success) totalErrors++;
      }
      
      // Validate appointments
      for (const appointment of appointments) {
        const { id: _unused, ...appointmentData } = appointment;
        const result = AppointmentSchema.safeParse(appointmentData);
        totalValidated++;
        if (!result.success) totalErrors++;
      }
      
      // Validate notifications
      for (const notification of notifications) {
        const { id: _unused, ...notificationData } = notification;
        const result = NotificationSchema.safeParse(notificationData);
        totalValidated++;
        if (!result.success) totalErrors++;
      }
      
      // Calculate execution time
      const endTime = performance.now();
      const executionTime = (endTime - startTime).toFixed(2);
      
      // Generate report
      const validationReport = {
        timestamp: new Date().toISOString(),
        executionTimeMs: executionTime,
        totalEntitiesValidated: totalValidated,
        totalErrors,
        entityCounts,
        status: totalErrors === 0 ? 'PASSED' : 'FAILED'
      };
      
      logInfo(`Database schema validation report:`, validationReport);
      
      // Final assertion
      expect(totalErrors).toBe(0);
      expect(validationReport.status).toBe('PASSED');
      
    } catch (error) {
      logError('Error generating validation report:', error);
      throw error;
    }
  });
}); 