# Authentication System

This document covers the authentication implementation, Firebase Auth setup, and user management for the Health Appointment System.

## Quick Reference

### Default Development Credentials
- **Password**: `Password123!` (for all users)
- **Admin**: `admin@example.com`
- **Patients**: `user7@demo.health`, `user8@demo.health`, `user9@demo.health`
- **Doctors**: `user1@demo.health`, `user2@demo.health`, `user3@demo.health`, etc.

### Authentication Commands
```bash
npm run auth:sync:firebase      # Sync users with Firebase Auth
npm run auth:verify:firebase    # Verify auth configuration
npm run test:login:user         # Test login functionality
```

### User Roles
- **Patient**: End-user seeking medical care
- **Doctor**: Verified healthcare provider
- **Admin**: System administrator with full access

---

## Authentication Architecture

### Overview

The Health Appointment System uses Firebase Authentication for user management with role-based access control. The system supports three user types with different permissions and capabilities.

### Authentication Flow

#### **User Registration**
1. User submits registration form with email, password, and role
2. Frontend validates input using Zod schemas
3. Firebase Auth creates user account
4. Cloud Function creates user profile in Firestore
5. Role-specific profile created (patient/doctor)
6. Custom claims set for role-based access

#### **User Login**
1. User submits email and password
2. Firebase Auth validates credentials
3. Custom claims provide role information
4. Frontend receives authenticated user with role
5. Role-based routing to appropriate dashboard

#### **Session Management**
- Firebase Auth handles token refresh automatically
- React Context maintains auth state across the app
- Protected routes enforce role-based access control
- Automatic logout on token expiration

---

## Firebase Authentication Setup

### Firebase Configuration

#### **Project Configuration**
- **Project ID**: `health7-c378f`
- **Auth Domain**: `health7-c378f.firebaseapp.com`
- **Region**: `us-central1`

#### **Authentication Methods**
- **Email/Password**: Primary authentication method
- **Custom Claims**: Role-based permissions
- **Email Verification**: Optional for enhanced security

### User Management

#### **User Creation Process**
```typescript
// 1. Create Firebase Auth user
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
const user = userCredential.user;

// 2. Create user profile in Firestore
await setDoc(doc(db, 'users', user.uid), {
  email: user.email,
  name: displayName,
  userType: role,
  isActive: true,
  createdAt: serverTimestamp()
});

// 3. Create role-specific profile
if (role === 'patient') {
  await setDoc(doc(db, 'patients', user.uid), patientData);
} else if (role === 'doctor') {
  await setDoc(doc(db, 'doctors', user.uid), doctorData);
}

// 4. Set custom claims (via Cloud Function)
await admin.auth().setCustomUserClaims(user.uid, {
  userType: role,
  role: role,
  admin: role === 'admin'
});
```

#### **Custom Claims Structure**
```typescript
interface CustomClaims {
  userType: 'patient' | 'doctor' | 'admin';
  role: 'patient' | 'doctor' | 'admin';
  admin: boolean;
  verified?: boolean;  // For doctors
}
```

---

## Role-Based Access Control

### User Roles and Permissions

#### **Patient Role**
- **Permissions**:
  - View own profile and medical history
  - Book appointments with verified doctors
  - View own appointments
  - Receive notifications
  - Update own profile information

- **Restrictions**:
  - Cannot access other patients' data
  - Cannot manage doctor availability
  - Cannot access admin functions

#### **Doctor Role**
- **Permissions**:
  - View own profile and practice information
  - Manage availability and schedule
  - View appointments with own patients
  - Update appointment status
  - Receive appointment notifications
  - View patient information for scheduled appointments

- **Restrictions**:
  - Cannot access other doctors' data
  - Cannot book appointments as patient
  - Cannot access admin functions
  - Cannot view unrelated patient data

#### **Admin Role**
- **Permissions**:
  - Full system access
  - Verify and manage doctor accounts
  - View all users and appointments
  - Manage system settings
  - Access analytics and reports
  - Override system restrictions

- **Capabilities**:
  - User management (create, update, deactivate)
  - Doctor verification workflow
  - System monitoring and maintenance
  - Data export and reporting

### Permission Implementation

#### **Frontend Route Protection**
```typescript
// Protected route component
function ProtectedRoute({ 
  children, 
  requiredRole, 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (requireAuth && !user) {
    return <Navigate to="/auth/login" />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  return <>{children}</>;
}
```

#### **Firestore Security Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // Patients can read/write their own data
    match /patients/{patientId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == patientId &&
        request.auth.token.userType == 'patient';
    }
    
    // Doctors can read/write their own data
    match /doctors/{doctorId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == doctorId &&
        request.auth.token.userType == 'doctor';
      // Patients can read verified doctor profiles
      allow read: if request.auth != null && 
        request.auth.token.userType == 'patient' &&
        resource.data.isVerified == true;
    }
    
    // Appointments - complex rules for patient/doctor access
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null && (
        request.auth.uid == resource.data.patientId ||
        request.auth.uid == resource.data.doctorId ||
        request.auth.token.admin == true
      );
    }
  }
}
```

---

## Authentication Implementation

### React Authentication Context

#### **AuthContext Setup**
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get custom claims
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const customClaims = idTokenResult.claims;
        
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: customClaims.userType as UserRole,
          isAdmin: customClaims.admin === true
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  // Implementation of login, logout, register functions
  // ...
  
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### **useAuth Hook**
```typescript
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Login Implementation

#### **Frontend Login Function**
```typescript
async function login(email: string, password: string): Promise<void> {
  try {
    setLoading(true);
    
    // Attempt Firebase Auth login
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get fresh token with custom claims
    await user.getIdToken(true);
    
    logInfo('Login successful', { userId: user.uid, email: user.email });
    
  } catch (error) {
    logError('Login failed', error);
    throw error;
  } finally {
    setLoading(false);
  }
}
```

#### **Direct Login Utility**
```typescript
// For testing and development
export async function directLoginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: userCredential.user,
      message: 'Login successful'
    };
  } catch (error) {
    logError('Direct login failed', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}
```

---

## User Synchronization

### Firebase Auth Synchronization

The system maintains synchronization between the local database and Firebase Authentication to ensure all users can authenticate properly.

#### **Synchronization Process**
```typescript
// Sync all users from database to Firebase Auth
async function syncFirebaseAuth() {
  const users = await loadUsers();
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    errors: 0
  };
  
  for (const user of users) {
    try {
      // Check if user exists in Firebase Auth
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUserByEmail(user.email);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create new Firebase Auth user
          firebaseUser = await admin.auth().createUser({
            uid: user.id,
            email: user.email,
            password: DEFAULT_PASSWORD,
            displayName: user.name,
            emailVerified: true,
            disabled: !user.isActive
          });
          results.created++;
        } else {
          throw error;
        }
      }
      
      // Set custom claims
      await admin.auth().setCustomUserClaims(firebaseUser.uid, {
        userType: user.userType,
        role: user.userType,
        admin: user.userType === 'admin'
      });
      
      results.processed++;
      
    } catch (error) {
      logError(`Failed to sync user ${user.email}`, error);
      results.errors++;
    }
  }
  
  return results;
}
```

#### **Verification Process**
```typescript
// Verify Firebase Auth configuration
async function verifyFirebaseAuth() {
  const users = await loadUsers();
  const firebaseUsers = await admin.auth().listUsers();
  
  const verification = {
    totalUsers: users.length,
    firebaseUsers: firebaseUsers.users.length,
    matched: 0,
    mismatched: 0,
    issues: []
  };
  
  for (const user of users) {
    const firebaseUser = firebaseUsers.users.find(fu => fu.uid === user.id);
    
    if (!firebaseUser) {
      verification.issues.push(`User ${user.email} not found in Firebase Auth`);
      verification.mismatched++;
      continue;
    }
    
    // Verify custom claims
    const customClaims = firebaseUser.customClaims || {};
    if (customClaims.userType !== user.userType) {
      verification.issues.push(`User ${user.email} has mismatched userType`);
      verification.mismatched++;
      continue;
    }
    
    verification.matched++;
  }
  
  return verification;
}
```

---

## Testing Authentication

### Login Testing

#### **Test Script**
```typescript
// Test login for specific user
async function testLoginUser(email: string, password: string) {
  console.log(`Testing login for: ${email}`);
  
  try {
    // Test with correct password
    const result = await directLoginUser(email, password);
    if (result.success) {
      console.log('✅ Login successful with correct password');
      
      // Test logout
      await signOut(auth);
      console.log('✅ Logout successful');
      
      // Test with incorrect password
      const failResult = await directLoginUser(email, 'wrongpassword');
      if (!failResult.success) {
        console.log('✅ Login correctly rejected with wrong password');
      } else {
        console.log('❌ Login should have failed with wrong password');
      }
      
    } else {
      console.log('❌ Login failed with correct password:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}
```

#### **Authentication Test Commands**
```bash
# Test login functionality
npm run test:login:user

# Verify Firebase Auth configuration
npm run auth:verify:firebase

# Sync users if authentication fails
npm run auth:sync:firebase
```

### Development Credentials

#### **Test Users**
All users in the development environment use the password `Password123!`:

**Admin Users**:
- `admin@example.com` - System administrator

**Doctor Users**:
- `user1@demo.health` - Dr. Sarah Johnson (Cardiology)
- `user2@demo.health` - Dr. Michael Chen (Dermatology)
- `user3@demo.health` - Dr. Emily Davis (Pediatrics)
- `user4@demo.health` - Dr. James Wilson (Orthopedics)
- `user5@demo.health` - Dr. Lisa Brown (Neurology)
- `user6@demo.health` - Dr. David Miller (General Practice)

**Patient Users**:
- `user7@demo.health` - John Smith
- `user8@demo.health` - Jane Doe
- `user9@demo.health` - Bob Johnson

---

## Security Considerations

### Password Security

#### **Development Environment**
- Default password: `Password123!` for all users
- Passwords are managed by Firebase Auth
- Password reset functionality available

#### **Production Environment**
- Strong password requirements enforced
- Password complexity validation
- Account lockout after failed attempts
- Email verification required

### Token Security

#### **JWT Token Management**
- Firebase Auth handles token generation and validation
- Tokens include custom claims for role-based access
- Automatic token refresh prevents session expiration
- Secure token storage in browser

#### **Custom Claims Security**
- Claims set server-side only (Cloud Functions)
- Claims validated in Firestore security rules
- Claims include role and permission information
- Claims updated when user roles change

### Data Protection

#### **Personal Information**
- Email addresses encrypted in transit
- User profiles protected by authentication
- Role-based access to sensitive data
- Audit logging for data access

#### **Medical Information**
- Patient data accessible only to authorized users
- Doctor-patient relationship enforced
- Admin oversight with audit trails
- HIPAA compliance considerations

---

## Troubleshooting

### Common Authentication Issues

#### **Login Failures**
```bash
# Check if user exists in Firebase Auth
npm run auth:verify:firebase

# Sync users if missing
npm run auth:sync:firebase

# Test with known credentials
npm run test:login:user
```

#### **Permission Errors**
- Verify custom claims are set correctly
- Check Firestore security rules
- Ensure user role matches expected permissions
- Verify token is not expired

#### **Development Issues**
- Ensure Firebase configuration is correct
- Check environment variables
- Verify Firebase project is active
- Test with default development credentials

### Error Messages

#### **Common Error Codes**
- `auth/user-not-found`: User doesn't exist in Firebase Auth
- `auth/wrong-password`: Incorrect password provided
- `auth/invalid-email`: Email format is invalid
- `auth/user-disabled`: User account has been disabled
- `auth/too-many-requests`: Too many failed login attempts

#### **Resolution Steps**
1. Check user exists in both database and Firebase Auth
2. Verify password is correct (use default for development)
3. Ensure user account is active
4. Check Firebase Auth configuration
5. Review Firestore security rules

---

## Related Documents

- [Architecture Overview](ARCHITECTURE.md)
- [Development Workflow](DEVELOPMENT.md)
- [API Reference](docs/API_REFERENCE.md)
- [Security Guide](docs/SECURITY.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) 