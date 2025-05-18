'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Filter,
  RotateCw,
  MoreVertical,
  Check,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { useAllUsers, useAdminActivateUser } from '@/data/adminLoaders';
import { UserType, AccountStatus } from '@/types/enums';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';

// Dynamically import the VirtualizedList component to reduce initial load time
const VirtualizedList = dynamic(() => import('@/components/ui/VirtualizedList'), {
  ssr: false,
  loading: () => <div className="py-4"><Spinner /></div>
});

// TypeScript interface for the API response
interface UsersApiResponse {
  success: boolean;
  users: User[];
  totalCount: number;
  error?: string;
}

// TypeScript interface for user
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  userType: UserType;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  accountStatus: AccountStatus;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  phoneNumber?: string;
  profilePictureUrl?: string;
}

// UserRow component for virtualized list
const UserRow = React.memo(({ 
  user, 
  selectedUsers, 
  toggleSelectUser, 
  activeDropdown, 
  setActiveDropdown,
  handleStatusChange,
  isActionLoading,
  style
}: { 
  user: User; 
  selectedUsers: string[];
  toggleSelectUser: (userId: string) => void;
  activeDropdown: string | null;
  setActiveDropdown: React.Dispatch<React.SetStateAction<string | null>>;
  handleStatusChange: (userId: string, status: AccountStatus) => Promise<void>;
  isActionLoading: boolean;
  style: React.CSSProperties;
}) => {
  return (
    <div 
      className="flex items-center w-full px-4 py-3 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
      style={style}
    >
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

export default function AdminUsersPage() {
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  
  // Virtualization state with enhanced device detection
  const [virtualizedState, setVirtualizedState] = useState({
    isVisible: false,
    isMobile: false,
    isTablet: false,
    hasRendered: false,
    itemSize: 72, // Default height of each user row in pixels
    visibleStartIndex: 0,
    visibleEndIndex: 0
  });
  
  const virtualizedRef = useRef<HTMLDivElement>(null);
  
  // Fetch users data
  const { data, isLoading, error, refetch } = useAllUsers();
  const activateUserMutation = useAdminActivateUser();
  
  // Performance tracking
  const perfTracker = useRef(trackPerformance('AdminUsersPage'));
  
  // Map API user objects to our User interface
  const processedUsers = useMemo(() => {
    if (!data?.users) return [];
    
    return data.users.map(apiUser => {
      // Generate a unique ID if missing
      const id = ('id' in apiUser ? apiUser.id : undefined) || `user-${apiUser.email || Date.now().toString()}`;
      
      // Map account status from isActive if needed
      const isActive = typeof apiUser.isActive === 'boolean' ? apiUser.isActive : true;
      const accountStatus = 'accountStatus' in apiUser 
        ? apiUser.accountStatus 
        : (isActive ? AccountStatus.ACTIVE : AccountStatus.INACTIVE);
        
      return {
        ...apiUser,
        id,
        accountStatus
      } as User;
    });
  }, [data]);
  
  // Filter and sort users
  const usersToDisplay = useMemo(() => {
    if (!processedUsers.length) return [];
    
    const users = [...processedUsers];
    
    // Apply filters
    let filteredUsers = users;
    
    if (filterType) {
      filteredUsers = filteredUsers.filter(user => user.userType === filterType);
    }
    
    if (filterStatus) {
      // Map isActive to accountStatus if needed
      filteredUsers = filteredUsers.filter(user => {
        // If user has accountStatus property, use it directly
        if ('accountStatus' in user) {
          return user.accountStatus === filterStatus;
        }
        // Otherwise map isActive to active/inactive status
        const isActive = typeof user.isActive === 'boolean' ? user.isActive : true;
        return (filterStatus === AccountStatus.ACTIVE && isActive) || 
               (filterStatus === AccountStatus.INACTIVE && !isActive);
      });
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter(
        user =>
          user.firstName.toLowerCase().includes(query) ||
          user.lastName.toLowerCase().includes(query) ||
          (user.email ? user.email.toLowerCase().includes(query) : false)
      );
    }
    
    // Sort by name
    filteredUsers.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    return filteredUsers;
  }, [data, filterType, filterStatus, searchQuery]);
  
  // Total user count
  const totalUserCount = data?.totalCount || 0;
  
  // Enhanced device detection with precise breakpoints
  const checkDeviceType = useCallback(() => {
    const width = window.innerWidth;
    const isMobile = width < 640; // sm breakpoint
    const isTablet = width >= 640 && width < 1024; // md-lg breakpoint
    
    // Adjust item size based on device type
    const itemSize = isMobile ? 100 : isTablet ? 85 : 72;
    
    setVirtualizedState(prev => ({ 
      ...prev, 
      isMobile,
      isTablet,
      itemSize
    }));
  }, []);
  
  // Memoize the virtualized list configuration to prevent unnecessary re-renders
  const virtualizedConfig = useMemo(() => ({
    itemSize: virtualizedState.isMobile ? 100 : 72, // Height of each user row
    height: Math.min(virtualizedState.isMobile ? 500 : 600, usersToDisplay.length * (virtualizedState.isMobile ? 100 : 72), 600), // Limit max height
    overscanCount: virtualizedState.isMobile ? 2 : 5, // Fewer overscan items on mobile to save memory
  }), [virtualizedState.isMobile, usersToDisplay.length]);
  
  // Track when items are rendered in the virtualized list
  const handleItemsRendered = useCallback((info: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    if (usersToDisplay.length > 50) {
      logInfo('VirtualizedList items rendered', {
        visibleRange: `${info.visibleStartIndex}-${info.visibleStopIndex}`,
        overscanRange: `${info.overscanStartIndex}-${info.overscanStopIndex}`,
        totalItems: usersToDisplay.length
      });
    }
    
    setVirtualizedState(prev => ({
      ...prev,
      visibleStartIndex: info.visibleStartIndex,
      visibleEndIndex: info.visibleStopIndex,
      isVisible: true
    }));
  }, [usersToDisplay.length]);
  
  // Toggle user selection
  const toggleSelectUser = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  }, []);
  
  // Toggle select all users
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedUsers([]);
    } else {
      const pageUserIds = usersToDisplay.map(user => user.id);
      setSelectedUsers([...Array.from(new Set([...selectedUsers, ...pageUserIds]))]);
    }
    setIsAllSelected(!isAllSelected);
  }, [isAllSelected, selectedUsers, usersToDisplay]);
  
  // Reset filters
  const resetFilters = useCallback(() => {
    setFilterType('');
    setFilterStatus('');
    setSearchQuery('');
  }, []);
  
  // Handle status change
  const handleStatusChange = useCallback(async (userId: string, status: AccountStatus) => {
    setIsActionLoading(true);
    setActiveDropdown(null);
    
    try {
      await activateUserMutation.mutateAsync({
        userId,
        status
      });
      
      // Show success feedback
      setActionFeedback({
        visible: true,
        type: 'success',
        message: `User ${status === AccountStatus.ACTIVE ? 'activated' : status === AccountStatus.SUSPENDED ? 'suspended' : 'deactivated'} successfully.`
      });
      
      // Refresh data
      await refetch();
    } catch (err) {
      console.error('Error changing user status:', err);
      
      // Show error feedback
      setActionFeedback({
        visible: true,
        type: 'error',
        message: `Failed to change user status. ${err instanceof Error ? err.message : ''}`
      });
    } finally {
      setIsActionLoading(false);
      
      // Hide feedback after 3 seconds
      setTimeout(() => {
        setActionFeedback(prev => prev ? { ...prev, visible: false } : null);
      }, 3000);
    }
  }, [activateUserMutation, refetch]);
  
  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown && event.target instanceof Element) {
        const dropdownElements = document.querySelectorAll('[data-dropdown]');
        let clickedInside = false;
        
        dropdownElements.forEach(element => {
          if (element.contains(event.target as Node)) {
            clickedInside = true;
          }
        });
        
        if (!clickedInside) {
          setActiveDropdown(null);
        }
      }
    };
    
    // Add event listener only when we have an active dropdown
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeDropdown]);
  
  // Toggle dropdown
  const toggleDropdown = useCallback((userId: string) => {
    if (activeDropdown === userId) {
      setActiveDropdown(null);
    } else {
      // Otherwise open the clicked dropdown (and close any other open dropdown)
      setActiveDropdown(userId);
    }
  }, [activeDropdown]);
  
  // Debounce function to prevent excessive resize handling
  const debounce = <F extends (...args: any[]) => any>(
    func: F, 
    wait: number
  ): ((...args: Parameters<F>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<F>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };
  
  // Check for device type on mount and window resize with debouncing
  useEffect(() => {
    // Initial check
    checkDeviceType();
    
    // Create debounced handler to prevent performance issues
    const debouncedCheckDeviceType = debounce(checkDeviceType, 150);
    
    // Add resize listener with debounced handler
    window.addEventListener('resize', debouncedCheckDeviceType);
    
    // Cleanup function to remove listener and cancel any pending debounce
    return () => {
      window.removeEventListener('resize', debouncedCheckDeviceType);
    };
  }, [checkDeviceType]);
  
  // Update bulk actions visibility
  useEffect(() => {
    setShowBulkActions(selectedUsers.length > 0);
  }, [selectedUsers]);
  
  // Track performance
  useEffect(() => {
    // Log performance metrics when data is loaded
    if (!isLoading && data) {
      const loadTime = perfTracker.current.stop();
      logInfo('AdminUsersPage loaded', {
        userCount: data.users.length,
        loadTimeMs: loadTime,
        filterType,
        filterStatus,
        hasSearchQuery: !!searchQuery
      });
    }
    
    return () => {
      perfTracker.current.stop();
    };
  }, [isLoading, data, filterType, filterStatus, searchQuery]);
  
  return (
    <div className="space-y-8">
      {/* Action feedback toast notification */}
      {actionFeedback && actionFeedback.visible && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
            actionFeedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {actionFeedback.message}
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
        <Link href="/admin/users/new">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </Link>
      </div>
      
      <Card className="p-4 mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
            
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="min-w-[150px]"
            >
              <option value="">All Types</option>
              <option value={UserType.ADMIN}>Admin</option>
              <option value={UserType.DOCTOR}>Doctor</option>
              <option value={UserType.PATIENT}>Patient</option>
            </Select>
            
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value={AccountStatus.ACTIVE}>Active</option>
              <option value={AccountStatus.SUSPENDED}>Suspended</option>
              <option value={AccountStatus.DEACTIVATED}>Deactivated</option>
            </Select>
            
            <Button
              variant="outline"
              onClick={resetFilters}
              disabled={!filterType && !filterStatus && !searchQuery}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            >
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
          
          {showFilterDrawer && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-medium mb-3">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Additional filters would go here */}
                <div className="col-span-full">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Advanced filters coming soon...
                  </p>
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
              <span className="text-sm font-medium">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUsers([])}
              >
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Bulk activate users
                  selectedUsers.forEach(userId => {
                    handleStatusChange(userId, AccountStatus.ACTIVE);
                  });
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Bulk suspend users
                  selectedUsers.forEach(userId => {
                    handleStatusChange(userId, AccountStatus.SUSPENDED);
                  });
                }}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Suspend
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Bulk deactivate users
                  selectedUsers.forEach(userId => {
                    handleStatusChange(userId, AccountStatus.DEACTIVATED);
                  });
                }}
              >
                <Ban className="h-4 w-4 mr-1" />
                Deactivate
              </Button>
            </div>
          </div>
        )}
        
        <div className="overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-800 flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="w-8 flex-shrink-0">
              <input
                type="checkbox"
                className="rounded text-primary-600 focus:ring-primary-500"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                id="select-all"
              />
            </div>
            
            <div className="flex-grow flex items-center">
              <div className="w-1/4 font-medium text-slate-500 dark:text-slate-400">Name</div>
              <div className="w-1/4 font-medium text-slate-500 dark:text-slate-400">Email</div>
              <div className="w-1/6 font-medium text-slate-500 dark:text-slate-400">Type</div>
              <div className="w-1/6 font-medium text-slate-500 dark:text-slate-400">Status</div>
              <div className="w-1/6 font-medium text-slate-500 dark:text-slate-400">Last Login</div>
            </div>
            
            <div className="flex-shrink-0 w-10"></div>
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="py-20 text-center">
              <Spinner className="mx-auto h-8 w-8 text-primary-500" />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading users...</p>
            </div>
          )}
          
          {/* Error State */}
          {!isLoading && error && (
            <div className="py-10 text-center">
              <Alert variant="error" className="inline-flex">
                {error instanceof Error ? error.message : String(error)}
              </Alert>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoading && !error && usersToDisplay.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Filter className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-500 mb-4">No users found matching your criteria.</p>
              <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
            </div>
          )}
          
          {/* Virtualized User List */}
          {!isLoading && !error && usersToDisplay.length > 0 && (
            <div 
              ref={virtualizedRef}
              aria-label={`Users list containing ${usersToDisplay.length} users`}
            >
              {/* Show a loading state until the virtualized list is visible */}
              {!virtualizedState.isVisible && (
                <div className="py-4 text-center">
                  <Spinner />
                  <p className="text-sm text-slate-500 mt-2">Preparing user list...</p>
                </div>
              )}
              
              {/* Only render the virtualized list when it should be visible */}
              {virtualizedState.isVisible && (
                <div 
                  className={`transition-opacity duration-300 ${virtualizedState.hasRendered ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => {
                    // Mark as rendered after first load
                    setVirtualizedState(prev => ({ ...prev, hasRendered: true }));
                  }}
                >
                  {usersToDisplay.length > 20 ? (
                    <VirtualizedList
                      items={usersToDisplay}
                      itemSize={virtualizedConfig.itemSize}
                      height={virtualizedConfig.height}
                      overscanCount={virtualizedConfig.overscanCount}
                      onItemsRendered={handleItemsRendered}
                      renderItem={(item, index, style) => {
                        const user = item as User;
                        return (
                          <UserRow
                            key={user.id}
                            user={user}
                            selectedUsers={selectedUsers}
                            toggleSelectUser={toggleSelectUser}
                            activeDropdown={activeDropdown}
                            setActiveDropdown={setActiveDropdown}
                            handleStatusChange={handleStatusChange}
                            isActionLoading={isActionLoading}
                            style={style}
                          />
                        );
                      }}
                    />
                  ) : (
                    // For small lists, render without virtualization
                    <div>
                      {usersToDisplay.map(user => (
                        <UserRow
                          key={user.id}
                          user={user}
                          selectedUsers={selectedUsers}
                          toggleSelectUser={toggleSelectUser}
                          activeDropdown={activeDropdown}
                          setActiveDropdown={setActiveDropdown}
                          handleStatusChange={handleStatusChange}
                          isActionLoading={isActionLoading}
                          style={{}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with stats */}
        {!isLoading && !error && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {usersToDisplay.length}
                </span>{' '}
                of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {totalUserCount}
                </span>{' '}
                users
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
