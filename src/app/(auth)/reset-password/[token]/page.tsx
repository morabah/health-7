'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { KeyRound, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { logInfo } from '@/lib/logger';

/**
 * Reset Password Page
 * Allows users to set a new password using a reset token
 * 
 * @returns Reset password form component
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string || '';
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    // Log password reset attempt
    logInfo('auth-event', {
      action: 'password-reset-submit',
      token: token.substring(0, 6) + '...',
      timestamp: new Date().toISOString()
    });
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      
      // Redirect to login after success
      setTimeout(() => {
        router.replace('/auth/login');
      }, 1500);
    }, 700);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound size={20} /> Reset Password
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Create a new password for your account
          </p>
        </div>
        
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}
        
        {success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3 text-green-600">
                <Check size={24} />
              </div>
            </div>
            <Alert variant="success">
              Your password has been successfully reset. You will be redirected to the login page.
            </Alert>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="password"
              name="password"
              type="password"
              label="New Password"
              required
              placeholder="Enter new password"
              value={formData.password}
              onChange={handleChange}
            />
            
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm New Password"
              required
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : ''}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              isLoading={isLoading}
            >
              Reset Password
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
} 