/**
 * Firebase Configuration
 * 
 * This file will contain all Firebase configuration and initialization.
 * Currently using placeholders - replace with actual Firebase config when migrating.
 */

// This is just a placeholder - replace with your actual Firebase config when migrating
export const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};

// Simulated Firebase services - these will be replaced with actual Firebase imports
export const auth = {
  // Placeholder for Firebase auth
  currentUser: null,
  onAuthStateChanged: (callback: (user: any) => void) => {
    return () => {}; // Returns unsubscribe function
  }
};

export const firestore = {
  // Placeholder for Firestore
  collection: (path: string) => ({
    doc: (id: string) => ({
      get: async () => ({ exists: false, data: () => null }),
      set: async () => {},
      update: async () => {}
    }),
    add: async (data: any) => ({ id: 'mock-id' }),
    where: () => ({ get: async () => ({ docs: [] }) })
  })
};

export const functions = {
  // Placeholder for Firebase Functions
  httpsCallable: (name: string) => async (data: any) => ({ data: null })
};

// Migration helper
export const isFirebaseEnabled = false; 