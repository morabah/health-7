'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { VerificationStatus } from '@/types/enums';
import { logError } from '@/lib/logger';

interface VerificationFormProps {
  currentStatus: VerificationStatus;
  onSubmit: (payload: { status: VerificationStatus; notes: string }) => Promise<void>;
  disableVerify?: boolean;
}

export default function VerificationForm({ 
  currentStatus, 
  onSubmit,
  disableVerify = false
}: VerificationFormProps) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if form can be submitted
  const canSubmit = () => {
    if (status === currentStatus) return false;
    if (status === VerificationStatus.REJECTED && !notes.trim()) return false;
    if (status === VerificationStatus.VERIFIED && disableVerify) return false;
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit()) return;
    
    setLoading(true);
    setSuccess(false);
    
    try {
      // Simulate network delay as specified
      await new Promise(r => setTimeout(r, 700));
      await onSubmit({ status, notes });
      setSuccess(true);
    } catch (error: unknown) {
      logError('Error updating verification status', { error, status });
      // Set a user-friendly error message if needed
    } finally {
      setLoading(false);
    }
  };

  // Create IDs for accessibility
  const notesId = "verification-notes";
  const notesErrorId = "verification-notes-error";
  const statusId = "verification-status";
  const successId = "verification-success";
  const warningId = "verification-warning";

  return (
    <Card className="mt-6">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold">Verification Decision</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-4" aria-label="Doctor verification form">
        {success && (
          <Alert variant="success" className="mb-4" id={successId} role="status">
            <CheckCircle className="h-4 w-4 mr-2" />
            Doctor verification status updated successfully.
          </Alert>
        )}
        
        {status === VerificationStatus.VERIFIED && disableVerify && (
          <Alert variant="warning" className="mb-4" id={warningId} role="alert">
            <AlertTriangle className="h-4 w-4 mr-2" />
            You must complete all checklist items before verifying this doctor.
          </Alert>
        )}
        
        <div>
          <label htmlFor={statusId} className="block text-sm font-medium mb-1">
            Verification Status
          </label>
          <Select
            id={statusId}
            value={status}
            onChange={(e) => setStatus(e.target.value as VerificationStatus)}
            className="w-full"
            aria-required="true"
          >
            <option value={VerificationStatus.PENDING}>Pending Verification</option>
            <option value={VerificationStatus.VERIFIED}>Verified</option>
            <option value={VerificationStatus.REJECTED}>Rejected</option>
          </Select>
        </div>
        
        <div>
          <label htmlFor={notesId} className="block text-sm font-medium mb-1">
            Notes {status === VerificationStatus.REJECTED && <span className="text-danger" aria-hidden="true">*</span>}
          </label>
          <Textarea
            id={notesId}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              status === VerificationStatus.REJECTED
                ? 'Please provide a reason for rejection...'
                : 'Optional notes about the verification decision...'
            }
            required={status === VerificationStatus.REJECTED}
            aria-required={status === VerificationStatus.REJECTED ? "true" : "false"}
            aria-describedby={status === VerificationStatus.REJECTED && !notes.trim() ? notesErrorId : undefined}
            aria-invalid={status === VerificationStatus.REJECTED && !notes.trim() ? "true" : "false"}
            rows={4}
          />
          {status === VerificationStatus.REJECTED && !notes.trim() && (
            <p className="mt-1 text-sm text-danger" id={notesErrorId} role="alert">
              Notes are required when rejecting a verification request.
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3 pt-2">
          <Button
            type="submit"
            disabled={!canSubmit() || loading}
            isLoading={loading}
            variant={status === VerificationStatus.VERIFIED ? 'primary' : status === VerificationStatus.REJECTED ? 'danger' : 'secondary'}
            aria-label={`Confirm ${status === VerificationStatus.VERIFIED ? 'verification' : status === VerificationStatus.REJECTED ? 'rejection' : 'pending status'}`}
          >
            {status === VerificationStatus.VERIFIED && <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />}
            {status === VerificationStatus.REJECTED && <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />}
            Confirm Decision
          </Button>
        </div>
      </form>
    </Card>
  );
} 