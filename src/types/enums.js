"use strict";
/** Defines core enumeration types used throughout the Health Appointment System for standardized status values and categorizations. Using string enums for better readability in database/logs. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountStatus = exports.NotificationType = exports.AppointmentType = exports.DocumentType = exports.AppointmentStatus = exports.VerificationStatus = exports.UserType = exports.BloodType = exports.Gender = void 0;
/**
 * Gender enum for user profiles
 */
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER"; // Includes prefer not to say / non-binary etc.
})(Gender || (exports.Gender = Gender = {}));
/** Common blood types for patient profiles */
var BloodType;
(function (BloodType) {
    BloodType["A_POSITIVE"] = "A+";
    BloodType["A_NEGATIVE"] = "A-";
    BloodType["B_POSITIVE"] = "B+";
    BloodType["B_NEGATIVE"] = "B-";
    BloodType["AB_POSITIVE"] = "AB+";
    BloodType["AB_NEGATIVE"] = "AB-";
    BloodType["O_POSITIVE"] = "O+";
    BloodType["O_NEGATIVE"] = "O-";
})(BloodType || (exports.BloodType = BloodType = {}));
/** Represents the distinct roles users can have within the system. */
var UserType;
(function (UserType) {
    UserType["ADMIN"] = "admin";
    UserType["DOCTOR"] = "doctor";
    UserType["PATIENT"] = "patient";
})(UserType || (exports.UserType = UserType = {}));
/** Represents the verification status of a Doctor's profile/credentials. */
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "pending";
    VerificationStatus["VERIFIED"] = "verified";
    VerificationStatus["REJECTED"] = "rejected";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
/** Represents the lifecycle states of a scheduled appointment. */
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["PENDING"] = "pending";
    AppointmentStatus["CONFIRMED"] = "confirmed";
    AppointmentStatus["CANCELED"] = "canceled";
    AppointmentStatus["COMPLETED"] = "completed";
    AppointmentStatus["RESCHEDULED"] = "rescheduled";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
// Removed duplicate AccountStatus enum - using the one defined below
/** Types of documents uploaded by Doctors for verification purposes. */
var DocumentType;
(function (DocumentType) {
    DocumentType["LICENSE"] = "LICENSE";
    DocumentType["CERTIFICATE"] = "CERTIFICATE";
    DocumentType["IDENTIFICATION"] = "IDENTIFICATION";
    DocumentType["OTHER"] = "OTHER"; // For miscellaneous documents
})(DocumentType || (exports.DocumentType = DocumentType = {}));
/** Defines the modality of the appointment. */
var AppointmentType;
(function (AppointmentType) {
    AppointmentType["IN_PERSON"] = "IN_PERSON";
    AppointmentType["VIDEO"] = "VIDEO"; // Telemedicine video call
})(AppointmentType || (exports.AppointmentType = AppointmentType = {}));
/** Types of notifications users can receive. */
var NotificationType;
(function (NotificationType) {
    NotificationType["APPOINTMENT_REQUEST"] = "appointment_request";
    NotificationType["APPOINTMENT_CONFIRMED"] = "appointment_confirmed";
    NotificationType["APPOINTMENT_CANCELED"] = "appointment_canceled";
    NotificationType["APPOINTMENT_RESCHEDULED"] = "appointment_rescheduled";
    NotificationType["APPOINTMENT_REMINDER"] = "appointment_reminder";
    NotificationType["NEW_MESSAGE"] = "new_message";
    NotificationType["APPOINTMENT_COMPLETED"] = "appointment_completed";
    NotificationType["VERIFICATION_STATUS_CHANGE"] = "verification_status_change";
    NotificationType["ACCOUNT_STATUS_CHANGE"] = "account_status_change";
    NotificationType["APPOINTMENT_BOOKED"] = "appointment_booked";
    NotificationType["SYSTEM_ALERT"] = "system_alert";
    NotificationType["SYSTEM"] = "system";
    NotificationType["OTHER"] = "other";
    NotificationType["PROFILE_UPDATE"] = "profile_update";
    NotificationType["APPOINTMENT_CREATED"] = "appointment_created";
    NotificationType["APPOINTMENT_CANCELLED"] = "appointment_cancelled";
    NotificationType["MESSAGE"] = "message";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
/** Account statuses for users */
var AccountStatus;
(function (AccountStatus) {
    AccountStatus["ACTIVE"] = "active";
    AccountStatus["INACTIVE"] = "inactive";
    AccountStatus["SUSPENDED"] = "suspended";
    AccountStatus["DEACTIVATED"] = "deactivated";
    AccountStatus["PENDING_VERIFICATION"] = "pending_verification";
})(AccountStatus || (exports.AccountStatus = AccountStatus = {}));
//# sourceMappingURL=enums.js.map