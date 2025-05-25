# Health Appointment System: Architecture

This document outlines the system architecture, technology stack, and core design decisions for the Health Appointment System.

## Quick Reference

### Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase Functions, Firebase Firestore, Firebase Authentication
- **Development**: Local JSON database, Firebase Emulator Suite
- **Deployment**: Firebase Hosting, Firebase Cloud Functions

### Core User Roles
- **Patient**: End-user seeking medical care
- **Doctor**: Verified healthcare provider offering services  
- **Administrator**: System manager with verification and oversight capabilities

---

## System Architecture

### Overview

The Health Appointment System is a modern web application built with a serverless architecture using Firebase services. The system supports three user types with role-based access control and provides a complete appointment booking and management solution.

### Architecture Patterns

- **Serverless Architecture**: Firebase Functions for backend logic
- **JAMstack**: Static site generation with dynamic API calls
- **Component-Based UI**: Reusable React components with TypeScript
- **Schema-First Development**: Zod schemas as single source of truth
- **Role-Based Access Control**: User permissions based on roles

---

## Directory Structure

### Project Root Structure

```
/
├── README.md                    # Project overview & quick start
├── ARCHITECTURE.md             # This file - system architecture
├── DEVELOPMENT.md              # Development workflow & scripts
├── AUTHENTICATION.md           # Auth implementation & Firebase setup
├── LOGIN_CREDENTIALS.md        # Development login credentials
├── package.json                # Dependencies & scripts
├── next.config.js              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── .env.local                  # Environment variables (local)
├── .gitignore                  # Git exclusions
├── firebase.json               # Firebase project configuration
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Firestore composite indexes
└── .firebaserc                 # Firebase project aliases
```

### Source Code Structure (`/src`)

```
src/
├── app/                        # Next.js App Router
│   ├── (public)/              # Marketing pages (home, about, contact)
│   ├── (auth)/                # Authentication flow pages
│   ├── (platform)/            # Authenticated user areas
│   ├── (dev)/                 # Development-only UI
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   └── not-found.tsx          # 404 page
├── components/                 # React components
│   ├── ui/                    # Atomic UI primitives
│   ├── layout/                # Layout components
│   ├── auth/                  # Authentication components
│   ├── booking/               # Appointment booking components
│   └── dashboard/             # Dashboard components
├── context/                    # React context providers
│   ├── AuthContext.tsx        # Authentication state
│   └── ThemeContext.tsx       # Theme management
├── hooks/                      # Custom React hooks
│   └── dashboard/             # Dashboard-specific hooks
├── lib/                        # Utility libraries
│   ├── apiClient.ts           # API communication layer
│   ├── localDb.ts             # Local database utilities
│   ├── logger.ts              # Logging utilities
│   ├── performance.ts         # Performance tracking
│   └── realFirebaseConfig.ts  # Firebase configuration
├── data/                       # Data loading modules
├── types/                      # TypeScript type definitions
│   ├── schemas.ts             # Zod schemas (source of truth)
│   ├── enums.ts               # Enum definitions
│   └── index.ts               # Type exports
├── styles/                     # Styling
│   └── globals.css            # Global styles & Tailwind
└── firebase_backend/           # Backend Firebase Functions
    └── functions/             # Cloud Functions code
```

### Firebase Functions Structure (`/src/firebase_backend/functions`)

```
src/firebase_backend/functions/
├── package.json               # Functions dependencies
├── tsconfig.json              # TypeScript config for functions
├── .eslintrc.js              # ESLint configuration
├── firebase.json              # Functions configuration
└── src/                       # Function source code
    ├── index.ts               # Main entry point
    ├── config/                # Configuration utilities
    │   └── firebaseAdmin.ts   # Firebase Admin SDK setup
    ├── shared/                # Shared utilities
    │   ├── logger.ts          # Cloud Functions logging
    │   ├── performance.ts     # Performance tracking
    │   └── schemas.ts         # Shared Zod schemas
    ├── user/                  # User management functions
    ├── patient/               # Patient-specific functions
    ├── doctor/                # Doctor-specific functions
    ├── appointment/           # Appointment management
    ├── notification/          # Notification functions
    └── admin/                 # Administrative functions
```

### Development Database (`/local_db`)

```
local_db/
├── users.json                 # User profiles
├── patients.json              # Patient-specific data
├── doctors.json               # Doctor profiles & availability
├── appointments.json          # Appointment records
└── notifications.json         # User notifications
```

### Scripts Directory (`/scripts`)

```
scripts/
├── seedLocalDb.ts             # Seed local database with test data
├── migrateLocalDbToDevCloud.ts # Migrate to Firebase
├── syncFirebaseAuth.ts        # Sync users with Firebase Auth
├── verifyFirebaseAuth.ts      # Verify auth configuration
├── testLoginUser.ts           # Test authentication
├── setupDatabaseIndexes.ts    # Create Firestore indexes
└── verifyDatabaseUniqueness.ts # Validate data integrity
```

---

## Technology Stack

### Frontend Technologies

#### **Next.js 15 (App Router)**
- **Purpose**: React framework with server-side rendering
- **Features**: App Router, API routes, static generation
- **Configuration**: `next.config.js` with TypeScript support

#### **React 18 with TypeScript**
- **Purpose**: Component-based UI development
- **Features**: Hooks, Context API, Suspense
- **Type Safety**: Full TypeScript integration

#### **Tailwind CSS**
- **Purpose**: Utility-first CSS framework
- **Features**: Responsive design, dark mode support
- **Configuration**: `tailwind.config.ts` with custom theme

#### **React Query (TanStack Query)**
- **Purpose**: Data fetching and caching
- **Features**: Background updates, optimistic updates
- **Integration**: Custom hooks for API calls

### Backend Technologies

#### **Firebase Functions**
- **Purpose**: Serverless backend logic
- **Runtime**: Node.js 22 with TypeScript
- **Features**: HTTPS callable functions, authentication

#### **Firebase Firestore**
- **Purpose**: NoSQL document database
- **Features**: Real-time updates, offline support
- **Security**: Role-based security rules

#### **Firebase Authentication**
- **Purpose**: User authentication and authorization
- **Features**: Email/password, custom claims
- **Integration**: React context for auth state

### Development Tools

#### **TypeScript**
- **Purpose**: Type safety and developer experience
- **Configuration**: Strict mode enabled
- **Integration**: Full stack type safety

#### **Zod**
- **Purpose**: Schema validation and type inference
- **Usage**: Single source of truth for data structures
- **Integration**: Frontend and backend validation

#### **ESLint & Prettier**
- **Purpose**: Code quality and formatting
- **Configuration**: Consistent code style
- **Integration**: Pre-commit hooks

---

## Data Architecture

### Schema Design

#### **Core Entities**
- **Users**: Base user information (email, name, role)
- **Patients**: Patient-specific data (medical history, preferences)
- **Doctors**: Doctor profiles (specialties, availability, verification)
- **Appointments**: Booking records (time, status, participants)
- **Notifications**: User notifications (messages, read status)

#### **Schema Validation**
- **Source of Truth**: Zod schemas in `src/types/schemas.ts`
- **Type Inference**: TypeScript types derived from schemas
- **Validation**: Both frontend and backend use same schemas

#### **Data Relationships**
- **Users → Patients/Doctors**: One-to-one relationship via userId
- **Appointments**: References to doctor and patient users
- **Notifications**: References to target user

### Database Strategy

#### **Development Environment**
- **Local Database**: JSON files for rapid development
- **Benefits**: Fast iteration, no network dependencies
- **Utilities**: CRUD operations through `localDb.ts`

#### **Production Environment**
- **Firebase Firestore**: Scalable NoSQL database
- **Features**: Real-time updates, offline support
- **Security**: Role-based access control rules

---

## Authentication Architecture

### Authentication Flow

#### **User Registration**
1. User submits registration form
2. Frontend validates with Zod schemas
3. Firebase Auth creates user account
4. Cloud Function creates user profile in Firestore
5. Role-specific profile created (patient/doctor)

#### **User Login**
1. User submits credentials
2. Firebase Auth validates credentials
3. Custom claims provide role information
4. Frontend receives authenticated user
5. Role-based routing to appropriate dashboard

#### **Session Management**
- **Firebase Auth**: Handles token refresh automatically
- **React Context**: Maintains auth state across app
- **Protected Routes**: Role-based access control

### Role-Based Access Control

#### **User Roles**
- **Patient**: Can book appointments, view own data
- **Doctor**: Can manage availability, view appointments
- **Admin**: Can verify doctors, manage all users

#### **Permission System**
- **Firestore Rules**: Database-level access control
- **Custom Claims**: Role information in JWT tokens
- **Frontend Guards**: Component-level access control

---

## API Architecture

### API Design Patterns

#### **Unified API Client**
- **Purpose**: Consistent API communication
- **Features**: Environment switching, error handling
- **Location**: `src/lib/apiClient.ts`

#### **Local API Functions**
- **Purpose**: Development environment backend simulation
- **Features**: Full CRUD operations, role-based logic
- **Location**: `src/lib/localApiFunctions.ts`

#### **Cloud Functions**
- **Purpose**: Production backend logic
- **Features**: Authentication, validation, business logic
- **Location**: `src/firebase_backend/functions/src/`

### Error Handling

#### **Error Categories**
- **Authentication Errors**: Login, permission issues
- **Validation Errors**: Schema validation failures
- **Network Errors**: Connection, timeout issues
- **Business Logic Errors**: Appointment conflicts, etc.

#### **Error Response Format**
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}
```

---

## Performance Architecture

### Frontend Performance

#### **Code Splitting**
- **Next.js**: Automatic code splitting by route
- **Dynamic Imports**: Lazy loading for large components
- **Bundle Analysis**: Webpack bundle analyzer integration

#### **Caching Strategy**
- **React Query**: Intelligent data caching
- **Next.js**: Static generation where possible
- **Browser Cache**: Optimized asset caching

### Backend Performance

#### **Database Optimization**
- **Firestore Indexes**: Composite indexes for complex queries
- **Query Optimization**: Efficient data fetching patterns
- **Pagination**: Large dataset handling

#### **Function Performance**
- **Cold Start Optimization**: Minimal dependencies
- **Memory Management**: Efficient resource usage
- **Monitoring**: Performance tracking and logging

---

## Security Architecture

### Data Security

#### **Input Validation**
- **Zod Schemas**: All inputs validated against schemas
- **Sanitization**: XSS prevention through proper escaping
- **Type Safety**: TypeScript prevents type-related vulnerabilities

#### **Authentication Security**
- **Firebase Auth**: Industry-standard authentication
- **Custom Claims**: Role-based access control
- **Token Validation**: Automatic token refresh and validation

### Database Security

#### **Firestore Rules**
- **Role-Based Access**: Users can only access appropriate data
- **Field-Level Security**: Sensitive fields protected
- **Validation Rules**: Server-side data validation

#### **API Security**
- **Authentication Required**: All sensitive endpoints protected
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Proper cross-origin policies

---

## Deployment Architecture

### Development Environment

#### **Local Development**
- **Next.js Dev Server**: Hot reloading, fast refresh
- **Local Database**: JSON files for rapid iteration
- **Firebase Emulator**: Local Firebase services

#### **Development Cloud**
- **Firebase Project**: `health7-c378f` for development
- **Real Services**: Firebase Auth, Firestore, Functions
- **Test Data**: Seeded with realistic test data

### Production Environment

#### **Hosting**
- **Firebase Hosting**: Static site hosting
- **CDN**: Global content delivery network
- **SSL**: Automatic HTTPS certificates

#### **Backend Services**
- **Firebase Functions**: Serverless function execution
- **Firestore**: Production database
- **Firebase Auth**: Production authentication

---

## Scalability Considerations

### Frontend Scalability

#### **Component Architecture**
- **Atomic Design**: Reusable component hierarchy
- **State Management**: Efficient state updates
- **Performance Monitoring**: Real-time performance tracking

### Backend Scalability

#### **Serverless Architecture**
- **Auto-scaling**: Firebase Functions scale automatically
- **Pay-per-use**: Cost-effective scaling model
- **Global Distribution**: Multi-region deployment capability

#### **Database Scalability**
- **Firestore**: Horizontally scalable NoSQL database
- **Indexing Strategy**: Optimized for common query patterns
- **Data Partitioning**: Efficient data distribution

---

## Related Documents

- [Development Workflow](DEVELOPMENT.md)
- [Authentication Setup](AUTHENTICATION.md)
- [API Reference](docs/API_REFERENCE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Prompt Completion Log](docs/history/PROMPT_COMPLETION_LOG.md) 