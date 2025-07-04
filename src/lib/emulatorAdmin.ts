/**
 * Firebase Admin SDK configuration for local emulator connections.
 * This file provides utilities for connecting to the Firebase Emulator Suite.
 */

// This is a simplified stub for the emulator connection
// In a real implementation, this would use the Firebase Admin SDK

interface EmulatorDocRef {
  id: string;
  collection: string;
}

interface FirestoreEmulator {
  collection: (name: string) => {
    doc: (id: string) => EmulatorDocRef;
  };
  batch: () => {
    set: (ref: EmulatorDocRef, data: Record<string, unknown>) => void;
    commit: () => Promise<void>;
  };
}

/**
 * Initializes the Admin SDK connection to the local Firebase emulator
 * @returns A Firestore instance connected to the emulator
 */
export function initAdminApp(): FirestoreEmulator {
  console.log('Connecting to Firebase emulator on localhost...');

  // This is a mock implementation
  // In a real scenario, this would be:
  // const admin = require('firebase-admin');
  // admin.initializeApp({
  //   projectId: 'demo-health-project',
  //   credential: admin.credential.applicationDefault()
  // });
  // process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  // return admin.firestore();

  // Return a mock Firestore implementation for the stub
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        id,
        collection: name,
      }),
    }),
    batch: () => ({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      set: (_ref: EmulatorDocRef, _: Record<string, unknown>) => {
        console.log(`Would set document ${_ref.id} in collection ${_ref.collection}`);
      },
      commit: async () => {
        console.log('Would commit batch write to emulator');
        return Promise.resolve();
      },
    }),
  };
}
