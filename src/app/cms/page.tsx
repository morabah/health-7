'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { logInfo, logDebug } from '@/lib/logger';
import { appEventBus, LogEventPayload, ValidationEventPayload } from '@/lib/eventBus';
import { API_MODE, IS_MOCK_MODE } from '@/config/appConfig';

/**
 * CMS Landing Page
 * Root page for the content management system
 * Serves as an entry point for various CMS functionalities
 * Also includes validation and logging for development
 * 
 * @returns CMS Portal dashboard component with validation and logging sections
 */
export default function CMSPage() {
  // State for tracking validation steps and logs
  const [validationSteps, setValidationSteps] = useState<ValidationEventPayload[]>([]);
  const [logs, setLogs] = useState<LogEventPayload[]>([]);
  
  // Subscribe to validation and log events
  useEffect(() => {
    // Handler for validation events
    const handleValidation = (payload: ValidationEventPayload) => {
      setValidationSteps(prev => [payload, ...prev]);
      logDebug('Validation event received', payload);
    };
    
    // Handler for log events
    const handleLog = (payload: LogEventPayload) => {
      setLogs(prev => [payload, ...prev].slice(0, 100)); // Limit to last 100 logs
      logDebug('Log event captured in CMS', { level: payload.level });
    };
    
    // Subscribe to events
    appEventBus.on('validation_event', handleValidation);
    appEventBus.on('log_event', handleLog);
    
    // Log initial state
    logInfo('CMS Validation page mounted', { mode: API_MODE });
    
    // Cleanup subscriptions on unmount
    return () => {
      appEventBus.off('validation_event', handleValidation);
      appEventBus.off('log_event', handleLog);
    };
  }, []);
  
  // Clear logs handler
  const handleClearLogs = () => {
    setLogs([]);
    logInfo('Logs cleared from CMS');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">CMS Portal</h1>
          <Link href="/" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">
            Back to Site
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-4">
          <p className="text-gray-600">
            Mode: <span className="font-semibold">{IS_MOCK_MODE ? 'Mock (Hardcoded)' : 'Local File DB'}</span>
          </p>
          <Link 
            href="/"
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>
      
      {/* Main Content with Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Validation Steps */}
        <div className="lg:col-span-1">
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Validation Steps</h2>
            {validationSteps.length === 0 ? (
              <p className="text-gray-500">No validation steps recorded yet</p>
            ) : (
              <div className="space-y-3">
                {validationSteps.map((step, index) => (
                  <div 
                    key={`${step.taskId}-${index}`}
                    className={`p-3 rounded-md border ${
                      step.status === 'success' ? 'border-health-success bg-green-50' : 'border-health-danger bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">Task {step.taskId}</span>
                      <span className={
                        step.status === 'success' ? 'text-health-success' : 'text-health-danger'
                      }>
                        {step.status.toUpperCase()}
                      </span>
                    </div>
                    {step.message && <p className="text-sm mt-1">{step.message}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(step.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Logs */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Logs</h2>
              <button 
                onClick={handleClearLogs}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm"
              >
                Clear Logs
              </button>
            </div>
            
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {logs.map((log, index) => (
                  <div 
                    key={`log-${index}-${log.timestamp}`}
                    className={`p-2 rounded border text-sm font-mono ${getLogStyles(log.level)}`}
                  >
                    <div className="flex gap-2 items-start">
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs uppercase font-semibold whitespace-nowrap">
                        {log.level}
                      </span>
                      <span className="flex-grow">{log.message}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.data && (
                      <pre className="mt-1 text-xs overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* CMS Navigation Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-3">User Management</h2>
          <p className="text-gray-600 mb-4">
            Manage patients, doctors, and administrators
          </p>
          <div className="mt-auto">
            <Link 
              href="/cms/users" 
              className="btn-primary"
            >
              Manage Users
            </Link>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-xl font-semibold mb-3">Content Management</h2>
          <p className="text-gray-600 mb-4">
            Edit site content, announcements, and resources
          </p>
          <div className="mt-auto">
            <Link 
              href="/cms/content" 
              className="btn-primary"
            >
              Manage Content
            </Link>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-xl font-semibold mb-3">Doctor Verification</h2>
          <p className="text-gray-600 mb-4">
            Review and verify healthcare provider credentials
          </p>
          <div className="mt-auto">
            <Link 
              href="/cms/doctor-verification" 
              className="btn-primary"
            >
              Verification Queue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to get Tailwind CSS classes based on log level
 */
function getLogStyles(level: string): string {
  switch (level) {
    case 'error':
      return 'border-health-danger bg-red-50';
    case 'warn':
      return 'border-health-warning bg-amber-50';
    case 'info':
      return 'border-health-info bg-blue-50';
    case 'debug':
      return 'border-gray-300 bg-gray-50';
    default:
      return 'border-gray-300 bg-gray-50';
  }
} 