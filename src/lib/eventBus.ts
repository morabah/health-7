import type { Emitter } from 'mitt';
import mitt from 'mitt';

/**
 * Log level enum for typed log events
 */
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug',
}

/**
 * Log event payload structure
 */
export interface LogEventPayload {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Validation event payload structure
 */
export interface ValidationEventPayload {
  taskId: string;
  status: 'success' | 'failure';
  message?: string;
  timestamp: number;
}

/**
 * Application event types mapping
 */
export type AppEvents = {
  log_event: LogEventPayload;
  validation_event: ValidationEventPayload;
  // Additional events can be defined here as needed
};

/**
 * Application-wide event bus instance
 * Used for communication between components/services
 */
export const appEventBus: Emitter<AppEvents> = mitt<AppEvents>();
