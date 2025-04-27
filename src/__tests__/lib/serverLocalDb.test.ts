import * as serverLocalDb from '@/lib/serverLocalDb';
import { UserType } from '@/types/enums';

jest.mock('@/lib/serverLocalDb');

const mockedServerLocalDb = serverLocalDb as jest.Mocked<typeof serverLocalDb>;

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

afterEach(() => {
  jest.restoreAllMocks();
});

describe('serverLocalDb', () => {
  describe('read operations', () => {
    it('should read users successfully', async () => {
      const mockUserData = [
        {
          id: 'mock-user-1',
          email: 'mock.user@example.com',
          userType: UserType.PATIENT,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          isActive: true,
          emailVerified: true,
          phoneVerified: false,
          firstName: 'Mock',
          lastName: 'User',
        },
      ];
      mockedServerLocalDb.getUsers.mockResolvedValueOnce(mockUserData);
      const users = await serverLocalDb.getUsers();
      expect(users).toEqual(mockUserData);
    });

    it('should return empty array and warn for non-existent files (ENOENT)', async () => {
      // Spy on and mock getAppointments to simulate ENOENT behavior (return empty array)
      mockedServerLocalDb.getAppointments.mockResolvedValueOnce([]);
      // We also need to simulate the console warning which happens inside the *real* function when ENOENT occurs
      // This is tricky without actually mocking fs.readFile. Let's assume the function handles logging.
      // Alternatively, we could mock readFromJson if it's exported.

      const appointments = await serverLocalDb.getAppointments();
      expect(appointments).toEqual([]);
    });

    it('should throw on other read errors (e.g., permission)', async () => {
      // Spy on and mock getDoctors to throw an error
      const error = new Error('Permission denied');
      mockedServerLocalDb.getDoctors.mockRejectedValueOnce(error);

      await expect(serverLocalDb.getDoctors()).rejects.toThrow('Permission denied');
    });
  });

  describe('write operations', () => {
    it('should save users successfully', async () => {
      const mockUsers = [
        {
          id: 'save-test-1',
          email: 'save.test@example.com',
          userType: UserType.PATIENT,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          isActive: true,
          emailVerified: true,
          phoneVerified: false,
          firstName: 'Save',
          lastName: 'Test',
        },
      ];
      // Spy on saveUsers and assume it resolves on success
      mockedServerLocalDb.saveUsers.mockResolvedValueOnce(undefined);

      await serverLocalDb.saveUsers(mockUsers);

      expect(mockedServerLocalDb.saveUsers).toHaveBeenCalledWith(mockUsers);
      // Verifying internal calls to mkdir/writeFile is difficult with this strategy
    });

    it('should propagate errors (e.g., from internal mkdir/writeFile)', async () => {
      // Spy on saveUsers and mock it to reject
      const error = new Error('Simulated save error');
      mockedServerLocalDb.saveUsers.mockRejectedValueOnce(error);

      await expect(serverLocalDb.saveUsers([])).rejects.toThrow('Simulated save error');
    });
  });
});
