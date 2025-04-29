'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { logInfo } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';

/**
 * Login Page
 * Allows users to authenticate into the application
 *
 * @returns Login form component
 */
export default function LoginPage() {
  const { login, error: authError, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // Form validation state
  const [isValid, setIsValid] = useState(false);
  
  // Validate form on input change
  useEffect(() => {
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(formData.email);
    const isValidPassword = formData.password.length >= 6;
    
    setIsValid(isValidEmail && isValidPassword);
  }, [formData]);
  
  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (error || authError) {
      const timer = setTimeout(() => {
        setError('');
        clearError();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, authError, clearError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isValid) return;
    
    setError('');
    setIsLoading(true);

    try {
      // Call the API directly to follow the required flow
      const res = await callApi('login', {
        email: formData.email,
        password: formData.password,
      });
      
      setIsLoading(false);
      
      if (res.success) {
        // On success, use the auth context login which will handle redirection
        await login(formData.email, formData.password);
        
        logInfo('Login successful', { email: formData.email });
      } else {
        setError(res.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
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

        {(error || authError) && (
          <Alert variant="error">{error || authError}</Alert>
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
          {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
            <p className="text-xs text-danger mt-1">Please enter a valid email address</p>
          )}

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
          {formData.password && formData.password.length < 6 && (
            <p className="text-xs text-danger mt-1">Password must be at least 6 characters</p>
          )}

          <div className="flex justify-end">
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            isLoading={isLoading}
            disabled={!isValid || isLoading}
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

        <div className="text-center mt-4 text-sm text-slate-500">
          <p>Test Accounts (use with password &quot;password&quot;):</p>
          <ul className="mt-2 space-y-1">
            <li>Patient: patient@example.com</li>
            <li>Doctor: doctor.verified@example.com</li>
            <li>Admin: admin@example.com</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
