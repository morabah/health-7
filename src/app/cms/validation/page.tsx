'use client';

import React from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileCheck, ArrowLeft, ExternalLink, Database, FileText, Server } from 'lucide-react';

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
            <Database className="w-6 h-6 text-primary mr-4" />
            <div>
              <h2 className="text-xl font-semibold mb-2">Database Schema Validation</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Run validation checks on your local database to verify data integrity and conformity to schema definitions.
                Identifies any data inconsistencies across all collections.
              </p>
              <Link href="/cms-validation">
                <Button>
                  Run Database Validation
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-start">
            <Server className="w-6 h-6 text-primary mr-4" />
            <div>
              <h2 className="text-xl font-semibold mb-2">API Endpoint Testing</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Test individual API endpoints to ensure they are functioning correctly. This includes
                authentication, data retrieval, and mutation operations.
              </p>
              <Link href="/cms/api-test">
                <Button>
                  Run API Tests
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-start">
            <FileText className="w-6 h-6 text-primary mr-4" />
            <div>
              <h2 className="text-xl font-semibold mb-2">System Health Check</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Run a complete system health check to verify that all components are operational and integrated correctly.
              </p>
              <Button onClick={() => alert("System health check functionality is currently under development.")}>
                Run System Health Check
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
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