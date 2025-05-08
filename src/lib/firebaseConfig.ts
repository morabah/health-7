/**
 * Firebase Configuration
 *
 * This file contains Firebase configuration and initialization.
 * It handles both local development with emulators and production environment.
 */

// Import AuthError from errors.ts
import { AuthError } from './errors';

/**
 * Custom type definitions for simulated Firebase services
 */
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  emailVerified?: boolean;
}

export interface FirebaseDocument {
  exists: boolean;
  data: () => Record<string, unknown> | null;
  id?: string;
}

/**
 * Firebase configuration object
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'FIREBASE_API_KEY',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-app.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-app.appspot.com',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your-messaging-sender-id',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'your-app-id',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'your-measurement-id',
};

/**
 * Firebase Emulator configuration
 */
export const emulatorConfig = {
  // Use 127.0.0.1 instead of localhost to avoid IPv6/IPv4 mismatches
  authHost: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099',
  firestoreHost: process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080',
  functionsHost: process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001',
  storageHost: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199',
  useEmulator: process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === 'true' || false,
};

/**
 * Authentication mock service
 */
export interface AuthService {
  currentUser: FirebaseUser | null;
  onAuthStateChanged: (_callback: (user: FirebaseUser | null) => void) => () => void;
  signInWithEmailAndPassword: (
    _email: string,
    _password: string
  ) => Promise<{ user: FirebaseUser }>;
  createUserWithEmailAndPassword: (
    _email: string,
    _password: string
  ) => Promise<{ user: FirebaseUser }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (_email: string) => Promise<void>;
  sendEmailVerification: (_user: FirebaseUser) => Promise<void>;
}

export const auth: AuthService = {
  currentUser: null,
  onAuthStateChanged: (_callback: (user: FirebaseUser | null) => void) => {
    return () => {}; // Returns unsubscribe function
  },
  signInWithEmailAndPassword: async (_email: string, _password: string) => {
    // This is just a mock - will be replaced with actual Firebase Auth
    throw new AuthError('Firebase Auth not initialized', { code: 'FIREBASE_AUTH_NOT_INITIALIZED' });
  },
  createUserWithEmailAndPassword: async (_email: string, _password: string) => {
    throw new AuthError('Firebase Auth not initialized', { code: 'FIREBASE_AUTH_NOT_INITIALIZED' });
  },
  signOut: async () => {
    throw new AuthError('Firebase Auth not initialized', { code: 'FIREBASE_AUTH_NOT_INITIALIZED' });
  },
  sendPasswordResetEmail: async (_email: string) => {
    throw new AuthError('Firebase Auth not initialized', { code: 'FIREBASE_AUTH_NOT_INITIALIZED' });
  },
  sendEmailVerification: async (_user: FirebaseUser) => {
    throw new AuthError('Firebase Auth not initialized', { code: 'FIREBASE_AUTH_NOT_INITIALIZED' });
  },
};

/**
 * Firestore database mock service
 */
export interface FirestoreService {
  collection: (_path: string) => FirestoreCollection;
}

interface FirestoreCollection {
  doc: (_id: string) => FirestoreDocument;
  add: (_data: Record<string, unknown>) => Promise<{ id: string }>;
  where: (_field: string, _operator: string, _value: unknown) => FirestoreQuery;
  orderBy: (_field: string, _direction?: 'asc' | 'desc') => FirestoreOrderBy;
}

interface FirestoreDocument {
  get: () => Promise<FirebaseDocument>;
  set: (_data: Record<string, unknown>) => Promise<void>;
  update: (_data: Record<string, unknown>) => Promise<void>;
  delete: () => Promise<void>;
}

interface FirestoreQuery {
  get: () => Promise<{ docs: FirebaseDocument[] }>;
  orderBy: (_field: string, _direction?: 'asc' | 'desc') => FirestoreOrderBy;
}

interface FirestoreOrderBy {
  limit: (_limit: number) => {
    get: () => Promise<{ docs: FirebaseDocument[] }>;
  };
}

export const firestore: FirestoreService = {
  collection: (_path: string) => ({
    doc: (_id: string) => ({
      get: async (): Promise<FirebaseDocument> => ({ exists: false, data: () => null }),
      set: async (_data: Record<string, unknown>) => {},
      update: async (_data: Record<string, unknown>) => {},
      delete: async () => {},
    }),
    add: async (_data: Record<string, unknown>) => ({ id: 'mock-id' }),
    where: (_field: string, _operator: string, _value: unknown) => ({
      get: async () => ({ docs: [] }),
      orderBy: (_field2: string, _direction?: 'asc' | 'desc') => ({
        limit: (_limit: number) => ({
          get: async () => ({ docs: [] }),
        }),
      }),
    }),
    orderBy: (_field: string, _direction?: 'asc' | 'desc') => ({
      limit: (_limit: number) => ({
        get: async () => ({ docs: [] }),
      }),
    }),
  }),
};

/**
 * Functions mock service
 */
export interface FunctionsService {
  httpsCallable: <T = Record<string, unknown>, R = unknown>(
    name: string
  ) => (data: T) => Promise<{ data: R }>;
  createTypedCallable: <T, R>(name: string) => (data: T) => Promise<{ data: R }>;
}

export const functions: FunctionsService = {
  httpsCallable:
    <T = Record<string, unknown>, R = unknown>(name: string) =>
    async (data: T): Promise<{ data: R }> => {
      console.log(`Mock Firebase Function called: ${name}`, data);
      return { data: null as unknown as R };
    },
  createTypedCallable:
    <T, R>(name: string) =>
    async (data: T): Promise<{ data: R }> => {
      console.log(`Mock Typed Firebase Function called: ${name}`, data);
      return { data: null as unknown as R };
    },
};

/**
 * Storage mock service
 */
export interface StorageService {
  ref: (_path: string) => StorageReference;
}

interface StorageReference {
  put: (_file: File) => Promise<{ ref: { getDownloadURL: () => Promise<string> } }>;
  delete: () => Promise<void>;
  getDownloadURL: () => Promise<string>;
}

export const storage: StorageService = {
  ref: (_path: string) => ({
    put: async (_file: File) => ({
      ref: {
        getDownloadURL: async () => 'https://mock-download-url.com/file.jpg',
      },
    }),
    delete: async () => {},
    getDownloadURL: async () => 'https://mock-download-url.com/file.jpg',
  }),
};

/**
 * Firebase configuration flags
 */
// Migration helper - set to true when migrating to Firebase
export const isFirebaseEnabled = process.env.NEXT_PUBLIC_FIREBASE_ENABLED === 'true' || false;

// Toggle to prefer emulator even in production build (for testing)
export const forceEmulator = process.env.NEXT_PUBLIC_FORCE_EMULATOR === 'true' || false;

// Flag for Firebase connection status
export const isFirebaseInitialized = false;

/**
 * Get current Firebase status
 * @returns Object with Firebase configuration status
 */
export interface FirebaseStatus {
  isEnabled: boolean;
  isInitialized: boolean;
  useEmulator: boolean;
  projectId: string;
}

export const getFirebaseStatus = (): FirebaseStatus => ({
  isEnabled: isFirebaseEnabled,
  isInitialized: isFirebaseInitialized,
  useEmulator: emulatorConfig.useEmulator || forceEmulator,
  projectId: firebaseConfig.projectId,
});
