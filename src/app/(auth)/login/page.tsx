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

/**
 * Login Page
 * Allows users to authenticate into the application
 * 
 * @returns Login form component
 */
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
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
      timestamp: new Date().toISOString()
    });
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      setIsLoading(false);
      // For demo, just redirect (in real app would check credentials)
      router.push('/dashboard');
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