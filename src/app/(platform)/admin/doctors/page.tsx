'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { Eye, CheckCircle, XCircle, Hourglass, Pencil, Search } from 'lucide-react';
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

// Define the API response type
interface DoctorsApiResponse {
  success: boolean;
  doctors: Doctor[];
  error?: string;
}

// Define the verification mutation response type
interface VerifyDoctorResponse {
  success: boolean;
  error?: string;
}

export default function AdminDoctorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams?.get('status') || '';

  const [statusFilter, setStatusFilter] = useState<string>(statusParam);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { 
    data, 
    isLoading, 
    error: fetchError, 
    refetch 
  } = useAllDoctors() as {
    data: DoctorsApiResponse | undefined;
    isLoading: boolean;
    error: unknown;
    refetch: () => Promise<unknown>;
  };

  const verifyDoctorMutation = useVerifyDoctor();

  const doctors = data?.success ? data.doctors : [];

  // Filter doctors based on verification status and search query
  const filteredDoctors = doctors.filter((doctor: Doctor) => {
    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      if (doctor.verificationStatus !== statusFilter) return false;
    }

    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const fullName = `${doctor.firstName} ${doctor.lastName}`.toLowerCase();
      const specialty = doctor.specialty.toLowerCase();
      const email = doctor.email.toLowerCase();

      return fullName.includes(query) || specialty.includes(query) || email.includes(query);
    }

    return true;
  });

  // Get badge variant and icon based on verification status
  const getStatusBadgeStyle = (
    status: string
  ): {
    variant: 'success' | 'warning' | 'danger' | 'default' | 'info' | 'pending';
    Icon: React.ElementType;
    text: string;
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
        notes: `Status changed to ${status} by admin`,
      }) as VerifyDoctorResponse;

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

  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatusFilter(newStatus);

    // Update URL with new status parameter
    if (searchParams) {
      const params = new URLSearchParams(searchParams.toString());

      if (newStatus && newStatus !== 'all') {
        params.set('status', newStatus);
      } else {
        params.delete('status');
      }

      // Push new URL with updated parameters
      router.push(`/admin/doctors${params.toString() ? `?${params.toString()}` : ''}`);
    }
  };

  useEffect(() => {
    logInfo('admin-doctors rendered (with real data)');

    if (data?.success) {
      // Debug logging to verify doctor data
      if (data.doctors && data.doctors.length > 0) {
        const firstDoctor = data.doctors[0];
        logInfo('Sample doctor data for verification', {
          id: firstDoctor.id,
          userId: firstDoctor.userId,
          name:
            firstDoctor.firstName && firstDoctor.lastName
              ? `${firstDoctor.firstName} ${firstDoctor.lastName}`
              : 'Missing name',
          email: firstDoctor.email || 'No email',
          specialty: firstDoctor.specialty || 'No specialty',
          status: firstDoctor.verificationStatus,
        });
      }

      try {
        logValidation('4.10', 'success', 'Admin doctors connected to real data via local API.');
      } catch (e) {
        // Silently handle validation logging errors
      }
    }

    // Update status filter if URL parameter changes
    if (statusParam !== statusFilter) {
      setStatusFilter(statusParam);
    }
  }, [data, statusParam, statusFilter]);

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
        {/* Status Filter and Search */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select
            className="w-48"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            disabled={isLoading || verifyDoctorMutation.isPending}
          >
            <option value="">All Statuses</option>
            <option value={VerificationStatus.PENDING}>Pending Verification</option>
            <option value={VerificationStatus.VERIFIED}>Verified</option>
            <option value={VerificationStatus.REJECTED}>Rejected</option>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name, specialty, or email..."
              className="w-full border rounded-md px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
          </div>

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
                    No doctors match the selected filters
                  </td>
                </tr>
              ) : (
                filteredDoctors.map(doctor => {
                  const status = getStatusBadgeStyle(doctor.verificationStatus);
                  return (
                    <tr key={doctor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {doctor.firstName} {doctor.lastName}
                        </div>
                      </td>
                      <td className="px-4 py-3">{doctor.email}</td>
                      <td className="px-4 py-3">{doctor.specialty}</td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant} className="flex items-center w-fit">
                          <status.Icon className="h-3 w-3 mr-1" />
                          {status.text}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {formatDate(doctor.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-2">
                          {/* View doctor profile */}
                          <Link href={`/admin/doctors/${doctor.id}`} passHref>
                            <Button variant="outline" size="sm" title="View doctor profile">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>

                          {/* Edit doctor */}
                          <Link href={`/admin/doctors/${doctor.id}/edit`} passHref>
                            <Button variant="outline" size="sm" title="Edit doctor profile">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </Link>

                          {/* Verify doctor - only shown for pending doctors */}
                          {doctor.verificationStatus === VerificationStatus.PENDING && (
                            <Button
                              variant="primary"
                              size="sm"
                              title="Approve verification request"
                              onClick={() =>
                                handleVerifyDoctor(doctor.id, VerificationStatus.VERIFIED)
                              }
                              disabled={verifyDoctorMutation.isPending}
                              className="text-white bg-green-500 hover:bg-green-600"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}

                          {/* Reject doctor - only shown for pending doctors */}
                          {doctor.verificationStatus === VerificationStatus.PENDING && (
                            <Button
                              variant="primary"
                              size="sm"
                              title="Reject verification request"
                              onClick={() =>
                                handleVerifyDoctor(doctor.id, VerificationStatus.REJECTED)
                              }
                              disabled={verifyDoctorMutation.isPending}
                              className="text-white bg-red-500 hover:bg-red-600"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          )}

                          {/* Verify doctor again - for rejected doctors */}
                          {doctor.verificationStatus === VerificationStatus.REJECTED && (
                            <Button
                              variant="primary"
                              size="sm"
                              title="Approve previously rejected doctor"
                              onClick={() =>
                                handleVerifyDoctor(doctor.id, VerificationStatus.VERIFIED)
                              }
                              disabled={verifyDoctorMutation.isPending}
                              className="text-white bg-green-500 hover:bg-green-600"
                            >
                              <CheckCircle className="h-3 w-3" />
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
