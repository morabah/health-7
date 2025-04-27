'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import TodoList from '@/components/cms/TodoList';
import { logInfo } from '@/lib/logger';
import { ArrowLeft } from 'lucide-react';

// Define the type for todo items
type TodoPriority = 'low' | 'medium' | 'high';

type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
  priority: TodoPriority;
  dueDate?: string;
  category?: string;
  notes?: string;
};

/**
 * Advanced Todo Management Page for CMS
 * Provides enhanced task management with priorities, categories, due dates, and filtering
 *
 * @returns Advanced Todo Management component
 */
export default function AdvancedTodoPage() {
  const [loading, setLoading] = useState(true);
  const [initialTodos, setInitialTodos] = useState<TodoItem[]>([]);

  // Wrap sampleTodos in useMemo with explicit typing
  const sampleTodos = useMemo<TodoItem[]>(
    () => [
      {
        id: '1',
        text: 'Review and approve new doctor applications',
        completed: false,
        priority: 'high',
        category: 'Admin',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        notes: 'Focus on cardiologists and pediatricians applications first',
      },
      {
        id: '2',
        text: 'Update patient privacy policy document',
        completed: true,
        priority: 'medium',
        category: 'Content',
        dueDate: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
        notes: 'Include new HIPAA compliance requirements',
      },
      {
        id: '3',
        text: 'Follow up with patients who missed appointments',
        completed: false,
        priority: 'medium',
        category: 'Patient',
        dueDate: new Date(Date.now()).toISOString().split('T')[0], // Today
      },
      {
        id: '4',
        text: 'Schedule maintenance for the appointment booking system',
        completed: false,
        priority: 'low',
        category: 'Admin',
        dueDate: new Date(Date.now() + 604800000).toISOString().split('T')[0], // Next week
        notes: 'Coordinate with IT department for minimal disruption',
      },
      {
        id: '5',
        text: 'Prepare monthly report on appointment statistics',
        completed: false,
        priority: 'high',
        category: 'Admin',
        dueDate: new Date(Date.now() + 259200000).toISOString().split('T')[0], // 3 days later
      },
    ],
    []
  ); // Empty dependency array ensures it's created only once

  // Simulate loading data - remove sampleTodos from dependency array
  useEffect(() => {
    logInfo('Advanced Todo page mounted in CMS');

    // Simulate API call
    const timer = setTimeout(() => {
      setInitialTodos(sampleTodos);
      setLoading(false);
      logInfo('Todo data loaded successfully');
    }, 800);

    return () => clearTimeout(timer);
  }, [sampleTodos]); // Keep sampleTodos here as we set it in the effect

  const handleSave = (todos: TodoItem[]) => {
    logInfo(`Saved ${todos.length} todo items`);
    // In a real app, this would call an API to save the todos
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex items-center mb-4">
          <Link href="/cms" className="mr-4 text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft size={16} className="mr-1" />
            Back to CMS
          </Link>
          <Link href="/cms/todo" className="text-blue-600 hover:text-blue-800">
            Simple Todo
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">Advanced Task Management</h1>
        <p className="text-gray-600">
          Manage tasks with priorities, categories, due dates, and more
        </p>
      </header>

      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 flex justify-center items-center h-64">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-blue-200 mb-4"></div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-2 w-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <TodoList
            title="Health System Tasks"
            initialTodos={initialTodos}
            onSave={handleSave}
            categories={['Admin', 'Doctor', 'Patient', 'Content', 'Technical']}
          />
        )}
      </div>
    </div>
  );
}
