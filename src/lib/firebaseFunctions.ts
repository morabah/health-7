/**
 * Firebase Cloud Functions Implementation
 * 
 * This file serves as a bridge between the app and Firebase Cloud Functions.
 * Each function here maps to a Firebase Cloud Function with the same name.
 * 
 * When migrating from local API to Firebase:
 * 1. Implement each function here to call the corresponding Firebase Function
 * 2. Set isFirebaseEnabled to true in firebaseConfig.ts
 * 3. The apiClient will automatically route requests to these implementations
 */

import { functions } from './firebaseConfig';
import { logInfo, logError } from './logger';
import type { AuthContext } from './apiAuthCtx';

/**
 * Generic type for a Firebase Cloud Function
 */
type CloudFunction<T, R> = (data: T) => Promise<R>;

/**
 * Initialize and cache callable Firebase Functions
 * 
 * @param name Function name
 * @returns Callable function
 */
function getCallable<T, R>(name: string): CloudFunction<T, R> {
  const callable = functions.httpsCallable(name);
  
  return async (data: T): Promise<R> => {
    try {
      logInfo(`Calling Firebase function: ${name}`, { functionName: name });
      const result = await callable(data);
      return result.data as R;
    } catch (error) {
      logError(`Error calling Firebase function ${name}:`, error);
      throw error;
    }
  };
}

/**
 * Prepare an API call with auth context
 * 
 * @param name Function name 
 * @param ctx Auth context
 * @param data Function payload
 * @returns Combined data with auth context
 */
function prepareApiCall<T>(
  name: string,
  ctx: AuthContext, 
  data?: T
): Record<string, unknown> {
  // For logging
  logInfo(`Preparing API call to ${name}`, { functionName: name });
  
  // Return appropriate payload structure based on whether data is provided
  if (data === undefined) {
    return { context: ctx };
  }
  
  // Include both context and data
  return { 
    context: ctx,
    data 
  };
}

// ===== Authentication Functions =====

/**
 * Sign in a user
 */
export async function signIn(email: string, password: string) {
  const loginFn = getCallable('login');
  return loginFn({ email, password });
}

/**
 * Register a new user
 */
export async function registerUser(userData: unknown) {
  const registerFn = getCallable('registerUser');
  return registerFn(userData);
}

/**
 * Get current user profile
 */
export async function getMyUserProfile(ctx: AuthContext) {
  const profileFn = getCallable('getMyUserProfile');
  return profileFn(prepareApiCall('getMyUserProfile', ctx));
}

/**
 * Update user profile
 */
export async function updateMyUserProfile(ctx: AuthContext, profileData: unknown) {
  const updateProfileFn = getCallable('updateMyUserProfile');
  return updateProfileFn(prepareApiCall('updateMyUserProfile', ctx, profileData));
}

// ===== Doctor Functions =====

/**
 * Find doctors with search criteria
 */
export async function findDoctors(ctx: AuthContext, searchParams: unknown) {
  const findDoctorsFn = getCallable('findDoctors');
  return findDoctorsFn(prepareApiCall('findDoctors', ctx, searchParams));
}

/**
 * Get doctor's public profile
 */
export async function getDoctorPublicProfile(ctx: AuthContext, doctorId: string) {
  const getProfileFn = getCallable('getDoctorPublicProfile');
  return getProfileFn(prepareApiCall('getDoctorPublicProfile', ctx, { doctorId }));
}

/**
 * Get doctor's availability
 */
export async function getDoctorAvailability(ctx: AuthContext, doctorId: string) {
  const getAvailabilityFn = getCallable('getDoctorAvailability');
  return getAvailabilityFn(prepareApiCall('getDoctorAvailability', ctx, { doctorId }));
}

/**
 * Set doctor's availability
 */
export async function setDoctorAvailability(ctx: AuthContext, availabilityData: unknown) {
  const setAvailabilityFn = getCallable('setDoctorAvailability');
  return setAvailabilityFn(prepareApiCall('setDoctorAvailability', ctx, availabilityData));
}

// ===== Appointment Functions =====

/**
 * Get user's appointments
 */
export async function getMyAppointments(ctx: AuthContext) {
  const getAppointmentsFn = getCallable('getMyAppointments');
  return getAppointmentsFn(prepareApiCall('getMyAppointments', ctx));
}

/**
 * Get appointment details
 */
export async function getAppointmentDetails(ctx: AuthContext, appointmentId: string) {
  const getDetailsFn = getCallable('getAppointmentDetails');
  return getDetailsFn(prepareApiCall('getAppointmentDetails', ctx, { appointmentId }));
}

/**
 * Book a new appointment
 */
export async function bookAppointment(ctx: AuthContext, appointmentData: unknown) {
  const bookFn = getCallable('bookAppointment');
  return bookFn(prepareApiCall('bookAppointment', ctx, appointmentData));
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(ctx: AuthContext, appointmentId: string, reason?: string) {
  const cancelFn = getCallable('cancelAppointment');
  return cancelFn(prepareApiCall('cancelAppointment', ctx, { appointmentId, reason }));
}

/**
 * Complete an appointment
 */
export async function completeAppointment(ctx: AuthContext, appointmentId: string, notes?: string) {
  const completeFn = getCallable('completeAppointment');
  return completeFn(prepareApiCall('completeAppointment', ctx, { appointmentId, notes }));
}

/**
 * Get available appointment slots
 */
export async function getAvailableSlots(ctx: AuthContext, doctorId: string, date: string) {
  const getSlotsFn = getCallable('getAvailableSlots');
  return getSlotsFn(prepareApiCall('getAvailableSlots', ctx, { doctorId, date }));
}

// ===== Notification Functions =====

/**
 * Get user's notifications
 */
export async function getMyNotifications(ctx: AuthContext) {
  const getNotificationsFn = getCallable('getMyNotifications');
  return getNotificationsFn(prepareApiCall('getMyNotifications', ctx));
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(ctx: AuthContext, notificationId: string, isRead = true) {
  const markReadFn = getCallable('markNotificationRead');
  return markReadFn(prepareApiCall('markNotificationRead', ctx, { notificationId, isRead }));
}

/**
 * Send a direct message to another user
 */
export async function sendDirectMessage(ctx: AuthContext, recipientId: string, message: string, subject?: string) {
  const sendMessageFn = getCallable('sendDirectMessage');
  return sendMessageFn(prepareApiCall('sendDirectMessage', ctx, { recipientId, message, subject }));
}

// ===== Admin Functions =====

/**
 * Admin: Get all users
 */
export async function adminGetAllUsers(ctx: AuthContext) {
  const getAllUsersFn = getCallable('adminGetAllUsers');
  return getAllUsersFn(prepareApiCall('adminGetAllUsers', ctx));
}

/**
 * Admin: Get all doctors
 */
export async function adminGetAllDoctors(ctx: AuthContext) {
  const getAllDoctorsFn = getCallable('adminGetAllDoctors');
  return getAllDoctorsFn(prepareApiCall('adminGetAllDoctors', ctx));
}

/**
 * Admin: Get all appointments
 */
export async function adminGetAllAppointments(ctx: AuthContext) {
  const getAllAppointmentsFn = getCallable('adminGetAllAppointments');
  return getAllAppointmentsFn(prepareApiCall('adminGetAllAppointments', ctx));
}

/**
 * Admin: Get user details
 */
export async function adminGetUserDetail(ctx: AuthContext, userId: string) {
  const getUserDetailFn = getCallable('adminGetUserDetail');
  return getUserDetailFn(prepareApiCall('adminGetUserDetail', ctx, { userId }));
}

/**
 * Admin: Update user status
 */
export async function adminUpdateUserStatus(ctx: AuthContext, userId: string, status: string, reason?: string) {
  const updateStatusFn = getCallable('adminUpdateUserStatus');
  return updateStatusFn(prepareApiCall('adminUpdateUserStatus', ctx, { userId, status, reason }));
}

/**
 * Admin: Update user profile
 */
export async function adminUpdateUserProfile(ctx: AuthContext, profileData: unknown) {
  const updateProfileFn = getCallable('adminUpdateUserProfile');
  return updateProfileFn(prepareApiCall('adminUpdateUserProfile', ctx, profileData));
}

/**
 * Admin: Create a new user
 */
export async function adminCreateUser(ctx: AuthContext, userData: unknown) {
  const createUserFn = getCallable('adminCreateUser');
  return createUserFn(prepareApiCall('adminCreateUser', ctx, userData));
}

/**
 * Admin: Verify a doctor
 */
export async function adminVerifyDoctor(ctx: AuthContext, doctorId: string, status: string, notes?: string) {
  const verifyDoctorFn = getCallable('adminVerifyDoctor');
  return verifyDoctorFn(prepareApiCall('adminVerifyDoctor', ctx, { doctorId, status, notes }));
}

// ===== Dashboard Functions =====

/**
 * Get dashboard stats
 */
export async function getMyDashboardStats(ctx: AuthContext) {
  const getDashboardStatsFn = getCallable('getMyDashboardStats');
  return getDashboardStatsFn(prepareApiCall('getMyDashboardStats', ctx));
}

// ===== Patient Functions =====

/**
 * Get patient profile
 */
export async function getPatientProfile(ctx: AuthContext, patientId: string) {
  const getProfileFn = getCallable('getPatientProfile');
  return getProfileFn(prepareApiCall('getPatientProfile', ctx, { patientId }));
}

// Export all functions in an object that matches the structure of localApi
export const firebaseApi = {
  login: (params: { email: string; password: string }) => signIn(params.email, params.password),
  registerPatient: registerUser,
  registerDoctor: registerUser,
  getMyUserProfile,
  updateMyUserProfile,
  findDoctors,
  getMyAppointments,
  getAppointmentDetails,
  bookAppointment,
  cancelAppointment,
  completeAppointment,
  setDoctorAvailability,
  getMyNotifications,
  markNotificationRead,
  getDoctorPublicProfile,
  getDoctorAvailability,
  getAvailableSlots,
  adminVerifyDoctor,
  adminGetAllUsers,
  adminGetAllDoctors,
  adminGetAllAppointments,
  adminGetUserDetail,
  adminUpdateUserStatus,
  adminUpdateUserProfile,
  adminCreateUser,
  sendDirectMessage,
  getMyDashboardStats,
  getPatientProfile
}; 