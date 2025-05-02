/**
 * TodoLoaders module
 * 
 * Provides functions for loading, creating, updating, and deleting todo items
 * using the local JSON database for development and testing.
 */

import { logError, logInfo } from '@/lib/logger';
import { TodoItemSchema, TodoListSchema, type TodoItem, type TodoList } from '@/types/schemas';

const COLLECTION_NAME = 'todos';

/**
 * Generic function to fetch todo data from the local DB API
 */
async function fetchTodoData(): Promise<TodoItem[]> {
  try {
    const response = await fetch(`/api/localDb?collection=${COLLECTION_NAME}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error fetching ${COLLECTION_NAME}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    logError(`Error fetching ${COLLECTION_NAME}:`, error);
    return [];
  }
}

/**
 * Generic function to save todo data through API
 */
async function saveTodoData(data: TodoItem[]): Promise<boolean> {
  try {
    const response = await fetch(`/api/localDb?collection=${COLLECTION_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error saving ${COLLECTION_NAME}`);
    }
    
    logInfo(`Saved ${data.length} items to ${COLLECTION_NAME}`);
    return true;
  } catch (error) {
    logError(`Error saving ${COLLECTION_NAME}:`, error);
    return false;
  }
}

/**
 * Get all todo items
 * 
 * @param userId Optional user ID to filter todos by
 * @returns Array of todo items
 */
export async function getAllTodos(userId?: string): Promise<TodoList> {
  try {
    // Read todos from local DB
    const todos = await fetchTodoData();
    
    // Parse the result through Zod schema to validate structure
    const validatedTodos = TodoListSchema.parse(todos);
    
    // Filter by userId if provided
    if (userId) {
      return validatedTodos.filter(todo => todo.userId === userId);
    }
    
    return validatedTodos;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logError('Failed to load todos', { error: error.message });
    } else {
      logError('Failed to load todos', { error });
    }
    return []; // Return empty array on error
  }
}

/**
 * Create a new todo item
 * 
 * @param todoData Partial todo item (id, createdAt, and updatedAt will be added)
 * @param userId Optional user ID to associate with the todo
 * @returns The newly created todo item
 */
export async function createTodo(
  todoData: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<TodoItem> {
  try {
    // Get existing todos
    const existingTodos = await getAllTodos();
    
    // Create a new todo with generated ID and timestamps
    const now = new Date().toISOString();
    const newTodo: TodoItem = {
      ...todoData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
      userId: userId || null,
    };
    
    // Validate with schema
    const validatedTodo = TodoItemSchema.parse(newTodo);
    
    // Add to list and save
    const updatedTodos = [...existingTodos, validatedTodo];
    await saveTodoData(updatedTodos);
    
    logInfo('Todo created', { todoId: validatedTodo.id });
    return validatedTodo;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logError('Failed to create todo', { error: error.message, todoData });
    } else {
      logError('Failed to create todo', { error, todoData });
    }
    throw new Error('Failed to create todo');
  }
}

/**
 * Update an existing todo item
 * 
 * @param id Todo ID to update
 * @param updates Partial updates to apply to the todo
 * @returns The updated todo item
 */
export async function updateTodo(
  id: string,
  updates: Partial<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TodoItem> {
  try {
    // Get existing todos
    const existingTodos = await getAllTodos();
    
    // Find the todo to update
    const todoIndex = existingTodos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) {
      throw new Error(`Todo with ID ${id} not found`);
    }
    
    // Update the todo
    const updatedTodo: TodoItem = {
      ...existingTodos[todoIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // Validate with schema
    const validatedTodo = TodoItemSchema.parse(updatedTodo);
    
    // Replace in the list and save
    const updatedTodos = [...existingTodos];
    updatedTodos[todoIndex] = validatedTodo;
    await saveTodoData(updatedTodos);
    
    logInfo('Todo updated', { todoId: id });
    return validatedTodo;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logError('Failed to update todo', { error: error.message, todoId: id });
      throw new Error(`Failed to update todo: ${error.message}`);
    } else {
      logError('Failed to update todo', { error, todoId: id });
      throw new Error('Failed to update todo');
    }
  }
}

/**
 * Delete a todo item
 * 
 * @param id Todo ID to delete
 * @returns true if successfully deleted
 */
export async function deleteTodo(id: string): Promise<boolean> {
  try {
    // Get existing todos
    const existingTodos = await getAllTodos();
    
    // Filter out the todo to delete
    const updatedTodos = existingTodos.filter(todo => todo.id !== id);
    
    // If no todo was removed, it didn't exist
    if (updatedTodos.length === existingTodos.length) {
      throw new Error(`Todo with ID ${id} not found`);
    }
    
    // Save the updated list
    await saveTodoData(updatedTodos);
    
    logInfo('Todo deleted', { todoId: id });
    return true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logError('Failed to delete todo', { error: error.message, todoId: id });
      throw new Error(`Failed to delete todo: ${error.message}`);
    } else {
      logError('Failed to delete todo', { error, todoId: id });
      throw new Error('Failed to delete todo');
    }
  }
}

/**
 * Update the order of todos
 * 
 * @param orderedIds Array of todo IDs in the desired order
 * @returns The updated list of todos
 */
export async function updateTodoOrder(orderedIds: string[]): Promise<TodoList> {
  try {
    // Get existing todos
    const existingTodos = await getAllTodos();
    
    // Ensure all IDs exist
    const allExist = orderedIds.every(id => existingTodos.some(todo => todo.id === id));
    if (!allExist) {
      throw new Error('Some todo IDs in the ordered list don\'t exist');
    }
    
    // Create a map for quick lookup
    const todoMap = new Map(existingTodos.map(todo => [todo.id, todo]));
    
    // Create the ordered list, preserving todos not in the ordered list
    const orderedTodos = [
      // First include todos in the specified order
      ...orderedIds.map(id => ({
        ...todoMap.get(id)!,
        updatedAt: new Date().toISOString(),
      })),
      // Then include any todos not in the ordered list
      ...existingTodos.filter(todo => !orderedIds.includes(todo.id)),
    ];
    
    // Save the updated list
    await saveTodoData(orderedTodos);
    
    logInfo('Todo order updated');
    return orderedTodos;
  } catch (error: unknown) {
    if (error instanceof Error) {
      logError('Failed to update todo order', { error: error.message });
      throw new Error(`Failed to update todo order: ${error.message}`);
    } else {
      logError('Failed to update todo order', { error });
      throw new Error('Failed to update todo order');
    }
  }
} 