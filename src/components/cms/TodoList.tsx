'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Check, Plus, Calendar, Clock, AlertCircle } from 'lucide-react';

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
  categories = ['General', 'Patient', 'Doctor', 'Admin', 'Content'] 
}: TodoListProps) {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('medium');
  const [newTodoCategory, setNewTodoCategory] = useState(categories[0]);
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoNotes, setNewTodoNotes] = useState('');
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | null>(null);

  // Call onSave when todos change
  useEffect(() => {
    if (onSave) {
      onSave(todos);
    }
  }, [todos, onSave]);

  const addTodo = () => {
    if (!newTodoText.trim()) return;
    
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false,
      priority: newTodoPriority,
      dueDate: newTodoDueDate || undefined,
      category: newTodoCategory,
      notes: newTodoNotes.trim() || undefined
    };
    
    setTodos([...todos, newTodo]);
    setNewTodoText('');
    setNewTodoPriority('medium');
    setNewTodoDueDate('');
    setNewTodoNotes('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const updateTodo = (id: string, updates: Partial<TodoItem>) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, ...updates } : todo
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTodo();
    }
  };

  const toggleExpandTodo = (id: string) => {
    setExpandedTodoId(expandedTodoId === id ? null : id);
  };

  const filteredTodos = todos
    .filter(todo => {
      if (filter === 'active') return !todo.completed;
      if (filter === 'completed') return todo.completed;
      return true;
    })
    .filter(todo => categoryFilter ? todo.category === categoryFilter : true)
    .filter(todo => priorityFilter ? todo.priority === priorityFilter : true);

  const getPriorityColor = (priority: TodoPriority) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 w-full">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      
      {/* New Todo Form */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="mb-3">
          <input
            type="text"
            className="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add a new task..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Priority</label>
            <select 
              className="w-full border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newTodoPriority}
              onChange={(e) => setNewTodoPriority(e.target.value as TodoPriority)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <select 
              className="w-full border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newTodoCategory}
              onChange={(e) => setNewTodoCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Due Date</label>
            <input 
              type="date"
              className="w-full border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newTodoDueDate}
              onChange={(e) => setNewTodoDueDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
          <textarea 
            className="w-full border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Additional details..."
            value={newTodoNotes}
            onChange={(e) => setNewTodoNotes(e.target.value)}
          />
        </div>
        
        <button
          className="bg-blue-500 text-white rounded-md px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
          onClick={addTodo}
        >
          <Plus size={18} className="mr-1" />
          Add Task
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div>
          <label className="mr-2 text-sm text-gray-600">Status:</label>
          <select 
            className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'completed')}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <div>
          <label className="mr-2 text-sm text-gray-600">Category:</label>
          <select 
            className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={categoryFilter || ''}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="mr-2 text-sm text-gray-600">Priority:</label>
          <select 
            className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={priorityFilter || ''}
            onChange={(e) => setPriorityFilter(e.target.value as TodoPriority || null)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      
      {/* Todo List */}
      {filteredTodos.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No tasks match your filters</p>
      ) : (
        <ul className="divide-y">
          {filteredTodos.map((todo) => (
            <li key={todo.id} className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`p-1 mr-3 rounded-full border ${
                      todo.completed 
                        ? 'bg-green-100 border-green-500 text-green-500' 
                        : 'border-gray-300 text-gray-400'
                    }`}
                    aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
                  >
                    {todo.completed && <Check size={16} />}
                  </button>
                  <div>
                    <span 
                      className={`${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
                      onClick={() => toggleExpandTodo(todo.id)}
                    >
                      {todo.text}
                    </span>
                    
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                      
                      {todo.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                          {todo.category}
                        </span>
                      )}
                      
                      {todo.dueDate && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex items-center bg-purple-50 text-purple-600 border border-purple-200">
                          <Calendar size={12} className="mr-1" />
                          {new Date(todo.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  aria-label="Delete task"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              {expandedTodoId === todo.id && (
                <div className="mt-3 ml-10 pl-2 border-l-2 border-gray-200">
                  {todo.notes && (
                    <div className="mb-2 text-sm text-gray-600">
                      <p className="font-medium">Notes:</p>
                      <p className="whitespace-pre-line">{todo.notes}</p>
                    </div>
                  )}
                  
                  <div className="mt-3 flex gap-2">
                    <select
                      className="border rounded-md px-2 py-1 text-sm"
                      value={todo.priority}
                      onChange={(e) => updateTodo(todo.id, { priority: e.target.value as TodoPriority })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    
                    <select
                      className="border rounded-md px-2 py-1 text-sm"
                      value={todo.category}
                      onChange={(e) => updateTodo(todo.id, { category: e.target.value })}
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    
                    <input
                      type="date"
                      className="border rounded-md px-2 py-1 text-sm"
                      value={todo.dueDate || ''}
                      onChange={(e) => updateTodo(todo.id, { dueDate: e.target.value || undefined })}
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      
      {todos.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 flex justify-between">
          <span>{todos.filter(todo => todo.completed).length} of {todos.length} tasks completed</span>
          <span>
            <span className="mr-3">{todos.filter(todo => todo.priority === 'high' && !todo.completed).length} high priority</span>
            {todos.some(todo => todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed) && (
              <span className="text-red-500 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                Overdue tasks
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
} 