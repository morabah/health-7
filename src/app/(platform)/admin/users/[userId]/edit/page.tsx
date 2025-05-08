'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { ArrowLeft, Save, UserCog, RotateCcw, Check, X } from 'lucide-react';
import { UserType, AccountStatus } from '@/types/enums';
import {
  useUserDetail,
  useAdminActivateUser,
  useAdminUpdateUserProfile,
} from '@/data/adminLoaders';
import { logInfo, logError } from '@/lib/logger';

// Define response type to fix TypeScript errors
interface UserDetailResponse {
  success: boolean;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    isActive?: boolean;
    userType?: UserType;
  };
  error?: string;
}

// Define response type for update profile mutation
interface UpdateProfileResponse {
  success: boolean;
  error?: string;
}

export default function UserEditPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    accountStatus: AccountStatus.ACTIVE,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch user details with proper type annotation
  const {
    data,
    isLoading,
    error: fetchError,
    refetch,
  } = useUserDetail(userId) as {
    data: UserDetailResponse | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<any>;
  };

  // Update profile mutation
  const updateProfile = useAdminUpdateUserProfile();

  // Populate form with user data when it's loaded
  useEffect(() => {
    if (data?.success && data.user) {
      const user = data.user;
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        accountStatus: user.isActive ? AccountStatus.ACTIVE : AccountStatus.DEACTIVATED,
      });
    }
  }, [data]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Update user profile information with all fields
      logInfo('Updating user data', { userId, ...formData });

      // Format the request properly according to the expected API structure
      const result = (await updateProfile.mutateAsync({
        userId,
        profileData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          accountStatus: formData.accountStatus,
        },
      })) as UpdateProfileResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to update user profile');
      }

      // Force a refetch of the user details to ensure we have the latest data
      await refetch();

      setSuccess(true);

      // Add a longer delay before redirecting to ensure data is properly updated
      setTimeout(() => {
        router.push(`/admin/users/${userId}`);
      }, 2500);
    } catch (err) {
      logError('Error updating user', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
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

  // If error fetching data
  if (fetchError || !data?.success) {
    return (
      <div className="space-y-4">
        <Alert variant="error" className="mb-4">
          {fetchError ? String(fetchError) : data?.error || 'Failed to load user details'}
        </Alert>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="primary" onClick={() => refetch()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // If user not found
  if (!data.user) {
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
            <h1 className="text-2xl font-semibold dark:text-white">Edit User</h1>
            <p className="text-slate-500 dark:text-slate-400">Update user information</p>
          </div>
        </div>
      </div>

      {/* Error and success messages */}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          User information updated successfully. Redirecting...
        </Alert>
      )}

      {/* Edit form */}
      <Card>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center">
            <UserCog className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-3" />
            <h2 className="text-xl font-medium">
              {data.user.firstName} {data.user.lastName}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                First Name
              </label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-slate-100 dark:bg-slate-700"
                disabled
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium mb-1">
                Address
              </label>
              <Input id="address" name="address" value={formData.address} onChange={handleChange} />
            </div>

            {/* Account Status */}
            <div>
              <label htmlFor="accountStatus" className="block text-sm font-medium mb-1">
                Account Status
              </label>
              <Select
                id="accountStatus"
                name="accountStatus"
                value={formData.accountStatus}
                onChange={handleChange}
                required
              >
                <option value={AccountStatus.ACTIVE}>Active</option>
                <option value={AccountStatus.DEACTIVATED}>Deactivated</option>
                <option value={AccountStatus.SUSPENDED}>Suspended</option>
              </Select>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push(`/admin/users/${userId}`)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
