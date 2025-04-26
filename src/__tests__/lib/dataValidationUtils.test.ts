import { z } from 'zod';
import { 
  validateCollectionData, 
  getSchemaForCollection, 
  type DocumentValidationResult 
} from '@/lib/dataValidationUtils';
import * as logger from '@/lib/logger';
import * as localDb from '@/lib/localDb';

// Mock the logger and localDb modules
jest.mock('@/lib/logger', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn()
}));

jest.mock('@/lib/localDb', () => ({
  getUsers: jest.fn(),
  getPatients: jest.fn(),
  getDoctors: jest.fn(),
  getAppointments: jest.fn(),
  getNotifications: jest.fn()
}));

describe('dataValidationUtils', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSchemaForCollection', () => {
    it('should return appropriate schema for each collection', () => {
      expect(getSchemaForCollection('users')).toBeDefined();
      expect(getSchemaForCollection('patients')).toBeDefined();
      expect(getSchemaForCollection('doctors')).toBeDefined();
      expect(getSchemaForCollection('appointments')).toBeDefined();
      expect(getSchemaForCollection('notifications')).toBeDefined();
    });

    it('should return undefined for unknown collections', () => {
      expect(getSchemaForCollection('unknown')).toBeUndefined();
    });
  });

  describe('validateCollectionData', () => {
    // Create a simple test schema for validation
    const TestSchema = z.object({
      name: z.string(),
      age: z.number().min(18)
    });

    it('should validate valid documents correctly', async () => {
      // Mock valid data return
      const mockData = [
        { id: '1', name: 'John', age: 30 },
        { id: '2', name: 'Jane', age: 25 }
      ];
      
      // Implement mock for getUsers
      (localDb.getUsers as jest.Mock).mockResolvedValue(mockData);

      const results = await validateCollectionData('users', TestSchema);

      // Expect 2 valid results
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('valid');
      expect(results[1].status).toBe('valid');
      
      // Verify logger was called correctly
      expect(logger.logInfo).toHaveBeenCalledWith('Starting validation for collection: users');
      expect(logger.logInfo).toHaveBeenCalledWith('Fetched 2 documents from users');
      expect(logger.logInfo).toHaveBeenCalledWith('Validation finished for collection: users');
    });

    it('should identify invalid documents', async () => {
      // Mock data with one invalid document (age below minimum)
      const mockData = [
        { id: '1', name: 'John', age: 30 },
        { id: '2', name: 'Minor', age: 16 }  // Invalid age
      ];
      
      (localDb.getUsers as jest.Mock).mockResolvedValue(mockData);

      const results = await validateCollectionData('users', TestSchema);

      // Expect mixed results
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('valid');
      expect(results[1].status).toBe('invalid');
      expect(results[1].errors).toBeDefined();
      expect(results[1].errors?.length).toBeGreaterThan(0);
      expect(results[1].errors?.[0].field).toBe('age');
      
      // Verify warning was logged for invalid document
      expect(logger.logWarn).toHaveBeenCalled();
    });

    it('should handle missing or incorrect data types', async () => {
      // Mock null return (no data found)
      (localDb.getUsers as jest.Mock).mockResolvedValue(null);

      const results = await validateCollectionData('users', TestSchema);

      // Expect error result
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('error');
      expect(results[0].fetchError).toBeDefined();
    });

    it('should handle exceptions during data fetching', async () => {
      // Mock exception during data fetch
      (localDb.getUsers as jest.Mock).mockRejectedValue(new Error('Database connection error'));

      const results = await validateCollectionData('users', TestSchema);

      // Expect error result
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('error');
      expect(results[0].fetchError).toBe('Database connection error');
      
      // Verify error was logged
      expect(logger.logError).toHaveBeenCalled();
    });
  });
}); 