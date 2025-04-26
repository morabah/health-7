'use client';

import React, { useState } from 'react';
import { Trash2, Check, Plus } from 'lucide-react';

type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
};

interface TodoProps {
  title?: string;
  initialTodos?: TodoItem[];
}

export default function Todo({ title = 'Todo List', initialTodos = [] }: TodoProps) {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [newTodoText, setNewTodoText] = useState('');

  const addTodo = () => {
    if (!newTodoText.trim()) return;
    
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false
    };
    
    setTodos([...todos, newTodo]);
    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      
      <div className="flex mb-4">
        <input
          type="text"
          className="flex-1 border rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a new task..."
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="bg-blue-500 text-white rounded-r-md px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={addTodo}
          aria-label="Add task"
        >
          <Plus size={20} />
        </button>
      </div>
      
      {todos.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No tasks yet. Add one above!</p>
      ) : (
        <ul className="divide-y">
          {todos.map((todo) => (
            <li key={todo.id} className="py-3 flex items-center justify-between">
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
                <span className={`${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {todo.text}
                </span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-red-500 hover:text-red-700 p-1"
                aria-label="Delete task"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {todos.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          {todos.filter(todo => todo.completed).length} of {todos.length} tasks completed
        </div>
      )}
    </div>
  );
} 