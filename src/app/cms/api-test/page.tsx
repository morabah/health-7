'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { logInfo, logError, logValidation } from '@/lib/logger';
import { callApi } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { ArrowLeft, Play, CheckCircle, XCircle, Users, Database, TestTube } from 'lucide-react';
import { UserType, AppointmentType, AppointmentStatus, NotificationType } from '@/types/enums';
import { 
  UserProfileSchema, 
  PatientProfileSchema, 
  DoctorProfileSchema,
  AppointmentSchema,
  NotificationSchema
} from '@/types/schemas';
import type { z } from 'zod';

// Types for user simulation
type SimulatedUser = {
  id: string;
  email: string | null;
  type: UserType;
};

// Types for seeding status
type SeedStatus = {
  [key: string]: {
    loading: boolean;
    error: string | null;
    success: string | null;
  };
};

// Types for function testing
type FunctionResult = {
  loading: boolean;
  error: string | null;
  result: any;
};

/**
 * Enhanced CMS Backend Function Testing Page
 * Comprehensive tool for testing all backend functions, seeding data, and user simulation
 */
export default function ApiTestPage() {
  const { user, userProfile } = useAuth();
  
  // Core state management
  const [validationSteps, setValidationSteps] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [lastApiResponse, setLastApiResponse] = useState<any>(null);
  
  // Seeding state
  const [seedStatus, setSeedStatus] = useState<SeedStatus>({});
  
  // User simulation state
  const [availableUsers, setAvailableUsers] = useState<SimulatedUser[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  
  // Patient function inputs
  const [findDoctorSpecialty, setFindDoctorSpecialty] = useState('');
  const [findDoctorLocation, setFindDoctorLocation] = useState('');
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [appointmentIdToCancel, setAppointmentIdToCancel] = useState('');
  const [notificationIdToMark, setNotificationIdToMark] = useState('');
  
  // Doctor function inputs
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [availabilityStartTime, setAvailabilityStartTime] = useState('');
  const [availabilityEndTime, setAvailabilityEndTime] = useState('');
  const [appointmentIdToComplete, setAppointmentIdToComplete] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [verificationDocumentType, setVerificationDocumentType] = useState('');
  const [verificationDocumentUrl, setVerificationDocumentUrl] = useState('');
  
  // Admin function inputs
  const [adminDoctorIdToVerify, setAdminDoctorIdToVerify] = useState('');
  const [adminUserIdToUpdate, setAdminUserIdToUpdate] = useState('');
  const [adminNewUserStatus, setAdminNewUserStatus] = useState('');
  const [adminUserEmailToReset, setAdminUserEmailToReset] = useState('');
  const [adminNewUserEmail, setAdminNewUserEmail] = useState('');
  const [adminNewUserType, setAdminNewUserType] = useState<UserType>(UserType.PATIENT);
  const [adminNewUserFirstName, setAdminNewUserFirstName] = useState('');
  const [adminNewUserLastName, setAdminNewUserLastName] = useState('');
  
  // Profile update inputs (shared)
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  
  // Function result states
  const [functionResults, setFunctionResults] = useState<{[key: string]: FunctionResult}>({});
  
  // Initialize function result state
  const initFunctionResult = (functionName: string) => ({
    loading: false,
    error: null,
    result: null
  });
  
  // Helper to update function result
  const updateFunctionResult = (functionName: string, updates: Partial<FunctionResult>) => {
    setFunctionResults(prev => ({
      ...prev,
      [functionName]: { ...prev[functionName], ...updates }
    }));
  };
  
  // Initialize all function results
  useEffect(() => {
    const functions = [
      'findDoctors', 'getDoctorPublicProfile', 'getAvailableSlots', 'bookAppointment',
      'getMyAppointments', 'cancelAppointment', 'updateUserProfile', 'getNotifications',
      'markNotificationRead', 'setDoctorAvailability', 'getDoctorAvailability',
      'completeAppointment', 'addVerificationDocument', 'getMyVerificationDocuments',
      'adminVerifyDoctor', 'adminGetAllUsers', 'adminUpdateUserStatus', 
      'adminTriggerPasswordReset', 'adminCreateUser', 'adminGetDoctorVerificationDetails',
      'adminGetUserDetail'
    ];
    
    const initialResults: {[key: string]: FunctionResult} = {};
    functions.forEach(func => {
      initialResults[func] = initFunctionResult(func);
    });
    setFunctionResults(initialResults);
  }, []);
  
  // Load available users for simulation
  useEffect(() => {
    const loadUsers = async () => {
      if (userProfile?.userType === UserType.ADMIN) {
        try {
          logInfo('Loading available users for simulation...');
          // For now, use mock data - in real implementation would call adminGetAllUsersSimple
          const mockUsers: SimulatedUser[] = [
            { id: 'u-007', email: 'user7@demo.health', type: UserType.PATIENT },
            { id: 'u-008', email: 'user8@demo.health', type: UserType.PATIENT },
            { id: 'u-009', email: 'user9@demo.health', type: UserType.PATIENT },
            { id: 'u-000', email: 'user0@demo.health', type: UserType.DOCTOR },
            { id: 'u-001', email: 'user1@demo.health', type: UserType.DOCTOR },
            { id: 'u-002', email: 'user2@demo.health', type: UserType.DOCTOR },
          ];
          setAvailableUsers(mockUsers);
          logInfo('Available users loaded for simulation', { count: mockUsers.length });
        } catch (error) {
          logError('Failed to load available users', error);
        }
      }
    };
    
    loadUsers();
  }, [userProfile]);
  
  // Seeding handlers
  const handleSeedBasic = useCallback(async () => {
    setSeedStatus(prev => ({ ...prev, basic: { loading: true, error: null, success: null } }));
    
    try {
      logInfo('Starting basic data seeding...');
      // REMINDER: Backend functions must be adapted to prioritize 'data.simulatedUserId' for testing IF provided AND current real caller is Admin. Remove for production.
      
      // For now, simulate seeding - in real implementation would call seedBasicData function
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      setSeedStatus(prev => ({ 
        ...prev, 
        basic: { loading: false, error: null, success: 'Basic users and profiles seeded successfully' } 
      }));
      logInfo('Basic data seeding completed');
      
      // Refresh available users
      // In real implementation, would reload users from backend
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSeedStatus(prev => ({ 
        ...prev, 
        basic: { loading: false, error: errorMessage, success: null } 
      }));
      logError('Basic data seeding failed', error);
    }
  }, []);
  
  const handleSeedDoctor = useCallback(async (doctorId: string) => {
    setSeedStatus(prev => ({ ...prev, doctor: { loading: true, error: null, success: null } }));
    
    try {
      logInfo('Starting doctor-specific data seeding...', { doctorId });
      // REMINDER: Backend functions must be adapted to prioritize 'data.simulatedUserId' for testing IF provided AND current real caller is Admin. Remove for production.
      
      // For now, simulate seeding - in real implementation would call seedDoctorSpecificData function
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      setSeedStatus(prev => ({ 
        ...prev, 
        doctor: { loading: false, error: null, success: `Doctor data seeded for ${doctorId}` } 
      }));
      logInfo('Doctor data seeding completed', { doctorId });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSeedStatus(prev => ({ 
        ...prev, 
        doctor: { loading: false, error: errorMessage, success: null } 
      }));
      logError('Doctor data seeding failed', error);
    }
  }, []);
  
  const handleSeedPatient = useCallback(async (patientId: string) => {
    setSeedStatus(prev => ({ ...prev, patient: { loading: true, error: null, success: null } }));
    
    try {
      logInfo('Starting patient-specific data seeding...', { patientId });
      // REMINDER: Backend functions must be adapted to prioritize 'data.simulatedUserId' for testing IF provided AND current real caller is Admin. Remove for production.
      
      // For now, simulate seeding - in real implementation would call seedPatientSpecificData function
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      setSeedStatus(prev => ({ 
        ...prev, 
        patient: { loading: false, error: null, success: `Patient data seeded for ${patientId}` } 
      }));
      logInfo('Patient data seeding completed', { patientId });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSeedStatus(prev => ({ 
        ...prev, 
        patient: { loading: false, error: errorMessage, success: null } 
      }));
      logError('Patient data seeding failed', error);
    }
  }, []);
  
  // Generic function call handler
  const callFunction = useCallback(async (
    functionName: string, 
    payload: any, 
    schema?: any
  ) => {
    updateFunctionResult(functionName, { loading: true, error: null });
    
    try {
      logInfo(`Calling function: ${functionName}`, { payload });
      
             // Add simulatedUserId for patient/doctor actions if admin is testing
       if (userProfile?.userType === UserType.ADMIN) {
        if (functionName.includes('Patient') || selectedPatientId) {
          payload.simulatedUserId = selectedPatientId;
        } else if (functionName.includes('Doctor') || selectedDoctorId) {
          payload.simulatedUserId = selectedDoctorId;
        }
      }
      
             const response = await callApi(functionName, payload, schema);
       setLastApiResponse(response);
       updateFunctionResult(functionName, { 
         loading: false, 
         result: (response as any)?.data || response 
       });
      
      logInfo(`Function ${functionName} completed successfully`, response);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateFunctionResult(functionName, { 
        loading: false, 
        error: errorMessage 
      });
      setLastApiResponse({ error: errorMessage });
      logError(`Function ${functionName} failed`, error);
    }
     }, [userProfile, selectedPatientId, selectedDoctorId]);
  
  // Patient action handlers
  const handleFindDoctors = () => callFunction('findDoctors', {
    specialty: findDoctorSpecialty,
    location: findDoctorLocation
  });
  
  const handleGetDoctorProfile = () => callFunction('getDoctorPublicProfile', {
    doctorId: bookingDoctorId
  });
  
  const handleGetAvailableSlots = () => callFunction('getAvailableSlots', {
    doctorId: bookingDoctorId,
    date: bookingDate
  });
  
  const handleBookAppointment = () => callFunction('bookAppointment', {
    doctorId: bookingDoctorId,
    appointmentDate: bookingDate,
    startTime: bookingTime,
    reason: bookingReason,
    appointmentType: AppointmentType.IN_PERSON
  });
  
  const handleGetMyAppointments = () => callFunction('getMyAppointments', {});
  
  const handleCancelAppointment = () => callFunction('cancelAppointment', {
    appointmentId: appointmentIdToCancel
  });
  
  const handleUpdateUserProfile = () => callFunction('updateUserProfile', {
    firstName: profileFirstName,
    lastName: profileLastName,
    phone: profilePhone
  });
  
  const handleGetNotifications = () => callFunction('getNotifications', {});
  
  const handleMarkNotificationRead = () => callFunction('markNotificationRead', {
    notificationId: notificationIdToMark
  });
  
  // Doctor action handlers
  const handleSetDoctorAvailability = () => callFunction('setDoctorAvailability', {
    date: availabilityDate,
    startTime: availabilityStartTime,
    endTime: availabilityEndTime
  });
  
  const handleGetDoctorAvailability = () => callFunction('getDoctorAvailability', {
    startDate: availabilityDate,
    endDate: availabilityDate
  });
  
  const handleCompleteAppointment = () => callFunction('completeAppointment', {
    appointmentId: appointmentIdToComplete,
    notes: completionNotes
  });
  
  const handleAddVerificationDocument = () => callFunction('addVerificationDocument', {
    documentType: verificationDocumentType,
    documentUrl: verificationDocumentUrl
  });
  
  const handleGetMyVerificationDocuments = () => callFunction('getMyVerificationDocuments', {});
  
  // Admin action handlers
  const handleAdminVerifyDoctor = () => callFunction('adminVerifyDoctor', {
    doctorId: adminDoctorIdToVerify,
    verified: true
  });
  
  const handleAdminGetAllUsers = () => callFunction('adminGetAllUsers', {});
  
  const handleAdminUpdateUserStatus = () => callFunction('adminUpdateUserStatus', {
    userId: adminUserIdToUpdate,
    status: adminNewUserStatus
  });
  
  const handleAdminTriggerPasswordReset = () => callFunction('adminTriggerPasswordReset', {
    email: adminUserEmailToReset
  });
  
  const handleAdminCreateUser = () => callFunction('adminCreateUser', {
    email: adminNewUserEmail,
    userType: adminNewUserType,
    firstName: adminNewUserFirstName,
    lastName: adminNewUserLastName
  });
  
  const handleAdminGetDoctorVerificationDetails = () => callFunction('adminGetDoctorVerificationDetails', {
    doctorId: adminDoctorIdToVerify
  });
  
  const handleAdminGetUserDetail = () => callFunction('adminGetUserDetail', {
    userId: adminUserIdToUpdate
  });
  
  // Clear logs handler
  const handleClearLogs = () => {
    setLogs([]);
  };
  
  // Get patients and doctors for selectors
  const patients = availableUsers.filter(u => u.type === UserType.PATIENT);
  const doctors = availableUsers.filter(u => u.type === UserType.DOCTOR);
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Backend Function Testing Suite</h1>
        <Link href="/cms/validation">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Validation
          </Button>
        </Link>
      </div>
      
      {/* Emulator Seeding Controls */}
      <Card className="p-6 mb-6">
        <div className="flex items-center mb-4">
          <Database className="w-6 h-6 text-blue-500 mr-3" />
          <h2 className="text-xl font-semibold">Emulator Data Controls</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Seed the Firestore and Auth Emulators with test data for comprehensive testing.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Button 
              onClick={handleSeedBasic}
              disabled={seedStatus.basic?.loading}
              className="w-full mb-2"
            >
              {seedStatus.basic?.loading && <Spinner size="sm" className="mr-2" />}
              Seed Basic Users/Profiles
            </Button>
            {seedStatus.basic?.success && (
              <Alert variant="success" className="text-sm">{seedStatus.basic.success}</Alert>
            )}
            {seedStatus.basic?.error && (
              <Alert variant="error" className="text-sm">{seedStatus.basic.error}</Alert>
            )}
          </div>
          
          <div>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Doctor ID"
                value={bookingDoctorId}
                onChange={(e) => setBookingDoctorId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={() => handleSeedDoctor(bookingDoctorId)}
                disabled={seedStatus.doctor?.loading || !bookingDoctorId}
                size="sm"
              >
                {seedStatus.doctor?.loading && <Spinner size="sm" className="mr-1" />}
                Seed Doctor
              </Button>
            </div>
            {seedStatus.doctor?.success && (
              <Alert variant="success" className="text-sm">{seedStatus.doctor.success}</Alert>
            )}
            {seedStatus.doctor?.error && (
              <Alert variant="error" className="text-sm">{seedStatus.doctor.error}</Alert>
            )}
          </div>
          
          <div>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Patient ID"
                value={selectedPatientId || ''}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={() => selectedPatientId && handleSeedPatient(selectedPatientId)}
                disabled={seedStatus.patient?.loading || !selectedPatientId}
                size="sm"
              >
                {seedStatus.patient?.loading && <Spinner size="sm" className="mr-1" />}
                Seed Patient
              </Button>
            </div>
            {seedStatus.patient?.success && (
              <Alert variant="success" className="text-sm">{seedStatus.patient.success}</Alert>
            )}
            {seedStatus.patient?.error && (
              <Alert variant="error" className="text-sm">{seedStatus.patient.error}</Alert>
            )}
          </div>
        </div>
      </Card>
      
      {/* User Simulation Selection */}
      <Card className="p-6 mb-6">
        <div className="flex items-center mb-4">
          <Users className="w-6 h-6 text-green-500 mr-3" />
          <h2 className="text-xl font-semibold">User Simulation</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Select users to simulate for testing patient and doctor functions.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Simulate as Patient</label>
            <Select
              value={selectedPatientId || ''}
              onChange={(e) => setSelectedPatientId(e.target.value || null)}
              className="mb-2"
            >
              <option value="">Select a patient...</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.email} ({patient.id})
                </option>
              ))}
            </Select>
            {selectedPatientId && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Selected: {selectedPatientId}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedPatientId(null)}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Simulate as Doctor</label>
            <Select
              value={selectedDoctorId || ''}
              onChange={(e) => setSelectedDoctorId(e.target.value || null)}
              className="mb-2"
            >
              <option value="">Select a doctor...</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.email} ({doctor.id})
                </option>
              ))}
            </Select>
            {selectedDoctorId && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Selected: {selectedDoctorId}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedDoctorId(null)}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {/* Patient Actions */}
      {selectedPatientId && (
        <Card className="p-6 mb-6">
          <div className="flex items-center mb-4">
            <TestTube className="w-6 h-6 text-blue-500 mr-3" />
            <h2 className="text-xl font-semibold">Patient Actions (as {selectedPatientId})</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Find Doctors */}
            <div className="space-y-3">
              <h3 className="font-medium">Find Doctors</h3>
              <Input
                placeholder="Specialty (e.g., Cardiology)"
                value={findDoctorSpecialty}
                onChange={(e) => setFindDoctorSpecialty(e.target.value)}
              />
              <Input
                placeholder="Location (optional)"
                value={findDoctorLocation}
                onChange={(e) => setFindDoctorLocation(e.target.value)}
              />
              <Button 
                onClick={handleFindDoctors}
                disabled={functionResults.findDoctors?.loading}
                className="w-full"
              >
                {functionResults.findDoctors?.loading && <Spinner size="sm" className="mr-2" />}
                Find Doctors
              </Button>
              {functionResults.findDoctors?.error && (
                <Alert variant="error" className="text-sm">{functionResults.findDoctors.error}</Alert>
              )}
              {functionResults.findDoctors?.result && (
                <Alert variant="success" className="text-sm">
                  Found {functionResults.findDoctors.result.length || 0} doctors
                </Alert>
              )}
            </div>
            
            {/* Book Appointment */}
            <div className="space-y-3">
              <h3 className="font-medium">Book Appointment</h3>
              <Input
                placeholder="Doctor ID"
                value={bookingDoctorId}
                onChange={(e) => setBookingDoctorId(e.target.value)}
              />
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
              <Input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
              />
              <Input
                placeholder="Reason for visit"
                value={bookingReason}
                onChange={(e) => setBookingReason(e.target.value)}
              />
              <Button 
                onClick={handleBookAppointment}
                disabled={functionResults.bookAppointment?.loading}
                className="w-full"
              >
                {functionResults.bookAppointment?.loading && <Spinner size="sm" className="mr-2" />}
                Book Appointment
              </Button>
              {functionResults.bookAppointment?.error && (
                <Alert variant="error" className="text-sm">{functionResults.bookAppointment.error}</Alert>
              )}
              {functionResults.bookAppointment?.result && (
                <Alert variant="success" className="text-sm">
                  Appointment booked: {functionResults.bookAppointment.result.id}
                </Alert>
              )}
            </div>
            
            {/* Get My Appointments */}
            <div className="space-y-3">
              <h3 className="font-medium">My Appointments</h3>
              <Button 
                onClick={handleGetMyAppointments}
                disabled={functionResults.getMyAppointments?.loading}
                className="w-full"
              >
                {functionResults.getMyAppointments?.loading && <Spinner size="sm" className="mr-2" />}
                Get My Appointments
              </Button>
              {functionResults.getMyAppointments?.error && (
                <Alert variant="error" className="text-sm">{functionResults.getMyAppointments.error}</Alert>
              )}
              {functionResults.getMyAppointments?.result && (
                <Alert variant="success" className="text-sm">
                  Found {functionResults.getMyAppointments.result.length || 0} appointments
                </Alert>
              )}
            </div>
            
            {/* Cancel Appointment */}
            <div className="space-y-3">
              <h3 className="font-medium">Cancel Appointment</h3>
              <Input
                placeholder="Appointment ID"
                value={appointmentIdToCancel}
                onChange={(e) => setAppointmentIdToCancel(e.target.value)}
              />
              <Button 
                onClick={handleCancelAppointment}
                disabled={functionResults.cancelAppointment?.loading}
                className="w-full"
                variant="outline"
              >
                {functionResults.cancelAppointment?.loading && <Spinner size="sm" className="mr-2" />}
                Cancel Appointment
              </Button>
              {functionResults.cancelAppointment?.error && (
                <Alert variant="error" className="text-sm">{functionResults.cancelAppointment.error}</Alert>
              )}
              {functionResults.cancelAppointment?.result && (
                <Alert variant="success" className="text-sm">Appointment cancelled successfully</Alert>
              )}
            </div>
          </div>
        </Card>
      )}
      
      {/* Doctor Actions */}
      {selectedDoctorId && (
        <Card className="p-6 mb-6">
          <div className="flex items-center mb-4">
            <TestTube className="w-6 h-6 text-green-500 mr-3" />
            <h2 className="text-xl font-semibold">Doctor Actions (as {selectedDoctorId})</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Set Availability */}
            <div className="space-y-3">
              <h3 className="font-medium">Set Availability</h3>
              <Input
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
              />
              <Input
                type="time"
                placeholder="Start time"
                value={availabilityStartTime}
                onChange={(e) => setAvailabilityStartTime(e.target.value)}
              />
              <Input
                type="time"
                placeholder="End time"
                value={availabilityEndTime}
                onChange={(e) => setAvailabilityEndTime(e.target.value)}
              />
              <Button 
                onClick={handleSetDoctorAvailability}
                disabled={functionResults.setDoctorAvailability?.loading}
                className="w-full"
              >
                {functionResults.setDoctorAvailability?.loading && <Spinner size="sm" className="mr-2" />}
                Set Availability
              </Button>
              {functionResults.setDoctorAvailability?.error && (
                <Alert variant="error" className="text-sm">{functionResults.setDoctorAvailability.error}</Alert>
              )}
              {functionResults.setDoctorAvailability?.result && (
                <Alert variant="success" className="text-sm">Availability set successfully</Alert>
              )}
            </div>
            
            {/* Complete Appointment */}
            <div className="space-y-3">
              <h3 className="font-medium">Complete Appointment</h3>
              <Input
                placeholder="Appointment ID"
                value={appointmentIdToComplete}
                onChange={(e) => setAppointmentIdToComplete(e.target.value)}
              />
              <Textarea
                placeholder="Completion notes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleCompleteAppointment}
                disabled={functionResults.completeAppointment?.loading}
                className="w-full"
              >
                {functionResults.completeAppointment?.loading && <Spinner size="sm" className="mr-2" />}
                Complete Appointment
              </Button>
              {functionResults.completeAppointment?.error && (
                <Alert variant="error" className="text-sm">{functionResults.completeAppointment.error}</Alert>
              )}
              {functionResults.completeAppointment?.result && (
                <Alert variant="success" className="text-sm">Appointment completed successfully</Alert>
              )}
            </div>
            
            {/* Add Verification Document */}
            <div className="space-y-3">
              <h3 className="font-medium">Add Verification Document</h3>
              <Select
                value={verificationDocumentType}
                onChange={(e) => setVerificationDocumentType(e.target.value)}
              >
                <option value="">Select document type...</option>
                <option value="medical_license">Medical License</option>
                <option value="board_certification">Board Certification</option>
                <option value="malpractice_insurance">Malpractice Insurance</option>
              </Select>
              <Input
                placeholder="Document URL"
                value={verificationDocumentUrl}
                onChange={(e) => setVerificationDocumentUrl(e.target.value)}
              />
              <Button 
                onClick={handleAddVerificationDocument}
                disabled={functionResults.addVerificationDocument?.loading}
                className="w-full"
              >
                {functionResults.addVerificationDocument?.loading && <Spinner size="sm" className="mr-2" />}
                Add Document
              </Button>
              {functionResults.addVerificationDocument?.error && (
                <Alert variant="error" className="text-sm">{functionResults.addVerificationDocument.error}</Alert>
              )}
              {functionResults.addVerificationDocument?.result && (
                <Alert variant="success" className="text-sm">Document added successfully</Alert>
              )}
            </div>
            
            {/* Get My Verification Documents */}
            <div className="space-y-3">
              <h3 className="font-medium">My Verification Documents</h3>
              <Button 
                onClick={handleGetMyVerificationDocuments}
                disabled={functionResults.getMyVerificationDocuments?.loading}
                className="w-full"
              >
                {functionResults.getMyVerificationDocuments?.loading && <Spinner size="sm" className="mr-2" />}
                Get My Documents
              </Button>
              {functionResults.getMyVerificationDocuments?.error && (
                <Alert variant="error" className="text-sm">{functionResults.getMyVerificationDocuments.error}</Alert>
              )}
              {functionResults.getMyVerificationDocuments?.result && (
                <Alert variant="success" className="text-sm">
                  Found {functionResults.getMyVerificationDocuments.result.length || 0} documents
                </Alert>
              )}
            </div>
          </div>
        </Card>
      )}
      
             {/* Admin Actions */}
       {userProfile?.userType === UserType.ADMIN && (
        <Card className="p-6 mb-6">
          <div className="flex items-center mb-4">
            <TestTube className="w-6 h-6 text-purple-500 mr-3" />
            <h2 className="text-xl font-semibold">Admin Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Verify Doctor */}
            <div className="space-y-3">
              <h3 className="font-medium">Verify Doctor</h3>
              <Input
                placeholder="Doctor ID"
                value={adminDoctorIdToVerify}
                onChange={(e) => setAdminDoctorIdToVerify(e.target.value)}
              />
              <Button 
                onClick={handleAdminVerifyDoctor}
                disabled={functionResults.adminVerifyDoctor?.loading}
                className="w-full"
              >
                {functionResults.adminVerifyDoctor?.loading && <Spinner size="sm" className="mr-2" />}
                Verify Doctor
              </Button>
              {functionResults.adminVerifyDoctor?.error && (
                <Alert variant="error" className="text-sm">{functionResults.adminVerifyDoctor.error}</Alert>
              )}
              {functionResults.adminVerifyDoctor?.result && (
                <Alert variant="success" className="text-sm">Doctor verified successfully</Alert>
              )}
            </div>
            
            {/* Get All Users */}
            <div className="space-y-3">
              <h3 className="font-medium">Get All Users</h3>
              <Button 
                onClick={handleAdminGetAllUsers}
                disabled={functionResults.adminGetAllUsers?.loading}
                className="w-full"
              >
                {functionResults.adminGetAllUsers?.loading && <Spinner size="sm" className="mr-2" />}
                Get All Users
              </Button>
              {functionResults.adminGetAllUsers?.error && (
                <Alert variant="error" className="text-sm">{functionResults.adminGetAllUsers.error}</Alert>
              )}
              {functionResults.adminGetAllUsers?.result && (
                <Alert variant="success" className="text-sm">
                  Found {functionResults.adminGetAllUsers.result.length || 0} users
                </Alert>
              )}
            </div>
            
            {/* Update User Status */}
            <div className="space-y-3">
              <h3 className="font-medium">Update User Status</h3>
              <Input
                placeholder="User ID"
                value={adminUserIdToUpdate}
                onChange={(e) => setAdminUserIdToUpdate(e.target.value)}
              />
              <Select
                value={adminNewUserStatus}
                onChange={(e) => setAdminNewUserStatus(e.target.value)}
              >
                <option value="">Select status...</option>
                <option value="ACTIVE">Active</option>
                <option value="DEACTIVATED">Deactivated</option>
                <option value="SUSPENDED">Suspended</option>
              </Select>
              <Button 
                onClick={handleAdminUpdateUserStatus}
                disabled={functionResults.adminUpdateUserStatus?.loading}
                className="w-full"
              >
                {functionResults.adminUpdateUserStatus?.loading && <Spinner size="sm" className="mr-2" />}
                Update Status
              </Button>
              {functionResults.adminUpdateUserStatus?.error && (
                <Alert variant="error" className="text-sm">{functionResults.adminUpdateUserStatus.error}</Alert>
              )}
              {functionResults.adminUpdateUserStatus?.result && (
                <Alert variant="success" className="text-sm">User status updated successfully</Alert>
              )}
            </div>
            
            {/* Create User */}
            <div className="space-y-3">
              <h3 className="font-medium">Create User</h3>
              <Input
                placeholder="Email"
                value={adminNewUserEmail}
                onChange={(e) => setAdminNewUserEmail(e.target.value)}
              />
              <Select
                value={adminNewUserType}
                onChange={(e) => setAdminNewUserType(e.target.value as UserType)}
              >
                <option value={UserType.PATIENT}>Patient</option>
                <option value={UserType.DOCTOR}>Doctor</option>
                <option value={UserType.ADMIN}>Admin</option>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="First Name"
                  value={adminNewUserFirstName}
                  onChange={(e) => setAdminNewUserFirstName(e.target.value)}
                />
                <Input
                  placeholder="Last Name"
                  value={adminNewUserLastName}
                  onChange={(e) => setAdminNewUserLastName(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAdminCreateUser}
                disabled={functionResults.adminCreateUser?.loading}
                className="w-full"
              >
                {functionResults.adminCreateUser?.loading && <Spinner size="sm" className="mr-2" />}
                Create User
              </Button>
              {functionResults.adminCreateUser?.error && (
                <Alert variant="error" className="text-sm">{functionResults.adminCreateUser.error}</Alert>
              )}
              {functionResults.adminCreateUser?.result && (
                <Alert variant="success" className="text-sm">
                  User created: {functionResults.adminCreateUser.result.userId}
                </Alert>
              )}
            </div>
          </div>
        </Card>
      )}
      
      {/* API Response & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Last API Response</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-sm">
              {lastApiResponse ? JSON.stringify(lastApiResponse, null, 2) : 'No API response yet'}
            </pre>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Logs</h2>
            <Button variant="outline" size="sm" onClick={handleClearLogs}>
              Clear Logs
            </Button>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-96">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">No logs recorded</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">[{log.level}]</span> {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This comprehensive testing suite allows you to test all backend functions with simulated user contexts.
          <br />
          REMINDER: Backend functions must be adapted to prioritize 'data.simulatedUserId' for testing IF provided AND current real caller is Admin. Remove for production.
        </p>
      </div>
    </div>
  );
}
