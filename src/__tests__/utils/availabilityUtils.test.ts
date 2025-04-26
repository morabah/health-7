import { 
  formatDateForComparison,
  getDayOfWeek,
  isDateBlocked,
  getDayName,
  isTimeInRange,
  isSlotAvailable,
  hasAppointmentConflict,
  getAvailableSlotsForDate
} from '@/utils/availabilityUtils';
import type { DoctorProfile, Appointment, TimeSlot } from '@/types/schemas';
import { AppointmentStatus, AppointmentType, VerificationStatus } from '@/types/enums';

describe('availabilityUtils', () => {
  describe('formatDateForComparison', () => {
    it('should format ISO date string correctly', () => {
      expect(formatDateForComparison('2023-06-15T14:30:00Z')).toBe('2023-06-15');
    });

    it('should return empty string for invalid date', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      expect(formatDateForComparison('invalid-date')).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getDayOfWeek', () => {
    it('should return correct day of week', () => {
      // 2023-06-15 was a Thursday (4)
      expect(getDayOfWeek('2023-06-15T00:00:00Z')).toBe(4);
    });

    it('should return -1 for invalid date', () => {
      // Invalid date will return -1 but doesn't log an error for the isNaN check
      expect(getDayOfWeek('invalid-date')).toBe(-1);
    });
  });

  describe('isDateBlocked', () => {
    it('should return true when date is blocked', () => {
      const blockedDates = ['2023-06-15T00:00:00Z', '2023-06-16T00:00:00Z'];
      expect(isDateBlocked('2023-06-15T14:30:00Z', blockedDates)).toBe(true);
    });

    it('should return false when date is not blocked', () => {
      const blockedDates = ['2023-06-15T00:00:00Z', '2023-06-16T00:00:00Z'];
      expect(isDateBlocked('2023-06-17T14:30:00Z', blockedDates)).toBe(false);
    });

    it('should handle empty blockedDates array', () => {
      expect(isDateBlocked('2023-06-15T14:30:00Z', [])).toBe(false);
    });

    it('should handle undefined blockedDates', () => {
      expect(isDateBlocked('2023-06-15T14:30:00Z')).toBe(false);
    });
  });

  describe('getDayName', () => {
    it('should return correct day names for each day number', () => {
      expect(getDayName(0)).toBe('sunday');
      expect(getDayName(1)).toBe('monday');
      expect(getDayName(2)).toBe('tuesday');
      expect(getDayName(3)).toBe('wednesday');
      expect(getDayName(4)).toBe('thursday');
      expect(getDayName(5)).toBe('friday');
      expect(getDayName(6)).toBe('saturday');
    });

    it('should return empty string for invalid day number', () => {
      expect(getDayName(-1)).toBe('');
      expect(getDayName(7)).toBe('');
    });
  });

  describe('isTimeInRange', () => {
    it('should return true when time is within available slot', () => {
      const availableSlot: TimeSlot = {
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true
      };
      
      expect(isTimeInRange('10:00', '11:00', availableSlot)).toBe(true);
      expect(isTimeInRange('09:00', '17:00', availableSlot)).toBe(true);
    });

    it('should return false when time is outside available slot', () => {
      const availableSlot: TimeSlot = {
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true
      };
      
      expect(isTimeInRange('08:00', '09:30', availableSlot)).toBe(false);
      expect(isTimeInRange('16:00', '18:00', availableSlot)).toBe(false);
    });

    it('should return false when slot is not available', () => {
      const availableSlot: TimeSlot = {
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: false
      };
      
      expect(isTimeInRange('10:00', '11:00', availableSlot)).toBe(false);
    });
  });

  describe('isSlotAvailable', () => {
    const mockDoctorProfile: DoctorProfile = {
      userId: 'doctor123',
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
          { startTime: '09:00', endTime: '12:00', isAvailable: true },
          { startTime: '13:00', endTime: '17:00', isAvailable: true }
        ],
        tuesday: [
          { startTime: '09:00', endTime: '12:00', isAvailable: true },
          { startTime: '13:00', endTime: '17:00', isAvailable: true }
        ],
        wednesday: [],
        thursday: [
          { startTime: '09:00', endTime: '17:00', isAvailable: true }
        ],
        friday: [
          { startTime: '09:00', endTime: '12:00', isAvailable: true }
        ],
        saturday: [],
        sunday: []
      },
      blockedDates: ['2023-06-15T00:00:00Z'],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    };

    it('should return true for an available slot', () => {
      // Monday is available from 9-12 and 13-17
      // June 12, 2023 was a Monday
      expect(isSlotAvailable(
        mockDoctorProfile, 
        '2023-06-12T00:00:00Z', 
        '10:00', 
        '11:00'
      )).toBe(true);
    });

    it('should return false for a blocked date', () => {
      expect(isSlotAvailable(
        mockDoctorProfile, 
        '2023-06-15T00:00:00Z', // This is in blockedDates
        '10:00', 
        '11:00'
      )).toBe(false);
    });

    it('should return false for a day with no availability', () => {
      // Sunday is not available
      // June 11, 2023 was a Sunday
      expect(isSlotAvailable(
        mockDoctorProfile, 
        '2023-06-11T00:00:00Z', 
        '10:00', 
        '11:00'
      )).toBe(false);
    });

    it('should return false for a time outside available hours', () => {
      // Monday is available 9-12 and 13-17
      // June 12, 2023 was a Monday
      expect(isSlotAvailable(
        mockDoctorProfile, 
        '2023-06-12T00:00:00Z', 
        '18:00', // After hours
        '19:00'
      )).toBe(false);
    });

    it('should return false for a null doctor profile', () => {
      expect(isSlotAvailable(
        null as unknown as DoctorProfile, 
        '2023-06-12T00:00:00Z', 
        '10:00', 
        '11:00'
      )).toBe(false);
    });
  });

  describe('hasAppointmentConflict', () => {
    const mockAppointments: Appointment[] = [
      {
        id: 'appt1',
        patientId: 'patient1',
        doctorId: 'doctor123',
        appointmentDate: '2023-06-12T00:00:00Z',
        startTime: '10:00',
        endTime: '11:00',
        status: AppointmentStatus.CONFIRMED,
        notes: 'Regular checkup',
        createdAt: '2023-05-10T00:00:00Z',
        updatedAt: '2023-05-10T00:00:00Z',
        appointmentType: AppointmentType.IN_PERSON,
        patientName: 'John Doe',
        doctorName: 'Dr. Smith',
        doctorSpecialty: 'Cardiology',
        reason: 'Annual checkup',
        videoCallUrl: null
      },
      {
        id: 'appt2',
        patientId: 'patient2',
        doctorId: 'doctor123',
        appointmentDate: '2023-06-12T00:00:00Z',
        startTime: '14:00',
        endTime: '15:00',
        status: AppointmentStatus.CONFIRMED,
        notes: 'Follow-up',
        createdAt: '2023-05-11T00:00:00Z',
        updatedAt: '2023-05-11T00:00:00Z',
        appointmentType: AppointmentType.IN_PERSON,
        patientName: 'Jane Doe',
        doctorName: 'Dr. Smith',
        doctorSpecialty: 'Cardiology',
        reason: 'Follow-up visit',
        videoCallUrl: null
      },
      {
        id: 'appt3',
        patientId: 'patient3',
        doctorId: 'doctor456', // Different doctor
        appointmentDate: '2023-06-12T00:00:00Z',
        startTime: '10:00',
        endTime: '11:00',
        status: AppointmentStatus.CONFIRMED,
        notes: 'Consultation',
        createdAt: '2023-05-12T00:00:00Z',
        updatedAt: '2023-05-12T00:00:00Z',
        appointmentType: AppointmentType.VIDEO,
        patientName: 'Sam Johnson',
        doctorName: 'Dr. Jones',
        doctorSpecialty: 'Dermatology',
        reason: 'Skin consultation',
        videoCallUrl: 'https://video.example.com/consultation/appt3'
      }
    ];

    it('should detect direct time conflict', () => {
      expect(hasAppointmentConflict(
        'doctor123',
        '2023-06-12T00:00:00Z',
        '10:00',
        '11:00',
        mockAppointments
      )).toBe(true);
    });

    it('should detect partial overlap conflicts', () => {
      expect(hasAppointmentConflict(
        'doctor123',
        '2023-06-12T00:00:00Z',
        '10:30',
        '11:30',
        mockAppointments
      )).toBe(true);

      expect(hasAppointmentConflict(
        'doctor123',
        '2023-06-12T00:00:00Z',
        '09:30',
        '10:30',
        mockAppointments
      )).toBe(true);
    });

    it('should not detect conflict with different doctor', () => {
      expect(hasAppointmentConflict(
        'doctor456',
        '2023-06-12T00:00:00Z',
        '14:00',
        '15:00',
        mockAppointments
      )).toBe(false);
    });

    it('should not detect conflict on different date', () => {
      expect(hasAppointmentConflict(
        'doctor123',
        '2023-06-13T00:00:00Z', // Different date
        '10:00',
        '11:00',
        mockAppointments
      )).toBe(false);
    });

    it('should not detect conflict when times don\'t overlap', () => {
      expect(hasAppointmentConflict(
        'doctor123',
        '2023-06-12T00:00:00Z',
        '11:30',
        '12:30',
        mockAppointments
      )).toBe(false);
    });
  });

  describe('getAvailableSlotsForDate', () => {
    const mockDoctorProfile: DoctorProfile = {
      userId: 'doctor123',
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
          { startTime: '09:00', endTime: '12:00', isAvailable: true },
          { startTime: '13:00', endTime: '15:00', isAvailable: true }
        ],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      },
      blockedDates: ['2023-06-19T00:00:00Z'], // This is a Monday
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    };

    const mockAppointments: Appointment[] = [
      {
        id: 'appt1',
        patientId: 'patient1',
        doctorId: 'doctor123',
        appointmentDate: '2023-06-12T00:00:00Z', // Monday
        startTime: '10:00',
        endTime: '10:30',
        status: AppointmentStatus.CONFIRMED,
        notes: 'Regular checkup',
        createdAt: '2023-05-10T00:00:00Z',
        updatedAt: '2023-05-10T00:00:00Z',
        appointmentType: AppointmentType.IN_PERSON,
        patientName: 'John Doe',
        doctorName: 'Dr. Smith',
        doctorSpecialty: 'Cardiology',
        reason: 'Regular checkup',
        videoCallUrl: null
      }
    ];

    it('should return all available slots for a date', () => {
      // Monday, June 12, 2023
      const slots = getAvailableSlotsForDate(
        mockDoctorProfile,
        '2023-06-12T00:00:00Z',
        mockAppointments,
        30 // 30-minute slots
      );
      
      // Expected slots:
      // 09:00-09:30, 09:30-10:00, 10:30-11:00, 11:00-11:30, 11:30-12:00, 
      // 13:00-13:30, 13:30-14:00, 14:00-14:30, 14:30-15:00
      // = 9 slots (one 30-min slot blocked by appointment)
      expect(slots.length).toBe(9);
      
      // Check that the conflicting slot is not included
      const hasConflictingSlot = slots.some(slot => 
        slot.startTime === '10:00' && slot.endTime === '10:30'
      );
      expect(hasConflictingSlot).toBe(false);
    });

    it('should return empty array for blocked date', () => {
      // This is in blockedDates array
      const slots = getAvailableSlotsForDate(
        mockDoctorProfile,
        '2023-06-19T00:00:00Z',
        mockAppointments,
        30
      );
      expect(slots).toEqual([]);
    });

    it('should return empty array for day with no schedule', () => {
      // Tuesday, June 13, 2023
      const slots = getAvailableSlotsForDate(
        mockDoctorProfile,
        '2023-06-13T00:00:00Z', // Tuesday
        mockAppointments,
        30
      );
      expect(slots).toEqual([]);
    });

    it('should handle different slot durations', () => {
      // Monday, June 12, 2023
      const slots = getAvailableSlotsForDate(
        mockDoctorProfile,
        '2023-06-12T00:00:00Z',
        mockAppointments,
        60 // 60-minute slots
      );
      
      // Expected slots:
      // 09:00-10:00, 11:00-12:00, 13:00-14:00, 14:00-15:00
      // = 4 slots (one 60-min slot affected by the 30-min appointment)
      expect(slots.length).toBe(4);
    });
  });
}); 