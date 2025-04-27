'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Moon, Sun, Activity, User, Heart } from 'lucide-react';
import { logValidation } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';

// Import UI components
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import StatsCard from '@/components/ui/StatsCard';
import Modal from '@/components/ui/Modal';

// Import custom hooks
import useDarkMode from '@/hooks/useDarkMode';

/**
 * UI Components Test Page
 * This page showcases all UI components for development and testing
 * Hidden in production unless NEXT_PUBLIC_SHOW_DEV=true
 */
export default function UITestPage() {
  const [theme, toggleTheme] = useDarkMode();
  const { user, login, logout } = useAuth();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  
  // Handle theme parameter from URL
  useEffect(() => {
    if (searchParams) {
      const themeParam = searchParams.get('theme');
      if (themeParam === 'dark' || themeParam === 'light') {
        document.documentElement.classList.toggle('dark', themeParam === 'dark');
      }
    }
  }, [searchParams]);

  // Log validation event when the page mounts
  useEffect(() => {
    logValidation('3.1', 'success', 'UI primitives + tokens ready');
  }, []);
  
  // Don't show in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SHOW_DEV !== 'true') {
    return null;
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 dark:text-white">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">UI Component Library</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </Button>
          
          {user && (
            <Badge variant="success" className="px-3 py-1">
              {user.role}
            </Badge>
          )}
        </div>
      </header>
      
      {/* Auth Testing */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Auth Testing</h2>
        <Card className="p-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Mock Authentication</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Use these buttons to simulate different user roles for testing.
            </p>
            
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Current User:</span>
                  <span>{user.firstName} {user.lastName}</span>
                  <Badge variant="info">{user.role}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="danger" onClick={() => logout()}>
                    Log Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => login('PATIENT')}>
                  Login as Patient
                </Button>
                <Button variant="primary" onClick={() => login('DOCTOR')}>
                  Login as Doctor
                </Button>
                <Button variant="primary" onClick={() => login('ADMIN')}>
                  Login as Admin
                </Button>
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              You can also use the following in the browser console:
            </p>
            <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono whitespace-pre overflow-x-auto">
              window.__mockLogin('PATIENT'); // For patient role
              window.__mockLogin('DOCTOR');  // For doctor role
              window.__mockLogin('ADMIN');   // For admin role
              window.__mockLogin(null);      // To log out
            </code>
          </div>
        </Card>
      </section>
      
      {/* Buttons */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
        <Card className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Variants</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Sizes</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">States</h3>
            <div className="flex flex-wrap gap-4">
              <Button disabled>Disabled</Button>
              <Button isLoading>Loading</Button>
            </div>
          </div>
        </Card>
      </section>
      
      {/* Form Controls */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Form Controls</h2>
        <Card className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Input</h3>
            <div className="max-w-md">
              <Input 
                id="email" 
                label="Email Address" 
                type="email" 
                placeholder="Enter your email"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                error={inputError}
              />
              <div className="mt-2 flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => setInputError('Please enter a valid email address')}
                >
                  Show Error
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setInputError('')}
                >
                  Clear Error
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Textarea</h3>
            <div className="max-w-md">
              <Textarea 
                id="message" 
                label="Message" 
                placeholder="Enter your message"
                rows={4}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Select</h3>
            <div className="max-w-md">
              <Select
                id="country"
                label="Country"
              >
                <option value="">Select a country</option>
                <option value="us">United States</option>
                <option value="ca">Canada</option>
                <option value="uk">United Kingdom</option>
                <option value="au">Australia</option>
              </Select>
            </div>
          </div>
        </Card>
      </section>
      
      {/* Alerts */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Alerts</h2>
        <Card className="space-y-4">
          <Alert variant="info">
            <p>This is an informational message.</p>
          </Alert>
          <Alert variant="success">
            <p>Your action was completed successfully!</p>
          </Alert>
          <Alert variant="warning">
            <p>Please be cautious with this action.</p>
          </Alert>
          <Alert variant="error">
            <p>An error occurred. Please try again.</p>
          </Alert>
        </Card>
      </section>
      
      {/* Badges */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Badges</h2>
        <Card>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="pending">Pending</Badge>
          </div>
        </Card>
      </section>
      
      {/* Stats Card */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Stats Card</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Total Patients"
            value={2543}
            icon={User}
          />
          <StatsCard
            title="Appointments Today"
            value={18}
            icon={Activity}
          />
          <StatsCard
            title="Active Doctors"
            value={42}
            icon={Heart}
          />
        </div>
      </section>
      
      {/* Modal */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Modal</h2>
        <Card>
          <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
          
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Example Modal"
          >
            <div className="space-y-4">
              <p>This is an example modal dialog. You can close it by clicking the X button, clicking outside the modal, or using the button below.</p>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Close Modal
                </Button>
              </div>
            </div>
          </Modal>
        </Card>
      </section>
    </div>
  );
} 