'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { logInfo } from '@/lib/logger';
import type { LogEventPayload, ValidationEventPayload } from '@/lib/eventBus';
import { appEventBus } from '@/lib/eventBus';
import { API_MODE, IS_MOCK_MODE } from '@/config/appConfig';
import { logValidation, ValidationStep } from '@/lib/validation';

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
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([]);
  const [logs, setLogs] = useState<LogEventPayload[]>([]);
  
  // Subscribe to validation and log events
  useEffect(() => {
    // Handler for validation events
    const handleValidation = (payload: ValidationEventPayload) => {
      setValidationSteps(prev => [...prev, payload as ValidationStep]);
    };
    
    // Handler for log events
    const handleLog = (payload: LogEventPayload) => {
      setLogs(prev => [payload, ...prev].slice(0, 100)); // Limit to last 100 logs
    };
    
    // Subscribe to events
    appEventBus.on('validation_event', handleValidation);
    appEventBus.on('log_event', handleLog);
    
    // Log initial state
    logInfo('CMS Validation page mounted');
    
    // Sample validation step for testing
    logValidation('CMS.1', 'success', 'CMS Dashboard loaded successfully');
    
    // Cleanup subscriptions on unmount
    return () => {
      appEventBus.off('validation_event', handleValidation);
      appEventBus.off('log_event', handleLog);
    };
  }, []);
  
  // Clear logs handler
  const handleClearLogs = () => {
    setLogs([]);
  };
  
  // Admin menu items
  const menuItems = [
    { label: 'User Management', href: '/cms/users', description: 'Manage patients, doctors and admin users' },
    { label: 'Content Management', href: '/cms/content', description: 'Manage site content and announcements' },
    { label: 'Doctor Verification', href: '/cms/doctor-verification', description: 'Review and verify doctor applications' },
    { label: 'Data Validation', href: '/cms-validation', description: 'Validate system data integrity' },
    { label: 'Task Management', href: '/cms/todo', description: 'Manage tasks and to-do lists' },,
    { label: "Advanced Task Management", href: "/cms/advanced-todo", description: "Enhanced task management with priorities, categories, and due dates" }
  ];
  
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">CMS Portal</h1>
        <div className="flex gap-4">
          <p>Mode: {IS_MOCK_MODE ? 'Mock' : 'Live'}</p>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded">
            Launch App
          </Link>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Validation Steps</h2>
          <div className="border p-4 rounded bg-gray-50 min-h-[200px]">
            {validationSteps.length === 0 ? (
              <p>No validation steps recorded</p>
            ) : (
              <ul>
                {validationSteps.map((step, index) => (
                  <li key={index} className="mb-2 p-2 border rounded">
                    <div>Task {step.taskId}: {step.status}</div>
                    {step.message && <div>{step.message}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Logs</h2>
            <button 
              onClick={handleClearLogs}
              className="px-3 py-1 bg-gray-200 rounded text-sm"
            >
              Clear
            </button>
          </div>
          <div className="border p-4 rounded bg-gray-50 min-h-[200px]">
            {logs.length === 0 ? (
              <p>No logs recorded</p>
            ) : (
              <ul>
                {logs.map((log, index) => (
                  <li key={index} className="mb-2 p-2 border rounded text-sm">
                    <div className="flex justify-between">
                      <span>{log.level}</span>
                      <span>{log.message}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      {/* CMS Navigation Section */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-3">Admin Tools</h2>
          <div className="grid grid-cols-1 gap-4">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="p-4 border rounded hover:bg-gray-50 flex flex-col"
              >
                <span className="font-medium text-lg">{item.label}</span>
                <span className="text-sm text-gray-500">{item.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 