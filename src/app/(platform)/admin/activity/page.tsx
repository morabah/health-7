'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { 
  User, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  RefreshCw,
  ChevronDown,
  Filter,
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { logInfo } from '@/lib/logger';

// Sample activity data - in a real app this would come from an API call
const sampleActivities = [
  {
    id: '1',
    title: 'Dr. Jane Smith verified',
    description: 'Admin verified doctor account',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    type: 'verification',
    actor: 'admin-1',
    targetUser: 'doctor-123',
    status: 'success',
  },
  {
    id: '2',
    title: 'Failed login attempt',
    description: 'Multiple failed login attempts detected',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    type: 'security',
    actor: 'unknown',
    targetUser: 'patient-456',
    status: 'warning',
  },
  {
    id: '3',
    title: 'New patient registered',
    description: 'New patient account created',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    type: 'user',
    actor: 'system',
    targetUser: 'patient-789',
    status: 'info',
  },
  {
    id: '4',
    title: 'Doctor account suspended',
    description: 'Admin suspended doctor account due to verification issues',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    type: 'admin',
    actor: 'admin-1',
    targetUser: 'doctor-456',
    status: 'danger',
  },
  {
    id: '5',
    title: 'System backup completed',
    description: 'Automatic system backup was successful',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    type: 'system',
    actor: 'system',
    targetUser: null,
    status: 'success',
  },
  {
    id: '6',
    title: 'Appointment booking spike detected',
    description: 'Unusual number of appointments being booked',
    timestamp: new Date(Date.now() - 1000 * 60 * 720).toISOString(), // 12 hours ago
    type: 'anomaly',
    actor: 'system',
    targetUser: null,
    status: 'warning',
  },
  {
    id: '7',
    title: 'Database migration completed',
    description: 'Updated patient records schema',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    type: 'system',
    actor: 'admin-2',
    targetUser: null,
    status: 'success',
  },
  {
    id: '8',
    title: 'New appointment created',
    description: 'Patient booked with Dr. Smith',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    type: 'appointment',
    actor: 'patient-123',
    targetUser: 'doctor-123',
    status: 'info',
  },
  {
    id: '9',
    title: 'Doctor added office hours',
    description: 'Updated availability schedule',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    type: 'doctor',
    actor: 'doctor-789',
    targetUser: null,
    status: 'info',
  },
  {
    id: '10',
    title: 'Server maintenance completed',
    description: 'Scheduled maintenance finished successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4 days ago
    type: 'system',
    actor: 'system',
    targetUser: null,
    status: 'success',
  },
];

// Helper function to get the appropriate icon for activity type
function getActivityIcon(type: string) {
  switch (type) {
    case 'verification':
      return UserCheck;
    case 'security':
      return ShieldAlert;
    case 'user':
      return User;
    case 'admin':
      return UserX;
    case 'system':
      return RefreshCw;
    case 'anomaly':
      return AlertTriangle;
    case 'appointment':
      return Calendar;
    case 'doctor':
      return User;
    default:
      return Clock;
  }
}

// Helper function to get the appropriate badge color for status
function getStatusColor(status: string): "success" | "warning" | "danger" | "info" | "default" {
  switch (status) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'danger':
      return 'danger';
    case 'info':
      return 'info';
    default:
      return 'default';
  }
}

/**
 * Activity Item Component
 */
function ActivityItem({ activity }: { activity: typeof sampleActivities[0] }) {
  const Icon = getActivityIcon(activity.type);
  const statusColor = getStatusColor(activity.status);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-start">
        <div className="mr-3 mt-1">
          <div className={`p-2 rounded-full bg-${statusColor}-100 dark:bg-${statusColor}-900/30`}>
            <Icon className={`h-4 w-4 text-${statusColor}-500`} />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{activity.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
            <Badge variant={statusColor}>
              {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
            </Badge>
          </div>
          
          {/* Additional details when expanded */}
          {isExpanded && (
            <div className="mt-3 text-sm border-t border-slate-200 dark:border-slate-700 pt-3">
              <p className="text-slate-600 dark:text-slate-300 mb-1">
                {activity.description}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Type:</span>{' '}
                  <span className="font-medium">{activity.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Actor:</span>{' '}
                  <span className="font-medium">{activity.actor}</span>
                </div>
                {activity.targetUser && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Target:</span>{' '}
                    <span className="font-medium">{activity.targetUser}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Time:</span>{' '}
                  <span className="font-medium">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Expand/collapse button */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-xs flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            {isExpanded ? 'Show less' : 'Show details'}
            <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Admin Activity Page
 * Displays a comprehensive activity log for the entire system
 */
export default function AdminActivityPage() {
  const [activities] = useState(sampleActivities);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading] = useState(false);

  // Filter activities based on current filter and search term
  const filteredActivities = activities
    .filter(activity => {
      if (filter === 'all') return true;
      return activity.type === filter;
    })
    .filter(activity => {
      if (!searchTerm) return true;
      return (
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activity.targetUser && activity.targetUser.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });

  // Log for validation that the page was accessed
  React.useEffect(() => {
    logInfo('Admin activity page accessed');
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold dark:text-white">System Activity Log</h1>
        <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <h2 className="text-sm font-medium mb-3">Filter Activity</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  className="w-full pl-10 pr-4 py-2 border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <select
                className="border rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="verification">Verification</option>
                <option value="security">Security</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="system">System</option>
                <option value="anomaly">Anomaly</option>
                <option value="appointment">Appointment</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Activity List */}
      <Card>
        <div className="border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center">
          <h2 className="text-lg font-medium">Activity Log</h2>
          <span className="text-sm text-slate-500">
            {filteredActivities.length} activities found
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Spinner />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No activity logs found matching your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
} 