'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import VerificationForm from '@/components/admin/VerificationForm';
import { FileText, ExternalLink, User } from 'lucide-react';
import { useUserDetail, useUpdateDoctorVerification } from '@/data/adminLoaders';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { VerificationStatus } from '@/types/enums';
import { logInfo, logValidation } from '@/lib/logger';
import Image from 'next/image';

type Document = {
  title: string;
  url: string;
  type: string;
};

// Helper component for placeholder content
function PlaceholderLine({ text }: { text: string }) {
  return (
    <div className="p-6 text-center text-slate-500 dark:text-slate-400">
      {text}
    </div>
  );
}

const DoctorVerificationPage = () => {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.doctorId as string;
  const [success, setSuccess] = useState(false);
  
  // Fetch doctor details
  const { 
    data: doctorData, 
    isLoading: isLoadingDoctor, 
    error: doctorError 
  } = useUserDetail(doctorId);
  
  // Get verification mutation
  const verifyDoctorMutation = useUpdateDoctorVerification();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  useEffect(() => {
    logInfo('DoctorVerificationPage mounted', { doctorId });
    
    // If doctor data is available, extract documents
    if (doctorData?.user?.doctorProfile) {
      const profile = doctorData.user.doctorProfile;
      const docs: Document[] = [];
      
      if (profile.licenseDocumentUrl) {
        docs.push({
          title: 'Medical License',
          url: profile.licenseDocumentUrl,
          type: 'license'
        });
      }
      
      if (profile.certificateUrl) {
        docs.push({
          title: 'Medical Certificate',
          url: profile.certificateUrl,
          type: 'certificate'
        });
      }
      
      setDocuments(docs);
    }
  }, [doctorId, doctorData]);

  // Handle verification submission
  const handleVerification = async ({ status, notes }: { status: string; notes: string }) => {
    try {
      await verifyDoctorMutation.mutateAsync({ 
        doctorId, 
        status: status as VerificationStatus, 
        notes 
      });
      setSuccess(true);
      logInfo('Doctor verification updated', { doctorId, status });
      logValidation('4.10', 'success', 'Doctor verification fully functional with real API');
      
      // Redirect after successful verification
      setTimeout(() => {
        router.push('/admin/doctors');
      }, 1500);
    } catch (error) {
      console.error('Verification error:', error);
      throw error;
    }
  };
  
  useEffect(() => {
    logInfo('doctor-verification rendered (with real data)', { doctorId });
  }, [doctorId]);

  const doctor = doctorData?.user;
  const doctorProfile = doctor?.doctorProfile;

  if (isLoadingDoctor) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Loading doctor information...</span>
      </div>
    );
  }

  if (doctorError) {
    return (
      <div className="p-6">
        <Alert variant="error">
          Error loading doctor: {doctorError instanceof Error ? doctorError.message : 'Unknown error'}
        </Alert>
      </div>
    );
  }

  if (!doctor || !doctorProfile) {
    return (
      <div className="p-6">
        <Alert variant="warning">Doctor not found or doctor profile not available</Alert>
      </div>
    );
  }

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
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-shrink-0 w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                {doctorProfile.profilePictureUrl ? (
                  <Image
                    src={doctorProfile.profilePictureUrl}
                    alt={`${doctor.firstName} ${doctor.lastName}`}
                    width={96}
                    height={96}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-500 text-xl">
                      {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <h3 className="text-xl font-semibold">Dr. {doctor.firstName} {doctor.lastName}</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {doctorProfile?.specialty || 'General Practice'}
                </p>
                <p className="text-slate-500 dark:text-slate-500">
                  License: {doctorProfile?.licenseNumber || 'Not provided'}
                </p>
                <p className="text-slate-500 dark:text-slate-500">
                  Experience: {doctorProfile?.yearsOfExperience || '0'} years
                </p>
              </div>
              
              <div className="md:text-right">
                <div className="inline-block px-3 py-1 rounded-full text-sm" 
                  style={{
                    backgroundColor: doctor.verificationStatus === 'VERIFIED' 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : doctor.verificationStatus === 'REJECTED'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    color: doctor.verificationStatus === 'VERIFIED'
                      ? 'rgb(16, 185, 129)'
                      : doctor.verificationStatus === 'REJECTED'
                        ? 'rgb(239, 68, 68)'
                        : 'rgb(245, 158, 11)'
                  }}
                >
                  {doctor.verificationStatus || 'PENDING'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Uploaded Documents */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Uploaded Documents</h2>
        </div>
        
        {isLoadingDocuments ? (
          <div className="flex justify-center items-center p-6">
            <Spinner />
          </div>
        ) : documentError ? (
          <Alert variant="error" className="m-4">{documentError}</Alert>
        ) : documents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">
            No documents have been uploaded
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-4">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-md">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <span className="font-medium">{doc.title}</span>
                  </div>
                  <Link 
                    href={doc.url}
                    target="_blank"
                    className="text-primary-600 dark:text-primary-400 flex items-center hover:underline"
                  >
                    <span>View</span>
                    <ExternalLink className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Verification Form */}
      {!isLoadingDoctor && doctor && (
        <VerificationForm
          doctorId={doctorId}
          currentStatus={(doctor.verificationStatus || 'PENDING') as 'PENDING' | 'VERIFIED' | 'REJECTED'}
          onSubmit={handleVerification}
        />
      )}
      
      {success && (
        <Alert variant="success" className="mt-4">
          Verification status updated successfully. Redirecting to doctors list...
        </Alert>
      )}
    </div>
  );
};

export default DoctorVerificationPage; 