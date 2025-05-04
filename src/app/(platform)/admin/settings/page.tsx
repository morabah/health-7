'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import {
  Save,
  Monitor,
  Bell,
  Shield,
  Users,
  Database,
  Mail,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  Info,
  HelpCircle,
  Calendar,
  Moon,
  Sun
} from 'lucide-react';
import { logInfo } from '@/lib/logger';

/**
 * Admin Settings Page Component
 */
export default function AdminSettingsPage() {
  // State for the different types of settings
  const [activeTab, setActiveTab] = useState('appearance');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [autoLogout, setAutoLogout] = useState(30);
  const [dataRetentionDays, setDataRetentionDays] = useState(90);
  const [appointmentBuffer, setAppointmentBuffer] = useState(15);

  // Log for validation that the page was accessed
  React.useEffect(() => {
    logInfo('Admin settings page accessed');
  }, []);

  // Function to simulate saving settings
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  // Function to render the appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-medium">Dark Mode</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enable dark mode for the admin panel
                </p>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full"
                onClick={() => setDarkMode(!darkMode)}
              >
                <span
                  className={`${
                    darkMode ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
                  } inline-block h-6 w-11 rounded-full transition`}
                >
                  <span
                    className={`${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                  />
                </span>
                <span className="sr-only">{darkMode ? 'Disable dark mode' : 'Enable dark mode'}</span>
              </button>
            </div>

            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Color Theme</h3>
              <div className="flex flex-wrap gap-4">
                <div 
                  className="w-12 h-12 bg-primary-500 rounded-md cursor-pointer border-2 border-primary-500"
                  title="Primary (Default)"
                ></div>
                <div 
                  className="w-12 h-12 bg-blue-500 rounded-md cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="Blue"
                ></div>
                <div 
                  className="w-12 h-12 bg-green-500 rounded-md cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="Green"
                ></div>
                <div 
                  className="w-12 h-12 bg-purple-500 rounded-md cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="Purple"
                ></div>
                <div 
                  className="w-12 h-12 bg-orange-500 rounded-md cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="Orange"
                ></div>
              </div>
            </div>

            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Font Size</h3>
              <select 
                className="w-full p-2 border rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                defaultValue="Medium (Default)"
              >
                <option>Small</option>
                <option>Medium (Default)</option>
                <option>Large</option>
                <option>Extra Large</option>
              </select>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-medium">Email Notifications</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Receive notifications via email
                </p>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full"
                onClick={() => setEmailNotifications(!emailNotifications)}
              >
                <span
                  className={`${
                    emailNotifications ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
                  } inline-block h-6 w-11 rounded-full transition`}
                >
                  <span
                    className={`${
                      emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                  />
                </span>
                <span className="sr-only">Toggle email notifications</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-medium">In-App Notifications</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Receive notifications within the application
                </p>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full"
                onClick={() => setInAppNotifications(!inAppNotifications)}
              >
                <span
                  className={`${
                    inAppNotifications ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
                  } inline-block h-6 w-11 rounded-full transition`}
                >
                  <span
                    className={`${
                      inAppNotifications ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                  />
                </span>
                <span className="sr-only">Toggle in-app notifications</span>
              </button>
            </div>

            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Notification Types</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input type="checkbox" id="notify-new-users" className="mr-2" defaultChecked />
                  <label htmlFor="notify-new-users" className="text-sm">New user registrations</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="notify-verifications" className="mr-2" defaultChecked />
                  <label htmlFor="notify-verifications" className="text-sm">Doctor verification requests</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="notify-appointments" className="mr-2" defaultChecked />
                  <label htmlFor="notify-appointments" className="text-sm">Appointment cancellations</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="notify-system" className="mr-2" defaultChecked />
                  <label htmlFor="notify-system" className="text-sm">System alerts</label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Require 2FA for admin logins
                </p>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full"
                onClick={() => setTwoFactorAuth(!twoFactorAuth)}
              >
                <span
                  className={`${
                    twoFactorAuth ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
                  } inline-block h-6 w-11 rounded-full transition`}
                >
                  <span
                    className={`${
                      twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                  />
                </span>
                <span className="sr-only">Toggle 2FA</span>
              </button>
            </div>

            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Auto Logout (Minutes)</h3>
              <input 
                type="range" 
                min="5" 
                max="60" 
                step="5" 
                value={autoLogout} 
                onChange={(e) => setAutoLogout(parseInt(e.target.value))}
                className="w-full" 
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>5</span>
                <span>{autoLogout} minutes</span>
                <span>60</span>
              </div>
            </div>

            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Password Policy</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input type="checkbox" id="password-uppercase" className="mr-2" defaultChecked />
                  <label htmlFor="password-uppercase" className="text-sm">Require uppercase letters</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="password-lowercase" className="mr-2" defaultChecked />
                  <label htmlFor="password-lowercase" className="text-sm">Require lowercase letters</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="password-numbers" className="mr-2" defaultChecked />
                  <label htmlFor="password-numbers" className="text-sm">Require numbers</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="password-special" className="mr-2" defaultChecked />
                  <label htmlFor="password-special" className="text-sm">Require special characters</label>
                </div>
                <div className="flex items-center">
                  <label htmlFor="password-length" className="text-sm mr-2">Minimum length:</label>
                  <select 
                    id="password-length" 
                    className="p-1 border rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    defaultValue="10"
                  >
                    <option>8</option>
                    <option>10</option>
                    <option>12</option>
                    <option>14</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Data Retention (Days)</h3>
              <input 
                type="range" 
                min="30" 
                max="365" 
                step="30" 
                value={dataRetentionDays} 
                onChange={(e) => setDataRetentionDays(parseInt(e.target.value))}
                className="w-full" 
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>30</span>
                <span>{dataRetentionDays} days</span>
                <span>365</span>
              </div>
            </div>

            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Backup Schedule</h3>
              <select 
                className="w-full p-2 border rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                defaultValue="Weekly"
              >
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>

            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Data Export</h3>
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="w-full">
                  <Database className="h-4 w-4 mr-2" />
                  Export All Data
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Export User Data
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Export Appointment Data
                </Button>
              </div>
            </div>
          </div>
        );

      case 'appointments':
        return (
          <div className="space-y-6">
            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Appointment Buffer (Minutes)</h3>
              <input 
                type="range" 
                min="0" 
                max="30" 
                step="5" 
                value={appointmentBuffer} 
                onChange={(e) => setAppointmentBuffer(parseInt(e.target.value))}
                className="w-full" 
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0</span>
                <span>{appointmentBuffer} minutes</span>
                <span>30</span>
              </div>
            </div>

            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Default Appointment Duration</h3>
              <select 
                className="w-full p-2 border rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                defaultValue="30 minutes"
              >
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>45 minutes</option>
                <option>60 minutes</option>
              </select>
            </div>

            <div className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium mb-3">Advance Booking Limit</h3>
              <select 
                className="w-full p-2 border rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                defaultValue="30 days"
              >
                <option>1 week</option>
                <option>2 weeks</option>
                <option>30 days</option>
                <option>60 days</option>
                <option>90 days</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold dark:text-white">System Settings</h1>
        <Button 
          variant="primary" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Spinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {saveSuccess && (
        <Alert variant="success" className="mb-6">
          Settings saved successfully.
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="w-full md:w-1/4">
          <Card>
            <div className="p-0">
              <nav className="flex flex-col">
                <button
                  className={`flex items-center px-4 py-3 text-left ${
                    activeTab === 'appearance'
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border-l-4 border-primary-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => setActiveTab('appearance')}
                >
                  <Monitor className="h-5 w-5 mr-3" />
                  <span>Appearance</span>
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left ${
                    activeTab === 'notifications'
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border-l-4 border-primary-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => setActiveTab('notifications')}
                >
                  <Bell className="h-5 w-5 mr-3" />
                  <span>Notifications</span>
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left ${
                    activeTab === 'security'
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border-l-4 border-primary-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => setActiveTab('security')}
                >
                  <Shield className="h-5 w-5 mr-3" />
                  <span>Security</span>
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left ${
                    activeTab === 'data'
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border-l-4 border-primary-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => setActiveTab('data')}
                >
                  <Database className="h-5 w-5 mr-3" />
                  <span>Data Management</span>
                </button>
                <button
                  className={`flex items-center px-4 py-3 text-left ${
                    activeTab === 'appointments'
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border-l-4 border-primary-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => setActiveTab('appointments')}
                >
                  <Calendar className="h-5 w-5 mr-3" />
                  <span>Appointments</span>
                </button>
              </nav>
            </div>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="w-full md:w-3/4">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-medium mb-6">
                {activeTab === 'appearance' && (
                  <div className="flex items-center">
                    <Monitor className="h-5 w-5 mr-2" />
                    <span>Appearance Settings</span>
                  </div>
                )}
                {activeTab === 'notifications' && (
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    <span>Notification Settings</span>
                  </div>
                )}
                {activeTab === 'security' && (
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    <span>Security Settings</span>
                  </div>
                )}
                {activeTab === 'data' && (
                  <div className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    <span>Data Management Settings</span>
                  </div>
                )}
                {activeTab === 'appointments' && (
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    <span>Appointment Settings</span>
                  </div>
                )}
              </h2>

              {renderTabContent()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 