'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { logInfo } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';

/**
 * Login Page
 * Allows users to authenticate into the application
 * 
 * @returns Login form component
 */
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
    role: 'PATIENT' // Default role
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Log authentication attempt
    logInfo('auth-event', {
      action: 'login-attempt',
      email: formData.email,
      role: formData.role,
      timestamp: new Date().toISOString()
    });
    
    // Mock login with timeout to simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      try {
        // Use the AuthContext login function
        login(formData.role as any);
        
        // Redirect based on role
        switch (formData.role) {
          case 'PATIENT':
            router.push('/patient/dashboard');
            break;
          case 'DOCTOR':
            router.push('/doctor/dashboard');
            break;
          case 'ADMIN':
            router.push('/admin/dashboard');
            break;
          default:
            router.push('/dashboard');
        }
      } catch (err) {
        setError('Login failed. Please try again.');
      }
    }, 700);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LogIn size={20} /> Sign In
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Access your health account</p>
        </div>
        
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            required
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
          />
          
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            required
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
          />
          
          <div className="space-y-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Login As (For Testing):
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/60 ring-offset-2 transition-colors duration-200 ease-in-out dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-primary border-slate-300 rounded"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-slate-600 dark:text-slate-400">
                Remember me
              </label>
            </div>
            
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
} 