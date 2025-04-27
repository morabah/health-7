'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { Stethoscope, CalendarCheck, FileText } from 'lucide-react';
import { logInfo } from '@/lib/logger';

export default function Home() {
  useEffect(() => logInfo('Homepage rendered static'), []);

  return (
    <>
      <h1 className="sr-only">Home</h1>

      {/* Hero */}
      <section className="text-center py-16 md:py-24 px-4">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
          Healthcare at&nbsp;Your&nbsp;Fingertips
        </h2>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8">
          Connect with doctors, schedule appointments, and manage your health journey —
          all in one secure place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg" onClick={() => logInfo('CTA register')}>
              Get Started
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="secondary" size="lg">
              Learn More
            </Button>
          </Link>
        </div>
        <div className="mt-12 h-64 sm:h-80 lg:h-96 w-full max-w-4xl mx-auto
                        bg-gradient-to-r from-blue-100 to-primary/20 dark:from-blue-900/30
                        dark:to-primary/30 rounded-lg shadow-md flex items-center
                        justify-center italic text-slate-500">
          [ Illustrative Hero Image ]
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Features Designed for Your Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 flex flex-col items-center text-center">
              <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full mb-4">
                <Stethoscope className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Specialists</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Browse qualified doctors by specialty, location, and availability to find the perfect match for your needs.
              </p>
            </Card>
            
            <Card className="p-6 flex flex-col items-center text-center">
              <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full mb-4">
                <CalendarCheck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Scheduling</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Book appointments with just a few clicks and receive instant confirmations and reminders.
              </p>
            </Card>
            
            <Card className="p-6 flex flex-col items-center text-center">
              <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Health Records</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Access your health information securely and conveniently from anywhere at any time.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          
          <div className="space-y-12 md:space-y-16">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="bg-primary text-white rounded-full w-9 h-9 flex items-center justify-center font-semibold shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Create an account</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  Register as a patient to access our healthcare platform and services.
                </p>
                <Link href="/auth/register">
                  <Button variant="link" onClick={() => logInfo('How it works: Register')}>
                    Register Now &rarr;
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="bg-primary text-white rounded-full w-9 h-9 flex items-center justify-center font-semibold shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Find the right doctor</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  Search our network of certified specialists based on your needs.
                </p>
                <Link href="/find-doctors">
                  <Button variant="link" onClick={() => logInfo('How it works: Find Doctors')}>
                    Find Doctors &rarr;
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="bg-primary text-white rounded-full w-9 h-9 flex items-center justify-center font-semibold shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Book an appointment</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  Select a convenient time slot from the doctor's available schedule.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="bg-primary text-white rounded-full w-9 h-9 flex items-center justify-center font-semibold shrink-0">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Receive care</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  Attend your appointment online or in-person and get the care you need.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What Our Users Say
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6">
              <p className="text-slate-600 dark:text-slate-400 mb-4 italic">
                &quot;This platform has transformed how I manage my healthcare. Finding specialists and booking appointments is now seamless and stress-free.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium">Sarah Johnson</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">Patient</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <p className="text-slate-600 dark:text-slate-400 mb-4 italic">
                &quot;As a doctor, this system has helped me organize my schedule efficiently and connect with patients who truly need my expertise.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium">Dr. Michael Chen</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">Cardiologist</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
} 