/**
 * Error Debugger Utility
 * 
 * This utility provides debugging tools for the error handling system
 * without interfering with the normal error flow or causing circular references.
 */

interface ErrorDebugInfo {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  source: 'console' | 'window' | 'unhandledRejection' | 'manual';
  context?: Record<string, unknown>;
}

class ErrorDebugger {
  private static instance: ErrorDebugger;
  private errors: ErrorDebugInfo[] = [];
  private maxErrors = 50; // Keep last 50 errors
  private isEnabled = false;

  private constructor() {
    // Enable in development mode
    this.isEnabled = typeof window !== 'undefined' && 
                    (window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1');
  }

  static getInstance(): ErrorDebugger {
    if (!ErrorDebugger.instance) {
      ErrorDebugger.instance = new ErrorDebugger();
    }
    return ErrorDebugger.instance;
  }

  /**
   * Log an error for debugging purposes
   */
  logError(
    error: Error | string, 
    source: ErrorDebugInfo['source'] = 'manual',
    context?: Record<string, unknown>
  ): void {
    if (!this.isEnabled) return;

    const errorInfo: ErrorDebugInfo = {
      id: `debug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      source,
      context
    };

    this.errors.unshift(errorInfo);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console with a special prefix for easy filtering
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[ERROR_DEBUG] ${source}:`, errorInfo);
    }
  }

  /**
   * Get all logged errors
   */
  getErrors(): ErrorDebugInfo[] {
    return [...this.errors];
  }

  /**
   * Get errors by source
   */
  getErrorsBySource(source: ErrorDebugInfo['source']): ErrorDebugInfo[] {
    return this.errors.filter(error => error.source === source);
  }

  /**
   * Get recent errors (last N minutes)
   */
  getRecentErrors(minutes: number = 5): ErrorDebugInfo[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.errors.filter(error => error.timestamp > cutoff);
  }

  /**
   * Clear all logged errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  getStats(): {
    total: number;
    bySource: Record<string, number>;
    recent: number;
    oldestTimestamp?: number;
    newestTimestamp?: number;
  } {
    const bySource: Record<string, number> = {};
    let oldestTimestamp: number | undefined;
    let newestTimestamp: number | undefined;

    for (const error of this.errors) {
      bySource[error.source] = (bySource[error.source] || 0) + 1;
      
      if (!oldestTimestamp || error.timestamp < oldestTimestamp) {
        oldestTimestamp = error.timestamp;
      }
      
      if (!newestTimestamp || error.timestamp > newestTimestamp) {
        newestTimestamp = error.timestamp;
      }
    }

    return {
      total: this.errors.length,
      bySource,
      recent: this.getRecentErrors(5).length,
      oldestTimestamp,
      newestTimestamp
    };
  }

  /**
   * Export errors as JSON for analysis
   */
  exportErrors(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      errors: this.errors
    }, null, 2);
  }

  /**
   * Enable or disable the debugger
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if debugger is enabled
   */
  isDebuggerEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const errorDebugger = ErrorDebugger.getInstance();

// Export utility functions
export function debugError(
  error: Error | string, 
  source: ErrorDebugInfo['source'] = 'manual',
  context?: Record<string, unknown>
): void {
  errorDebugger.logError(error, source, context);
}

export function getErrorStats() {
  return errorDebugger.getStats();
}

export function exportErrorLog(): string {
  return errorDebugger.exportErrors();
}

// Make debugger available globally in development
if (typeof window !== 'undefined' && errorDebugger.isDebuggerEnabled()) {
  (window as any).__errorDebugger = errorDebugger;
  
  // Add console commands for easy debugging
  (window as any).__debugErrors = () => {
    console.log('Error Debugger Stats:', errorDebugger.getStats());
    console.log('Recent Errors:', errorDebugger.getRecentErrors());
  };
  
  (window as any).__exportErrors = () => {
    const exported = errorDebugger.exportErrors();
    console.log('Exported Error Log:', exported);
    return exported;
  };
  
  (window as any).__clearErrorLog = () => {
    errorDebugger.clearErrors();
    console.log('Error log cleared');
  };
}

export default errorDebugger; 