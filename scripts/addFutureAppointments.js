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

// Current simulated date is in 2025
const targetDoctorId = 'u-005';
const baseDate = new Date();
baseDate.setFullYear(2025);

// Create several appointments in the future with different statuses
const newAppointments = [
  {
    patientId: 'u-007',
    patientName: 'Test Patient',
    doctorId: targetDoctorId,
    doctorName: 'Dr. Sarah Chen',
    doctorSpecialty: 'Cardiology',
    appointmentDate: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days in future
    startTime: '09:00',
    endTime: '09:30',
    status: 'pending',
    reason: 'Future Appointment 1',
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    appointmentType: 'IN_PERSON',
    videoCallUrl: null,
    id: 'test-future-1-' + Math.floor(Math.random() * 1000000)
  },
  {
    patientId: 'u-008',
    patientName: 'Another Patient',
    doctorId: targetDoctorId,
    doctorName: 'Dr. Sarah Chen',
    doctorSpecialty: 'Cardiology',
    appointmentDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days in future
    startTime: '10:00',
    endTime: '10:30',
    status: 'confirmed',
    reason: 'Future Appointment 2',
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    appointmentType: 'VIDEO',
    videoCallUrl: 'https://video.example.com/123',
    id: 'test-future-2-' + Math.floor(Math.random() * 1000000)
  },
  {
    patientId: 'u-009',
    patientName: 'Third Patient',
    doctorId: targetDoctorId,
    doctorName: 'Dr. Sarah Chen',
    doctorSpecialty: 'Cardiology',
    appointmentDate: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day in future
    startTime: '14:00',
    endTime: '14:30',
    status: 'pending',
    reason: 'Urgent Consultation',
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    appointmentType: 'IN_PERSON',
    videoCallUrl: null,
    id: 'test-future-3-' + Math.floor(Math.random() * 1000000)
  }
];

// Add the new appointments to the array
appointments.push(...newAppointments);

// Save the updated appointments array back to the file
try {
  fs.writeFileSync(filePath, JSON.stringify(appointments, null, 2));
  console.log(`Added ${newAppointments.length} new future appointments for doctor ${targetDoctorId}`);
  newAppointments.forEach(appt => {
    console.log(`- ID: ${appt.id}, Date: ${appt.appointmentDate}, Status: ${appt.status}`);
  });
} catch (error) {
  console.error('Error writing appointments file:', error);
  process.exit(1);
} 