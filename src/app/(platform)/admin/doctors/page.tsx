'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { Eye, CheckCircle, XCircle, Hourglass, Pencil } from 'lucide-react';
import { useAllDoctors, useVerifyDoctor } from '@/data/adminLoaders';
import { VerificationStatus } from '@/types/enums';
import { formatDate } from '@/lib/dateUtils';
import { logInfo, logValidation, logError } from '@/lib/logger';

// Define the doctor type
interface Doctor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  specialty: string;
  verificationStatus: string;
  createdAt: string;
}

export default function AdminDoctorsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [mutationError, setMutationError] = useState<string | null>(null);
  
  const { 
    data, 
    isLoading, 
    error: fetchError,
    refetch 
  } = useAllDoctors();
  
  const verifyDoctorMutation = useVerifyDoctor();
  
  const doctors = data?.success ? data.doctors : [];
  
  // Filter doctors based on verification status
  const filteredDoctors = statusFilter && statusFilter !== 'all'
    ? doctors.filter((doctor: Doctor) => doctor.verificationStatus === statusFilter)
    : doctors;
  
  // Get badge variant and icon based on verification status
  const getStatusBadgeStyle = (status: string): { 
    variant: 'success' | 'warning' | 'danger' | 'default' | 'info' | 'pending'; 
    Icon: React.ElementType; 
    text: string 
  } => {
    switch (status) {
      case VerificationStatus.PENDING:
        return { variant: 'warning', Icon: Hourglass, text: 'Pending' };
      case VerificationStatus.VERIFIED:
        return { variant: 'success', Icon: CheckCircle, text: 'Verified' };
      case VerificationStatus.REJECTED:
        return { variant: 'danger', Icon: XCircle, text: 'Rejected' };
      default:
        return { variant: 'default', Icon: Hourglass, text: status };
    }
  };

  // Handle verifying a doctor
  const handleVerifyDoctor = async (doctorId: string, status: VerificationStatus) => {
    setMutationError(null);
    
    try {
      const result = await verifyDoctorMutation.mutateAsync({
        doctorId,
        status,
        notes: `Status changed to ${status} by admin`
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update doctor verification status');
      }
      
      // Explicitly refetch to ensure we have the latest data
      // Even though useVerifyDoctor has an onSuccess handler
      await refetch();
      
      logInfo(`Doctor ${doctorId} verification status updated to ${status}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update doctor status';
      logError('Error verifying doctor', err);
      setMutationError(errorMessage);
    }
  };

  useEffect(() => {
    logInfo('admin-doctors rendered (with real data)');
    
    if (data?.success) {
      try {
        logValidation('4.10', 'success', 'Admin doctors connected to real data via local API.');
      } catch (e) {
        // Silently handle validation logging errors
      }
    }
  }, [data]);

  // Combined error from fetch or mutation
  const error = fetchError || mutationError;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold dark:text-white">Doctor Management</h1>
      </div>

      {/* Display errors if any */}
      {error && (
        <Alert variant="error" className="mb-4">
          {error instanceof Error ? error.message : String(error)}
        </Alert>
      )}

      <Card className="p-4">
        {/* Status Filter */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select 
            className="w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={isLoading || verifyDoctorMutation.isPending}
          >
            <option value="">All Statuses</option>
            <option value={VerificationStatus.PENDING}>Pending Verification</option>
            <option value={VerificationStatus.VERIFIED}>Verified</option>
            <option value={VerificationStatus.REJECTED}>Rejected</option>
          </Select>

          <div className="flex-grow"></div>

          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
            <span className="hidden sm:inline">Total:</span>{' '}
            <span className="font-medium ml-1">{filteredDoctors.length}</span>
          </div>
        </div>

        {/* Doctors Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Specialty</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="flex justify-center">
                      <Spinner className="w-8 h-8" />
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <Alert variant="error">
                      {fetchError instanceof Error ? fetchError.message : String(fetchError)}
                    </Alert>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500 dark:text-slate-400">
                    No doctors match the selected filter
                </td>
              </tr>
              ) : (
                filteredDoctors.map((doctor: Doctor) => {
                  const { variant, Icon, text } = getStatusBadgeStyle(doctor.verificationStatus);
                  const isUpdatingThisDoctor = verifyDoctorMutation.isPending;
                  
                  return (
                    <tr key={doctor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3">{doctor.firstName} {doctor.lastName}</td>
                      <td className="px-4 py-3">{doctor.email}</td>
                      <td className="px-4 py-3">{doctor.specialty}</td>
        <td className="px-4 py-3">
                        <Badge variant={variant} className="flex items-center w-fit">
                          <Icon className="h-3.5 w-3.5 mr-1" /> {text}
          </Badge>
        </td>
                      <td className="px-4 py-3">{formatDate(doctor.createdAt)}</td>
        <td className="px-4 py-3">
          <div className="flex justify-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
                            title="View Doctor Details"
              as={Link}
                            href={`/admin/doctor-verification/${doctor.id}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
                          
                          {doctor.verificationStatus === VerificationStatus.PENDING && (
                            <>
                              <Button 
                                variant="primary" 
                                size="sm"
                                onClick={() => handleVerifyDoctor(doctor.id, VerificationStatus.VERIFIED)}
                                disabled={isUpdatingThisDoctor}
                                isLoading={verifyDoctorMutation.isPending}
                              >
              Verify
            </Button>
                              <Button 
                                variant="danger" 
                                size="sm"
                                onClick={() => handleVerifyDoctor(doctor.id, VerificationStatus.REJECTED)}
                                disabled={isUpdatingThisDoctor}
                                isLoading={verifyDoctorMutation.isPending}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {doctor.verificationStatus === VerificationStatus.REJECTED && (
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => handleVerifyDoctor(doctor.id, VerificationStatus.VERIFIED)}
                              disabled={isUpdatingThisDoctor}
                              isLoading={verifyDoctorMutation.isPending}
                            >
                              Approve
            </Button>
                          )}
          </div>
        </td>
      </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
      </Card>
    </div>
  );
}
