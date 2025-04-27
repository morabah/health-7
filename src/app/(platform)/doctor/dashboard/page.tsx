'use client';

import React from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  CalendarCheck,
  ClipboardList,
  Bell,
  Users,
  Clock,
  Calendar,
  UserCheck,
  Stethoscope,
} from 'lucide-react';

export default function DoctorDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
        <div className="hidden md:flex space-x-2">
          <Button size="sm" variant="outline" as={Link} href="/doctor/availability">
            <Calendar className="h-4 w-4 mr-2" />
            Update Availability
          </Button>
          <Button size="sm" variant="outline" as={Link} href="/doctor/profile">
            <UserCheck className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex flex-col">
            <div className="flex items-center text-primary mb-2">
              <Users className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Total Patients</span>
            </div>
            <span className="text-2xl font-bold">—</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex flex-col">
            <div className="flex items-center text-primary mb-2">
              <CalendarCheck className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Appointments Today</span>
            </div>
            <span className="text-2xl font-bold">—</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex flex-col">
            <div className="flex items-center text-primary mb-2">
              <ClipboardList className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Completed This Week</span>
            </div>
            <span className="text-2xl font-bold">—</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex flex-col">
            <div className="flex items-center text-primary mb-2">
              <Bell className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">New Notifications</span>
            </div>
            <span className="text-2xl font-bold">—</span>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="col-span-1 lg:col-span-2">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-medium">Today&apos;s Schedule</h2>
            </div>
            <Button variant="ghost" size="sm" as={Link} href="/doctor/appointments">
              View all
            </Button>
          </div>
          <div className="p-4">
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">Loading...</p>
          </div>
        </Card>

        {/* Right Side Content */}
        <div className="col-span-1 space-y-6">
          {/* Quick Actions */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-medium">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                as={Link}
                href="/doctor/appointments"
              >
                <CalendarCheck className="h-4 w-4 mr-2" />
                View Appointments
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                as={Link}
                href="/doctor/availability"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Update Availability
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                as={Link}
                href="/doctor/profile"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                as={Link}
                href="/notifications"
              >
                <Bell className="h-4 w-4 mr-2" />
                Check Notifications
              </Button>
            </div>
          </Card>

          {/* Profile Status */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-medium">Profile Info</h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Verification Status
                </span>
                <Badge variant="warning">Pending</Badge>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Profile Completion
                </span>
                <Badge variant="info">80%</Badge>
              </div>
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  as={Link}
                  href="/doctor/profile"
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Complete Your Profile
                </Button>
              </div>
            </div>
          </Card>

          {/* Upcoming */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div className="flex items-center">
                <CalendarCheck className="h-5 w-5 mr-2 text-primary" />
                <h2 className="text-lg font-medium">Upcoming</h2>
              </div>
              <Button variant="ghost" size="sm" as={Link} href="/doctor/appointments">
                View all
              </Button>
            </div>
            <div className="p-4">
              <p className="text-slate-500 dark:text-slate-400 text-center py-4">Loading...</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
