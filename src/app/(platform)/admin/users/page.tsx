'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
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
import { 
  useAllUsers, 
  useAdminActivateUser, 
  useAdminTriggerPasswordReset,
  type AdminUserListItem // Import the type
} from '@/data/adminLoaders';
import { useToast, ToastProvider } from '@/components/ui/use-toast';
// Custom hook for media queries
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
};
import { UserType, AccountStatus } from '@/types/enums';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { logInfo, logValidation, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';

// TypeScript interface for the API response
interface UsersApiResponse {
  success: boolean;
  users: User[];
  totalCount: number;
  error?: string;
}

// Define types for the user data
interface User {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  userType: UserType;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  profilePictureUrl?: string | null;
  accountStatus: AccountStatus;
  lastLogin?: string | null;
};

interface UserRowProps {
  user: User;
  selectedUsers: string[];
  toggleSelectUser: (userId: string) => void;
  activeDropdown: string | null;
  setActiveDropdown: (userId: string | null) => void;
  handleStatusChange: (userId: string, status: AccountStatus) => void;
  isActionLoading: boolean;
}

// UserRow component for virtualized list
const UserRow = React.memo(({
  user,
  selectedUsers,
  toggleSelectUser,
  activeDropdown,
  setActiveDropdown,
  handleStatusChange,
  isActionLoading
}: UserRowProps) => {
  return (
    <div className="flex items-center w-full px-4 py-3 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
      <div className="w-8 flex-shrink-0">
        <input
          type="checkbox"
          className="rounded text-primary-600 focus:ring-primary-500"
          checked={selectedUsers.includes(user.id)}
          onChange={() => toggleSelectUser(user.id)}
          id={`user-${user.id}`}
        />
      </div>
      
      <div className="flex-grow flex items-center">
        <div className="w-1/4 font-medium text-slate-900 dark:text-white truncate">
          {user.firstName} {user.lastName}
        </div>
        
        <div className="w-1/4 text-slate-600 dark:text-slate-300 truncate">
          {user.email}
        </div>
        
        <div className="w-1/6">
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
        </div>
        
        <div className="w-1/6">
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
        </div>
        
        <div className="w-1/6 text-sm text-slate-500 dark:text-slate-400">
          {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
        </div>
      </div>
      
      <div className="flex-shrink-0 flex items-center space-x-2">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
            aria-label="User actions"
            className="rounded-full p-2"
            disabled={isActionLoading}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          
          {activeDropdown === user.id && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg z-10 border border-slate-200 dark:border-slate-700">
              <div className="py-1">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
                
                {user.accountStatus !== AccountStatus.ACTIVE && (
                  <button
                    onClick={() => handleStatusChange(user.id, AccountStatus.ACTIVE)}
                    className="w-full flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    disabled={isActionLoading}
                  >
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Activate
                  </button>
                )}
                
                {user.accountStatus !== AccountStatus.SUSPENDED && (
                  <button
                    onClick={() => handleStatusChange(user.id, AccountStatus.SUSPENDED)}
                    className="w-full flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    disabled={isActionLoading}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                    Suspend
                  </button>
                )}
                
                {user.accountStatus !== AccountStatus.DEACTIVATED && (
                  <button
                    onClick={() => handleStatusChange(user.id, AccountStatus.DEACTIVATED)}
                    className="w-full flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    disabled={isActionLoading}
                  >
                    <Ban className="h-4 w-4 mr-2 text-red-500" />
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

UserRow.displayName = 'UserRow';

// VirtualizedList component definition
interface VirtualizedListProps<T> {
  data: T[];
  height: number;
  itemHeight: number;
  renderRow: (props: { item: T; index: number }) => React.ReactNode;
}

function VirtualizedList<T>({
  data,
  height,
  itemHeight,
  renderRow,
}: VirtualizedListProps<T>) {
  return (
    <div className="overflow-y-auto" style={{ height }}>
      {data.map((item, index) => (
        <div key={index} style={{ height: itemHeight }}>
          {renderRow({ item, index })}
        </div>
      ))}
    </div>
  );
}

// Define action types for confirmation dialogs
type ConfirmActionType = 'deactivate' | 'activate' | 'suspend' | 'delete' | 'password' | 'message' | 'status' | null;

interface ConfirmActionState {
  type: ConfirmActionType;
  userId?: string;
  title?: string;
  description?: string;
  onConfirm?: () => Promise<void>;
}

// Corrected useDebounce hook for debouncing function calls
function useDebounceCallback(
  callback: (...args: any[]) => void, 
  delay: number
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(() => {
    let handler: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(handler);
      handler = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    };
  }, [delay]);
}

function AdminUsersPageContent() {
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  const [usersToDisplay, setUsersToDisplay] = useState<AdminUserListItem[]>([]);
  
  // State for search and filtering
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<UserType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // State for UI
  const [sortConfig, setSortConfig] = useState<{ key: keyof AdminUserListItem; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc',
  });
  
  // State for user selection and actions
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // State for action feedback
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    visible: boolean;
  } | null>(null);
  
  // State for confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
  
  // State for message form
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
  });
  
  // State for virtualized list
  const [virtualizedState, setVirtualizedState] = useState({
    isVisible: false,
  });
  
  // Refs
  const virtualizedRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Check if mobile view
  const [isMobile, setIsMobile] = useState(false);
  
  // Toast hook
  const { toast } = useToast();
  
  // API hooks
  const { data: usersData, isLoading, error, refetch } = useAllUsers({
    page: currentPage,
    limit: itemsPerPage,
    filter: searchQuery,
    status: statusFilter === 'all' ? 'all' : 
           statusFilter === AccountStatus.ACTIVE ? 'active' : 'inactive',
    userType: userTypeFilter === 'all' ? undefined : userTypeFilter,
  });
  
  const { mutateAsync: activateUser } = useAdminActivateUser();
  const { mutateAsync: resetPassword } = useAdminTriggerPasswordReset();
  
  useEffect(() => {
    if (usersData?.users) {
      setUsersToDisplay(usersData.users);
    }
  }, [usersData]);

  const debouncedSetSearchQuery = useDebounceCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, 300);
  
  const processedUsersForDisplay = useMemo(() => {
    if (!usersData?.users) return [];
    return usersData.users.map(apiUser => ({
      ...apiUser,
      phoneNumber: apiUser.phone || undefined,
      address: (apiUser as any).address || '',
      city: (apiUser as any).city || '',
      state: (apiUser as any).state || '',
      zipCode: (apiUser as any).zipCode || '',
      lastLogin: (apiUser as any).lastLogin || apiUser.updatedAt,
    }));
  }, [usersData]);

  const filteredUsers = useMemo(() => {
    let filtered = [...usersToDisplay];
    return [...filtered].sort((a, b) => {
      if (!sortConfig?.key) return 0;
      const key = sortConfig.key as keyof AdminUserListItem;
      
      const aValue = a[key];
      const bValue = b[key];
      
      if (aValue === bValue) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      
      return 0;
    });
  }, [usersToDisplay, sortConfig]);

  // Calculate pagination
  const totalUserCount = filteredUsers.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = useMemo(() => 
    filteredUsers.slice(startIndex, startIndex + itemsPerPage),
    [filteredUsers, startIndex, itemsPerPage]
  );
  const totalPages = Math.ceil(totalUserCount / itemsPerPage);

  // Handle pagination
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  // Toggle user selection
  const toggleSelectUser = useCallback((userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  }, []);

  // Toggle select all users
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(usersToDisplay.map(user => user.id));
    }
    setIsAllSelected(!isAllSelected);
  }, [isAllSelected, usersToDisplay]);

  // Handle status change
  const handleStatusChange = useCallback(async (userId: string, status: AccountStatus) => {
    try {
      setIsActionLoading(true);
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setUsersToDisplay(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, accountStatus: status } : user
        )
      );
      
      setActionFeedback({
        type: 'success',
        message: `User ${status === AccountStatus.ACTIVE ? 'activated' : 'deactivated'} successfully`,
        visible: true,
      });
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: 'Failed to update user status',
        visible: true,
      });
    } finally {
      setIsActionLoading(false);
      setActiveDropdown(null);
    }
  }, []);

  // Handle password reset
  const handlePasswordReset = useCallback(async (userId: string) => {
    try {
      setIsActionLoading(true);
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setActionFeedback({
        type: 'success',
        message: 'Password reset email sent successfully',
        visible: true,
      });
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: 'Failed to send password reset email',
        visible: true,
      });
    } finally {
      setIsActionLoading(false);
      setConfirmAction(null);
    }
  }, []);

  // Handle message form change
  const handleMessageFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMessageForm(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Handle send message
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmAction) return;
    
    try {
      setIsActionLoading(true);
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setActionFeedback({
        type: 'success',
        message: 'Message sent successfully',
        visible: true,
      });
      
      // Reset form and close dialog
      setMessageForm({ subject: '', message: '' });
      setConfirmAction(null);
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: 'Failed to send message',
        visible: true,
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [confirmAction]);

  // Close action feedback after delay
  useEffect(() => {
    if (actionFeedback?.visible) {
      const timer = setTimeout(() => {
        setActionFeedback(prev => prev ? { ...prev, visible: false } : null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if mobile view
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">User Management</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link href="/admin/users/new">
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search users..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); debouncedSetSearchQuery(e.target.value); }}
                icon={<Search className="h-4 w-4 text-slate-400" />}
                className="w-full"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')}
              className="w-full md:w-48"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Select
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value as UserType)}
              className="w-full md:w-48"
            >
              <option value="all">All Types</option>
              {Object.values(UserType).map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        {/* Users Table Card */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              {/* Table Header */}
              <div className="bg-slate-50 dark:bg-slate-800">
                <div className="grid grid-cols-12 px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">Name</div>
                  <div className="col-span-2">Email</div>
                  <div className="col-span-1">Type</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2">Last Login</div>
                  <div className="col-span-2">Joined</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      selectedUsers={selectedUsers}
                      toggleSelectUser={toggleSelectUser}
                      activeDropdown={activeDropdown}
                      setActiveDropdown={setActiveDropdown}
                      handleStatusChange={handleStatusChange}
                      isActionLoading={isActionLoading}
                    />
                  ))
                ) : (
                  <div className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">
                    No users found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pagination (Part of Users Table Card) */}
          <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-medium">{paginatedUsers.length > 0 ? startIndex + 1 : 0}</span> to{' '}
              <span className="font-medium">
                {Math.min(startIndex + itemsPerPage, totalUserCount)}
              </span>{' '}
              of <span className="font-medium">{totalUserCount}</span> results
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>

        {/* Action Feedback Toast */}
        {actionFeedback?.visible && (
          <div 
            className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ${
              actionFeedback.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
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

        {/* Confirmation Dialogs */}
        {/* Deactivate Confirmation */}
        {confirmAction?.type === 'deactivate' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">Confirm Deactivation</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Are you sure you want to deactivate this user? They will no longer be able to log in.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                  disabled={isActionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirmAction?.userId) {
                      handleStatusChange(confirmAction.userId, AccountStatus.DEACTIVATED);
                      setConfirmAction(null);
                    }
                  }}
                  isLoading={isActionLoading} 
                >
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Confirmation */}
        {confirmAction?.type === 'password' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">Reset Password</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Are you sure you want to send a password reset email to this user?
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                  disabled={isActionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (confirmAction?.userId) { 
                      handlePasswordReset(confirmAction.userId);
                      setConfirmAction(null); // Also close dialog on action
                    }
                  }}
                  isLoading={isActionLoading} 
                >
                  Send Reset Email
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Message User Modal */}
        {confirmAction?.type === 'message' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <form onSubmit={handleSendMessage} className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">Send Message</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <Input
                    name="subject"
                    value={messageForm.subject}
                    onChange={handleMessageFormChange}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={messageForm.message}
                    onChange={handleMessageFormChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                  disabled={isActionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isActionLoading}
                >
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* NEW/Corrected Stats Footer */}
        <div className="flex flex-wrap justify-between items-center gap-4 px-6 py-3 border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {paginatedUsers.length > 0 ? startIndex + 1 : 0}-
              {Math.min(startIndex + itemsPerPage, totalUserCount)}
            </span>{' '}
            of <span className="font-medium">{totalUserCount}</span> users
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Patients:{' '}
                <span className="font-medium">
                  {usersToDisplay.filter((u) => u.userType === UserType.PATIENT).length}
                </span>
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-success mr-2"></div>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Doctors:{' '}
                <span className="font-medium">
                  {usersToDisplay.filter((u) => u.userType === UserType.DOCTOR).length}
                </span>
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Admins:{' '}
                <span className="font-medium">
                  {usersToDisplay.filter((u) => u.userType === UserType.ADMIN).length}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Three Summary Stat Cards */}
        <div className="mt-4 px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Active Users Card */}
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-100 dark:border-green-900/30 transition-all duration-300">
            <div className="text-xs uppercase text-green-700 dark:text-green-400 font-semibold mb-1">
              Active Users
            </div>
            <div className="text-2xl font-bold text-green-800 dark:text-green-300">
              {usersToDisplay.filter(u => u.accountStatus === AccountStatus.ACTIVE).length}
            </div>
            {usersToDisplay.length > 0 && (
              <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                {Math.round(
                  (usersToDisplay.filter(u => u.accountStatus === AccountStatus.ACTIVE).length /
                    usersToDisplay.length) * 100
                )}% of total
              </div>
            )}
          </div>
          {/* Suspended Users Card */}
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md border border-orange-100 dark:border-orange-900/30 transition-all duration-300">
            <div className="text-xs uppercase text-orange-700 dark:text-orange-400 font-semibold mb-1">
              Suspended Users
            </div>
            <div className="text-2xl font-bold text-orange-800 dark:text-orange-300">
              {usersToDisplay.filter(u => u.accountStatus === AccountStatus.SUSPENDED).length}
            </div>
            {usersToDisplay.length > 0 && (
              <div className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                {Math.round(
                  (usersToDisplay.filter(u => u.accountStatus === AccountStatus.SUSPENDED).length /
                    usersToDisplay.length) * 100
                )}% of total
              </div>
            )}
          </div>
          {/* Deactivated Users Card */}
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-900/30 transition-all duration-300">
            <div className="text-xs uppercase text-red-700 dark:text-red-400 font-semibold mb-1">
              Deactivated Users
            </div>
            <div className="text-2xl font-bold text-red-800 dark:text-red-300">
              {usersToDisplay.filter(u => u.accountStatus === AccountStatus.DEACTIVATED).length}
            </div>
            {usersToDisplay.length > 0 && (
              <div className="text-xs text-red-600 dark:text-red-500 mt-1">
                {Math.round(
                  (usersToDisplay.filter(u => u.accountStatus === AccountStatus.DEACTIVATED).length /
                    usersToDisplay.length) * 100
                )}% of total
              </div>
            )}
          </div>
        </div>
      </div>

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
            background-color: rgba(99, 102, 241, 0.1); /* Assuming primary-500 is this color */
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
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); /* Assuming primary-500 is this color */
          }
          70% {
            box-shadow: 0 0 0 6px rgba(99, 102, 241, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
          }
        }
      `}</style>
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <ToastProvider>
      <AdminUsersPageContent />
    </ToastProvider>
  );
}
