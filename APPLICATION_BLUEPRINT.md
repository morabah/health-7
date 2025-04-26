Health Appointment System: Blueprint (User Stories, Sitemap, Workflows)
I. Core User Roles:
Patient: End-user seeking medical care. Needs to find doctors, book/manage appointments, view health info.
Doctor: Verified healthcare provider offering services. Needs to manage profile, availability, view/manage appointments.
Administrator: System manager. Needs to verify doctors, manage users, oversee platform.
II. User Stories:
(Code: P=Patient, D=Doctor, A=Admin, S=Shared/System)
Authentication & Registration:
S-REG-CHOICE: As any new user, I want to choose whether I'm registering as a Patient or a Doctor, so I can proceed with the correct account setup.
P-REG: As a new user seeking care, I want to register as a Patient by providing my name, email, phone (optional), password, DOB, gender, and basic health info (blood type, history - optional), so I can create my patient account.
D-REG: As a healthcare provider, I want to register as a Doctor by providing my name, email, phone, password, professional credentials (specialty, license #, experience), location, languages, fee, and uploading verification documents (profile pic, license), so my application can be submitted for review.
S-VERIFY-EMAIL: As a newly registered user (Patient or Doctor), I want to receive a verification email and click a link (or enter a code), so my email address is confirmed and my account activation can proceed.
S-AWAIT-VERIFICATION (Doctor): As a newly registered Doctor after email verification, I want my account status to be 'Pending Verification', so I understand an admin needs to approve my credentials before I can fully use the platform (D-AWAIT-VERIFICATION).
S-LOGIN: As a registered user (Patient, verified Doctor, Admin), I want to log in securely using my email and password, so I can access my role-specific dashboard and features (P-LOGIN, D-LOGIN, A-LOGIN).
S-RESET-PWD-REQUEST: As a registered user who forgot their password, I want to enter my email address on a 'Forgot Password' page, so I receive a password reset link/code via email (P-RESET-PWD, D-RESET-PWD, A-RESET-PWD).
S-RESET-PWD-CONFIRM: As a user who requested a password reset, I want to use the link/code from my email to access a page where I can set and confirm a new password, so I can regain access to my account.
S-LOGOUT: As a logged-in user, I want to log out securely, so my session is terminated.
Patient Workflow:
P-FIND-DOC: As a logged-in Patient, I want to navigate to a 'Find Doctors' page and filter the list by specialty, location, and language, so I can find relevant providers (Corresponds to Doctor Search Flow Step 1-2).
P-VIEW-DOC-LIST: As a Patient searching for doctors, I want to see a list of matching doctors with summary cards displaying profile picture, name, specialty, experience, location, languages, consultation fee, and an availability indicator, so I can quickly scan relevant providers (Corresponds to Doctor Search Flow Step 3).
P-VIEW-DOC-PROFILE: As a Patient, I want to click on a doctor's card or name to view their detailed public profile page, including bio, education, training, and services offered (tabs), so I can make an informed decision (Corresponds to Doctor Search Flow Step 4, Appointment Booking Flow Step 1).
P-INITIATE-BOOKING: As a Patient viewing a doctor's profile, I want to click a 'Book Appointment' button, so I can start the scheduling process (Corresponds to Appointment Booking Flow Step 2).
P-VIEW-DOC-AVAIL: As a Patient starting the booking process, I want to see the selected doctor's availability calendar, highlighting available dates, so I can choose a date (Corresponds to Appointment Booking Flow Step 3-4).
P-SELECT-SLOT: As a Patient who selected a date, I want to see available time slots for that day displayed clearly (e.g., as selectable cards/buttons), so I can choose a specific time (Corresponds to Appointment Booking Flow Step 5).
P-CONFIRM-BOOKING: As a Patient who selected a time slot, I want to select an appointment type (In-person/Video), optionally enter a brief reason for visit, and confirm the booking via a final 'Book Appointment' button, so the appointment is scheduled (Corresponds to Appointment Booking Flow Step 6-8).
P-VIEW-APPT-CONFIRMATION: As a Patient, after confirming a booking, I want to see the appointment appear on my dashboard/appointments list and receive a notification, so I know it's scheduled (Corresponds to Appointment Booking Flow Step 9-10).
P-DASHBOARD: As a logged-in Patient, I want to view my dashboard summarizing upcoming appointments, basic profile info, and stats (placeholder for records/prescriptions), so I have a quick overview.
P-VIEW-MY-APPT: As a logged-in Patient, I want to navigate to my 'My Appointments' page and view lists of upcoming, past, and cancelled appointments using tabs, so I can manage my schedule and history (Corresponds to Patient Appointment Management Flow Step 1).
P-VIEW-APPT-DETAILS: As a logged-in Patient viewing my appointments list, I want to click 'View Details' on an appointment to see more information (like reason provided, notes if added by doctor later).
P-CANCEL-APPT: As a logged-in Patient viewing an upcoming appointment, I want to click a 'Cancel' button, provide a reason (optional), and confirm the cancellation via a modal, so the appointment is cancelled and the doctor notified (Corresponds to Patient Appointment Management Flow Step 2-4).
P-MANAGE-PROFILE: As a logged-in Patient, I want to navigate to a profile page where I can view my details (Name, Contact, DOB, Gender, Blood Type, History) and potentially edit some fields (e.g., contact info, medical history), so my information is up-to-date.
P-NOTIFICATIONS: As a logged-in Patient, I want to access a notifications list/panel (e.g., via navbar icon) to see system messages about my appointments (booked, cancelled, completed) and mark them as read, so I stay informed.
Doctor Workflow:
D-AWAIT-VERIFICATION: As a registered Doctor pending approval, I want to log in and see a status page indicating my account is 'Pending Verification', so I know the status of my application.
D-NOTIFICATION-VERIFIED: As a Doctor whose credentials have been approved, I want to receive a notification (e.g., email and in-app) that my account is 'Verified' and active, so I know I can start using the platform features (Corresponds to Doctor Registration Flow Step 8).
D-DASHBOARD: As a logged-in, verified Doctor, I want to view my dashboard summarizing today's schedule, upcoming appointments, key stats (notifications, total patients), and quick actions (Update Availability, Edit Profile), so I have an overview of my practice on the platform.
D-MANAGE-PROFILE: As a logged-in Doctor, I want to navigate to my profile page to add/edit my professional details (specialty, license, experience, location, languages, fee, bio, education, services offered, profile picture), so I can present accurate information to patients (Corresponds to Doctor Profile Management workflow).
D-MANAGE-AVAIL: As a logged-in Doctor, I want to access an 'Availability Management' page where I can define my regular weekly working hours (e.g., using checkboxes on a schedule grid) and block specific dates using a date picker, so my calendar accurately reflects when I can accept bookings (Corresponds to Doctor Availability Management workflow).
D-VIEW-SCHEDULE: As a logged-in Doctor, I want to navigate to my 'Appointments' page and view my scheduled appointments, optionally filtering by date range or status, potentially using a calendar or list view, so I can manage my workload (Corresponds to Doctor Appointment Management Flow Step 1).
D-VIEW-APPT-DETAILS: As a logged-in Doctor viewing my schedule, I want to see details for each appointment (Patient Name, Time, Reason for Visit), so I can prepare for the consultation (Corresponds to Doctor Appointment Management Flow Step 2).
D-COMPLETE-APPT: As a logged-in Doctor, after finishing a consultation, I want to select an appointment from my schedule and click a 'Complete' button, optionally adding completion notes (e.g., in a modal), which updates the appointment status to 'COMPLETED', so my records are accurate (Corresponds to Doctor Appointment Management Flow Step 3).
D-CANCEL-APPT (Implied): As a logged-in Doctor, I might need the ability to cancel an upcoming appointment (with reason), notifying the patient.
D-MANAGE-DOCS: As a logged-in Doctor, I want to access a section (likely within my profile) where I can view the verification documents I uploaded and potentially upload new/updated ones (e.g., renewed license).
D-NOTIFICATIONS: As a logged-in Doctor, I want to access a notifications list/panel to see system messages about new bookings, cancellations, and updates to my verification status, and mark them as read.
D-HANDLE-REJECTION: As a Doctor whose registration was rejected, I want to see the rejection reason (provided by admin) and have clear options to edit my profile/re-upload documents and potentially resubmit for verification (Corresponds to User Management/Doctor Verification workflow).
Administrator Workflow:
A-LOGIN: As an Administrator, I want to log in securely (potentially via a dedicated route or using specific credentials).
A-DASHBOARD: As an Admin, I want to view a dashboard summarizing system statistics (total users, patients, doctors, pending verifications).
A-VIEW-USERS: As an Admin, I want to navigate to a 'User Management' page to view a list of all users (Patients, Doctors, Admins) with filtering and search capabilities.
A-MANAGE-USERS: As an Admin viewing the user list, I want options to view user details, potentially edit basic info, deactivate/activate accounts, and trigger password resets for users.
A-VIEW-DOCTORS: As an Admin, I want to navigate to a 'Doctor Management' page to view a list of all doctors, filterable by verification status.
A-VIEW-PENDING-VERIFICATION: As an Admin, I want to easily see a list or section on my dashboard highlighting Doctors with 'Pending Verification' status.
A-REVIEW-DOCTOR-VERIFICATION: As an Admin, I want to select a pending doctor, view their submitted profile information and uploaded verification documents (securely), so I can assess their credentials (Corresponds to Doctor Verification Flow Step 1-2).
A-APPROVE-REJECT-DOCTOR: As an Admin reviewing a doctor's verification submission, I want buttons to 'Approve' or 'Reject' the verification. If rejecting, I must provide a reason (notes). Approving changes status to 'Verified', rejecting changes status to 'Rejected' and notifies the doctor (Corresponds to Doctor Verification Flow Step 3-5).
A-CREATE-USER (Optional): As an Admin, I might need the ability to create new user accounts (Patient, Doctor, or Admin) directly via an admin form.
III. Sitemap (Route Structure):
(Mapping URLs to Purpose and corresponding User Stories)
Public Area:
/ (Homepage) - Purpose: Service overview, entry point. Features: Hero, Highlights, How it Works, Testimonials. (Supports P-REG, D-REG starting point).
/about (About Page) - Purpose: Information about the service. Features: Mission, Team, Description.
/contact (Contact Page) - Purpose: Inquiry form. Features: Contact form, Info.
Authentication (/auth/)
/auth/login - Purpose: User Authentication. Features: Login Form, Forgot Password link, Register link. (Supports S-LOGIN).
/auth/register - Purpose: Select account type. Features: Patient/Doctor choice cards. (Supports S-REG-CHOICE).
/auth/register/patient - Purpose: Create Patient Account. Features: Patient registration form. (Supports P-REG).
/auth/register/doctor - Purpose: Create Doctor Account. Features: Doctor registration form with document upload. (Supports D-REG).
/auth/verify-email - Purpose: Handle email verification action link (Firebase might handle display). Features: Confirmation message. (Supports S-VERIFY-EMAIL).
/auth/verify-phone - Purpose: Verify phone number (if implemented). Features: Code entry form, Resend option.
/auth/pending-verification - Purpose: Status screen for users awaiting action (email verification, doctor approval). Features: Status info, Next steps/Resend links. (Supports S-VERIFY-EMAIL, D-AWAIT-VERIFICATION).
/auth/forgot-password - Purpose: Request password reset. Features: Email entry form. (Supports S-RESET-PWD-REQUEST).
/auth/reset-password - Purpose: Set new password via token/link. Features: New password form. (Supports S-RESET-PWD-CONFIRM).
/auth/logout - Purpose: End user session (likely handled via function call, redirects to /). (Supports S-LOGOUT).
Patient Area (/patient/ - Requires Patient Login)
/patient/dashboard - Purpose: Patient control center. Features: Stats, Upcoming appointments preview, Profile summary. (Supports P-DASHBOARD).
/patient/appointments - Purpose: View/Manage appointments. Features: Tabbed lists (Upcoming, Past, Cancelled), Filters, Action buttons (Cancel, Details). (Supports P-VIEW-MY-APPT, P-VIEW-APPT-DETAILS, P-CANCEL-APPT UI).
/patient/profile - Purpose: View/Edit patient profile. Features: Display info, Edit form elements. (Supports P-MANAGE-PROFILE).
Doctor Area (/doctor/ - Requires Verified Doctor Login)
/doctor/dashboard - Purpose: Doctor control center. Features: Stats, Today's schedule, Upcoming appointments preview, Quick actions. (Supports D-DASHBOARD, D-VIEW-SCHEDULE preview).
/doctor/appointments - Purpose: View/Manage appointments. Features: Calendar/List view, Filters, Action buttons (Complete, Details, Cancel). (Supports D-VIEW-SCHEDULE, D-VIEW-APPT-DETAILS, D-COMPLETE-APPT UI, D-CANCEL-APPT UI).
/doctor/profile - Purpose: Edit professional profile. Features: Detailed profile form, Document management section. (Supports D-MANAGE-PROFILE, D-MANAGE-DOCS UI).
/doctor/availability - Purpose: Set working hours/unavailability. Features: Weekly schedule grid, Date picker for blocking. (Supports D-MANAGE-AVAIL).
Admin Area (/admin/ - Requires Admin Login)
/admin/dashboard - Purpose: Admin control center. Features: System stats, Recent users, Pending verifications list. (Supports A-DASHBOARD, A-VIEW-PENDING-VERIFICATION).
/admin/users - Purpose: Manage all users. Features: User list table, Filters, Search, Actions (View, Edit, Deactivate, Reset Pwd). (Supports A-VIEW-USERS, A-MANAGE-USERS UI).
/admin/doctors - Purpose: Manage doctors. Features: Doctor list table, Filters (by status), Actions (View, Verify). (Supports A-VIEW-DOCTORS).
/admin/doctor-verification - Purpose: List doctors needing verification. Features: List view, links to detail. (Redundant if included on dashboard, but potentially useful).
/admin/doctor-verification/[doctorId] - Purpose: Verify specific doctor. Features: Display doctor info, Document viewer placeholder, Approve/Reject form (status dropdown, notes). (Supports A-REVIEW-DOCTOR-VERIFICATION, A-APPROVE-REJECT-DOCTOR).
Shared Functionality (/main/ - Requires Login)
/main/find-doctors - Purpose: Search/filter doctors. Features: Search filters, Results list (doctor cards), Pagination. (Supports P-FIND-DOC, P-VIEW-DOC-LIST).
/main/doctor-profile/[doctorId] - Purpose: View public doctor profile. Features: Sidebar info, Tabs (Bio, Edu, Services), Reviews section (placeholder). (Supports P-VIEW-DOC-PROFILE).
/main/book-appointment/[doctorId] - Purpose: Schedule appointment. Features: Doctor sidebar, Date picker, Available time slots display, Reason input, Confirm button. (Supports P-INITIATE-BOOKING, P-VIEW-DOC-AVAIL, P-SELECT-SLOT, P-CONFIRM-BOOKING).
/main/notifications - Purpose: View system notifications. Features: Notification list (grouped/filtered), Mark as read actions. (Supports P-NOTIFICATIONS, D-NOTIFICATIONS).
IV. Key Workflows (Connecting Stories & Sitemap):
Patient Registration & Activation:
Homepage (/) -> Click "Get Started" -> /auth/register -> Select "Patient" -> /auth/register/patient (Fill form) -> Submit -> (Backend: registerUser creates User/Patient, triggers email) -> /auth/pending-verification (Shows "Check email") -> User clicks email link -> (Backend: Firebase handles link) -> /auth/login (or auto-login to /patient/dashboard).
Doctor Registration & Verification:
Homepage (/) -> "Get Started" -> /auth/register -> Select "Doctor" -> /auth/register/doctor (Fill form, upload docs) -> Submit -> (Backend: registerUser creates User/Doctor [PENDING], triggers email) -> /auth/pending-verification -> User verifies email -> Status remains "Pending Verification".
Admin Login -> /admin/dashboard (Sees pending doctor) -> /admin/doctor-verification/[doctorId] (Reviews info/docs) -> Clicks "Approve" -> (Backend: adminVerifyDoctor updates status to VERIFIED, sends notification) -> Doctor logs in -> /doctor/dashboard.
(Rejection Path): Admin clicks "Reject", adds notes -> (Backend: adminVerifyDoctor updates status to REJECTED, sends notification with reason) -> Doctor logs in -> Sees rejection status/reason, potentially link to edit profile (/doctor/profile).
Patient Appointment Booking:
Patient Login -> /patient/dashboard (or direct link) -> /main/find-doctors -> Filter/Search -> View Results -> Click Doctor Card -> /main/doctor-profile/[doctorId] -> Click "Book Appointment" -> /main/book-appointment/[doctorId] -> Select Date -> Select Time Slot -> Enter Reason -> Click "Book Appointment" -> (Backend: getAvailableSlots check, bookAppointment creates appointment, creates notification) -> Redirect to /patient/appointments (or show confirmation) -> Appointment appears in list, notification received.
Doctor Appointment Completion:
Doctor Login -> /doctor/dashboard (Sees Today's Schedule) -> /doctor/appointments -> Select appointment -> Click "Complete" -> (Modal opens) -> Add Notes -> Click "Confirm Completion" -> (Backend: completeAppointment updates status, adds notes) -> UI updates (appointment moves to 'Past'/status changes).
Doctor Availability Management:
Doctor Login -> /doctor/dashboard -> Click "Update Availability" -> /doctor/availability -> Check/Uncheck hours on grid, select dates to block -> Click "Save Changes" -> (Backend: setDoctorAvailability updates Firestore) -> UI shows confirmation/updated state.
