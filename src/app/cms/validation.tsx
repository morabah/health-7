'use client';

import React from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileCheck, ArrowLeft, ExternalLink } from 'lucide-react';

export default function CMSValidationPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">API Validation Tests</h1>
        <Link href="/cms">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to CMS
          </Button>
        </Link>
      </div>
      
      <div className="grid gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-start">
            <FileCheck className="w-6 h-6 text-primary mr-4" />
            <div>
              <h2 className="text-xl font-semibold mb-2">API Validation Suite</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Run a comprehensive test suite to verify that all core API functions are working correctly.
                This will test authentication, appointment booking, doctor availability, and more.
              </p>
              <Link href="/dev/api-test/validation">
                <Button>
                  Run Validation Tests
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-start">
            <FileCheck className="w-6 h-6 text-primary mr-4" />
            <div>
              <h2 className="text-xl font-semibold mb-2">System Validation Page</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Access the full system validation page to test all API functions and verify the complete system is working correctly.
              </p>
              <Link href="/dev/cms/validation/final">
                <Button variant="outline">
                  Open System Validation
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
      
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>
          These validation tools are for development use only. They run real API calls against your local database
          and may create test data in your system.
        </p>
      </div>
    </div>
  );
} 