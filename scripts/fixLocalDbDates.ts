import fs from 'fs';
import path from 'path';

function toIsoIfNeeded(date: string | undefined): string | undefined {
  if (!date) return date;
  // If already ISO, return as is
  if (/T\d{2}:\d{2}:\d{2}/.test(date)) return date;
  // If YYYY-MM-DD, convert to ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date + 'T00:00:00.000Z';
  return date;
}

function fixAppointments() {
  const file = path.join(__dirname, '../local_db/appointments.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let fixed = 0;
  for (const appt of data) {
    const orig = appt.appointmentDate;
    const fixedDate = toIsoIfNeeded(orig);
    if (fixedDate !== orig) {
      appt.appointmentDate = fixedDate;
      fixed++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Appointments: fixed ${fixed} date(s)`);
}

function fixPatients() {
  const file = path.join(__dirname, '../local_db/patients.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let fixed = 0;
  for (const patient of data) {
    const orig = patient.dateOfBirth;
    const fixedDate = toIsoIfNeeded(orig);
    if (fixedDate !== orig) {
      patient.dateOfBirth = fixedDate;
      fixed++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Patients: fixed ${fixed} date(s)`);
}

fixAppointments();
fixPatients();
console.log('Date fix complete.'); 