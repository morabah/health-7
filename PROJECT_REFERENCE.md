# Health Appointment System: Project Reference

This is the main reference document for the Health Appointment System. It provides quick access to all project documentation and serves as the central navigation hub.

## 📋 Quick Navigation

### Core Documentation
- **[Architecture](ARCHITECTURE.md)** - System architecture, tech stack, and design patterns
- **[Development](DEVELOPMENT.md)** - Development workflow, scripts, and best practices  
- **[Authentication](AUTHENTICATION.md)** - Firebase Auth setup, user roles, and security
- **[Login Credentials](LOGIN_CREDENTIALS.md)** - Development login credentials

### Specialized Documentation
- **[API Reference](docs/API_REFERENCE.md)** - API endpoints, schemas, and validation
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Firebase deployment and configuration
- **[Error Handling](docs/ERROR_HANDLING.md)** - Error system and troubleshooting
- **[Testing Guide](docs/TESTING.md)** - Testing strategies and validation tools
- **[UI Components](docs/UI_COMPONENTS.md)** - Component library and styling

### Historical Records
- **[Prompt Completion Log](docs/history/PROMPT_COMPLETION_LOG.md)** - Detailed prompt completion history
- **[Migration History](docs/history/MIGRATION_HISTORY.md)** - Database migrations and Firebase setup
- **[Bug Fixes](docs/history/BUG_FIXES.md)** - Bug resolution history
- **[Feature Development](docs/history/FEATURE_DEVELOPMENT.md)** - Feature implementation timeline

---

## 🚀 Quick Start

### Essential Commands
```bash
# Development
npm run dev                     # Start development server
npm run build                   # Build for production

# Database
npm run db:seed:local           # Seed local database
npm run db:migrate:local-to-cloud-dev  # Migrate to cloud

# Authentication  
npm run auth:sync:firebase      # Sync users with Firebase Auth
npm run test:login:user         # Test login functionality
```

### Default Development Credentials
- **Password**: `Password123!` (for all users)
- **Admin**: `admin@example.com`
- **Patients**: `user7@demo.health`, `user8@demo.health`, `user9@demo.health`
- **Doctors**: `user1@demo.health`, `user2@demo.health`, etc.

---

## 🏗️ System Overview

### Technology Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase Functions, Firestore, Firebase Auth
- **Development**: Local JSON database, Firebase Emulator Suite
- **Deployment**: Firebase Hosting, Firebase Cloud Functions

### User Roles
- **Patient**: End-user seeking medical care
- **Doctor**: Verified healthcare provider offering services
- **Administrator**: System manager with verification and oversight capabilities

### Core Features
- **User Authentication**: Role-based access control with Firebase Auth
- **Appointment Booking**: Patients can book appointments with verified doctors
- **Doctor Management**: Doctor verification and availability management
- **Admin Dashboard**: System administration and user management
- **Notifications**: Real-time notifications for appointments and updates

---

## 📁 Project Structure

### Root Directory
```
/
├── README.md                   # Project overview & setup
├── ARCHITECTURE.md            # System architecture
├── DEVELOPMENT.md             # Development workflow
├── AUTHENTICATION.md          # Auth implementation
├── LOGIN_CREDENTIALS.md       # Development credentials
├── package.json               # Dependencies & scripts
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── firebase.json              # Firebase configuration
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Database indexes
└── .env.local                 # Environment variables
```

### Source Code (`/src`)
```
src/
├── app/                       # Next.js App Router
│   ├── (public)/             # Marketing pages
│   ├── (auth)/               # Authentication pages
│   ├── (platform)/           # Authenticated areas
│   └── (dev)/                # Development tools
├── components/                # React components
│   ├── ui/                   # Atomic UI components
│   ├── layout/               # Layout components
│   └── auth/                 # Auth components
├── lib/                       # Utility libraries
├── types/                     # TypeScript types & Zod schemas
├── data/                      # Data loading modules
└── firebase_backend/          # Backend Firebase Functions
```

### Development Database (`/local_db`)
```
local_db/
├── users.json                 # User profiles
├── patients.json              # Patient data
├── doctors.json               # Doctor profiles
├── appointments.json          # Appointment records
└── notifications.json         # User notifications
```

---

## 🔧 Development Environment

### Environment Modes

#### Local Development
```bash
NEXT_PUBLIC_API_MODE=local
NEXT_PUBLIC_FIREBASE_ENABLED=false
```
- Uses local JSON database
- No Firebase dependencies
- Fast iteration and testing

#### Cloud Development  
```bash
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_FIREBASE_ENABLED=true
```
- Uses Firebase Firestore
- Firebase Authentication
- Real cloud services

### Database States

| Environment | Users | Appointments | Status |
|-------------|-------|--------------|--------|
| **Local** | 15 users | 25 appointments | ✅ Seeded |
| **Cloud Dev** | 14 users | 25 appointments | ✅ Migrated |
| **Firebase Auth** | 14 users | - | ✅ Synced |

---

## 🔐 Authentication Status

### Firebase Auth Configuration
- **Project**: `health7-c378f`
- **Users Synced**: 14/14 (100% coverage)
- **Default Password**: `Password123!`
- **Custom Claims**: ✅ Configured
- **Security Rules**: ✅ Deployed

### User Distribution
- **Admin**: 1 user (`admin@example.com`)
- **Doctors**: 9 users (verified healthcare providers)
- **Patients**: 4 users (end-users)

---

## 📊 Database Status

### Firestore Collections
- **users**: 14 documents (user profiles)
- **patients**: 4 documents (patient-specific data)
- **doctors**: 9 documents (doctor profiles)
- **appointments**: 25 documents (appointment records)
- **notifications**: 283 documents (user notifications)

### Database Optimization
- **Composite Indexes**: 12 indexes deployed
- **Security Rules**: Role-based access control
- **Data Integrity**: 100% verified
- **Email Uniqueness**: ✅ Enforced

---

## 🧪 Testing & Validation

### Available Test Scripts
```bash
npm run test:login:user         # Test authentication
npm run auth:verify:firebase    # Verify Firebase Auth
npm run db:verify:uniqueness    # Verify data integrity
npm run db:analyze:duplicates   # Check for duplicates
```

### Validation Status
- **Authentication**: ✅ All users can login
- **Database Integrity**: ✅ 100% verified
- **Email Uniqueness**: ✅ Enforced
- **Firebase Sync**: ✅ Complete

---

## 🚀 Deployment Status

### Firebase Services
- **Hosting**: Ready for deployment
- **Functions**: Backend functions deployed
- **Firestore**: Database with indexes and rules
- **Authentication**: User management configured

### Environment Configuration
- **Development**: `health7-c378f` project
- **Production**: Ready for separate project setup
- **Emulator**: Available for local testing

---

## 📈 Recent Achievements

### Completed Milestones
- ✅ **Firebase Setup Complete** (Prompts 5.1-5.3)
- ✅ **Database Migration Complete** (Prompt 6.1)
- ✅ **Database Optimization Complete** (Prompt 6.2)
- ✅ **Authentication Synchronization Complete** (Prompt 6.3)
- ✅ **Login System Verified** (Prompt 6.4)

### Latest Updates
- **Documentation Restructure**: PROJECT_REFERENCE.md restructured (95% size reduction)
- **Prompt 6.4**: Login issue investigation and resolution
- **Database**: 336 documents across 5 collections
- **Authentication**: 14 users with Firebase Auth accounts
- **Performance**: 12 composite indexes for optimal queries
- **Security**: Role-based access control rules deployed

---

## 🔍 Troubleshooting

### Common Issues

#### Authentication Problems
```bash
npm run auth:verify:firebase    # Check auth status
npm run auth:sync:firebase      # Sync users if needed
npm run test:login:user         # Test login
```

#### Database Issues
```bash
npm run db:verify:uniqueness    # Check data integrity
npm run db:migrate:local-to-cloud-dev  # Re-migrate if needed
```

#### Development Issues
```bash
npm run dev                     # Start development server
npm run typecheck              # Check TypeScript
npm run lint                   # Check code quality
```

---

## 📚 Additional Resources

### External Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

### Project-Specific Guides
- [Setup Guide](README.md) - Initial project setup
- [Contributing Guide](docs/CONTRIBUTING.md) - Contribution guidelines
- [Security Guide](docs/SECURITY.md) - Security best practices
- [Performance Guide](docs/PERFORMANCE.md) - Performance optimization

---

## 📞 Support

### Getting Help
1. **Check Documentation**: Start with relevant documentation above
2. **Review Logs**: Check console and Firebase logs
3. **Run Diagnostics**: Use available test scripts
4. **Check History**: Review prompt completion log for context

### Common Solutions
- **Login Issues**: Use default password `Password123!`
- **Database Issues**: Verify data integrity with test scripts
- **Build Issues**: Check TypeScript and linting errors
- **Firebase Issues**: Verify project configuration and auth status

---

*Last Updated: January 2025*
*Total Documentation Size: ~95% reduction from original PROJECT_REFERENCE.md* 