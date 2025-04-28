'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { UserPlus, Search, Eye, Pencil, RotateCw, Key } from 'lucide-react';
import { useAllUsers } from '@/data/adminLoaders';
import { UserType, AccountStatus } from '@/types/enums';
import { formatDate } from '@/lib/dateUtils';
import { logInfo, logValidation } from '@/lib/logger';

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
}

export default function AdminUsersPage() {
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { data, isLoading, error } = useAllUsers() as { data: UsersApiResponse | undefined, isLoading: boolean, error: unknown };
  const users = data?.success ? data.users : [];
  
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
      if (filterStatus === 'inactive' && 
         (user.accountStatus !== AccountStatus.SUSPENDED && user.accountStatus !== AccountStatus.DEACTIVATED)) return false;
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

  useEffect(() => {
    logInfo('admin-users rendered (with real data)');
    
    if (data?.success) {
      try {
        logValidation('4.10', 'success', 'Admin users connected to real data via local API.');
      } catch (e) {
        console.error('Could not log validation', e);
      }
    }
  }, [data]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold dark:text-white">User Management</h1>
      </div>

      <Card className="p-4">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1">
            <Input 
              placeholder="Search by name or email…" 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
          </div>

          <Select 
            className="w-32 sm:w-40"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">User Type</option>
            <option value="all">All Users</option>
            <option value="patient">Patients</option>
            <option value="doctor">Doctors</option>
            <option value="admin">Admins</option>
          </Select>

          <Select 
            className="w-32 sm:w-40"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Status</option>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>

          <Link href="/admin/create-user">
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </Link>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Last Login</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="flex justify-center">
                      <Spinner />
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-danger">
                    Error loading users
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    No users match your filters
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: User) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-3">{user.firstName} {user.lastName}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.userType}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.accountStatus === AccountStatus.ACTIVE ? "success" : "danger"}>
                        {user.accountStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatDate(user.createdAt) || "Unknown"}</td>
                    <td className="px-4 py-3">{user.lastLogin ? formatDate(user.lastLogin) : "Never"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center space-x-2">
                        <Button variant="ghost" size="sm" title="View User">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Edit User">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Toggle Status">
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Reset Password">
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
