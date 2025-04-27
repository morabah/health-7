/**
 * Router utilities for managing navigation flows
 */

import { UserType } from '@/types/enums';

/**
 * Get the dashboard path for a user type
 *
 * @param userType - The user role or userType
 * @returns The path to the appropriate dashboard
 */
export function roleToDashboard(userType: UserType | string | null | undefined): string {
  if (!userType) return '/';

  switch (userType) {
    case UserType.PATIENT:
      return '/patient/dashboard';
    case UserType.DOCTOR:
      return '/doctor/dashboard';
    case UserType.ADMIN:
      return '/admin/dashboard';
    default:
      return '/dashboard';
  }
}

/**
 * Determine path after successful login
 *
 * @param userType - The user role or userType
 * @param nextPath - Optional destination path from query params
 * @returns The appropriate redirect path
 */
export function getPostLoginRedirect(
  userType: UserType | string | null | undefined,
  nextPath?: string | null
): string {
  // If next path is specified, use that
  if (nextPath) return nextPath;

  // Otherwise redirect to the role-specific dashboard
  return roleToDashboard(userType);
}
