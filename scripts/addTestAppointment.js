const fs = require('fs');
const path = require('path');

// Path to the appointments.json file
const filePath = path.join(process.cwd(), 'local_db', 'appointments.json');

// Read current appointments
let appointments;
try {
  appointments = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (error) {
  console.error('Error reading appointments file:', error);
  process.exit(1);
}

// Create a date that is two weeks in the future from the current date
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 14);
futureDate.setFullYear(2025); // Force it to be in 2025

// Create a new appointment object
const newAppointment = {
  patientId: 'u-007',
  patientName: 'Test Patient',
  doctorId: 'u-002',
  doctorName: 'Dr. Test Doctor',
  doctorSpecialty: 'Testing',
  appointmentDate: futureDate.toISOString(),
  startTime: '10:00',
  endTime: '10:30',
  status: 'pending',
  reason: 'Test Appointment',
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  appointmentType: 'IN_PERSON',
  videoCallUrl: null,
  id: 'test-appointment-' + Math.floor(Math.random() * 1000000)
};

// Add the new appointment to the array
appointments.push(newAppointment);

// Save the updated appointments array back to the file
try {
  fs.writeFileSync(filePath, JSON.stringify(appointments, null, 2));
  console.log('New test appointment created with ID:', newAppointment.id);
  console.log('Date:', newAppointment.appointmentDate);
  console.log('Status:', newAppointment.status);
} catch (error) {
  console.error('Error writing appointments file:', error);
  process.exit(1);
} 