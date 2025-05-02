'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import VerificationForm from '@/components/admin/VerificationForm';
import { 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  ChevronLeft,
  History,
  ClipboardCheck,
  UserCheck,
  Shield,
  HelpCircle
} from 'lucide-react';
import { useUserDetail, useVerifyDoctor } from '@/data/adminLoaders';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { VerificationStatus } from '@/types/enums';
import { logInfo, logValidation, logError } from '@/lib/logger';
import Image from 'next/image';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';

type Document = {
  title: string;
  url: string;
  type: string;
};

// Verification checklist item component
function ChecklistItem({ 
  label, 
  isChecked, 
  onChange,
  description
}: { 
  label: string;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  description: string;
}) {
  return (
    <div className="flex items-start mb-4 p-3 rounded-md border border-slate-200 dark:border-slate-700">
      <label className="flex items-start cursor-pointer w-full">
        <input 
          type="checkbox" 
          checked={isChecked} 
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 rounded text-primary-600 focus:ring-primary-500" 
        />
        <div className="ml-3">
          <div className="flex items-center">
            <span className="font-medium">{label}</span>
            <Tooltip content={description}>
              <HelpCircle className="h-4 w-4 ml-1 text-slate-400" />
            </Tooltip>
          </div>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </label>
    </div>
  );
}

const DoctorVerificationPage = () => {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.doctorId as string;
  const [success, setSuccess] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('details');
  
  // Verification checklist state
  const [checklistItems, setChecklistItems] = useState({
    identityVerified: false,
    licenseValid: false,
    credentialsVerified: false,
    contactInfoConfirmed: false,
    specialtyVerified: false,
  });
  
  // Track if all checklist items are completed
  const allItemsChecked = Object.values(checklistItems).every(Boolean);
  
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
      // Require completion of all checklist items for verification
      if (status === VerificationStatus.VERIFIED && !allItemsChecked) {
        throw new Error('Please complete all verification checklist items before approving.');
      }
      
      const result = await verifyDoctorMutation.mutateAsync({ 
        doctorId, 
        status: status as VerificationStatus, 
        notes: getVerificationNotes(status as VerificationStatus, notes)
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
  
  // Generate comprehensive verification notes
  const getVerificationNotes = (status: VerificationStatus, userNotes: string): string => {
    if (status === VerificationStatus.REJECTED) {
      return userNotes; // For rejections, use the admin's provided notes directly
    }
    
    // For approvals, add checklist items as structured notes
    const checklistNotes = [
      checklistItems.identityVerified ? '✓ Identity verified' : '',
      checklistItems.licenseValid ? '✓ License valid and current' : '',
      checklistItems.credentialsVerified ? '✓ Medical credentials verified' : '',
      checklistItems.contactInfoConfirmed ? '✓ Contact information confirmed' : '',
      checklistItems.specialtyVerified ? '✓ Specialty credentials verified' : ''
    ].filter(Boolean).join('\n');
    
    return `Verification Checklist:\n${checklistNotes}\n\nAdmin Notes:\n${userNotes || 'Approved through the standard verification process.'}`;
  };
  
  // Handle checklist item changes
  const handleChecklistChange = (item: keyof typeof checklistItems, checked: boolean) => {
    setChecklistItems(prev => ({
      ...prev,
      [item]: checked
    }));
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

  // Error state
  if (doctorError) {
    return (
      <div className="p-6">
        <Alert variant="error">
          Error loading doctor: {typeof doctorError === 'string' ? doctorError : 'Failed to load doctor information'}
        </Alert>
        <div className="mt-4">
          <Button 
            variant="secondary" 
            as={Link}
            href="/admin/doctors"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Doctors
          </Button>
        </div>
      </div>
    );
  }

  // Doctor not found state
  if (!doctor || !doctorProfile) {
    return (
      <div className="p-6">
        <Alert variant="warning">
          Doctor not found or doctor profile not available
        </Alert>
        <div className="mt-4">
          <Button 
            variant="secondary" 
            as={Link}
            href="/admin/doctors"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Doctors
          </Button>
        </div>
      </div>
    );
  }

  // Determine current verification status
  const currentStatus = 
    typeof doctor.verificationStatus === 'string' 
      ? (doctor.verificationStatus.toLowerCase() === 'pending' 
        ? VerificationStatus.PENDING
        : doctor.verificationStatus.toLowerCase() === 'verified'
          ? VerificationStatus.VERIFIED
          : VerificationStatus.REJECTED)
      : VerificationStatus.PENDING;

  // Status badge
  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.PENDING:
        return <Badge variant="warning" className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case VerificationStatus.VERIFIED:
        return <Badge variant="success" className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>;
      case VerificationStatus.REJECTED:
        return <Badge variant="danger" className="flex items-center"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="default">Unknown</Badge>;
    }
  };

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
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Doctors
        </Button>
      </div>
      
      {/* Display mutation error if any */}
      {mutationError && (
        <Alert variant="error">
          {mutationError}
        </Alert>
      )}
      
      {/* Display success message if verification was successful */}
      {success && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Doctor verification status updated successfully. Redirecting...
        </Alert>
      )}
      
      {/* Status banner */}
      <div className={`p-4 rounded-lg flex items-center justify-between ${
        currentStatus === VerificationStatus.PENDING 
          ? 'bg-warning-50 dark:bg-warning-900/20 text-warning-800 dark:text-warning-200'
          : currentStatus === VerificationStatus.VERIFIED
            ? 'bg-success-50 dark:bg-success-900/20 text-success-800 dark:text-success-200'
            : 'bg-danger-50 dark:bg-danger-900/20 text-danger-800 dark:text-danger-200'
      }`}>
        <div className="flex items-center">
          {currentStatus === VerificationStatus.PENDING && <Clock className="h-5 w-5 mr-2" />}
          {currentStatus === VerificationStatus.VERIFIED && <CheckCircle2 className="h-5 w-5 mr-2" />}
          {currentStatus === VerificationStatus.REJECTED && <XCircle className="h-5 w-5 mr-2" />}
          <div>
            <p className="font-medium">
              Current Status: {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
            </p>
            <p className="text-sm">
              {currentStatus === VerificationStatus.PENDING && 'This doctor is waiting for verification. Review their credentials and make a decision.'}
              {currentStatus === VerificationStatus.VERIFIED && 'This doctor has been verified and can accept appointments.'}
              {currentStatus === VerificationStatus.REJECTED && 'This doctor\'s verification was rejected.'}
            </p>
          </div>
        </div>
        {getStatusBadge(currentStatus as VerificationStatus)}
      </div>
      
      {/* Tabs for different sections */}
      <Tabs
        tabs={[
          { id: 'details', label: 'Doctor Details', icon: UserCheck },
          { id: 'documents', label: 'Documents', icon: FileText },
          { id: 'verification', label: 'Verification', icon: Shield },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      
      {/* Doctor Information */}
      {activeTab === 'details' && (
        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold">Doctor Information</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {/* Name and basic info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-800 dark:text-primary-300">
                        {typeof doctor.firstName === 'string' ? doctor.firstName.charAt(0) : ''}
                        {typeof doctor.lastName === 'string' ? doctor.lastName.charAt(0) : ''}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold">
                        Dr. {typeof doctor.firstName === 'string' ? doctor.firstName : ''} {typeof doctor.lastName === 'string' ? doctor.lastName : ''}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400">
                        {typeof doctorProfile.specialty === 'string' ? doctorProfile.specialty : 'Unknown Specialty'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col justify-center">
                  <div className="text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-medium text-slate-500 dark:text-slate-400">Email</span>
                      <span>{typeof doctor.email === 'string' ? doctor.email : 'No email'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-medium text-slate-500 dark:text-slate-400">License Number</span>
                      <span>{typeof doctorProfile.licenseNumber === 'string' ? doctorProfile.licenseNumber : 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-medium text-slate-500 dark:text-slate-400">Experience</span>
                      <span>{typeof doctorProfile.yearsOfExperience === 'number' ? `${doctorProfile.yearsOfExperience} years` : 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Professional details */}
              <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                <h4 className="text-md font-semibold mb-4">Professional Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-slate-600 dark:text-slate-300 mb-2">Specialty</h5>
                    <p className="text-slate-800 dark:text-slate-200">
                      {typeof doctorProfile.specialty === 'string' ? doctorProfile.specialty : 'Not specified'}
                    </p>
                    
                    <h5 className="font-medium text-slate-600 dark:text-slate-300 mt-4 mb-2">Years of Experience</h5>
                    <p className="text-slate-800 dark:text-slate-200">
                      {typeof doctorProfile.yearsOfExperience === 'number' ? `${doctorProfile.yearsOfExperience} years` : 'Not specified'}
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-slate-600 dark:text-slate-300 mb-2">License Details</h5>
                    <p className="text-slate-800 dark:text-slate-200">
                      License Number: {typeof doctorProfile.licenseNumber === 'string' ? doctorProfile.licenseNumber : 'Not provided'}
                    </p>
                    
                    <h5 className="font-medium text-slate-600 dark:text-slate-300 mt-4 mb-2">Bio</h5>
                    <p className="text-slate-800 dark:text-slate-200">
                      {typeof doctorProfile.bio === 'string' && doctorProfile.bio 
                        ? doctorProfile.bio 
                        : 'No bio provided.'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Additional Information */}
              {typeof doctorProfile.education === 'object' && doctorProfile.education && Array.isArray(doctorProfile.education) && (
                <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                  <h4 className="text-md font-semibold mb-3">Education</h4>
                  <ul className="space-y-2">
                    {doctorProfile.education.map((edu: any, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary-500 mt-1.5 mr-2"></div>
                        <div>
                          <p className="font-medium">{edu.institution}</p>
                          <p className="text-sm text-slate-500">{edu.degree}, {edu.year}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      
      {/* Uploaded Documents Tab */}
      {activeTab === 'documents' && (
        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold">Uploaded Documents</h2>
          </div>
          
          {documents.length === 0 ? (
            <div className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-warning-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Documents Found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                This doctor has not uploaded any verification documents. Verification cannot proceed until required documents are provided.
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
                {documents.map((doc, idx) => (
                  <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-slate-400 mr-2" />
                        <span className="font-medium">{doc.title}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          as={Link}
                          href={doc.url}
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                    
                    {/* Document preview */}
                    <div className="p-4">
                      <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                        {doc.url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <Image 
                            src={doc.url}
                            alt={doc.title}
                            width={600}
                            height={400}
                            className="max-h-full object-contain"
                          />
                        ) : doc.url.match(/\.(pdf)$/i) ? (
                          <div className="text-center p-4">
                            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                            <p className="font-medium">PDF Document</p>
                            <p className="text-sm text-slate-500 mt-1">Click "View" to open the PDF file</p>
                          </div>
                        ) : (
                          <div className="text-center p-4">
                            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                            <p className="font-medium">Document</p>
                            <p className="text-sm text-slate-500 mt-1">Click "View" to open this document</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
      
      {/* Verification Tab */}
      {activeTab === 'verification' && (
        <>
          {/* Verification Checklist */}
          <Card>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">Verification Checklist</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                Complete the verification checklist before approving this doctor. All items must be checked.
              </p>
              
              <ChecklistItem 
                label="Identity Verified" 
                isChecked={checklistItems.identityVerified}
                onChange={(checked) => handleChecklistChange('identityVerified', checked)}
                description="Confirm the doctor's identity matches their submitted credentials and documentation."
              />
              
              <ChecklistItem 
                label="License Valid" 
                isChecked={checklistItems.licenseValid}
                onChange={(checked) => handleChecklistChange('licenseValid', checked)}
                description="Verify the medical license is current, legitimate, and without restrictions."
              />
              
              <ChecklistItem 
                label="Medical Credentials Verified" 
                isChecked={checklistItems.credentialsVerified}
                onChange={(checked) => handleChecklistChange('credentialsVerified', checked)}
                description="Check that degrees, certifications, and training match the claimed qualifications."
              />
              
              <ChecklistItem 
                label="Contact Information Confirmed" 
                isChecked={checklistItems.contactInfoConfirmed}
                onChange={(checked) => handleChecklistChange('contactInfoConfirmed', checked)}
                description="Verify the contact information is accurate and belongs to the doctor."
              />
              
              <ChecklistItem 
                label="Specialty Credentials Verified" 
                isChecked={checklistItems.specialtyVerified}
                onChange={(checked) => handleChecklistChange('specialtyVerified', checked)}
                description="Confirm that specialty certifications and experience match the claimed specialty."
              />
              
              {!allItemsChecked && currentStatus !== VerificationStatus.VERIFIED && (
                <Alert variant="warning" className="mt-4">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  All checklist items must be verified before approving this doctor.
                </Alert>
              )}
            </div>
          </Card>
          
          {/* Verification Form */}
          <VerificationForm
            currentStatus={currentStatus as VerificationStatus}
            onSubmit={handleVerification}
            disableVerify={!allItemsChecked}
          />
        </>
      )}
    </div>
  );
};

export default DoctorVerificationPage; 