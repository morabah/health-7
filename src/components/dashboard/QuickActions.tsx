'use client';

import React from 'react';
import Link from 'next/link';
import { 
  CalendarCheck, 
  Stethoscope, 
  FileText, 
  Pill, 
  MessageCircle, 
  User, 
  Search,
  Clock,
  Heart,
  AlertCircle
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { QuickActionsProps, QuickActionItem } from '@/types/dashboard/dashboard.types';

/**
 * ActionCard Component
 * Individual quick action card with icon, title, description and navigation
 */
const ActionCard = ({ action }: { action: QuickActionItem }) => (
  <Link href={action.href} className="block group">
    <Card className={`p-4 h-full transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.02] border ${action.bgColor} ${action.color.replace('text-', 'border-').replace('-600', '-200')} dark:border-slate-700`}>
      <div className="flex flex-col items-center text-center space-y-3">
        {/* Icon */}
        <div className={`p-3 rounded-full ${action.bgColor.replace('bg-', 'bg-').replace('-50', '-100')} dark:${action.bgColor.replace('bg-', 'bg-').replace('-50', '-900/20')}`}>
          <action.Icon className={`h-6 w-6 ${action.color}`} />
        </div>
        
        {/* Content */}
        <div className="space-y-1">
          <h4 className={`font-medium text-sm ${action.color.replace('text-', 'text-').replace('-600', '-800')} dark:text-white group-hover:${action.color}`}>
            {action.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {action.description}
          </p>
        </div>

        {/* Action indicator */}
        <div className={`w-full h-0.5 rounded-full transition-all duration-200 ${action.bgColor.replace('bg-', 'bg-').replace('-50', '-200')} group-hover:${action.bgColor.replace('bg-', 'bg-').replace('-50', '-300')}`}></div>
      </div>
    </Card>
  </Link>
);

/**
 * ActionCardSkeleton Component
 * Loading skeleton for action cards
 */
const ActionCardSkeleton = () => (
  <Card className="p-4 h-full">
    <div className="flex flex-col items-center space-y-3 animate-pulse">
      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      <div className="space-y-2 w-full">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto"></div>
      </div>
      <div className="w-full h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
    </div>
  </Card>
);

/**
 * QuickActions Component
 * 
 * Displays a grid of quick action cards for common patient tasks like
 * booking appointments, viewing records, managing medications, etc.
 * Extracted from the monolithic PatientDashboardPage for better maintainability.
 */
export default function QuickActions({
  upcomingAppointments,
  isLoading,
  error
}: QuickActionsProps) {
  // Define quick actions with priority and dynamic states
  const quickActions: QuickActionItem[] = [
    {
      id: 'book-appointment',
      title: 'Book Appointment',
      description: 'Schedule a new appointment with your healthcare provider',
      href: '/find-doctors',
      Icon: CalendarCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:text-blue-700',
      priority: 1
    },
    {
      id: 'view-appointments',
      title: 'My Appointments',
      description: upcomingAppointments.length > 0 
        ? `View your ${upcomingAppointments.length} upcoming appointment${upcomingAppointments.length !== 1 ? 's' : ''}`
        : 'View your appointment history and upcoming visits',
      href: '/patient/appointments',
      Icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:text-green-700',
      priority: upcomingAppointments.length > 0 ? 2 : 5
    },
    {
      id: 'find-doctors',
      title: 'Find Doctors',
      description: 'Search and connect with healthcare professionals',
      href: '/find-doctors',
      Icon: Stethoscope,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:text-purple-700',
      priority: 3
    },
    {
      id: 'health-records',
      title: 'Health Records',
      description: 'Access and manage your medical documents',
      href: '/patient/health-records',
      Icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:text-orange-700',
      priority: 4
    },
    {
      id: 'medications',
      title: 'Medications',
      description: 'Track your prescriptions and medication schedule',
      href: '/patient/medications',
      Icon: Pill,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      hoverColor: 'hover:text-red-700',
      priority: 6
    },
    {
      id: 'messages',
      title: 'Messages',
      description: 'Communicate with your healthcare team',
      href: '/patient/messages',
      Icon: MessageCircle,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      hoverColor: 'hover:text-indigo-700',
      priority: 7
    },
    {
      id: 'profile',
      title: 'Update Profile',
      description: 'Manage your personal information and preferences',
      href: '/patient/profile',
      Icon: User,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      hoverColor: 'hover:text-teal-700',
      priority: 8
    },
    {
      id: 'wellness',
      title: 'Wellness Hub',
      description: 'Access health tips, articles, and wellness resources',
      href: '/wellness',
      Icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      hoverColor: 'hover:text-pink-700',
      priority: 9
    }
  ];

  // Sort actions by priority and take top 6 for better layout
  const sortedActions = quickActions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6);

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
            Unable to Load Quick Actions
          </h3>
          <p className="text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-6 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/20 dark:to-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Search className="text-primary-500 mr-2" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Quick Actions
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Frequently used features and shortcuts
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {sortedActions.length} actions
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <ActionCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sortedActions.map((action) => (
              <ActionCard 
                key={action.id} 
                action={action} 
              />
            ))}
          </div>
        )}

        {/* Additional quick links */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Need More Help?
          </h4>
          <div className="flex flex-wrap gap-2">
            <Link href="/help">
              <Button variant="outline" size="sm" className="text-xs">
                Help Center
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="sm" className="text-xs">
                Contact Support
              </Button>
            </Link>
            <Link href="/emergency">
              <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                Emergency Info
              </Button>
            </Link>
          </div>
        </div>

        {/* Context-sensitive suggestions */}
        {upcomingAppointments.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Appointment Reminder
                </h5>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You have {upcomingAppointments.length} upcoming appointment{upcomingAppointments.length !== 1 ? 's' : ''}. 
                  Don't forget to prepare any questions or documents you may need.
                </p>
                <Link href="/patient/appointments">
                  <Button size="sm" variant="outline" className="mt-2 text-blue-600 border-blue-300 hover:bg-blue-100">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 