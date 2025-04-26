import { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks();

import * as localDb from '@/lib/localDb';
import * as logger from '@/lib/logger';

// Mock the logger module
jest.mock('@/lib/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe('localDb', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();
  });

  describe('fetchCollectionData (via getUsers, etc.)', () => {
    it('should fetch user data successfully', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', userType: 'PATIENT' },
        { id: '2', email: 'user2@example.com', userType: 'DOCTOR' }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({ data: mockUsers }));
      
      const users = await localDb.getUsers();
      
      expect(users).toEqual(mockUsers);
      expect(fetchMock).toHaveBeenCalledWith('/api/localDb?collection=users');
    });
    
    it('should fetch patient data successfully', async () => {
      const mockPatients = [
        { id: '1', userId: '1', name: 'Patient 1' },
        { id: '2', userId: '2', name: 'Patient 2' }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({ data: mockPatients }));
      
      const patients = await localDb.getPatients();
      
      expect(patients).toEqual(mockPatients);
      expect(fetchMock).toHaveBeenCalledWith('/api/localDb?collection=patients');
    });
    
    it('should fetch doctor data successfully', async () => {
      const mockDoctors = [
        { id: '1', userId: '1', name: 'Doctor 1' },
        { id: '2', userId: '2', name: 'Doctor 2' }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({ data: mockDoctors }));
      
      const doctors = await localDb.getDoctors();
      
      expect(doctors).toEqual(mockDoctors);
      expect(fetchMock).toHaveBeenCalledWith('/api/localDb?collection=doctors');
    });
    
    it('should fetch appointment data successfully', async () => {
      const mockAppointments = [
        { id: '1', patientId: '1', doctorId: '1' },
        { id: '2', patientId: '2', doctorId: '2' }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({ data: mockAppointments }));
      
      const appointments = await localDb.getAppointments();
      
      expect(appointments).toEqual(mockAppointments);
      expect(fetchMock).toHaveBeenCalledWith('/api/localDb?collection=appointments');
    });
    
    it('should fetch notification data successfully', async () => {
      const mockNotifications = [
        { id: '1', userId: '1', message: 'Notification 1' },
        { id: '2', userId: '2', message: 'Notification 2' }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({ data: mockNotifications }));
      
      const notifications = await localDb.getNotifications();
      
      expect(notifications).toEqual(mockNotifications);
      expect(fetchMock).toHaveBeenCalledWith('/api/localDb?collection=notifications');
    });
    
    it('should return empty array when API returns non-OK response', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Not found' }), { status: 404 });
      
      const users = await localDb.getUsers();
      
      expect(users).toEqual([]);
      expect(logger.logError).toHaveBeenCalled();
    });
    
    it('should return empty array when fetch throws an error', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));
      
      const users = await localDb.getUsers();
      
      expect(users).toEqual([]);
      expect(logger.logError).toHaveBeenCalled();
    });
  });
  
  describe('saveCollectionData (via saveUsers, etc.)', () => {
    it('should save user data successfully', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', userType: 'PATIENT' },
        { id: '2', email: 'user2@example.com', userType: 'DOCTOR' }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
      
      const result = await localDb.saveUsers(mockUsers);
      
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith('/api/localDb?collection=users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: mockUsers }),
      });
      expect(logger.logInfo).toHaveBeenCalled();
    });
    
    it('should save patient data successfully', async () => {
      const mockPatients = [
        { id: '1', userId: '1', name: 'Patient 1' },
        { id: '2', userId: '2', name: 'Patient 2' }
      ];
      
      fetchMock.mockResponseOnce(JSON.stringify({ success: true }));
      
      const result = await localDb.savePatients(mockPatients);
      
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith('/api/localDb?collection=patients', expect.any(Object));
    });
    
    it('should return false when API returns non-OK response', async () => {
      const mockDoctors = [{ id: '1', userId: '1', name: 'Doctor 1' }];
      
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server error' }), { status: 500 });
      
      const result = await localDb.saveDoctors(mockDoctors);
      
      expect(result).toBe(false);
      expect(logger.logError).toHaveBeenCalled();
    });
    
    it('should return false when fetch throws an error', async () => {
      const mockAppointments = [{ id: '1', patientId: '1', doctorId: '1' }];
      
      fetchMock.mockRejectOnce(new Error('Network error'));
      
      const result = await localDb.saveAppointments(mockAppointments);
      
      expect(result).toBe(false);
      expect(logger.logError).toHaveBeenCalled();
    });
  });
}); 