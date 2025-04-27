'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { logInfo } from '@/lib/logger';

type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

/**
 * User Management Page
 * Allows admins to view and manage users (patients, doctors, admins)
 * 
 * @returns User Management component
 */
export default function UsersManagementPage() {
  // Mock data for users
  const [users, setUsers] = useState<User[]>([
    { 
      id: 'user1', 
      email: 'patient@example.com',
      firstName: 'John',
      lastName: 'Patient',
      role: 'PATIENT',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString() // 30 days ago
    },
    { 
      id: 'user2', 
      email: 'doctor@example.com',
      firstName: 'Jane',
      lastName: 'Doctor',
      role: 'DOCTOR',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString() // 7 days ago
    },
    { 
      id: 'user3', 
      email: 'admin@example.com',
      firstName: 'Bob',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString() // 90 days ago
    },
  ]);
  
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Log when component mounts
    logInfo('User Management page mounted');
    
    // In a real implementation, fetch users from backend
    // const fetchUsers = async () => {
    //   try {
    //     const response = await callApi('getAllUsers');
    //     setUsers(response.data);
    //   } catch (error) {
    //     console.error('Error fetching users:', error);
    //   }
    // };
    
    // fetchUsers();
  }, []);
  
  // Filter users based on selected filters and search term
  const filteredUsers = users.filter(user => {
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRole && matchesStatus && matchesSearch;
  });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Handle user status change
  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    // In a real implementation, update user status via API
    // try {
    //   await callApi('updateUserStatus', { userId, status: newStatus });
    //   
    //   // Update local state
    //   setUsers(prevUsers => 
    //     prevUsers.map(user => 
    //       user.id === userId ? { ...user, status: newStatus } : user
    //     )
    //   );
    // } catch (error) {
    //   console.error('Error updating user status:', error);
    // }
    
    // For mock implementation, update local state
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      )
    );
    
    logInfo(`User ${userId} status updated to ${newStatus}`);
  };
  
  // Get badge style based on status
  const getStatusBadgeStyle = (status: UserStatus) => {
    switch(status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get badge style based on role
  const getRoleBadgeStyle = (role: UserRole) => {
    switch(role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'DOCTOR':
        return 'bg-blue-100 text-blue-800';
      case 'PATIENT':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-4">User Management</h1>
          <Link href="/cms" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            Back to CMS
          </Link>
        </div>
        <p className="text-gray-600">
          View and manage users, their roles, and account status
        </p>
      </header>
      
      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold">Filters and Search</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="role-filter"
                className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
              >
                <option value="ALL">All Roles</option>
                <option value="PATIENT">Patient</option>
                <option value="DOCTOR">Doctor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'ALL')}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                id="search"
                type="text"
                className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="font-semibold">Users ({filteredUsers.length})</h2>
        </div>
        
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No users match the current filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{user.firstName} {user.lastName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeStyle(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {user.status === 'ACTIVE' && (
                          <button 
                            onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Suspend
                          </button>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <button 
                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Activate
                          </button>
                        )}
                        {user.status === 'PENDING' && (
                          <button 
                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                        )}
                        <Link 
                          href={`/cms/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 