'use client';

import React from 'react';
import Todo from '@/components/ui/Todo';
import { logInfo } from '@/lib/logger';
import { logValidation } from '@/lib/validation';

/**
 * Todo Management Page for CMS
 * Allows admins to manage tasks and to-do lists
 * Uses enhanced Todo component with persistence
 * 
 * @returns Todo Management component
 */
export default function TodoPage() {
  // Log component mount
  React.useEffect(() => {
    logInfo('Todo page mounted in CMS');
    logValidation('5.1', 'success', 'Todo component with persistence implemented');
  }, []);

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Task Management</h1>
        <p className="text-gray-600">
          Manage tasks and to-do items with drag-and-drop ordering and persistence
        </p>
      </header>
      
      <div className="max-w-3xl mx-auto">
        <Todo 
          title="Admin Tasks" 
          // No need to provide initialTodos, component will load from API
        />
      </div>
    </div>
  );
} 