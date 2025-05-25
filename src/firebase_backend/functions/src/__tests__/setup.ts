// Setup file for Jest tests
import '@testing-library/jest-dom';

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  return {
    // Mock Firestore
    firestore: () => ({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      onSnapshot: jest.fn(),
    }),
    // Mock Auth
    auth: () => ({
      verifyIdToken: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getUser: jest.fn(),
      getUserByEmail: jest.fn(),
      setCustomUserClaims: jest.fn(),
    }),
    // Initialize app with mock
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
    },
  };
});

// Mock Firebase Functions
jest.mock('firebase-functions', () => ({
  https: {
    HttpsError: class HttpsError extends Error {
      constructor(code: string, message: string, details?: unknown) {
        super(message);
        this.code = code;
        this.details = details;
      }
      code: string;
      details?: unknown;
    },
    onCall: (handler: any) => handler,
    onRequest: (handler: any) => handler,
  },
  config: jest.fn(() => ({
    firebase: {},
  })),
}));

// Mock environment variables
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
process.env.FIREBASE_PRIVATE_KEY = 'test-key';

// Global mocks
global.console = {
  ...console,
  // Override console methods in tests to reduce noise
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
