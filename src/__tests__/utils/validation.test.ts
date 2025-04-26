import { logValidation } from '@/lib/logger';
import { appEventBus } from '@/lib/eventBus';

// Mock the console functions and event bus
const originalConsoleInfo = console.info;
const originalConsoleError = console.error;
const mockEmit = jest.fn();

// Setup mocks before each test
beforeEach(() => {
  console.info = jest.fn();
  console.error = jest.fn();
  appEventBus.emit = mockEmit;
});

// Restore original functions after each test
afterEach(() => {
  console.info = originalConsoleInfo;
  console.error = originalConsoleError;
  jest.clearAllMocks();
});

describe('logger', () => {
  describe('logValidation', () => {
    it('should log success validation to console and emit event', () => {
      // Act
      logValidation('1.1', 'success', 'Validation completed successfully');
      
      // Assert console output - match the actual format from logger.ts
      expect(console.info).toHaveBeenCalledWith(
        '[INFO] Validation for task 1.1: success - Validation completed successfully',
        ''
      );
      
      // Assert event emission
      expect(mockEmit).toHaveBeenCalledWith('validation_event', expect.objectContaining({
        taskId: '1.1',
        status: 'success',
        message: 'Validation completed successfully'
      }));
    });

    it('should log failure validation to console and emit event', () => {
      // Act
      logValidation('1.2', 'failure', 'Validation failed');
      
      // Assert console output - match the actual format from logger.ts
      expect(console.error).toHaveBeenCalledWith(
        '[ERROR] Validation for task 1.2: failure - Validation failed',
        ''
      );
      
      // Assert event emission
      expect(mockEmit).toHaveBeenCalledWith('validation_event', expect.objectContaining({
        taskId: '1.2',
        status: 'failure',
        message: 'Validation failed'
      }));
    });

    it('should work without an optional message', () => {
      // Act
      logValidation('1.3', 'success');
      
      // Assert console output - match the actual format from logger.ts
      expect(console.info).toHaveBeenCalledWith(
        '[INFO] Validation for task 1.3: success',
        ''
      );
      
      // Assert event emission
      expect(mockEmit).toHaveBeenCalledWith('validation_event', expect.objectContaining({
        taskId: '1.3',
        status: 'success',
        message: undefined
      }));
    });
  });
}); 