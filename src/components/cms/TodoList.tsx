'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trash, Calendar, AlertCircle } from 'lucide-react';
import { formatDateForInput, formatDateForApi } from '@/lib/dateUtils';

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

interface TodoListProps {
  title?: string;
  initialTodos?: TodoItem[];
  onSave?: (todos: TodoItem[]) => void;
  categories?: string[];
}

export default function TodoList({
  title = 'Enhanced Todo List',
  initialTodos = [],
  onSave,
  categories = ['General', 'Patient', 'Doctor', 'Admin', 'Content'],
}: TodoListProps) {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoNotes, setNewTodoNotes] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('medium');
  const [newTodoCategory, setNewTodoCategory] = useState(categories[0]);
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>('');
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);

  // Filter state
  const [showCompleted, setShowCompleted] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | null>(null);

  // Refs for focus management
  const inputRef = useRef<HTMLInputElement>(null);
  const todoListRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const newlyAddedTodoRef = useRef<string | null>(null);

  useEffect(() => {
    if (onSave) {
      onSave(todos);
    }
  }, [todos, onSave]);

  // Focus the newly added todo item
  useEffect(() => {
    if (newlyAddedTodoRef.current) {
      const newTodoElement = document.getElementById(`todo-item-${newlyAddedTodoRef.current}`);
      if (newTodoElement) {
        newTodoElement.focus();
        newlyAddedTodoRef.current = null;
      }
    }
  }, [todos]);

  const addTodo = () => {
    if (newTodoText.trim() === '') return;
    
    // Format date properly for API storage
    const formattedDueDate = newTodoDueDate ? formatDateForApi(newTodoDueDate) : undefined;
    
    // Create new todo
    const newTodo: TodoItem = {
      id: 'todo-' + Date.now() + Math.floor(Math.random() * 1000),
      text: newTodoText,
      completed: false,
      priority: newTodoPriority,
      dueDate: formattedDueDate,
      category: newTodoCategory,
      notes: newTodoNotes || undefined,
    };
    
    // Add to list
    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    if (onSave) onSave(updatedTodos);
    
    // Reset form
    setNewTodoText('');
    setNewTodoPriority('medium');
    setNewTodoCategory(categories[0]);
    setNewTodoDueDate('');
    setNewTodoNotes('');
    
    // Set focus back to the text input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: string) => {
    // Find the index of the todo to delete
    const index = todos.findIndex(todo => todo.id === id);

    // Remove the todo
    setTodos(todos.filter(todo => todo.id !== id));

    // Focus management after deletion
    setTimeout(() => {
      const todoItems = document.querySelectorAll('[id^="todo-item-"]');

      if (todoItems.length > 0) {
        // Try to focus the next item, or the previous if at the end
        if (index < todoItems.length) {
          (todoItems[index] as HTMLElement).focus();
        } else if (todoItems.length > 0) {
          (todoItems[todoItems.length - 1] as HTMLElement).focus();
        }
      } else {
        // If no todos left, focus back to the input
        inputRef.current?.focus();
      }
    }, 0);
  };

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
    setTodos(todos.map(todo => (todo.id === id ? { ...todo, ...updates } : todo)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Add todo when Enter is pressed (without Shift for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTodo();
    }
  };

  const toggleExpandTodo = (id: string) => {
    setExpandedTodoId(expandedTodoId === id ? null : id);
  };

  // Filter todos based on filters
  const filteredTodos = todos.filter(todo => {
    if (!showCompleted && todo.completed) return false;
    if (categoryFilter && todo.category !== categoryFilter) return false;
    if (priorityFilter && todo.priority !== priorityFilter) return false;
    return true;
  });

  const getKeyboardShortcutsInstructions = () => {
    return (
      <div className="text-xs text-gray-500 mt-1">
        <p>
          Keyboard shortcuts: Space or Enter to toggle completion, Delete to remove, Ctrl+E to
          expand details
        </p>
      </div>
    );
  };

  return (
    <div
      className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto"
      ref={todoListRef}
      aria-labelledby="todo-list-title"
    >
      <h2 id="todo-list-title" className="text-lg font-semibold text-gray-900 mb-6">
        {title}
      </h2>

      {/* Add Todo Form */}
      <div className="space-y-4" role="form" aria-label="Add new task">
        <div>
          <label htmlFor="new-todo-text" className="block text-sm font-medium text-gray-700 mb-1">
            Task name
          </label>
          <input
            id="new-todo-text"
            ref={inputRef}
            type="text"
            className="border w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a new task..."
            value={newTodoText}
            onChange={e => setNewTodoText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="new-todo-priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="new-todo-priority"
              className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={newTodoPriority}
              onChange={e => setNewTodoPriority(e.target.value as TodoPriority)}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          <div>
            <label htmlFor="new-todo-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="new-todo-category"
              className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={newTodoCategory}
              onChange={e => setNewTodoCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="new-todo-due-date" className="block text-sm font-medium text-gray-700 mb-1">
              Due date
            </label>
            <input
              id="new-todo-due-date"
              type="date"
              className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={newTodoDueDate}
              onChange={e => setNewTodoDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="new-todo-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="new-todo-notes"
            className="border w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add notes (optional)..."
            value={newTodoNotes}
            onChange={e => setNewTodoNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div>
          <button
            ref={addButtonRef}
            onClick={addTodo}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={newTodoText.trim() === ''}
          >
            Add Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 border-t pt-4">
        <h3 id="filters-heading" className="font-medium text-gray-700 mb-2">
          Filters
        </h3>
        <div
          className="flex flex-wrap gap-4 items-center"
          role="group"
          aria-labelledby="filters-heading"
        >
          <label className="flex items-center">
            <input
              id="show-completed"
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              checked={showCompleted}
              onChange={e => setShowCompleted(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Show Completed</span>
          </label>

          <div>
            <label htmlFor="category-filter" className="sr-only">
              Filter by category
            </label>
            <select
              id="category-filter"
              className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={categoryFilter || ''}
              onChange={e => setCategoryFilter(e.target.value || null)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority-filter" className="sr-only">
              Filter by priority
            </label>
            <select
              id="priority-filter"
              className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={priorityFilter || ''}
              onChange={e => setPriorityFilter((e.target.value as TodoPriority) || null)}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {getKeyboardShortcutsInstructions()}
      </div>

      {/* Todo List */}
      {filteredTodos.length === 0 ? (
        <p className="text-gray-500 text-center py-4" role="status">
          No tasks match your filters
        </p>
      ) : (
        <ul className="mt-6 space-y-2 list-none p-0" aria-label="Task list">
          {filteredTodos.map(todo => (
            <li
              key={todo.id}
              id={`todo-item-${todo.id}`}
              className={`border rounded-lg p-3 shadow-sm flex items-start gap-3 ${
                todo.completed ? 'bg-gray-50' : 'bg-white'
              }`}
              aria-labelledby={`todo-label-${todo.id}`}
            >
              <div className="mt-1">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  id={`todo-${todo.id}`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <button
                    className="flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                    onClick={() => toggleExpandTodo(todo.id)}
                  >
                    <div className="flex items-center gap-2">
                      <label
                        id={`todo-label-${todo.id}`}
                        htmlFor={`todo-${todo.id}`}
                        className={`font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
                      >
                        {todo.text}
                      </label>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                          ${
                            todo.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : todo.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                      >
                        {todo.priority}
                      </span>
                      <span
                        className="text-xs text-gray-500"
                      >
                        {todo.category}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded p-1"
                  >
                    <Trash size={16} />
                  </button>
                </div>
                {todo.notes && (
                  <p className="mt-1 text-sm text-gray-600" aria-label="Notes">
                    {todo.notes}
                  </p>
                )}
                {todo.dueDate && (
                  <div
                    className="mt-1 flex items-center text-xs text-gray-500"
                    aria-label={`Due date: ${new Date(todo.dueDate).toLocaleDateString()}`}
                  >
                    <Calendar size={14} className="mr-1" aria-hidden="true" />
                    {new Date(todo.dueDate).toLocaleDateString()}
                    {new Date(todo.dueDate) < new Date() && !todo.completed && (
                      <span className="ml-2 text-red-500" aria-label="Overdue">
                        Overdue
                      </span>
                    )}
                  </div>
                )}

                {expandedTodoId === todo.id && (
                  <div className="mt-3 border-t pt-2" role="form" aria-label="Edit task details">
                    <div className="mt-2 flex gap-2">
                      <div>
                        <label htmlFor={`edit-priority-${todo.id}`} className="sr-only">
                          Edit priority
                        </label>
                        <select
                          id={`edit-priority-${todo.id}`}
                          className="border rounded-md px-2 py-1 text-sm"
                          value={todo.priority}
                          onChange={e =>
                            updateTodo(todo.id, { priority: e.target.value as TodoPriority })
                          }
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`edit-category-${todo.id}`} className="sr-only">
                          Edit category
                        </label>
                        <select
                          id={`edit-category-${todo.id}`}
                          className="border rounded-md px-2 py-1 text-sm"
                          value={todo.category}
                          onChange={e => updateTodo(todo.id, { category: e.target.value })}
                        >
                          {categories.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`edit-due-date-${todo.id}`} className="sr-only">
                          Edit due date
                        </label>
                        <input
                          id={`edit-due-date-${todo.id}`}
                          type="date"
                          className="border rounded-md px-2 py-1 text-sm"
                          value={todo.dueDate ? formatDateForInput(todo.dueDate) : ''}
                          onChange={e =>
                            updateTodo(todo.id, { dueDate: e.target.value ? formatDateForApi(e.target.value) : undefined })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {todos.length > 0 && (
        <div
          className="mt-4 text-sm text-gray-500 flex justify-between"
          role="status"
          aria-live="polite"
        >
          <span>
            {todos.filter(todo => todo.completed).length} of {todos.length} tasks completed
          </span>
          <span>
            {todos.filter(todo => todo.priority === 'high' && !todo.completed).length > 0 && (
              <span
                aria-label={`${todos.filter(todo => todo.priority === 'high' && !todo.completed).length} high priority tasks remaining`}
              >
                {todos.filter(todo => todo.priority === 'high' && !todo.completed).length} high
                priority
              </span>
            )}
            {todos.some(
              todo => todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed
            ) && (
              <span
                className="text-red-500 flex items-center"
                aria-label="Warning: You have overdue tasks"
              >
                <AlertCircle size={14} className="mr-1" aria-hidden="true" />
                Overdue tasks
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
