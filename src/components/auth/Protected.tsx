'use client';

/**
 * @deprecated This component is deprecated. Use ProtectedRoute from '@/components/auth/ProtectedRoute' instead.
 */

import React from 'react';
import ProtectedRoute from './ProtectedRoute';
import type { UserType } from '@/types/enums';

interface ProtectedPageProps {
  children: React.ReactNode;
  allowedRoles?: UserType[];
  redirectIfAuth?: boolean;
}

/**
 * @deprecated This component is deprecated. Use ProtectedRoute from '@/components/auth/ProtectedRoute' instead.
 * This is a compatibility wrapper to maintain backward compatibility.
 */
export default function ProtectedPage(props: ProtectedPageProps) {
  // Forward all props to the new consolidated component
  return <ProtectedRoute {...props} />;
}
