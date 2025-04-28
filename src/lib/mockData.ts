/**
 * mockData.ts
 * 
 * A utility for managing mock user data in local development.
 * Particularly useful for maintaining state across multiple function calls.
 */

import type { UserType } from '@/types/enums';

// Define a type for our mock user
type MockUser = {
  id: string;
  email: string | null;
  type: UserType;
};

// Create a class to manage mock user state
class MockUserManager {
  private currentUser: MockUser | null = null;

  // Set the current mock user
  setCurrentUser(user: MockUser | null): void {
    this.currentUser = user;
  }

  /**
   * Get the current user (includes proper null checking)
   */
  getCurrentUser(): MockUser | null {
    return this.currentUser || null;
  }

  // Clear the current mock user
  clearCurrentUser(): void {
    this.currentUser = null;
  }
}

// Export a singleton instance
export const mockUserData = new MockUserManager();

// Default export for convenience
export default mockUserData; 