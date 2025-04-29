'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import VerificationForm from '@/components/admin/VerificationForm';
import { FileText, ExternalLink } from 'lucide-react';
import { useUserDetail, useVerifyDoctor } from '@/data/adminLoaders';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { VerificationStatus } from '@/types/enums';
import { logInfo, logValidation, logError } from '@/lib/logger';
import Image from 'next/image';

type Document = {
  title: string;
  url: string;
  type: string;
};

const DoctorVerificationPage = () => {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.doctorId as string;
  const [success, setSuccess] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  
  // Fetch doctor details
  const { 
    data: doctorData, 
    isLoading: isLoadingDoctor, 
    error: doctorError,
    refetch 
  } = useUserDetail(doctorId);
  
  // Get verification mutation
  const verifyDoctorMutation = useVerifyDoctor();
  
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    logInfo('DoctorVerificationPage mounted', { doctorId });
    // If doctor data is available and successful, extract documents
    if (
      doctorData &&
      'success' in doctorData &&
      doctorData.success &&
      doctorData.user &&
      doctorData.user.doctorProfile &&
      typeof doctorData.user.doctorProfile === 'object'
    ) {
      const profile = doctorData.user.doctorProfile as Record<string, unknown>;
      const docs: Document[] = [];
      if (typeof profile.licenseDocumentUrl === 'string' && profile.licenseDocumentUrl) {
        docs.push({
          title: 'Medical License',
          url: profile.licenseDocumentUrl,
          type: 'license',
        });
      }
      if (typeof profile.certificateUrl === 'string' && profile.certificateUrl) {
        docs.push({
          title: 'Medical Certificate',
          url: profile.certificateUrl,
          type: 'certificate',
        });
      }
      setDocuments(docs);
    }
  }, [doctorId, doctorData]);

  // Handle verification submission
  const handleVerification = async ({ status, notes }: { status: string; notes: string }) => {
    setMutationError(null);
    
    try {
      const result = await verifyDoctorMutation.mutateAsync({ 
        doctorId, 
        status: status as VerificationStatus, 
        notes 
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update verification status');
      }
      
      setSuccess(true);
      logInfo('Doctor verification updated', { doctorId, status });
      logValidation('4.10', 'success', 'Doctor verification fully functional with real API');
      
      // Explicitly refetch to ensure we have the latest data
      await refetch();
      
      // Redirect after successful verification
      setTimeout(() => {
        router.push('/admin/doctors');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update verification status';
      logError('Verification error:', err);
      setMutationError(errorMessage);
    }
  };
  
  useEffect(() => {
    logInfo('doctor-verification rendered (with real data)', { doctorId });
  }, [doctorId]);

  const doctor = doctorData && 'success' in doctorData && doctorData.success ? doctorData.user as Record<string, unknown> : null;
  const doctorProfile = doctor && typeof doctor === 'object' && 'doctorProfile' in doctor && typeof doctor.doctorProfile === 'object' ? doctor.doctorProfile as Record<string, unknown> : null;

  // Loading state
  if (isLoadingDoctor || verifyDoctorMutation.isPending) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <Spinner className="w-8 h-8" />
        <span className="ml-3 text-gray-600">Loading doctor information...</span>
      </div>
    );
  }

  // Error state for data fetching
  if (doctorError) {
    return (
      <div className="p-6">
        <Alert variant="error">
          Error loading doctor: {doctorError instanceof Error ? doctorError.message : 'Unknown error'}
        </Alert>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            as={Link}
            href="/admin/doctors"
          >
            Back to Doctors
          </Button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!doctor || !doctorProfile) {
    return (
      <div className="p-6">
        <Alert variant="warning">Doctor not found or doctor profile not available</Alert>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            as={Link}
            href="/admin/doctors"
          >
            Back to Doctors
          </Button>
        </div>
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
      
      {/* Display mutation error if any */}
      {mutationError && (
        <Alert variant="error">
          {mutationError}
        </Alert>
      )}

      {/* Doctor Information */}
      <Card>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Doctor Information</h2>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-shrink-0 w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                {doctorProfile && typeof doctorProfile.profilePictureUrl === 'string' && doctorProfile.profilePictureUrl ? (
                  <Image
                    src={doctorProfile.profilePictureUrl}
                    alt={`${typeof doctor?.firstName === 'string' ? doctor.firstName : ''} ${typeof doctor?.lastName === 'string' ? doctor.lastName : ''}`}
                    width={96}
                    height={96}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-500 text-xl">
                      {typeof doctor?.firstName === 'string' ? doctor.firstName[0] : ''}
                      {typeof doctor?.lastName === 'string' ? doctor.lastName[0] : ''}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <h3 className="text-xl font-semibold">Dr. {typeof doctor?.firstName === 'string' ? doctor.firstName : ''} {typeof doctor?.lastName === 'string' ? doctor.lastName : ''}</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {doctorProfile && typeof doctorProfile.specialty === 'string' ? doctorProfile.specialty : 'General Practice'}
                </p>
                <p className="text-slate-500 dark:text-slate-500">
                  License: {doctorProfile && typeof doctorProfile.licenseNumber === 'string' ? doctorProfile.licenseNumber : 'Not provided'}
                </p>
                <p className="text-slate-500 dark:text-slate-500">
                  Experience: {doctorProfile && typeof doctorProfile.yearsOfExperience === 'number' ? doctorProfile.yearsOfExperience : '0'} years
                </p>
              </div>
              
              <div className="md:text-right">
                <div className="inline-block px-3 py-1 rounded-full text-sm" 
                  style={{
                    backgroundColor: doctor && doctor.verificationStatus === 'VERIFIED' 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : doctor && doctor.verificationStatus === 'REJECTED'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'rgba(245, 158, 11, 0.1)',
                    color: doctor && doctor.verificationStatus === 'VERIFIED'
                      ? 'rgb(16, 185, 129)'
                      : doctor && doctor.verificationStatus === 'REJECTED'
                        ? 'rgb(239, 68, 68)'
                        : 'rgb(245, 158, 11)'
                  }}
                >
                  {doctor && typeof doctor.verificationStatus === 'string' ? doctor.verificationStatus : 'PENDING'}
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
        
        {documents.length === 0 ? (
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
          currentStatus={
            typeof doctor.verificationStatus === 'string' 
              ? (doctor.verificationStatus.toLowerCase() === 'pending' 
                ? VerificationStatus.PENDING
                : doctor.verificationStatus.toLowerCase() === 'verified'
                  ? VerificationStatus.VERIFIED
                  : VerificationStatus.REJECTED)
              : VerificationStatus.PENDING
          }
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