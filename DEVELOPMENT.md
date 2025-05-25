# Development Workflow

This document outlines the development workflow, scripts, and best practices for the Health Appointment System.

## Quick Reference

### Essential Commands
```bash
# Development
npm run dev                     # Start development server
npm run build                   # Build for production
npm run lint                    # Run ESLint
npm run format                  # Format code with Prettier

# Database
npm run db:seed:local           # Seed local database
npm run db:migrate:local-to-cloud-dev  # Migrate to cloud
npm run db:verify:uniqueness    # Verify data integrity

# Authentication
npm run auth:sync:firebase      # Sync users with Firebase Auth
npm run auth:verify:firebase    # Verify auth configuration
npm run test:login:user         # Test login functionality

# Testing
npm run test                    # Run tests
npm run typecheck              # TypeScript type checking
```

### Environment Files
- `.env.local` - Local development environment variables
- `.env.example` - Template for environment variables

---

## Development Setup

### Prerequisites
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Firebase CLI**: `npm install -g firebase-tools`
- **Git**: For version control

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd health-7
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Firebase Setup**
   ```bash
   firebase login
   firebase use health7-c378f
   ```

5. **Seed Local Database**
   ```bash
   npm run db:seed:local
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

---

## Development Environment

### Local Development Stack

#### **Frontend Development**
- **Next.js Dev Server**: `http://localhost:3000`
- **Hot Reloading**: Automatic page refresh on changes
- **TypeScript**: Real-time type checking
- **Tailwind CSS**: JIT compilation for styles

#### **Backend Development**
- **Local Database**: JSON files in `/local_db/`
- **API Simulation**: Local API functions for development
- **Firebase Emulator**: Optional for testing cloud functions

#### **Environment Variables**
```bash
# .env.local
NEXT_PUBLIC_API_MODE=local              # Use local API
NEXT_PUBLIC_FIREBASE_ENABLED=true       # Enable Firebase
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=false # Use cloud services
```

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| **Database** | Local JSON files | Firebase Firestore |
| **Authentication** | Local simulation | Firebase Auth |
| **API** | Local functions | Firebase Functions |
| **Hosting** | Next.js dev server | Firebase Hosting |

---

## Scripts Reference

### Core Development Scripts

#### **Development Server**
```bash
npm run dev                     # Start development server
npm run build                   # Build for production
npm run start                   # Start production server
npm run lint                    # Run ESLint
npm run lint:fix                # Fix ESLint issues
npm run format                  # Format with Prettier
```

#### **Type Checking**
```bash
npm run typecheck               # Check TypeScript types
npm run typecheck:watch         # Watch mode type checking
```

### Database Management Scripts

#### **Local Database**
```bash
npm run db:seed:local           # Seed with test data
```

#### **Cloud Migration**
```bash
npm run db:migrate:local-to-cloud-dev    # Migrate to Firebase
npm run db:verify:cloud-migration        # Verify migration
npm run db:verify:timestamps              # Verify timestamp conversion
```

#### **Database Optimization**
```bash
npm run db:analyze:duplicates    # Analyze duplicate users
npm run db:deduplicate:users     # Remove duplicate users
npm run db:setup:indexes         # Create Firestore indexes
npm run db:verify:uniqueness     # Verify data integrity
```

### Authentication Scripts

#### **Firebase Auth Management**
```bash
npm run auth:sync:firebase       # Sync users with Firebase Auth
npm run auth:verify:firebase     # Verify auth configuration
npm run test:login:user          # Test login functionality
```

### Testing Scripts

#### **Test Execution**
```bash
npm run test                     # Run all tests
npm run test:ci                  # Run tests in CI mode
npm run test:e2e                 # Run end-to-end tests
```

#### **Validation Scripts**
```bash
npm run validate-api             # Validate API endpoints
npm run validate-db              # Validate database schemas
```

---

## Development Workflow

### Feature Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Development Cycle**
   - Make changes to code
   - Test locally with `npm run dev`
   - Run type checking with `npm run typecheck`
   - Run linting with `npm run lint`

3. **Testing**
   - Run unit tests: `npm run test`
   - Test authentication: `npm run test:login:user`
   - Verify database integrity: `npm run db:verify:uniqueness`

4. **Code Quality**
   - Format code: `npm run format`
   - Fix linting issues: `npm run lint:fix`
   - Ensure type safety: `npm run typecheck`

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   git push origin feature/feature-name
   ```

### Database Development Workflow

#### **Local Development**
1. **Seed Local Database**
   ```bash
   npm run db:seed:local
   ```

2. **Develop with Local Data**
   - Use local JSON files for rapid iteration
   - Test CRUD operations
   - Validate data schemas

3. **Migrate to Cloud (When Ready)**
   ```bash
   npm run db:migrate:local-to-cloud-dev
   npm run db:verify:cloud-migration
   ```

#### **Cloud Development**
1. **Sync Authentication**
   ```bash
   npm run auth:sync:firebase
   npm run auth:verify:firebase
   ```

2. **Setup Database Indexes**
   ```bash
   npm run db:setup:indexes
   ```

3. **Verify Data Integrity**
   ```bash
   npm run db:verify:uniqueness
   ```

### Authentication Development

#### **Local Authentication Testing**
```bash
# Test login functionality
npm run test:login:user

# Verify Firebase Auth configuration
npm run auth:verify:firebase

# Sync users if needed
npm run auth:sync:firebase
```

#### **Default Development Credentials**
- **Password**: `Password123!` (for all users)
- **Admin**: `admin@example.com`
- **Patient**: `user7@demo.health`, `user8@demo.health`, `user9@demo.health`
- **Doctor**: `user1@demo.health`, `user2@demo.health`, etc.

---

## Code Quality Standards

### TypeScript Guidelines

#### **Type Safety**
- Use strict TypeScript configuration
- Derive types from Zod schemas
- Avoid `any` type usage
- Use proper type annotations

#### **Schema-First Development**
```typescript
// Define schema first
const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['patient', 'doctor', 'admin'])
});

// Infer TypeScript type
type User = z.infer<typeof UserSchema>;

// Use in functions
function createUser(userData: User): Promise<void> {
  // Implementation
}
```

### Component Development

#### **Component Structure**
```typescript
// Component with proper typing
interface ComponentProps {
  title: string;
  onAction: () => void;
  optional?: boolean;
}

export default function Component({ title, onAction, optional = false }: ComponentProps) {
  // Implementation
}
```

#### **Styling Guidelines**
- Use Tailwind CSS utility classes
- Follow responsive design patterns
- Implement dark mode support
- Use semantic HTML elements

### Error Handling

#### **Error Handling Pattern**
```typescript
try {
  const result = await apiCall();
  // Handle success
} catch (error) {
  logError('Operation failed', error);
  // Handle error appropriately
}
```

#### **Validation Pattern**
```typescript
const result = Schema.safeParse(data);
if (!result.success) {
  return { success: false, error: 'Validation failed' };
}
// Use validated data
const validatedData = result.data;
```

---

## Environment Configuration

### Environment Variables

#### **Required Variables**
```bash
# API Configuration
NEXT_PUBLIC_API_MODE=local|live
NEXT_PUBLIC_FIREBASE_ENABLED=true|false
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true|false

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

#### **Development Modes**

**Local Development Mode**:
```bash
NEXT_PUBLIC_API_MODE=local
NEXT_PUBLIC_FIREBASE_ENABLED=false
```

**Cloud Development Mode**:
```bash
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_FIREBASE_ENABLED=true
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=false
```

**Emulator Mode**:
```bash
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_FIREBASE_ENABLED=true
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true
```

---

## Debugging and Troubleshooting

### Common Issues

#### **Authentication Issues**
```bash
# Check Firebase Auth status
npm run auth:verify:firebase

# Sync users if authentication fails
npm run auth:sync:firebase

# Test login with known credentials
npm run test:login:user
```

#### **Database Issues**
```bash
# Verify data integrity
npm run db:verify:uniqueness

# Check for duplicates
npm run db:analyze:duplicates

# Re-migrate if needed
npm run db:migrate:local-to-cloud-dev
```

#### **Build Issues**
```bash
# Check TypeScript errors
npm run typecheck

# Fix linting issues
npm run lint:fix

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Logging and Monitoring

#### **Development Logging**
- Console logs for development debugging
- Performance tracking for optimization
- Error logging for issue identification

#### **Log Levels**
- **INFO**: General information
- **WARN**: Warning conditions
- **ERROR**: Error conditions
- **DEBUG**: Detailed debugging information

---

## Performance Optimization

### Development Performance

#### **Fast Refresh**
- Next.js Fast Refresh for instant updates
- TypeScript incremental compilation
- Tailwind JIT for fast CSS compilation

#### **Build Optimization**
- Code splitting by route
- Dynamic imports for large components
- Bundle analysis for size optimization

### Database Performance

#### **Local Database**
- JSON file operations optimized for development
- In-memory caching for frequently accessed data
- Efficient CRUD operations

#### **Cloud Database**
- Firestore composite indexes for complex queries
- Query optimization for large datasets
- Pagination for performance

---

## Deployment Workflow

### Development Deployment

#### **Firebase Functions**
```bash
cd src/firebase_backend/functions
npm run build
firebase deploy --only functions
```

#### **Frontend Deployment**
```bash
npm run build
firebase deploy --only hosting
```

### Production Deployment

#### **Pre-deployment Checklist**
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Linting issues resolved
- [ ] Environment variables configured
- [ ] Database indexes deployed
- [ ] Security rules updated

#### **Deployment Commands**
```bash
# Build and deploy everything
npm run build
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Related Documents

- [Architecture Overview](ARCHITECTURE.md)
- [Authentication Setup](AUTHENTICATION.md)
- [API Reference](docs/API_REFERENCE.md)
- [Testing Guide](docs/TESTING.md)
- [Deployment Guide](docs/DEPLOYMENT.md) 