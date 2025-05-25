/**
 * Logger utility for Firebase Cloud Functions
 * Adapted from frontend logger to use functions.logger for proper Cloud Functions logging
 */
import * as functions from 'firebase-functions';

// Define log levels for structured logging
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

// Check if we're in the Functions environment
const isLogging = true; // Flag to control logging
let lastLogTime = 0; // Track last log time
let logCounter = 0; // Count logs within time window
const MAX_LOGS_PER_SECOND = 50; // Throttle if more than this per second
const LOG_THROTTLE_RESET_MS = 1000; // Reset counter after this time

// Define type for operation log tracking
type OpLogTracking = {
  lastLogTime: number;
  logInterval: number;
  messageCount: number; // Track number of identical messages
};

// Track frequent operations to avoid over-logging
const frequentOpLogs: Record<string, OpLogTracking> = {
  getMyNotifications: { lastLogTime: 0, logInterval: 60000, messageCount: 0 }, // Log once per minute max
  getAvailableSlots: { lastLogTime: 0, logInterval: 60000, messageCount: 0 },
  getMyDashboardStats: { lastLogTime: 0, logInterval: 60000, messageCount: 0 },
  fetchCollectionData: { lastLogTime: 0, logInterval: 60000, messageCount: 0 },
  'Using memory cached notifications data': { lastLogTime: 0, logInterval: 10000, messageCount: 0 },
  'Using React Query cached notifications data': {
    lastLogTime: 0,
    logInterval: 10000,
    messageCount: 0,
  },
  'Fetching fresh notifications data': { lastLogTime: 0, logInterval: 10000, messageCount: 0 },
};

// Track recent log messages to avoid repetition
const recentLogMessages = new Map<string, { count: number; lastTime: number }>();
const RECENT_MESSAGE_TTL = 5000; // 5 seconds retention for duplicate detection

// List of operations to be logged less frequently
const frequentOperations = Object.keys(frequentOpLogs);

/**
 * Base logging function that handles structured logging for Cloud Functions
 * @param level - The log level (info, warn, error, debug)
 * @param message - The log message
 * @param data - Optional data to include with the log
 */
const log = (level: LogLevel, message: string, data?: unknown): void => {
  // Check if logging should be throttled
  const now = Date.now();

  // Reset counter if enough time has passed since last reset
  if (now - lastLogTime > LOG_THROTTLE_RESET_MS) {
    logCounter = 0;
    lastLogTime = now;
  }

  // Check for duplicate recent messages (identical message + level)
  const msgKey = `${level}-${message}`;
  const recentMsg = recentLogMessages.get(msgKey);

  if (recentMsg) {
    // We've seen this exact message recently
    recentMsg.count++;

    // Only log every 5th occurrence or after 5 seconds
    if (recentMsg.count < 5 && now - recentMsg.lastTime < 5000) {
      return; // Skip this log
    }

    // Update the timestamp but allow this one through
    recentMsg.lastTime = now;
  } else {
    // New message, add to tracking
    recentLogMessages.set(msgKey, { count: 1, lastTime: now });

    // Clean up old entries every 20 logs
    if (recentLogMessages.size > 20) {
      // Use Array.from to convert Map entries to array for iteration compatibility
      Array.from(recentLogMessages.entries()).forEach(([key, value]) => {
        if (now - value.lastTime > RECENT_MESSAGE_TTL) {
          recentLogMessages.delete(key);
        }
      });
    }
  }

  // Increment counter
  logCounter++;

  // Skip log if we're hitting the rate limit
  if (logCounter > MAX_LOGS_PER_SECOND) {
    // Only log warnings about throttling once per throttle period
    if (logCounter === MAX_LOGS_PER_SECOND + 1) {
      functions.logger.warn(`Logger throttled: too many logs (>${MAX_LOGS_PER_SECOND} per second)`);
    }
    return;
  }

  // Skip logging if disabled
  if (!isLogging) return;

  // Check for exact message matches in frequent operations
  if (frequentOperations.includes(message)) {
    const tracker = frequentOpLogs[message];

    // Skip if we've logged this operation recently
    if (now - tracker.lastLogTime < tracker.logInterval) {
      tracker.messageCount++;
      return;
    }

    // Update last log time for this operation
    tracker.lastLogTime = now;

    // If we've skipped many messages, add a count
    const skippedCount = tracker.messageCount;
    tracker.messageCount = 0;

    if (skippedCount > 0) {
      message = `${message} (${skippedCount} similar messages suppressed)`;
    }
  } else {
    // Check for operations contained within the message
    for (const op of frequentOperations) {
      if (typeof message === 'string' && message.includes(op)) {
        // Skip if we've logged this operation recently
        if (now - frequentOpLogs[op].lastLogTime < frequentOpLogs[op].logInterval) {
          frequentOpLogs[op].messageCount++;
          return;
        }

        // Update last log time for this operation
        frequentOpLogs[op].lastLogTime = now;

        // If we've skipped many messages, add a count
        const skippedCount = frequentOpLogs[op].messageCount;
        frequentOpLogs[op].messageCount = 0;

        if (skippedCount > 0) {
          message = `${message} (${skippedCount} similar messages suppressed)`;
        }

        break;
      }
    }
  }

  // Create structured data for Functions logger
  const structuredData = data
    ? typeof data === 'object'
      ? (data as Record<string, unknown>)
      : { value: data }
    : undefined;

  // Output using functions.logger based on level
  switch (level) {
    case LogLevel.INFO:
      functions.logger.info(message, structuredData);
      break;
    case LogLevel.WARN:
      functions.logger.warn(message, structuredData);
      break;
    case LogLevel.ERROR:
      functions.logger.error(message, structuredData);
      break;
    case LogLevel.DEBUG:
      functions.logger.debug(message, structuredData);
      break;
    default:
      functions.logger.info(message, structuredData);
  }
};

/**
 * Log informational message in Cloud Functions environment
 * @param message - The message to log
 * @param data - Optional structured data to include
 */
export const logInfo = (message: string, data?: unknown): void => {
  log(LogLevel.INFO, message, data);
};

/**
 * Log warning message in Cloud Functions environment
 * @param message - The message to log
 * @param data - Optional structured data to include
 */
export const logWarn = (message: string, data?: unknown): void => {
  log(LogLevel.WARN, message, data);
};

/**
 * Log error message in Cloud Functions environment
 * @param message - The message to log
 * @param data - Optional structured data to include
 */
export const logError = (message: string, data?: unknown): void => {
  log(LogLevel.ERROR, message, data);
};

/**
 * Log debug message in Cloud Functions environment
 * Debug logs are always allowed through - verbosity controlled by Functions log level settings
 * @param message - The message to log
 * @param data - Optional structured data to include
 */
export const logDebug = (message: string, data?: unknown): void => {
  log(LogLevel.DEBUG, message, data);
};

/**
 * Log validation results for Firebase Functions
 * @param taskId - Identifier for the validation task
 * @param status - Success or failure status
 * @param message - Optional additional message
 */
export const logValidation = (
  taskId: string,
  status: 'success' | 'failure',
  message?: string
): void => {
  const validationData = {
    taskId,
    status,
    timestamp: new Date().toISOString(),
    message: message || `Task ${taskId} completed with status: ${status}`,
  };

  if (status === 'success') {
    functions.logger.info(`✅ Validation ${taskId} succeeded`, validationData);
  } else {
    functions.logger.error(`❌ Validation ${taskId} failed`, validationData);
  }
};

/**
 * Reset logger state for testing purposes
 * Used in Cloud Functions testing environment
 */
export const resetLoggerStateForTesting = (): void => {
  logCounter = 0;
  lastLogTime = 0;
  recentLogMessages.clear();
  
  // Reset frequent operation trackers
  Object.keys(frequentOpLogs).forEach(key => {
    frequentOpLogs[key].lastLogTime = 0;
    frequentOpLogs[key].messageCount = 0;
  });
}; 