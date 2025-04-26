'use client';

import React from 'react';
import Todo from '@/components/ui/Todo';
import { logInfo } from '@/lib/logger';

/**
 * Todo Management Page for CMS
 * Allows admins to manage tasks and to-do lists
 * 
 * @returns Todo Management component
 */
export default function TodoPage() {
  // Initial sample todos
  const initialTodos = [
    { id: '1', text: 'Review new doctor applications', completed: false },
    { id: '2', text: 'Update privacy policy document', completed: true },
    { id: '3', text: 'Check system performance reports', completed: false },
  ];
  
  // Log component mount
  React.useEffect(() => {
    logInfo('Todo page mounted in CMS');
  }, []);

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Task Management</h1>
        <p className="text-gray-600">Keep track of tasks and to-do items</p>
      </header>
      
      <div className="max-w-3xl mx-auto">
        <Todo 
          title="Admin Tasks" 
          initialTodos={initialTodos} 
        />
      </div>
    </div>
  );
} 