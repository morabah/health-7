const fs = require('fs');
const path = require('path');

// Path to the appointments.json file
const filePath = path.join(process.cwd(), 'local_db', 'appointments.json');

// Read appointments
let appointments;
try {
  appointments = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (error) {
  console.error('Error reading appointments file:', error);
  process.exit(1);
}

// Simulate the dashboard stats calculation for a specific doctor
const doctorId = 'u-005';

// Filter appointments for the specific doctor
const doctorAppointments = appointments.filter(a => a.doctorId === doctorId);

// Current simulated date (2025)
const now = new Date();
console.log('Current date:', now.toISOString());

// Calculate upcoming count (future and not canceled)
const upcomingCount = doctorAppointments.filter(a => {
  // Parse the appointment date
  const appointmentDate = a.appointmentDate.includes('T')
    ? new Date(a.appointmentDate)
    : new Date(`${a.appointmentDate}T${a.startTime}`);
  
  const status = a.status.toLowerCase();
  const isInFuture = appointmentDate > now;
  const isNotCanceled = status !== 'canceled';
  const isUpcoming = isInFuture && isNotCanceled;
  
  console.log(`Appointment: ${a.id}, Date: ${appointmentDate.toISOString()}, Status: ${a.status}`);
  console.log(`  - isInFuture: ${isInFuture}, isNotCanceled: ${isNotCanceled}, isUpcoming: ${isUpcoming}`);
  
  return isUpcoming;
}).length;

console.log(`\nTotal doctor appointments: ${doctorAppointments.length}`);
console.log(`Upcoming count (future + not canceled): ${upcomingCount}`);

// Show details of upcoming appointments
const upcomingAppointments = doctorAppointments.filter(a => {
  const appointmentDate = a.appointmentDate.includes('T')
    ? new Date(a.appointmentDate)
    : new Date(`${a.appointmentDate}T${a.startTime}`);
  
  const status = a.status.toLowerCase();
  return appointmentDate > now && status !== 'canceled';
});

console.log("\nUpcoming appointments detail:");
upcomingAppointments.forEach(a => {
  console.log(`- ID: ${a.id}, Date: ${a.appointmentDate}, Status: ${a.status}`);
}); 