'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import {
  UserPlus,
  Search,
  Eye,
  Pencil,
  RotateCw,
  Key,
  Trash2,
  CheckSquare,
  Filter,
  Download,
  Mail,
  ChevronDown,
  MoreVertical,
  Check,
  Ban,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { useAllUsers, useAdminActivateUser } from '@/data/adminLoaders';
import { UserType, AccountStatus } from '@/types/enums';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { logInfo, logValidation, logError } from '@/lib/logger';

// TypeScript interface for the API response
interface UsersApiResponse {
  success: boolean;
  users: User[];
}

// TypeScript interface for user
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserType;
  createdAt: string;
  lastLogin?: string;
  accountStatus: AccountStatus;
  isActive?: boolean;
}

export default function AdminUsersPage() {
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    userId: string;
    status?: AccountStatus;
  } | null>(null);

  // Add state for action loading status
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    visible: boolean;
  } | null>(null);

  const { data, isLoading, error, refetch } = useAllUsers() as {
    data: UsersApiResponse | undefined;
    isLoading: boolean;
    error: unknown;
    refetch: () => Promise<any>;
  };

  const activateUserMutation = useAdminActivateUser();

  // Transform users data to include accountStatus field based on isActive
  const users = useMemo(() => {
    if (!data?.success) return [];

    return data.users.map(user => {
      // Handle the possible missing accountStatus field
      let accountStatus;
      if (user.accountStatus) {
        // If accountStatus is already defined, use it
        accountStatus = user.accountStatus;
      } else {
        // Otherwise map from isActive boolean
        if (user.isActive === undefined) {
          // Default to active if isActive is not defined
          accountStatus = AccountStatus.ACTIVE;
        } else {
          accountStatus = user.isActive ? AccountStatus.ACTIVE : AccountStatus.DEACTIVATED;
        }
      }

      return {
        ...user,
        accountStatus,
      };
    });
  }, [data]);

  // Filtered users based on search and filters
  const filteredUsers = users.filter((user: User) => {
    // Type filter
    if (filterType && filterType !== 'all') {
      if (filterType === 'patient' && user.userType !== UserType.PATIENT) return false;
      if (filterType === 'doctor' && user.userType !== UserType.DOCTOR) return false;
      if (filterType === 'admin' && user.userType !== UserType.ADMIN) return false;
    }

    // Status filter
    if (filterStatus && filterStatus !== 'all') {
      if (filterStatus === 'active' && user.accountStatus !== AccountStatus.ACTIVE) return false;
      if (filterStatus === 'suspended' && user.accountStatus !== AccountStatus.SUSPENDED)
        return false;
      if (filterStatus === 'deactivated' && user.accountStatus !== AccountStatus.DEACTIVATED)
        return false;
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();

      if (!fullName.includes(query) && !email.includes(query)) return false;
    }

    return true;
  });

  // Sort users by creation date (newest first)
  const sortedUsers = [...filteredUsers].sort((a: User, b: User) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Toggle select all users
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(sortedUsers.map(user => user.id));
    }
    setIsAllSelected(!isAllSelected);
  };

  // Toggle select individual user
  const toggleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setSearchQuery('');
  };

  // Add force refresh state
  const [refreshKey, setRefreshKey] = useState(0);

  // Convert updateUserStatus to useCallback to prevent unnecessary rerenders
  const updateUserStatus = useCallback(
    async (userId: string, status: AccountStatus, reason: string = '') => {
      setIsActionLoading(true);

      try {
        // Log the request for better debugging
        logInfo('Updating user status', { userId, status, reason });

        // Make the API call with correct parameters
        // Note: The enum values are already strings that match what the backend expects
      const result = await activateUserMutation.mutateAsync({
        userId,
        status,
        reason,
      });

        // Type-check the result
        if (
          typeof result === 'object' &&
          result !== null &&
          'success' in result &&
          !result.success
        ) {
          const errorMessage = 'error' in result ? result.error : 'Failed to update user status';
          throw new Error(errorMessage as string);
      }

      // Clear confirmation dialog
      setConfirmAction(null);

      // Refetch users to get updated data
      await refetch();

        // Force UI refresh by incrementing refresh key
        setRefreshKey(prevKey => prevKey + 1);

        // Show success feedback
        setActionFeedback({
          type: 'success',
          message: `User status updated to ${status}`,
          visible: true,
        });

        // Auto-hide feedback after 3 seconds
        setTimeout(() => {
          setActionFeedback(null);
        }, 3000);

      logInfo('User status updated successfully', { userId, status });
    } catch (err) {
      logError('Error updating user status', err);

        // Show error feedback
        setActionFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to update user status',
          visible: true,
        });

        // Auto-hide feedback after 3 seconds
        setTimeout(() => {
          setActionFeedback(null);
        }, 3000);
      } finally {
        setIsActionLoading(false);
      }
    },
    [activateUserMutation, refetch]
  );

  // Simplified handler for direct status changes from dropdown
  const handleStatusChange = async (userId: string, status: AccountStatus) => {
    setIsActionLoading(true);

    try {
      logInfo('Status change triggered', { userId, status });

      // Show immediate feedback that action is in progress
      setActionFeedback({
        type: 'success',
        message: `Processing status change to ${status}...`,
        visible: true,
      });

      // Debug the account status format
      const statusAsString = status.toString();
      logInfo('Status value being sent to API', {
        status,
        statusAsString,
        statusType: typeof status,
        accountStatusEnum: AccountStatus,
      });

      // Call the updateUserStatus function with the status and a reason
      await updateUserStatus(userId, status, `Status changed to ${status} from dropdown`);

      // Update feedback to show success
      setActionFeedback({
        type: 'success',
        message: `User status successfully updated to ${status}`,
        visible: true,
      });

      setActiveDropdown(null);

      // Force UI refresh to show updated status
      setRefreshKey(prevKey => prevKey + 1);

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setActionFeedback(null);
      }, 3000);
    } catch (error) {
      logError('Failed to change user status', error);

      // Show error feedback
      setActionFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update user status',
        visible: true,
      });

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setActionFeedback(null);
      }, 3000);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Update bulk action handler to force refresh
  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    try {
      let status: AccountStatus;

      switch (action) {
        case 'activate':
          status = AccountStatus.ACTIVE;
          break;
        case 'suspend':
          status = AccountStatus.SUSPENDED;
          break;
        case 'deactivate':
          status = AccountStatus.DEACTIVATED;
          break;
        default:
          return;
      }

      // Process each selected user in sequence
      for (const userId of selectedUsers) {
        await updateUserStatus(userId, status, `Bulk ${action} by admin`);
      }

      // Clear selections after bulk action
      setSelectedUsers([]);
      setIsAllSelected(false);

      // Hide bulk actions
      setShowBulkActions(false);

      // Force UI refresh
      setRefreshKey(prevKey => prevKey + 1);

      // Show success feedback
      setActionFeedback({
        type: 'success',
        message: `Successfully ${action}d ${selectedUsers.length} users`,
        visible: true,
      });

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setActionFeedback(null);
      }, 3000);
    } catch (err) {
      logError('Error processing bulk action', err);

      // Show error feedback
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to process bulk action',
        visible: true,
      });

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setActionFeedback(null);
      }, 3000);
    }
  };

  // Export users as CSV
  const exportUsers = () => {
    const usersToExport =
      selectedUsers.length > 0
        ? sortedUsers.filter(user => selectedUsers.includes(user.id))
        : sortedUsers;

    // Create CSV header
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'User Type',
      'Status',
      'Created At',
      'Last Login',
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...usersToExport.map(user =>
        [
          user.firstName,
          user.lastName,
          user.email,
          user.userType,
          user.accountStatus,
          user.createdAt,
          user.lastLogin || '',
        ].join(',')
      ),
    ].join('\n');

    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update selected status when filtered list changes
  useEffect(() => {
    if (sortedUsers.length > 0 && selectedUsers.length === sortedUsers.length) {
      setIsAllSelected(true);
    } else {
      setIsAllSelected(false);
    }
  }, [sortedUsers.length, selectedUsers.length]);

  useEffect(() => {
    logInfo('admin-users rendered (with real data)');

    if (data?.success) {
      try {
        // Ensure we have all necessary user data
        if (data.users && data.users.length > 0) {
          // Log the first user for debugging
          logInfo('Sample user data', {
            user: {
              id: data.users[0].id,
              name: `${data.users[0].firstName} ${data.users[0].lastName}`,
              email: data.users[0].email,
              userType: data.users[0].userType,
            },
          });
        }

        logValidation('4.10', 'success', 'Admin users connected to real data via local API.');
      } catch (e) {
        console.error('Could not log validation', e);
      }
    }
  }, [data]);

  // Update show bulk actions based on selections
  useEffect(() => {
    setShowBulkActions(selectedUsers.length > 0);
  }, [selectedUsers]);

  // Add new state for dropdown menus
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Only close if we have an active dropdown
      if (
        activeDropdown &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }

    // Add event listener only when we have an active dropdown
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [activeDropdown, dropdownRef]);

  // Toggle dropdown menu for a user
  const toggleDropdown = (userId: string) => {
    // If clicking the same dropdown, close it
    if (activeDropdown === userId) {
      setActiveDropdown(null);
    } else {
      // Otherwise open the clicked dropdown (and close any other open dropdown)
      setActiveDropdown(userId);
    }
  };

  // Handle actions directly from the dropdown menu
  const handleDropdownAction = (action: string, userId: string, e?: React.MouseEvent) => {
    // Stop event propagation if event is passed
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Add detailed logging
    logInfo('Dropdown action clicked', { action, userId });

    // Close the dropdown after action is selected
    setActiveDropdown(null);

    // Handle different actions
    switch (action) {
      case 'view':
        // Use router instead of window.location for better Next.js integration
        logInfo(`Viewing user details for ${userId}`);
        window.location.href = `/admin/users/${userId}`;
        break;
      case 'edit':
        logInfo(`Editing user ${userId}`);
        window.location.href = `/admin/users/${userId}/edit`;
        break;
      case 'reset-password':
        logInfo(`Opening reset password modal for user ${userId}`);
        setConfirmAction({
          type: 'password',
          userId: userId,
        });
        break;
      case 'send-message':
        logInfo(`Opening message modal for user ${userId}`);
        setConfirmAction({
          type: 'message',
          userId: userId,
        });
        break;
      case 'activate':
        logInfo(`Activating user ${userId}`);
        handleStatusChange(userId, AccountStatus.ACTIVE);
        break;
      case 'suspend':
        logInfo(`Suspending user ${userId}`);
        handleStatusChange(userId, AccountStatus.SUSPENDED);
        break;
      case 'deactivate':
        logInfo(`Opening deactivation confirmation for user ${userId}`);
        setConfirmAction({
          type: 'deactivate',
          userId: userId,
        });
        break;
      default:
        logError(`Unknown action: ${action}`);
        break;
    }
  };

  // Add state for message form
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
  });

  // Add handler for message form changes
  const handleMessageFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setMessageForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add handler for message form submission
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();

    if (!confirmAction || confirmAction.type !== 'message') return;
    if (!messageForm.subject || !messageForm.message) return;

    setIsActionLoading(true);

    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      logInfo('Message sent to user', {
        userId: confirmAction.userId,
        subject: messageForm.subject,
        message: messageForm.message,
      });

      // Reset form
      setMessageForm({ subject: '', message: '' });
      setConfirmAction(null);

      // Show success feedback
      setActionFeedback({
        type: 'success',
        message: 'Message sent successfully',
        visible: true,
      });

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setActionFeedback(null);
      }, 3000);
    } catch (err) {
      logError('Error sending message', err);

      // Show error feedback
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send message',
        visible: true,
      });

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setActionFeedback(null);
      }, 3000);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Add handler for password reset
  const handlePasswordReset = async (userId: string) => {
    setIsActionLoading(true);

    try {
      // In a real app, this would call an API endpoint to trigger password reset
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      logInfo('Password reset requested', { userId });

      // Clear confirmation dialog
      setConfirmAction(null);

      // Show success feedback
      setActionFeedback({
        type: 'success',
        message: 'Password reset link sent successfully',
        visible: true,
      });

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setActionFeedback(null);
      }, 3000);
    } catch (err) {
      logError('Error resetting password', err);

      // Show error feedback
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to reset password',
        visible: true,
      });

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setActionFeedback(null);
      }, 3000);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Make sure the UI updates when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      refetch();
    }
  }, [refreshKey, refetch]);

  return (
    <div className="space-y-8">
      {/* Action feedback toast notification */}
      {actionFeedback && actionFeedback.visible && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
            actionFeedback.type === 'success'
              ? 'bg-green-100 border border-green-200 text-green-800'
              : 'bg-red-100 border border-red-200 text-red-800'
          } animate-fadeIn`}
        >
          <div className="flex items-center">
            {actionFeedback.type === 'success' ? (
              <Check className="h-5 w-5 mr-2" />
            ) : (
              <AlertTriangle className="h-5 w-5 mr-2" />
            )}
            <p>{actionFeedback.message}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold dark:text-white">User Management</h1>

        <div className="flex gap-2">
          <Link href="/admin/users/create">
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </Link>
        </div>
      </div>

        {/* Search & Filter Toolbar */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[250px]">
            <Input
              placeholder="Search by name or email…"
              className="pl-10"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <ChevronDown className="h-4 w-4 rotate-45" />
                </button>
              )}
          </div>

            <Button
              variant={showFilterDrawer ? 'primary' : 'outline'}
              size="md"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className="flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {(filterType || filterStatus) && (
                <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium rounded-full px-2 py-0.5">
                  {(filterType ? 1 : 0) + (filterStatus ? 1 : 0)}
                </span>
              )}
            </Button>

            <Button variant="outline" onClick={exportUsers} title="Export Users as CSV">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Link href="/admin/users/create" className="ml-auto">
              <Button className="whitespace-nowrap">
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </Link>
          </div>

          {showFilterDrawer && (
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm animate-fadeIn">
              <div className="flex flex-wrap gap-4">
                <div className="min-w-[200px]">
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    User Type
                  </label>
            <Select
                    className="w-full"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
                    <option value="">All Types</option>
              <option value="patient">Patients</option>
              <option value="doctor">Doctors</option>
              <option value="admin">Admins</option>
            </Select>
                </div>

                <div className="min-w-[200px]">
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Account Status
                  </label>
            <Select
                    className="w-full"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
                    <option value="">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="suspended">Suspended Only</option>
                    <option value="deactivated">Deactivated Only</option>
            </Select>
                </div>

                <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={resetFilters} title="Reset Filters">
                    <RotateCw className="h-4 w-4 mr-2" />
                    Reset Filters
            </Button>
          </div>
        </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded mb-4 border border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium mr-3">
                {selectedUsers.length} {selectedUsers.length === 1 ? 'user' : 'users'} selected
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleBulkAction('activate')}
                className="flex items-center"
                title="Activate selected users"
              >
                <Check className="h-4 w-4 mr-2" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleBulkAction('suspend')}
                className="flex items-center"
                title="Suspend selected users"
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspend
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleBulkAction('deactivate')}
                className="flex items-center"
                title="Deactivate selected users"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedUsers([])}
                className="flex items-center"
                title="Clear selection"
              >
                Clear
              </Button>
            </div>
            <div>
              <Button size="sm" variant="secondary" onClick={() => setShowBulkActions(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 sticky top-0">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left font-medium w-10">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Last Login</th>
                <th className="px-4 py-3 text-center font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <div className="flex justify-center">
                      <Spinner />
                    </div>
                    <p className="mt-2 text-slate-500">Loading users...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <Alert variant="error" className="inline-flex">
                      Error loading users. Please try again.
                    </Alert>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Filter className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-2" />
                      <p>No users match your filters</p>
                      <Button variant="link" onClick={resetFilters} className="mt-2">
                        Reset all filters
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user: User) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      selectedUsers.includes(user.id) ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                    } animate-highlight`}
                  >
                    <td className="px-4 py-3">
                        <input
                          type="checkbox"
                        className="rounded text-primary-600 focus:ring-primary-500"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          id={`user-${user.id}`}
                        />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="font-medium text-slate-900 dark:text-white">
                            {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          user.userType === UserType.ADMIN
                            ? 'warning'
                            : user.userType === UserType.DOCTOR
                              ? 'success'
                              : 'primary'
                        }
                        className="capitalize"
                      >
                        {user.userType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          user.accountStatus === AccountStatus.ACTIVE
                            ? 'success'
                            : user.accountStatus === AccountStatus.SUSPENDED
                              ? 'warning'
                              : 'danger'
                        }
                        className="capitalize px-3 py-1 text-sm font-medium shadow-sm"
                      >
                        {user.accountStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span title={formatDateTime(user.createdAt)}>
                        {formatDate(user.createdAt) || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span
                        title={user.lastLogin ? formatDateTime(user.lastLogin) : 'Never logged in'}
                      >
                        {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <div className="relative" ref={dropdownRef}>
                        <Button
                          variant="ghost"
                          size="sm"
                            onClick={() => toggleDropdown(user.id)}
                            className="flex items-center"
                            title="User Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="ml-1">Actions</span>
                            <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>

                          {activeDropdown === user.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg z-10 border border-slate-200 dark:border-slate-700">
                              <ul className="py-1">
                                <li>
                                  <a
                                    href={`/admin/users/${user.id}`}
                                    className="block w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </a>
                                </li>

                                <li>
                                  <a
                          href={`/admin/users/${user.id}/edit`}
                                    className="block w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit User
                                  </a>
                                </li>

                                <li>
                                  <a
                                    href="#"
                                    className="block w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    onClick={e => {
                                      e.preventDefault();
                                      setActiveDropdown(null);
                              setConfirmAction({
                                        type: 'password',
                                userId: user.id,
                                      });
                                    }}
                                  >
                                    <Key className="h-4 w-4 mr-2" />
                                    Reset Password
                                  </a>
                                </li>

                                <li>
                                  <a
                                    href="#"
                                    className="block w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    onClick={e => {
                                      e.preventDefault();
                                      setActiveDropdown(null);
                            setConfirmAction({
                                        type: 'message',
                              userId: user.id,
                                      });
                                    }}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Send Message
                                  </a>
                                </li>

                                <li>
                                  <hr className="my-1 border-slate-200 dark:border-slate-700" />
                                </li>

                                <li className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                  Status Actions
                                </li>

                                {user.accountStatus !== AccountStatus.ACTIVE && (
                                  <li>
                                    <a
                                      href="#"
                                      className="block w-full text-left flex items-center px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors duration-200"
                                      onClick={e => {
                                        e.preventDefault();
                                        setActiveDropdown(null);
                                        handleStatusChange(user.id, AccountStatus.ACTIVE);
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Activate Account
                                    </a>
                                  </li>
                                )}

                                {user.accountStatus !== AccountStatus.SUSPENDED && (
                                  <li>
                                    <a
                                      href="#"
                                      className="block w-full text-left flex items-center px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors duration-200"
                                      onClick={e => {
                                        e.preventDefault();
                                        setActiveDropdown(null);
                                        handleStatusChange(user.id, AccountStatus.SUSPENDED);
                                      }}
                                    >
                                      <Ban className="h-4 w-4 mr-2" />
                                      Suspend Account
                                    </a>
                                  </li>
                                )}

                                {user.accountStatus !== AccountStatus.DEACTIVATED && (
                                  <li>
                                    <a
                                      href="#"
                                      className="block w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors duration-200"
                                      onClick={e => {
                                        e.preventDefault();
                                        setActiveDropdown(null);
                                        setConfirmAction({
                                          type: 'deactivate',
                                          userId: user.id,
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Deactivate Account
                                    </a>
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with stats */}
        {!isLoading && !error && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {sortedUsers.length}
                </span>{' '}
                of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {users.length}
                </span>{' '}
                total users
            </div>

              <div className="flex flex-wrap gap-4 sm:gap-6">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Patients:{' '}
                    <span className="font-medium">
                      {users.filter(u => u.userType === UserType.PATIENT).length}
                    </span>
                  </span>
            </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-success mr-2"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Doctors:{' '}
                    <span className="font-medium">
                      {users.filter(u => u.userType === UserType.DOCTOR).length}
                    </span>
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-warning mr-2"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Admins:{' '}
                    <span className="font-medium">
                      {users.filter(u => u.userType === UserType.ADMIN).length}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-100 dark:border-green-900/30 transition-all duration-300">
                <div className="text-xs uppercase text-green-700 dark:text-green-400 font-semibold mb-1">
                  Active Users
                </div>
                <div className="text-2xl font-bold text-green-800 dark:text-green-300">
                  {users.filter(u => u.accountStatus === AccountStatus.ACTIVE).length}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                  {Math.round(
                    (users.filter(u => u.accountStatus === AccountStatus.ACTIVE).length /
                      users.length) *
                      100
                  )}
                  % of total
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md border border-orange-100 dark:border-orange-900/30 transition-all duration-300">
                <div className="text-xs uppercase text-orange-700 dark:text-orange-400 font-semibold mb-1">
                  Suspended Users
                </div>
                <div className="text-2xl font-bold text-orange-800 dark:text-orange-300">
                  {users.filter(u => u.accountStatus === AccountStatus.SUSPENDED).length}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                  {Math.round(
                    (users.filter(u => u.accountStatus === AccountStatus.SUSPENDED).length /
                      users.length) *
                      100
                  )}
                  % of total
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-900/30 transition-all duration-300">
                <div className="text-xs uppercase text-red-700 dark:text-red-400 font-semibold mb-1">
                  Deactivated Users
                </div>
                <div className="text-2xl font-bold text-red-800 dark:text-red-300">
                  {users.filter(u => u.accountStatus === AccountStatus.DEACTIVATED).length}
                </div>
                <div className="text-xs text-red-600 dark:text-red-500 mt-1">
                  {Math.round(
                    (users.filter(u => u.accountStatus === AccountStatus.DEACTIVATED).length /
                      users.length) *
                      100
                  )}
                  % of total
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Status Change Confirmation Modal */}
      {confirmAction?.type === 'status' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Change User Status</h3>
            <p className="mb-4">Select the new status for this user:</p>
            <div className="space-y-2 mb-6">
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => updateUserStatus(confirmAction.userId, AccountStatus.ACTIVE)}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Activate Account
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => updateUserStatus(confirmAction.userId, AccountStatus.SUSPENDED)}
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Suspend Account
              </Button>
              <Button
                variant="danger"
                className="w-full justify-center"
                onClick={() => updateUserStatus(confirmAction.userId, AccountStatus.DEACTIVATED)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate Account
              </Button>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {confirmAction?.type === 'password' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
            <p className="mb-6">
              This will send a password reset link to the user's email address. Continue?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handlePasswordReset(confirmAction.userId)}
                isLoading={isActionLoading}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Reset Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Modal */}
      {confirmAction?.type === 'deactivate' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 text-danger">Confirm Account Deactivation</h3>
            <p className="mb-4">
              Are you sure you want to deactivate this user account? This action:
            </p>
            <ul className="list-disc pl-5 mb-6 space-y-1 text-sm">
              <li>Will prevent the user from logging in</li>
              <li>Will cancel all their pending appointments</li>
              <li>Can be reversed later by an administrator</li>
            </ul>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  updateUserStatus(
                    confirmAction.userId,
                    AccountStatus.DEACTIVATED,
                    'Admin deactivation'
                  );
                }}
                isLoading={isActionLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Message User Modal */}
      {confirmAction?.type === 'message' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Send Message to User</h3>
            <form onSubmit={handleSendMessage}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Subject</label>
                <Input
                  name="subject"
                  placeholder="Enter message subject..."
                  className="w-full"
                  value={messageForm.subject}
                  onChange={handleMessageFormChange}
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  name="message"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60 dark:bg-slate-700 dark:text-white"
                  rows={4}
                  placeholder="Enter your message..."
                  value={messageForm.message}
                  onChange={handleMessageFormChange}
                  required
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isActionLoading}>
                <Mail className="h-4 w-4 mr-2" />
                  Send Message
              </Button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* Add status change animation styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        @keyframes highlight {
          0% {
            background-color: transparent;
          }
          50% {
            background-color: rgba(99, 102, 241, 0.1);
          }
          100% {
            background-color: transparent;
          }
        }

        .animate-highlight {
          animation: highlight 2s ease-in-out;
        }

        .badge-pulse {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(99, 102, 241, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
          }
        }
      `}</style>
    </div>
  );
}
