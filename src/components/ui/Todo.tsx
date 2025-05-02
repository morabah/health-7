'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Check, Plus, GripVertical, Loader2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { logError } from '@/lib/logger';
import { 
  getAllTodos, 
  createTodo, 
  updateTodo, 
  deleteTodo, 
  updateTodoOrder 
} from '@/data/todoLoaders';
import type { TodoItem } from '@/types/schemas';

interface TodoProps {
  title?: string;
  initialTodos?: TodoItem[];
  userId?: string;
  showLoader?: boolean;
}

// Sortable Todo Item component
function SortableTodoItem({ todo, onToggle, onDelete }: { 
  todo: TodoItem, 
  onToggle: (id: string) => void, 
  onDelete: (id: string) => void 
}) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition 
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li 
      ref={setNodeRef} 
      style={style} 
      className="py-3 flex items-center justify-between"
      id={`todo-item-${todo.id}`}
    >
      <div className="flex items-center flex-1">
        <div 
          className="mr-2 cursor-grab touch-none p-1 text-gray-400 hover:text-gray-600" 
          {...attributes} 
          {...listeners}
        >
          <GripVertical size={16} />
        </div>
        <button
          onClick={() => onToggle(todo.id)}
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
        onClick={() => onDelete(todo.id)}
        className="text-red-500 hover:text-red-700 p-1"
        aria-label="Delete task"
      >
        <Trash2 size={18} />
      </button>
    </li>
  );
}

export default function Todo({ 
  title = 'Todo List', 
  initialTodos = [], 
  userId,
  showLoader = true
}: TodoProps) {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [newTodoText, setNewTodoText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // DnD sensors setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load todos on component mount
  useEffect(() => {
    async function loadTodos() {
      try {
        setIsLoading(true);
        const loadedTodos = await getAllTodos(userId);
        setTodos(loadedTodos);
      } catch (error) {
        logError('Failed to load todos', { error });
      } finally {
        setIsLoading(false);
      }
    }

    // Only load if we don't have initialTodos
    if (initialTodos.length === 0) {
      loadTodos();
    } else {
      setIsLoading(false);
    }
  }, [initialTodos.length, userId]);

  const addTodo = async () => {
    if (!newTodoText.trim() || isSaving) return;
    
    try {
      setIsSaving(true);
      
      const now = new Date().toISOString();
      const todoData = {
        text: newTodoText.trim(),
        completed: false,
        priority: "MEDIUM",
        createdAt: now,
        updatedAt: now,
        userId: userId || null,
      } as const;
      
      const newTodo = await createTodo(todoData, userId);
      setTodos(prev => [...prev, newTodo]);
      setNewTodoText('');
    } catch (error) {
      logError('Error adding todo', { error });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTodo = async (id: string) => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Find the todo to toggle
      const todo = todos.find(t => t.id === id);
      if (!todo) return;
      
      // Update optimistically in UI
      setTodos(todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ));
      
      // Update in the backend
      await updateTodo(id, { completed: !todo.completed });
    } catch (error) {
      logError('Error toggling todo', { error });
      // Revert on error
      const loadedTodos = await getAllTodos(userId);
      setTodos(loadedTodos);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTodoItem = async (id: string) => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Update optimistically in UI
      setTodos(todos.filter(todo => todo.id !== id));
      
      // Delete in the backend
      await deleteTodo(id);
    } catch (error) {
      logError('Error deleting todo', { error });
      // Revert on error
      const loadedTodos = await getAllTodos(userId);
      setTodos(loadedTodos);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      try {
        setIsSaving(true);
        
        // Update optimistically in UI
        setTodos((items) => {
          const oldIndex = items.findIndex(item => item.id === active.id);
          const newIndex = items.findIndex(item => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
        
        // Get the new order of IDs
        const orderedIds = todos.map(todo => todo.id);
        
        // Update the order in the backend
        await updateTodoOrder(orderedIds);
      } catch (error) {
        logError('Error reordering todos', { error });
        // Revert on error
        const loadedTodos = await getAllTodos(userId);
        setTodos(loadedTodos);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Show loading state
  if (isLoading && showLoader) {
    return (
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading todos...</span>
        </div>
      </div>
    );
  }

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
          disabled={isSaving}
        />
        <button
          className={`${
            isSaving 
              ? 'bg-blue-300 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white rounded-r-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          onClick={addTodo}
          aria-label="Add task"
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Plus size={20} />
          )}
        </button>
      </div>
      
      {todos.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No tasks yet. Add one above!</p>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={todos.map(todo => todo.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y">
              {todos.map((todo) => (
                <SortableTodoItem 
                  key={todo.id} 
                  todo={todo} 
                  onToggle={toggleTodo} 
                  onDelete={deleteTodoItem} 
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      
      {todos.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          {todos.filter(todo => todo.completed).length} of {todos.length} tasks completed
          {isSaving && <span className="ml-2">(Saving...)</span>}
        </div>
      )}
    </div>
  );
} 