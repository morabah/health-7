'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { 
  Eye, 
  Pencil, 
  RotateCw, 
  Key, 
  UserPlus,
  Search
} from 'lucide-react';

export default function AdminUsersPage() {
  useEffect(() => {
    console.info('admin-users rendered (static)');
  }, []);
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold dark:text-white">User Management</h1>
      </div>
      
      <Card className="p-4">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1">
            <Input placeholder="Search by name or email…" className="pl-10" />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
          </div>
          
          <Select className="w-32 sm:w-40">
            <option value="">User Type</option>
            <option value="all">All Users</option>
            <option value="patient">Patients</option>
            <option value="doctor">Doctors</option>
            <option value="admin">Admins</option>
          </Select>
          
          <Select className="w-32 sm:w-40">
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
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400">
                  Loading users …
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Preview of a future row (commented out for now) */}
      {/* 
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800">
        <td className="px-4 py-3">John Doe</td>
        <td className="px-4 py-3">john@example.com</td>
        <td className="px-4 py-3">Patient</td>
        <td className="px-4 py-3">
          <Badge variant="success">Active</Badge>
        </td>
        <td className="px-4 py-3">Jan 12, 2023</td>
        <td className="px-4 py-3">Today, 2:30 PM</td>
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
      */}
    </div>
  );
} 