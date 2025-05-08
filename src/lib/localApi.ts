/**
 * Local API implementation for development/testing
 */

import { logInfo } from './logger';
import {
  findDoctors,
  getDoctorPublicProfile,
  setDoctorAvailability,
  getDoctorAvailability,
} from './api/doctorFunctions';

import {
  getMyNotifications,
  markNotificationRead,
  sendDirectMessage,
} from './api/notificationFunctions';

import {
  bookAppointment,
  cancelAppointment,
  completeAppointment,
  getMyAppointments,
  getAppointmentDetails,
  getAvailableSlots,
} from './api/appointmentFunctions';

import {
  adminVerifyDoctor,
  adminGetAllUsers,
  adminGetAllDoctors,
  adminGetUserDetail,
  adminUpdateUserStatus,
  adminCreateUser,
  adminGetAllAppointments,
  adminUpdateUserProfile,
} from './api/adminFunctions';

import { getMyDashboardStats, adminGetDashboardData } from './api/dashboardFunctions';

// Stub implementations for missing functions
const signIn = async () => {
  logInfo('signIn stub called');
  return { success: false, error: 'Not implemented' };
};

const signOut = async () => {
  logInfo('signOut stub called');
  return { success: false, error: 'Not implemented' };
};

const registerUser = async () => {
  logInfo('registerUser stub called');
  return { success: false, error: 'Not implemented' };
};

const requestPasswordReset = async () => {
  logInfo('requestPasswordReset stub called');
  return { success: false, error: 'Not implemented' };
};

const resetPassword = async () => {
  logInfo('resetPassword stub called');
  return { success: false, error: 'Not implemented' };
};

const getMyUserProfile = async () => {
  logInfo('getMyUserProfile stub called');
  return { success: false, error: 'Not implemented' };
};

const updateMyUserProfile = async () => {
  logInfo('updateMyUserProfile stub called');
  return { success: false, error: 'Not implemented' };
};

const getUserProfile = async () => {
  logInfo('getUserProfile stub called');
  return { success: false, error: 'Not implemented' };
};

const getAllUsers = async () => {
  logInfo('getAllUsers stub called');
  return { success: false, error: 'Not implemented' };
};

const updateDoctorProfile = async () => {
  logInfo('updateDoctorProfile stub called');
  return { success: false, error: 'Not implemented' };
};

const verifyDoctor = async () => {
  logInfo('verifyDoctor stub called');
  return { success: false, error: 'Not implemented' };
};

const addPatient = async () => {
  logInfo('addPatient stub called');
  return { success: false, error: 'Not implemented' };
};

const updatePatient = async () => {
  logInfo('updatePatient stub called');
  return { success: false, error: 'Not implemented' };
};

const getPatientProfile = async () => {
  logInfo('getPatientProfile stub called');
  return { success: false, error: 'Not implemented' };
};

const getAllPatients = async () => {
  logInfo('getAllPatients stub called');
  return { success: false, error: 'Not implemented' };
};

const getPatientsByDoctorId = async () => {
  logInfo('getPatientsByDoctorId stub called');
  return { success: false, error: 'Not implemented' };
};

const getPatientAppointments = async () => {
  logInfo('getPatientAppointments stub called');
  return { success: false, error: 'Not implemented' };
};

const getDoctorAppointments = async () => {
  logInfo('getDoctorAppointments stub called');
  return { success: false, error: 'Not implemented' };
};

const updateAppointmentStatus = async () => {
  logInfo('updateAppointmentStatus stub called');
  return { success: false, error: 'Not implemented' };
};

const getAllAppointments = async () => {
  logInfo('getAllAppointments stub called');
  return { success: false, error: 'Not implemented' };
};

const markAllNotificationsAsRead = async () => {
  logInfo('markAllNotificationsAsRead stub called');
  return { success: false, error: 'Not implemented' };
};

const adminGetAllPatients = async () => {
  logInfo('adminGetAllPatients stub called');
  return { success: false, error: 'Not implemented' };
};

const batchGetDoctorData = async () => {
  logInfo('batchGetDoctorData stub called');
  return { success: false, error: 'Not implemented' };
};

const checkSystemStatus = async () => {
  logInfo('checkSystemStatus stub called');
  return { success: true, status: 'healthy' };
};

const getSystemMetrics = async () => {
  logInfo('getSystemMetrics stub called');
  return { success: true, metrics: {} };
};

export const localApi = {
  // User auth methods
  signIn,
  signOut,
  registerUser,
  requestPasswordReset,
  resetPassword,

  // User profile methods
  getMyUserProfile,
  updateMyUserProfile,
  getUserProfile,
  getAllUsers,

  // Doctor methods
  getAllDoctors: adminGetAllDoctors, // Reuse admin function
  findDoctors,
  getDoctorPublicProfile,
  updateDoctorProfile,
  verifyDoctor,
  setDoctorAvailability,
  getDoctorAvailability,

  // Patient methods
  addPatient,
  updatePatient,
  getPatientProfile,
  getAllPatients,
  getPatientsByDoctorId,

  // Appointment methods
  bookAppointment,
  cancelAppointment,
  getMyAppointments,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
  getAllAppointments,
  getAvailableSlots,
  completeAppointment,

  // Notification methods
  getMyNotifications,
  markNotificationAsRead: markNotificationRead, // Name slightly different
  markAllNotificationsAsRead,
  sendDirectMessage,

  // Admin methods
  adminGetAllUsers,
  adminGetAllDoctors,
  adminGetAllAppointments,
  adminGetAllPatients,
  adminVerifyDoctor,
  adminGetUserDetail,
  adminUpdateUserStatus,
  adminCreateUser,
  adminUpdateUserProfile,

  // Dashboard methods
  getMyDashboardStats,
  adminGetDashboardData,

  // Optimization and batch methods
  batchGetDoctorData,

  // Other methods
  checkSystemStatus,
  getSystemMetrics,
};
