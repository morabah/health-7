/**
 * DEPRECATED - DO NOT USE
 * 
 * This file has been migrated to the new modular error system and is no longer needed.
 * All functionality has been moved to dedicated files in the new structure.
 * 
 * Please use the new error system instead:
 * - Import error classes from '@/lib/errors/errorClasses'
 * - Import utility functions from '@/lib/errors/errorUtils'
 * - Import persistence functions from '@/lib/errors/errorPersistence'
 * - Import network utilities from '@/lib/errors/networkUtils'
 * - Import API error handling from '@/lib/errors/apiErrorHandling'
 * 
 * Alternatively, use the consolidated imports from '@/lib/errors' (index.ts)
 * 
 * For detailed migration instructions, see:
 * - src/lib/MIGRATION.md
 */

// Re-export from the new location for backward compatibility
// This ensures existing code won't break immediately, but you should still migrate
export * from './errors/errorClasses';
export * from './errors/errorUtils'; 