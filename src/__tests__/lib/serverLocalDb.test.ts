import path from 'path';
import * as serverLocalDb from '@/lib/serverLocalDb';
import { UserType } from '@/types/enums';

// Mock fs module
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockImplementation((path) => {
    if (path.includes('users.json')) {
      return Promise.resolve(JSON.stringify([
        {
          id: '1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          userType: UserType.PATIENT,
          isActive: true,
          emailVerified: true,
          phoneVerified: false,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        }
      ]));
    }
    return Promise.reject(new Error('Not found'));
  }),
}));

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('serverLocalDb', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('read operations', () => {
    it('should read users successfully', async () => {
      const users = await serverLocalDb.getUsers();
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('user1@example.com');
      expect(require('fs/promises').readFile).toHaveBeenCalledWith(
        expect.stringContaining('users.json'),
        'utf-8'
      );
    });
    
    it('should return empty array for non-existent files', async () => {
      // Mock file not found error
      require('fs/promises').readFile.mockImplementationOnce(() => {
        const error = new Error('ENOENT');
        // Add code property to Error
        Object.defineProperty(error, 'code', { value: 'ENOENT' });
        return Promise.reject(error);
      });
      
      const appointments = await serverLocalDb.getAppointments();
      expect(appointments).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
    });
    
    it('should throw on other errors', async () => {
      // Mock permission error
      require('fs/promises').readFile.mockImplementationOnce(() => {
        return Promise.reject(new Error('Permission denied'));
      });
      
      await expect(serverLocalDb.getDoctors()).rejects.toThrow('Permission denied');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('write operations', () => {
    it('should save users successfully', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          userType: UserType.PATIENT,
          isActive: true,
          emailVerified: true,
          phoneVerified: false,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        }
      ];
      
      await serverLocalDb.saveUsers(mockUsers);
      
      expect(require('fs/promises').mkdir).toHaveBeenCalled();
      expect(require('fs/promises').writeFile).toHaveBeenCalledWith(
        expect.stringContaining('users.json'),
        expect.any(String),
        'utf-8'
      );
      expect(console.log).toHaveBeenCalled();
    });
    
    it('should propagate errors from mkdir', async () => {
      // Mock mkdir error
      require('fs/promises').mkdir.mockImplementationOnce(() => {
        return Promise.reject(new Error('Permission denied'));
      });
      
      await expect(serverLocalDb.saveUsers([])).rejects.toThrow('Permission denied');
      expect(console.error).toHaveBeenCalled();
    });
  });
}); 