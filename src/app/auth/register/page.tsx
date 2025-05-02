'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UserCircle, UserCog, ArrowRight, ArrowLeft } from 'lucide-react';
import { logInfo } from '@/lib/logger';

/**
 * Registration choice page
 * Allows users to choose whether they want to register as a patient or a doctor
 */
export default function RegisterChoicePage() {
  const router = useRouter();
  const [hoveredOption, setHoveredOption] = useState<'patient' | 'doctor' | null>(null);
  
  const handleSelectOption = (option: 'patient' | 'doctor') => {
    logInfo('registration_choice', { option });
    router.push(`/auth/register/${option}`);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Create your account</h1>
      <p className="text-center text-slate-600 dark:text-slate-300 mb-10">
        Choose the account type that best suits your needs
      </p>
      
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Patient Registration Option */}
        <Card 
          className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-xl border-2 
            ${hoveredOption === 'patient' ? 'border-primary' : 'border-transparent'}`}
          onClick={() => handleSelectOption('patient')}
          onMouseEnter={() => setHoveredOption('patient')}
          onMouseLeave={() => setHoveredOption(null)}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <UserCircle size={48} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-3">Register as a Patient</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Looking for healthcare services? Create a patient account to book appointments with doctors, manage your medical records, and more.
            </p>
            <Button 
              variant={hoveredOption === 'patient' ? 'primary' : 'outline'} 
              className="mt-auto flex items-center"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
        
        {/* Doctor Registration Option */}
        <Card 
          className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-xl border-2 
            ${hoveredOption === 'doctor' ? 'border-primary' : 'border-transparent'}`}
          onClick={() => handleSelectOption('doctor')}
          onMouseEnter={() => setHoveredOption('doctor')}
          onMouseLeave={() => setHoveredOption(null)}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <UserCog size={48} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-3">Register as a Doctor</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you a healthcare provider? Join our platform to manage your appointments, connect with patients, and grow your practice.
            </p>
            <Button 
              variant={hoveredOption === 'doctor' ? 'primary' : 'outline'} 
              className="mt-auto flex items-center"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
      
      <div className="text-center">
        <p className="mb-4 text-slate-600 dark:text-slate-300">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <Link href="/">
          <Button variant="link" className="flex items-center mx-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
} 