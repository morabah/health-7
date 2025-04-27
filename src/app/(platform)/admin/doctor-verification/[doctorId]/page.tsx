'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import VerificationForm from '@/components/admin/VerificationForm';
import { FileText, ExternalLink } from 'lucide-react';

// Helper component for placeholder content
function PlaceholderLine({ text }: { text: string }) {
  return (
    <div className="p-6 text-center text-slate-500 dark:text-slate-400">
      {text}
    </div>
  );
}

export default function DoctorVerificationPage() {
  const params = useParams();
  const doctorId = params.doctorId as string;
  
  useEffect(() => {
    console.info('doctor-verification rendered (static)', { doctorId });
  }, [doctorId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold dark:text-white">Doctor Verification</h1>
        <Button
          variant="outline"
          size="sm"
          as={Link}
          href="/admin/doctors"
        >
          Back to Doctors
        </Button>
      </div>

      {/* Doctor Information */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Doctor Information</h2>
        </div>
        <PlaceholderLine text="Loading doctor info …" />
      </Card>

      {/* Uploaded Documents */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Uploaded Documents</h2>
        </div>
        
        {/* This would be replaced with actual documents in a real implementation */}
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-md">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <span className="font-medium">Medical License</span>
              </div>
              <Link 
                href="#" 
                className="text-primary-600 dark:text-primary-400 flex items-center hover:underline"
              >
                <span>View</span>
                <ExternalLink className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-md">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <span className="font-medium">Certification</span>
              </div>
              <Link 
                href="#" 
                className="text-primary-600 dark:text-primary-400 flex items-center hover:underline"
              >
                <span>View</span>
                <ExternalLink className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Verification Form */}
      <VerificationForm
        doctorId={doctorId}
        currentStatus="PENDING"
        onSubmit={async ({ status, notes }) => {
          console.info('verification submit (placeholder)', { status, notes });
        }}
      />
    </div>
  );
} 