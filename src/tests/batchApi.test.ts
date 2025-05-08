/**
 * Batch API Operations Tests
 * 
 * Tests the batch API functionality to ensure it correctly processes
 * multiple operations in a single request.
 */

import { executeBatchOperations, createBatchOperation } from '@/lib/batchApiUtils';
import { UserType } from '@/types/enums';

// Mock dependencies
jest.mock('@/lib/apiClient', () => ({
  callApi: jest.fn().mockImplementation((method, context, payload) => {
    // Mock implementation of batch endpoint
    if (method === 'executeBatchOperations') {
      const operations = payload.operations || [];
      const results: Record<string, any> = {};
      
      // Process each operation
      operations.forEach((op: any) => {
        switch (op.method) {
          case 'getMyUserProfile':
            results[op.key] = { 
              success: true, 
              user: { id: 'user123', firstName: 'Test', lastName: 'User' } 
            };
            break;
          case 'getMyNotifications':
            results[op.key] = { 
              success: true, 
              notifications: [
                { id: 'notif1', title: 'Test Notification', isRead: false }
              ] 
            };
            break;
          case 'getMyAppointments':
            results[op.key] = { 
              success: true, 
              appointments: [
                { id: 'appt1', doctorId: 'doc1', status: 'confirmed' }
              ] 
            };
            break;
          default:
            results[op.key] = { success: false, error: 'Method not implemented in test' };
        }
      });
      
      return Promise.resolve({ success: true, results });
    }
    
    return Promise.resolve({ success: false, error: 'Method not implemented in test' });
  })
}));

jest.mock('@/lib/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

jest.mock('@/lib/performance', () => ({
  trackPerformance: jest.fn().mockReturnValue({
    mark: jest.fn(),
    stop: jest.fn()
  })
}));

describe('Batch API Operations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('executeBatchOperations should process multiple operations', async () => {
    // Create operations for batch request
    const operations = [
      createBatchOperation('getMyUserProfile', {}, 'userProfile'),
      createBatchOperation('getMyNotifications', { limit: 5 }, 'notifications'),
      createBatchOperation('getMyAppointments', { status: 'upcoming' }, 'appointments')
    ];
    
    // Execute batch request
    const result = await executeBatchOperations(operations, { 
      uid: 'user123', 
      role: UserType.PATIENT 
    });
    
    // Verify results
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('userProfile.success', true);
    expect(result).toHaveProperty('notifications.success', true);
    expect(result).toHaveProperty('appointments.success', true);
  });
  
  test('createBatchOperation should correctly format operations', () => {
    // Test with explicit key
    const op1 = createBatchOperation('testMethod', { param: 'value' }, 'customKey');
    expect(op1).toEqual({
      method: 'testMethod',
      payload: { param: 'value' },
      key: 'customKey'
    });
    
    // Test with default key
    const op2 = createBatchOperation('anotherMethod', { id: 123 });
    expect(op2).toEqual({
      method: 'anotherMethod',
      payload: { id: 123 },
      key: 'anotherMethod'
    });
  });
  
  test('executeBatchOperations should handle errors', async () => {
    // Mock api client to throw an error
    require('@/lib/apiClient').callApi.mockImplementationOnce(() => {
      throw new Error('Test API error');
    });
    
    // Create operations
    const operations = [
      createBatchOperation('getMyUserProfile', {}, 'userProfile')
    ];
    
    // Execute batch request and expect it to throw
    await expect(executeBatchOperations(operations, { 
      uid: 'user123', 
      role: UserType.PATIENT 
    })).rejects.toThrow('Test API error');
  });
  
  test('executeBatchOperations should deduplicate operations', async () => {
    // Create operations with duplicates
    const operations = [
      createBatchOperation('getMyUserProfile', {}, 'profile1'),
      createBatchOperation('getMyUserProfile', {}, 'profile2') // Same operation with different key
    ];
    
    // Mock the apiClient implementation for this test
    const apiClientMock = require('@/lib/apiClient').callApi;
    
    // Execute batch request
    await executeBatchOperations(operations, { uid: 'user123', role: UserType.PATIENT });
    
    // Verify only one call was made with deduplicated operations
    const callArgs = apiClientMock.mock.calls[0][2];
    
    // The original array had 2 operations, but only 1 unique operation should be sent
    expect(callArgs.operations.length).toBeLessThan(operations.length);
  });
}); 