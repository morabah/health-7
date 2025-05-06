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
  getAllDoctors,
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
  
  // Notification methods
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  
  // Admin methods
  adminGetAllUsers,
  adminGetAllDoctors,
  adminGetAllAppointments,
  adminGetAllPatients,
  
  // Optimization and batch methods
  batchGetDoctorData,
  
  // Other methods
  checkSystemStatus,
  getSystemMetrics,
}; 