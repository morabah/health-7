'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface VerificationFormProps {
  doctorId: string;
  currentStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  onSubmit: (payload: { status: string; notes: string }) => Promise<void>;
}

export default function VerificationForm({ 
  doctorId, 
  currentStatus, 
  onSubmit 
}: VerificationFormProps) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if form can be submitted
  const canSubmit = () => {
    if (status === currentStatus) return false;
    if (status === 'REJECTED' && !notes.trim()) return false;
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit()) return;
    
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Simulate network delay as specified
      await new Promise(r => setTimeout(r, 700));
      await onSubmit({ status, notes });
      setSuccess(true);
    } catch (err) {
      setError('Failed to update verification status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold">Verification Decision</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <Alert variant="error" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" className="mb-4">
            <CheckCircle className="h-4 w-4 mr-2" />
            Doctor verification status updated successfully.
          </Alert>
        )}
        
        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-1">
            Verification Status
          </label>
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'PENDING' | 'VERIFIED' | 'REJECTED')}
            className="w-full"
          >
            <option value="PENDING">Pending Verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Notes {status === 'REJECTED' && <span className="text-danger">*</span>}
          </label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              status === 'REJECTED'
                ? 'Please provide a reason for rejection...'
                : 'Optional notes about the verification decision...'
            }
            required={status === 'REJECTED'}
            rows={4}
          />
          {status === 'REJECTED' && !notes.trim() && (
            <p className="mt-1 text-sm text-danger">
              Notes are required when rejecting a verification request.
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3 pt-2">
          <Button
            type="submit"
            disabled={!canSubmit() || loading}
            isLoading={loading}
            variant={status === 'VERIFIED' ? 'primary' : status === 'REJECTED' ? 'danger' : 'secondary'}
          >
            {status === 'VERIFIED' && <CheckCircle className="h-4 w-4 mr-2" />}
            {status === 'REJECTED' && <XCircle className="h-4 w-4 mr-2" />}
            Confirm Decision
          </Button>
        </div>
      </form>
    </Card>
  );
} 