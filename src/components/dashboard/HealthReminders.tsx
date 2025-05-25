'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Pill, 
  FileText, 
  CalendarCheck, 
  Activity,
  AlertCircle
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { HealthRemindersProps, HealthReminderItem } from '@/types/dashboard/dashboard.types';

/**
 * ReminderCard Component
 * Individual reminder card with condition-based display
 */
const ReminderCard = ({ 
  reminder, 
  showAction = true 
}: { 
  reminder: HealthReminderItem; 
  showAction?: boolean;
}) => (
  <div className={`flex items-start p-4 rounded-lg border ${reminder.bgColor} ${reminder.borderColor}`}>
    <div className={`mr-3 mt-1 flex-shrink-0 ${reminder.color}`}>
      <reminder.Icon size={20} />
    </div>
    <div className="flex-1">
      <h4 className={`font-medium ${reminder.color.replace('text-', 'text-').replace('-500', '-700')} dark:${reminder.color.replace('text-', 'text-').replace('-500', '-300')}`}>
        {reminder.title}
      </h4>
      <p className={`text-sm mt-1 ${reminder.color.replace('text-', 'text-').replace('-500', '-600')} dark:${reminder.color.replace('text-', 'text-').replace('-500', '-400')}`}>
        {reminder.description}
      </p>
      {showAction && reminder.actionText && reminder.actionHref && (
        <Link href={reminder.actionHref}>
          <Button
            size="sm"
            variant="outline"
            className={`mt-2 ${reminder.color.replace('text-', 'text-').replace('-500', '-600')} ${reminder.borderColor.replace('border-', 'border-').replace('-200', '-600')} hover:${reminder.bgColor.replace('bg-', 'bg-').replace('-50', '-100')}`}
          >
            {reminder.actionText}
          </Button>
        </Link>
      )}
    </div>
  </div>
);

/**
 * HealthReminders Component
 * 
 * Displays contextual health reminders based on user stats and upcoming appointments.
 * Shows medication reminders, wellness tips, appointment reminders, and health record updates.
 * Extracted from the monolithic PatientDashboardPage for better maintainability.
 */
export default function HealthReminders({
  healthStats,
  upcomingAppointments,
  isLoading,
  error
}: HealthRemindersProps) {
  // Define health reminders with conditions
  const healthReminders: HealthReminderItem[] = [
    {
      id: 'upcoming-appointment',
      title: 'Upcoming Appointment Reminder',
      description: `You have an appointment coming up with Dr. ${upcomingAppointments[0]?.doctorName || 'your healthcare provider'}. Please arrive 15 minutes early and bring any required documents.`,
      type: 'appointment',
      priority: 'high',
      Icon: CalendarCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-700',
      actionText: 'View Appointment',
      actionHref: '/patient/appointments',
      condition: (stats, appointments) => appointments.length > 0
    },
    {
      id: 'medication-reminder',
      title: 'Medication Reminder',
      description: 'Don\'t forget to take your daily medication. Consider setting up automatic reminders for better adherence.',
      type: 'medication',
      priority: 'medium',
      Icon: Pill,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-700',
      actionText: 'Manage Medications',
      actionHref: '/patient/medications',
      condition: (stats) => stats.medications > 0
    },
    {
      id: 'wellness-tip',
      title: 'Daily Wellness Tip',
      description: 'Stay hydrated and aim for 7-8 hours of sleep each night for optimal health. Regular exercise and a balanced diet are key to maintaining good health.',
      type: 'wellness',
      priority: 'low',
      Icon: Heart,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-700',
      condition: () => true // Always show wellness tips
    },
    {
      id: 'health-records-update',
      title: 'Update Your Health Records',
      description: 'Keep your health records up to date by uploading recent test results and medical documents. This helps your healthcare providers make better decisions.',
      type: 'records',
      priority: 'medium',
      Icon: FileText,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-700',
      actionText: 'View Records',
      actionHref: '/patient/health-records',
      condition: (stats) => stats.completedCheckups < 2
    },
    {
      id: 'annual-checkup',
      title: 'Annual Health Checkup Due',
      description: 'It\'s time for your annual health checkup. Regular checkups help catch potential health issues early.',
      type: 'checkup',
      priority: 'high',
      Icon: Activity,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      actionText: 'Book Checkup',
      actionHref: '/find-doctors',
      condition: (stats) => stats.completedCheckups === 0
    }
  ];

  // Filter reminders based on conditions
  const activeReminders = healthReminders.filter(reminder => 
    reminder.condition ? reminder.condition(healthStats, upcomingAppointments) : true
  );

  // Sort by priority (high -> medium -> low)
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const sortedReminders = activeReminders.sort((a, b) => 
    priorityOrder[b.priority] - priorityOrder[a.priority]
  );

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
            Unable to Load Health Reminders
          </h3>
          <p className="text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-700 p-6 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/20 dark:to-slate-700">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-600 rounded animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              </div>
            ))}
          </div>
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
            <Heart className="text-primary-500 mr-2" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Health Reminders
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Personalized tips and reminders for your health
              </p>
            </div>
          </div>

          {/* Priority indicator */}
          {sortedReminders.some(r => r.priority === 'high') && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-600 dark:text-red-400 font-medium">
                High Priority
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {sortedReminders.length > 0 ? (
          <div className="space-y-4">
            {sortedReminders.map((reminder) => (
              <ReminderCard 
                key={reminder.id} 
                reminder={reminder} 
              />
            ))}
          </div>
        ) : (
          // Empty state - all reminders resolved
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-green-500" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              All Caught Up!
            </h4>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Great job staying on top of your health! Continue with your healthy habits and regular checkups.
            </p>
          </div>
        )}

        {/* Additional wellness section */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Daily Health Goal
          </h4>
          <div className="bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/20 dark:to-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-primary mr-2" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Stay Active Today
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Aim for at least 30 minutes of physical activity
                  </p>
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="flex space-x-1">
                <div className="h-1.5 w-6 bg-primary rounded-full"></div>
                <div className="h-1.5 w-6 bg-primary/50 rounded-full"></div>
                <div className="h-1.5 w-6 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 