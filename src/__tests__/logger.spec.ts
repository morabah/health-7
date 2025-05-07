import { logInfo, resetLoggerStateForTesting } from '@/lib/logger';
import { appEventBus, LogLevel } from '@/lib/eventBus';
import type { LogEventPayload } from '@/lib/eventBus';

describe('Logger', () => {
  // Save original console methods
  const originalConsoleInfo = console.info;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleDebug = console.debug;

  // Create a mock for the appEventBus.emit method
  const mockEmit = jest.fn();
  const originalEmit = appEventBus.emit;

  beforeEach(() => {
    // Mock console methods before each test
    console.info = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();

    // Mock the emit method
    appEventBus.emit = mockEmit;

    // Reset logger internal state
    resetLoggerStateForTesting();
  });

  afterEach(() => {
    // Restore original methods after each test
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;

    // Restore original emit method
    appEventBus.emit = originalEmit;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('logInfo', () => {
    it('should write info messages to console', () => {
      // Arrange
      const message = 'Test info message';
      const data = { key: 'value' };

      // Act
      logInfo(message, data);

      // Assert
      expect(console.info).toHaveBeenCalledWith('[INFO] Test info message', data);
    });

    it('should emit a log_event with the correct payload', () => {
      // Arrange
      const message = 'Test info message';
      const data = { key: 'value' };

      // Mock Date.now to return a consistent timestamp for testing
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      // Act
      logInfo(message, data);

      // Assert
      expect(mockEmit).toHaveBeenCalledWith('log_event', {
        level: LogLevel.INFO,
        message,
        data,
        timestamp: mockTimestamp,
      } as LogEventPayload);

      // Restore Date.now
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should handle undefined data parameter', () => {
      // Arrange
      const message = 'Test info message without data';

      // Act
      logInfo(message);

      // Assert
      expect(console.info).toHaveBeenCalledWith('[INFO] Test info message without data', '');
    });
  });
});
