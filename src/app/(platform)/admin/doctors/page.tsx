'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';

export default function AdminDoctorsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold dark:text-white">Doctor Management</h1>
      </div>

      <Card className="p-4">
        {/* Status Filter */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select className="w-48">
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending Verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </Select>

          <div className="flex-grow"></div>

          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
            <span className="hidden sm:inline">Total:</span>{' '}
            <span className="font-medium ml-1">—</span>
          </div>
        </div>

        {/* Doctors Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Specialty</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-slate-400">
                  Loading doctors …
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Preview of future rows (commented out for now) */}
      {/* 
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800">
        <td className="px-4 py-3">Dr. Jane Smith</td>
        <td className="px-4 py-3">dr.jane@example.com</td>
        <td className="px-4 py-3">Cardiology</td>
        <td className="px-4 py-3">
          <Badge variant="warning" className="flex items-center w-fit">
            <Hourglass className="h-3.5 w-3.5 mr-1" /> Pending
          </Badge>
        </td>
        <td className="px-4 py-3">Jan 15, 2023</td>
        <td className="px-4 py-3">
          <div className="flex justify-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              title="View Doctor"
              as={Link}
              href="/admin/doctor-verification/doc123"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="primary" size="sm">
              Verify
            </Button>
          </div>
        </td>
      </tr>
      
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800">
        <td className="px-4 py-3">Dr. Mark Johnson</td>
        <td className="px-4 py-3">dr.mark@example.com</td>
        <td className="px-4 py-3">Neurology</td>
        <td className="px-4 py-3">
          <Badge variant="success" className="flex items-center w-fit">
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Verified
          </Badge>
        </td>
        <td className="px-4 py-3">Dec 5, 2022</td>
        <td className="px-4 py-3">
          <div className="flex justify-center space-x-2">
            <Button variant="ghost" size="sm" title="View Doctor">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Edit Doctor">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Toggle Status">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
      
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800">
        <td className="px-4 py-3">Dr. Lisa Chen</td>
        <td className="px-4 py-3">dr.lisa@example.com</td>
        <td className="px-4 py-3">Dermatology</td>
        <td className="px-4 py-3">
          <Badge variant="danger" className="flex items-center w-fit">
            <XCircle className="h-3.5 w-3.5 mr-1" /> Rejected
          </Badge>
        </td>
        <td className="px-4 py-3">Feb 20, 2023</td>
        <td className="px-4 py-3">
          <div className="flex justify-center space-x-2">
            <Button variant="ghost" size="sm" title="View Doctor">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Edit Doctor">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="primary" size="sm">
              Reconsider
            </Button>
          </div>
        </td>
      </tr>
      */}
    </div>
  );
}
