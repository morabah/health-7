'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { logInfo } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { UserType } from '@/types/enums';

/**
 * Login Page
 * Allows users to authenticate into the application
 *
 * @returns Login form component
 */
export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuth();
  const searchParams = useSearchParams();
  const nextPath = searchParams ? searchParams.get('next') : null;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: UserType.PATIENT as string, // Default to PATIENT role
  });

  // Clear any error when component mounts or when form data changes
  useEffect(() => {
    clearError();
  }, [clearError, formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Log authentication attempt
    logInfo('auth-event', {
      action: 'login-attempt',
      email: formData.email,
      role: formData.role,
      timestamp: new Date().toISOString(),
    });

    // Attempt login
    const ok = await login(formData.email, formData.password);
    if (!ok) return; // Error already in context

    // If login succeeded and we have a 'next' path, redirect to it
    // Otherwise, AuthContext will handle the redirect to the appropriate dashboard
    if (nextPath) {
      router.push(nextPath);
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

        {error && <Alert variant="error">{error}</Alert>}

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

          <div className="w-full">
            <label
              htmlFor="role"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white dark:border-slate-600"
              value={formData.role}
              onChange={handleChange}
            >
              <option value={UserType.PATIENT}>Patient</option>
              <option value={UserType.DOCTOR}>Doctor</option>
              <option value={UserType.ADMIN}>Admin</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div></div>
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" isLoading={loading}>
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
