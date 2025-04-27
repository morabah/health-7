'use client';

import React, { useState, useEffect } from 'react';
import TodoList from '@/components/cms/TodoList';
import { logInfo } from '@/lib/logger';
import Link from 'next/link';

type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  category?: string;
  notes?: string;
};

/**
 * Advanced Todo Management Page for CMS
 * Allows admins to manage tasks and to-do lists with enhanced features
 * 
 * @returns Advanced Todo Management component
 */
export default function AdvancedTodoPage() {
  // Initial sample todos with enhanced properties
  const initialTodos = [
    { 
      id: '1', 
      text: 'Review new doctor applications', 
      completed: false,
      priority: 'high',
      category: 'Doctor',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
      notes: 'Focus on verifying credentials and checking licenses'
    },
    { 
      id: '2', 
      text: 'Update privacy policy document', 
      completed: true,
      priority: 'medium',
      category: 'Content',
      dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // yesterday
      notes: 'Include new GDPR compliance sections'
    },
    { 
      id: '3', 
      text: 'Check system performance reports', 
      completed: false,
      priority: 'low',
      category: 'Admin',
      dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], // day after tomorrow
    },
    { 
      id: '4', 
      text: 'Contact patients about appointment confirmations', 
      completed: false,
      priority: 'medium',
      category: 'Patient',
    },
  ] as TodoItem[];

  // State for todos
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading from a database or API
  useEffect(() => {
    const loadTodos = async () => {
      // In a real app, you would fetch todos from API/Firebase here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      setTodos(initialTodos);
      setIsLoading(false);
    };

    loadTodos();
    logInfo('Advanced Todo page mounted in CMS');
  }, []);

  // Handle saving todos (in a real app, this would save to a backend)
  const handleSaveTodos = (updatedTodos: TodoItem[]) => {
    console.log('Todos updated:', updatedTodos);
    // In a real app: callApi('updateTodos', { todos: updatedTodos });
  };

  // Custom categories relevant to the health appointment system
  const categories = [
    'General', 
    'Patient', 
    'Doctor', 
    'Admin', 
    'Content', 
    'Technical', 
    'Compliance',
    'Marketing'
  ];

  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex flex-wrap items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Advanced Task Management</h1>
          <div className="flex gap-3 mt-2 sm:mt-0">
            <Link href="/cms" className="px-4 py-2 bg-secondary-600 text-white rounded-md hover:bg-secondary-700">
              Back to CMS
            </Link>
            <Link href="/cms/todo" className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              Simple Todo
            </Link>
          </div>
        </div>
        <p className="text-gray-600">
          Manage administrative tasks with priorities, categories, due dates, and notes
        </p>
      </header>
      
      <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        ) : (
          <TodoList 
            title="Administrative Tasks" 
            initialTodos={todos}
            onSave={handleSaveTodos}
            categories={categories}
          />
        )}
      </div>
    </div>
  );
} 