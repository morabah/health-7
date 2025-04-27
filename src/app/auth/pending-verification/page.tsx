'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { logInfo } from '@/lib/logger';

/**
 * Pending Verification Page
 * Shown after doctor registration to inform them their account is being verified
 *
 * @returns Pending verification component
 */
export default function PendingVerificationPage() {
  useEffect(() => {
    // Log page view for analytics
    logInfo('page-view', {
      page: 'pending-verification',
      timestamp: new Date().toISOString(),
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 size={64} className="text-yellow-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Verification Pending
          </h1>

          <div className="space-y-3 text-slate-600 dark:text-slate-400">
            <p>
              Thank you for registering as a healthcare provider. Your account is currently pending
              verification.
            </p>

            <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-left">
              <div className="flex items-start">
                <AlertCircle
                  size={20}
                  className="text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3 flex-shrink-0"
                />
                <div className="text-sm text-yellow-700 dark:text-yellow-400">
                  <p className="font-medium mb-1">Verification Process</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Our team will review your credentials and license information</li>
                    <li>This process typically takes 1-3 business days</li>
                    <li>You&apos;ll receive an email notification once your account is verified</li>
                  </ul>
                </div>
              </div>
            </div>

            <p>
              In the meantime, you can check your email for further instructions or contact our
              support team if you have any questions.
            </p>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Link href="/auth/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft size={16} className="mr-2" />
              Back to Login
            </Button>
          </Link>

          <Link href="/">
            <Button variant="link" className="w-full">
              Return to Homepage
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
