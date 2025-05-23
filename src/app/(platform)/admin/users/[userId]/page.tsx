'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Edit,
  UserX,
  UserCheck,
  Stethoscope,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserType, AccountStatus, VerificationStatus } from '@/types/enums';
import { useUserDetail, useAdminActivateUser } from '@/data/adminLoaders';
import { logInfo, logError } from '@/lib/logger';
import { ApiError, DataError } from '@/lib/errors/errorClasses';

// Define types for the API response
interface UserDetailResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: UserType;
    isActive: boolean;
    createdAt?: string;
    lastLoginTime?: string;
    phone?: string;
    address?: string;
  };
  doctorProfile?: {
    verificationStatus?: VerificationStatus;
    specialty?: string;
    bio?: string;
  };
}

interface UserStatusUpdateResponse {
  success: boolean;
  error?: string;
}

import CreateUserPage from '../create/page';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  const [reason, setReason] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | null>(null);

  // If route param is 'new', render the user creation page instead
  if (userId === 'new') {
    return <CreateUserPage />;
  }

  // Fetch user details
  const { data, isLoading, error, refetch } = useUserDetail(userId);

  // Update user status mutation
  const updateUserStatus = useAdminActivateUser();

  // Force refetch whenever the page is displayed
  useEffect(() => {
    // Refresh data when component mounts
    refetch();

    // Setup interval to periodically refetch while on this page
    const intervalId = setInterval(() => {
      refetch();
    }, 5000); // Refresh every 5 seconds

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [refetch]);

  // Handle activation/deactivation
  const handleStatusChange = async (status: AccountStatus) => {
    try {
      const result = (await updateUserStatus.mutateAsync({
        userId,
        status,
        reason: reason || undefined,
      })) as UserStatusUpdateResponse;

      if (!result.success) {
        throw new ApiError(result.error || 'Failed to update user status', {
          statusCode: 400,
          context: { userId, status, reason },
        });
      }

      setShowActionModal(false);
      setReason('');

      // Explicitly fetch fresh data
      await refetch();

      // Show a success message to the user
      logInfo(`User status successfully updated to ${status}`);
    } catch (error) {
      logError('Error updating user status', error);
    }
  };

  // Show action modal
  const showActivateModal = () => {
    setActionType('activate');
    setShowActionModal(true);
  };

  const showDeactivateModal = () => {
    setActionType('deactivate');
    setShowActionModal(true);
  };

  // Show appropriate badge for user status
  const getStatusBadge = (isActive: boolean | undefined) => {
    if (isActive === undefined) return <Badge variant="default">Unknown</Badge>;
    return isActive ? (
      <Badge variant="success">Active</Badge>
    ) : (
      <Badge variant="danger">Inactive</Badge>
    );
  };

  // Show badge for verification status
  const getVerificationBadge = (status: VerificationStatus | undefined) => {
    if (!status) return null;

    switch (status) {
      case VerificationStatus.VERIFIED:
        return <Badge variant="success">Verified</Badge>;
      case VerificationStatus.PENDING:
        return <Badge variant="warning">Pending</Badge>;
      case VerificationStatus.REJECTED:
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return null;
    }
  };

  // If loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // If error
  if (error || !(data as UserDetailResponse)?.success) {
    return (
      <div className="space-y-4">
        <Alert variant="error" className="mb-4">
          {error
            ? String(error)
            : (data as UserDetailResponse)?.error || 'Failed to load user details'}
        </Alert>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="primary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Extract data
  const typedData = data as UserDetailResponse;
  const { user, doctorProfile } = typedData;

  if (!user) {
    return (
      <div className="space-y-4">
        <Alert variant="error">User not found</Alert>
        <Button variant="outline" onClick={() => router.back()} className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4 p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold dark:text-white">User Details</h1>
            <p className="text-slate-500 dark:text-slate-400">View and manage user information</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {user.isActive ? (
            <Button
              variant="danger"
              onClick={showDeactivateModal}
              disabled={updateUserStatus.isPending}
            >
              <UserX className="h-4 w-4 mr-2" />
              Deactivate User
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={showActivateModal}
              disabled={updateUserStatus.isPending}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Activate User
            </Button>
          )}
        </div>
      </div>

      {/* Status alert if user is inactive */}
      {!user.isActive && (
        <Alert variant="warning" className="mb-4">
          <ShieldAlert className="h-4 w-4 mr-2" />
          This user account is currently inactive and cannot log in.
        </Alert>
      )}

      {/* User details card */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
              <User className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-medium">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex items-center mt-1">
                <Badge
                  variant={
                    user.userType === UserType.ADMIN
                      ? 'warning'
                      : user.userType === UserType.DOCTOR
                        ? 'success'
                        : 'info'
                  }
                  className="mr-2"
                >
                  {user.userType}
                </Badge>
                {getStatusBadge(user.isActive)}
                {user.userType === UserType.DOCTOR && doctorProfile && (
                  <div className="ml-2">
                    {getVerificationBadge(doctorProfile.verificationStatus)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {/* Basic Information */}
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-start mb-3">
                  <Mail className="h-5 w-5 text-slate-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-start mb-3">
                  <Calendar className="h-5 w-5 text-slate-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Joined</p>
                    <p className="font-medium">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                        (
                        {user.createdAt
                          ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })
                          : ''}
                        )
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-slate-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Last Login</p>
                    <p className="font-medium">
                      {user.lastLoginTime
                        ? new Date(user.lastLoginTime).toLocaleDateString()
                        : 'Never'}
                      {user.lastLoginTime && (
                        <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                          ({formatDistanceToNow(new Date(user.lastLoginTime), { addSuffix: true })})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                {user.userType === UserType.DOCTOR && doctorProfile && (
                  <>
                    <div className="flex items-start mb-3">
                      <Stethoscope className="h-5 w-5 text-slate-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Specialty</p>
                        <p className="font-medium">{doctorProfile.specialty || 'Not specified'}</p>
                      </div>
                    </div>
                    {doctorProfile.bio && (
                      <div className="mt-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Biography</p>
                        <p className="text-sm">{doctorProfile.bio}</p>
                      </div>
                    )}
                  </>
                )}

                {user.phone && (
                  <div className="flex items-start mb-3">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                      <p className="font-medium">{user.phone}</p>
                    </div>
                  </div>
                )}

                {user.address && (
                  <div className="flex items-start mb-3">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Address</p>
                      <p className="font-medium">{user.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" as={Link} href={`/admin/users`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>

              {/* Doctor specific actions */}
              {user.userType === UserType.DOCTOR && doctorProfile && (
                <>
                  {doctorProfile.verificationStatus === VerificationStatus.PENDING && (
                    <Button
                      variant="primary"
                      as={Link}
                      href={`/admin/doctor-verification/${user.id}`}
                    >
                      <ShieldAlert className="h-4 w-4 mr-2" />
                      Review Verification
                    </Button>
                  )}
                </>
              )}

              {/* Activate/Deactivate buttons */}
              {user.isActive ? (
                <Button
                  variant="danger"
                  onClick={showDeactivateModal}
                  disabled={updateUserStatus.isPending}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Deactivate User
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={showActivateModal}
                  disabled={updateUserStatus.isPending}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Activate User
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">
              {actionType === 'activate' ? 'Activate User' : 'Deactivate User'}
            </h3>
            <p className="mb-4 text-slate-600 dark:text-slate-300">
              {actionType === 'activate'
                ? 'Are you sure you want to activate this user? They will be able to log in again.'
                : 'Are you sure you want to deactivate this user? They will no longer be able to log in.'}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason (optional)</label>
              <textarea
                className="w-full p-2 border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Enter reason for this action..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowActionModal(false)}
                disabled={updateUserStatus.isPending}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === 'activate' ? 'primary' : 'danger'}
                onClick={() =>
                  handleStatusChange(
                    actionType === 'activate' ? AccountStatus.ACTIVE : AccountStatus.DEACTIVATED
                  )
                }
                disabled={updateUserStatus.isPending}
              >
                {updateUserStatus.isPending ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionType === 'activate' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Deactivate
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
