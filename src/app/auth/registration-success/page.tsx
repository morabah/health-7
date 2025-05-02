'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { CheckCircle, Mail, ArrowRight, Users } from 'lucide-react';
import { logInfo } from '@/lib/logger';
import { APP_ROUTES } from '@/lib/router';
import { UserType } from '@/types/enums';

/**
 * Registration Success Page
 * Shown immediately after successful registration before verification step
 */
export default function RegistrationSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userType = searchParams ? searchParams.get('type') as UserType | null : null;
  const email = searchParams ? searchParams.get('email') : null;
  
  // Auto-redirect after 5 seconds
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    logInfo('registration_success_page_viewed', { userType, email });
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/auth/pending-verification');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router, userType, email]);
  
  const accountTypeInfo = () => {
    switch(userType) {
      case UserType.DOCTOR:
        return {
          title: 'Doctor Account Created Successfully!',
          description: 'Your doctor account has been created and is now pending verification. Please check your email for verification instructions.',
          steps: [
            'Check your email inbox for the verification email.',
            'Click the verification link in the email to confirm your account.',
            'Upload your medical credentials and license documents.',
            'Wait for admin verification (usually within 24-48 hours).',
            'Once verified, you can start accepting appointments!'
          ],
          icon: <Users className="w-16 h-16 text-primary" />
        };
      case UserType.PATIENT:
      default:
        return {
          title: 'Account Created Successfully!',
          description: 'Your patient account has been created. Please check your email for verification instructions.',
          steps: [
            'Check your email inbox for the verification email.',
            'Click the verification link in the email to confirm your account.',
            'Complete your medical profile with additional health information.',
            'Browse available doctors and schedule your first appointment!'
          ],
          icon: <CheckCircle className="w-16 h-16 text-green-500" />
        };
    }
  };
  
  const { title, description, steps, icon } = accountTypeInfo();
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
            {icon}
          </div>
          <h1 className="text-2xl font-bold mb-3">{title}</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-2">
            {description}
          </p>
          {email && (
            <div className="text-sm font-medium p-2 bg-slate-50 dark:bg-slate-800 rounded-md inline-block mt-2">
              {email}
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="font-medium text-lg mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-primary" />
            Next Steps:
          </h2>
          <ol className="list-decimal pl-5 space-y-3 text-slate-600 dark:text-slate-300">
            {steps.map((step, index) => (
              <li key={index} className="pl-2">{step}</li>
            ))}
          </ol>
        </div>
        
        <div className="text-center space-y-4">
          <p className="text-sm text-slate-500">
            Redirecting to verification page in <span className="font-bold">{countdown}</span> seconds...
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/pending-verification">
              <Button variant="primary" className="w-full sm:w-auto">
                Proceed to Verification
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href={APP_ROUTES.LOGIN}>
              <Button variant="outline" className="w-full sm:w-auto">
                Go to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
} 