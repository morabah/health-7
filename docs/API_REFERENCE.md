# API Reference

This document provides comprehensive API documentation for the Health Appointment System.

## Overview

The Health Appointment System uses a hybrid API approach:
- **Local API**: JSON-based simulation for development
- **Firebase Functions**: Cloud-based API for production

## Quick Reference

### Base URLs
- **Local Development**: `http://localhost:3000/api`
- **Cloud Development**: `https://us-central1-health7-c378f.cloudfunctions.net`

### Authentication
All API endpoints require Firebase Authentication tokens in the Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

---

## API Endpoints

### User Management

#### Get User Profile
```typescript
GET /api/users/profile
```
Returns the current user's profile data including role-specific information.

#### Update User Profile
```typescript
PUT /api/users/profile
```
Updates the current user's profile information.

### Appointment Management

#### Get Appointments
```typescript
GET /api/appointments
```
Returns appointments for the current user (filtered by role).

#### Create Appointment
```typescript
POST /api/appointments
```
Creates a new appointment booking.

#### Update Appointment
```typescript
PUT /api/appointments/:id
```
Updates an existing appointment.

### Doctor Management

#### Get Doctors
```typescript
GET /api/doctors
```
Returns list of verified doctors available for booking.

#### Update Doctor Availability
```typescript
PUT /api/doctors/availability
```
Updates doctor's availability schedule.

---

## Data Schemas

### User Schema
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  userType: 'patient' | 'doctor' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Appointment Schema
```typescript
interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Error Handling

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}
```

### Common Error Codes
- `AUTH_REQUIRED`: Authentication token required
- `INVALID_ROLE`: User role insufficient for operation
- `VALIDATION_ERROR`: Request data validation failed
- `NOT_FOUND`: Requested resource not found
- `CONFLICT`: Resource conflict (e.g., appointment time taken)

---

## Related Documents

- [Architecture Overview](../ARCHITECTURE.md)
- [Authentication System](../AUTHENTICATION.md)
- [Development Workflow](../DEVELOPMENT.md)

*Note: This is a placeholder document. Full API documentation will be expanded as endpoints are implemented.* 