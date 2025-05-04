/**
 * Firebase Configuration
 * 
 * This file contains Firebase configuration and initialization.
 * It handles both local development with emulators and production environment.
 */

// This should be replaced with your actual Firebase config when migrating
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "FIREBASE_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-app.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your-app-id",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "your-measurement-id"
};

// Firebase Emulator configuration
export const emulatorConfig = {
  // Use 127.0.0.1 instead of localhost to avoid IPv6/IPv4 mismatches
  authHost: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099",
  firestoreHost: process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080",
  functionsHost: process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5001",
  storageHost: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST || "127.0.0.1:9199",
  useEmulator: process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === "true" || false
};

// Simulated Firebase services - these will be replaced with actual Firebase imports
// when the Firebase SDK is imported and initialized
export const auth = {
  currentUser: null,
  onAuthStateChanged: (callback: (user: any) => void) => {
    return () => {}; // Returns unsubscribe function
  },
  signInWithEmailAndPassword: async (email: string, password: string) => {
    // This is just a mock - will be replaced with actual Firebase Auth
    throw new Error("Firebase Auth not initialized");
  },
  createUserWithEmailAndPassword: async (email: string, password: string) => {
    throw new Error("Firebase Auth not initialized");
  },
  signOut: async () => {
    throw new Error("Firebase Auth not initialized");
  },
  sendPasswordResetEmail: async (email: string) => {
    throw new Error("Firebase Auth not initialized");
  },
  sendEmailVerification: async (user: any) => {
    throw new Error("Firebase Auth not initialized");
  }
};

export const firestore = {
  // Placeholder for Firestore
  collection: (path: string) => ({
    doc: (id: string) => ({
      get: async () => ({ exists: false, data: () => null }),
      set: async (data: any) => {},
      update: async (data: any) => {},
      delete: async () => {}
    }),
    add: async (data: any) => ({ id: 'mock-id' }),
    where: () => ({ 
      get: async () => ({ docs: [] }),
      orderBy: () => ({
        limit: () => ({
          get: async () => ({ docs: [] })
        })
      })
    }),
    orderBy: () => ({
      limit: () => ({
        get: async () => ({ docs: [] })
      })
    })
  })
};

export const functions = {
  // Placeholder for Firebase Functions
  httpsCallable: (name: string) => async (data: any) => {
    console.log(`Mock Firebase Function called: ${name}`, data);
    return { data: null };
  },
  // Helper method that will be used to create typed callable functions
  createTypedCallable: <T, R>(name: string) => 
    async (data: T): Promise<{data: R}> => {
      console.log(`Mock Typed Firebase Function called: ${name}`, data);
      return { data: null as unknown as R };
    }
};

export const storage = {
  // Placeholder for Firebase Storage
  ref: (path: string) => ({
    put: async (file: any) => ({
      ref: {
        getDownloadURL: async () => "https://mock-download-url.com/file.jpg"
      }
    }),
    delete: async () => {},
    getDownloadURL: async () => "https://mock-download-url.com/file.jpg"
  })
};

// Migration helper - set to true when migrating to Firebase
export const isFirebaseEnabled = process.env.NEXT_PUBLIC_FIREBASE_ENABLED === "true" || false;

// Toggle to prefer emulator even in production build (for testing)
export const forceEmulator = process.env.NEXT_PUBLIC_FORCE_EMULATOR === "true" || false;

// Flag for Firebase connection status
export let isFirebaseInitialized = false;

// Firebase initialization status for client components
export const getFirebaseStatus = () => ({
  isEnabled: isFirebaseEnabled,
  isInitialized: isFirebaseInitialized,
  useEmulator: emulatorConfig.useEmulator || forceEmulator,
  projectId: firebaseConfig.projectId
});