/**
 * API Module Index
 * 
 * Re-exports all domain-specific functions from individual modules for easy importing
 */

// User Management & Authentication
export * from './userFunctions';

// Doctor-specific Functions
export * from './doctorFunctions';

// Patient-specific Functions, except for the health data functions (which are imported from healthDataFunctions)
export { getMockPatientProfile } from './patientFunctions';

// Health tracking Functions from patientFunctions
export { saveHealthEntry, getHealthEntries } from './patientFunctions';

// Health Analysis Functions
export { calculateHealthScore } from './healthDataFunctions';

// Appointment Management
export * from './appointmentFunctions';

// Admin Functions
export * from './adminFunctions';

// Notification Functions
export * from './notificationFunctions'; 

// Dashboard Functions
export * from './dashboardFunctions'; 