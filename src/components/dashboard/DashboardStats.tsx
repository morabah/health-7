'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Activity, 
  CalendarCheck, 
  Clipboard, 
  FileText, 
  Pill 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Card from '@/components/ui/Card';
import { DashboardStatsProps, StatCardData } from '@/types/dashboard/dashboard.types';

/**
 * StatCard Component
 * Reusable card component for displaying health statistics
 */
const StatCard = ({
  title,
  value,
  Icon,
  href,
  className,
  isLoading = false
}: StatCardData) => {
  const CardContent = (
    <Card 
      className={`flex items-center gap-4 p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer ${className || ''}`}
    >
      <div className="p-3 rounded-full bg-white/50 dark:bg-slate-800/50">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
          {title}
        </p>
        {isLoading ? (
          <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        ) : (
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        )}
      </div>
      <div className="text-slate-400 dark:text-slate-500">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {CardContent}
    </Link>
  ) : (
    CardContent
  );
};

/**
 * SkeletonCards Component
 * Loading skeleton for stat cards
 */
const StatCardSkeleton = () => (
  <Card className="flex items-center gap-4 p-5">
    <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 w-12 h-12"></div>
    <div className="flex-1 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
    </div>
    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
  </Card>
);

/**
 * DashboardStats Component
 * 
 * Displays health overview statistics including appointments, records, medications,
 * and health progress visualization with progress bars.
 * Extracted from the monolithic PatientDashboardPage for better maintainability.
 */
export default function DashboardStats({
  healthStats,
  upcomingAppointments,
  isLoading,
  error
}: DashboardStatsProps) {
  if (error) {
    return (
      <Card className="p-6 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700">
        <div className="text-center">
          <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
            Unable to Load Health Stats
          </h3>
          <p className="text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      </Card>
    );
  }

  const statCards: StatCardData[] = [
    {
      title: "Next Appointment",
      value: upcomingAppointments.length > 0 
        ? `In ${Math.ceil(
            (new Date(upcomingAppointments[0].appointmentDate).getTime() - new Date().getTime()) 
            / (1000 * 60 * 60 * 24)
          )} days`
        : "None scheduled",
      Icon: CalendarCheck,
      href: "/patient/appointments?filter=upcoming",
      className: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700"
    },
    {
      title: "Total Appointments",
      value: `${healthStats.upcomingAppointments + healthStats.pastAppointments}`,
      Icon: Clipboard,
      href: "/patient/appointments",
      className: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700"
    },
    {
      title: "Health Records",
      value: healthStats.completedCheckups,
      Icon: FileText,
      href: "/patient/health-records",
      className: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700"
    },
    {
      title: "Active Medications",
      value: healthStats.medications,
      Icon: Pill,
      href: "/patient/medications",
      className: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Heart className="text-primary-500" size={28} />
          Your Health Overview
        </h2>
        <div className="text-sm text-slate-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </>
        ) : (
          statCards.map((card, index) => (
            <StatCard
              key={index}
              title={card.title}
              value={card.value}
              Icon={card.Icon}
              href={card.href}
              className={card.className}
              isLoading={isLoading}
            />
          ))
        )}
      </div>

      {/* Health Progress Visualization */}
      <Card className="p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Activity className="text-primary-500" size={20} />
          Health Progress This Year
        </h3>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Appointments Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Appointments Completed
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {healthStats.pastAppointments}/12
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((healthStats.pastAppointments / 12) * 100, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-slate-500">Goal: 12 per year</p>
            </div>

            {/* Health Records Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Health Records</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {healthStats.completedCheckups}/4
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((healthStats.completedCheckups / 4) * 100, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-slate-500">Goal: 4 per year</p>
            </div>

            {/* Medication Compliance */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Medication Compliance
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {Math.min(healthStats.medications * 20, 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(healthStats.medications * 20, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-slate-500">Taking medications regularly</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 