'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import { ArrowLeft, UserCheck, User, Calendar, Mail, Phone, MapPin, Stethoscope, Shield, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useAllDoctors } from '@/data/adminLoaders';
import { VerificationStatus, UserType } from '@/types/enums';
import { logError } from '@/lib/logger';
import type { DoctorProfile } from '@/types/schemas';

// Define a type for the extended doctor profile with user info
type DoctorWithUserInfo = DoctorProfile & {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  certifications?: string[];
};

// Define the response type from useAllDoctors
interface DoctorsResponse {
  success: boolean;
  doctors: DoctorWithUserInfo[];
  message?: string;
}

export default function DoctorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.doctorId as string;
  
  // Use the general doctors query since we don't have a specific API for a single doctor
  const { data, isLoading, error } = useAllDoctors();
  const [doctor, setDoctor] = useState<DoctorWithUserInfo | null>(null);
  
  useEffect(() => {
    if (data && typeof data === 'object' && 'success' in data && data.success && 'doctors' in data) {
      const doctorsData = data as DoctorsResponse;
      const foundDoctor = doctorsData.doctors.find((doc) => doc.id === doctorId);
      if (foundDoctor) {
        setDoctor(foundDoctor);
      }
    }
  }, [data, doctorId]);
  
  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-gray-500">Loading doctor information...</p>
        </div>
      </div>
    );
  }
  
  // Handle error state
  if (error || !data || typeof data !== 'object' || !('success' in data) || !data.success) {
    const errorMessage = error ? String(error) : 'Failed to load doctor information';
    logError('Error loading doctor details', { doctorId, error: errorMessage });
    
    return (
      <div className="p-6">
        <Alert variant="error" className="mb-4">
          {errorMessage}
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }
  
  if (!doctor) {
    return (
      <div className="p-6">
        <Alert variant="warning" className="mb-4">
          Doctor not found
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }
  
  // Get verification status badge color
  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return <Badge variant="success">Verified</Badge>;
      case VerificationStatus.PENDING:
        return <Badge variant="warning">Pending Verification</Badge>;
      case VerificationStatus.REJECTED:
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="info">Unknown</Badge>;
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Doctors
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push(`/admin/doctor-verification/${doctorId}`)}
          >
            <Shield className="h-4 w-4 mr-1" />
            Review Verification
          </Button>
        </div>
      </div>
      
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Dr. {doctor.firstName} {doctor.lastName}
            </h1>
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <div className="flex items-center">
                <Stethoscope className="h-4 w-4 mr-1" />
                <span>{doctor.specialty || 'No specialty provided'}</span>
              </div>
              <div>{getStatusBadge(doctor.verificationStatus)}</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div>
            <h2 className="font-semibold mb-4 text-lg flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-500 text-sm block">Full Name</span>
                <span>Dr. {doctor.firstName} {doctor.lastName}</span>
              </div>
              <div>
                <span className="text-gray-500 text-sm block">Email</span>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1 text-gray-500" />
                  <span>{doctor.email}</span>
                </div>
              </div>
              {doctor.phone && (
                <div>
                  <span className="text-gray-500 text-sm block">Phone</span>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{doctor.phone}</span>
                  </div>
                </div>
              )}
              {doctor.address && (
                <div>
                  <span className="text-gray-500 text-sm block">Address</span>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{doctor.address}</span>
                  </div>
                </div>
              )}
              <div>
                <span className="text-gray-500 text-sm block">User Type</span>
                <span>{UserType.DOCTOR}</span>
              </div>
              <div>
                <span className="text-gray-500 text-sm block">Joined</span>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                  <span>{new Date(doctor.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Professional Information */}
          <div>
            <h2 className="font-semibold mb-4 text-lg flex items-center">
              <Stethoscope className="h-5 w-5 mr-2" />
              Professional Information
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-500 text-sm block">Specialty</span>
                <span>{doctor.specialty || 'Not provided'}</span>
              </div>
              {doctor.education && (
                <div>
                  <span className="text-gray-500 text-sm block">Education</span>
                  <span>{doctor.education}</span>
                </div>
              )}
              {doctor.yearsOfExperience > 0 && (
                <div>
                  <span className="text-gray-500 text-sm block">Experience</span>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{doctor.yearsOfExperience} years</span>
                  </div>
                </div>
              )}
              {doctor.certifications && doctor.certifications.length > 0 && (
                <div>
                  <span className="text-gray-500 text-sm block">Certifications</span>
                  <ul className="list-disc list-inside pl-1">
                    {doctor.certifications.map((cert: string, index: number) => (
                      <li key={index} className="text-sm py-1">{cert}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <span className="text-gray-500 text-sm block">Verification Status</span>
                <div className="mt-1">{getStatusBadge(doctor.verificationStatus)}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Actions Card */}
      <Card className="p-6 mb-6">
        <h2 className="font-semibold mb-4 text-lg">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => router.push(`/admin/doctor-verification/${doctorId}`)}
            className="flex items-center"
          >
            <Shield className="h-4 w-4 mr-1" />
            Review Verification
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/appointments?doctorId=${doctorId}`)}
            className="flex items-center"
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            View Appointments
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/doctor-profile/${doctorId}`, '_blank')}
            className="flex items-center"
          >
            <UserCheck className="h-4 w-4 mr-1" />
            View Public Profile
          </Button>
        </div>
      </Card>
    </div>
  );
} 