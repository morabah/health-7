// Mock Firebase Admin SDK

// Mock Firestore
const mockFirestore = () => {
  const store: Record<string, any> = {};
  const mockCollection = jest.fn((path: string) => {
    if (!store[path]) {
      store[path] = {
        docs: {},
        get: jest.fn().mockResolvedValue({ empty: true }),
        doc: jest.fn((id: string) => ({
          get: jest.fn().mockResolvedValue({
            exists: !!store[path]?.docs?.[id],
            data: () => store[path]?.docs?.[id],
            id,
          }),
          set: jest.fn((data: any) => {
            if (!store[path]) store[path] = { docs: {} };
            store[path].docs[id] = data;
            return Promise.resolve();
          }),
          update: jest.fn((data: any) => {
            if (!store[path]?.docs?.[id]) {
              return Promise.reject(new Error('Document not found'));
            }
            store[path].docs[id] = { ...store[path].docs[id], ...data };
            return Promise.resolve();
          }),
          delete: jest.fn().mockResolvedValue(undefined),
          collection: mockCollection,
        })),
      };
    }
    return store[path];
  });

  return {
    collection: mockCollection,
  };
};

// Mock Auth
const mockAuth = () => ({
  verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user' }),
  createUser: jest.fn().mockResolvedValue({ uid: 'new-user' }),
  updateUser: jest.fn().mockResolvedValue({ uid: 'updated-user' }),
  deleteUser: jest.fn().mockResolvedValue(undefined),
  getUser: jest.fn().mockResolvedValue({ uid: 'test-user' }),
  getUserByEmail: jest.fn().mockResolvedValue({ uid: 'test-user' }),
  setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
});

// Mock Firebase App
const mockApps: any[] = [];

const mockInitializeApp = jest.fn(() => {
  const app = {
    name: '[DEFAULT]',
    options: {},
    firestore: mockFirestore(),
    auth: mockAuth(),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  mockApps.push(app);
  return app;
});

// Mock the apps.getApps() method
mockInitializeApp['apps'] = mockApps;

// Mock the getApp function
const mockGetApp = jest.fn(() => {
  if (mockApps.length === 0) {
    return mockInitializeApp();
  }
  return mockApps[0];
});

// Mock the getApps function
const mockGetApps = jest.fn(() => mockApps);

// Mock credential
const mockCredential = {
  cert: jest.fn(() => ({})),
};

// Mock Firestore types
const mockFieldValue = {
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  delete: jest.fn(() => 'MOCK_DELETE'),
  increment: jest.fn((n: number) => n),
  arrayUnion: jest.fn((...elements: any[]) => elements),
  arrayRemove: jest.fn((...elements: any[]) => elements),
};

// Mock Timestamp
const mockTimestamp = {
  now: jest.fn(() => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 })),
  fromDate: jest.fn((date: Date) => ({
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  })),
  fromMillis: jest.fn((millis: number) => ({
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1000000,
  })),
};

// Mock Firestore instance
const mockFirestoreInstance = {
  FieldValue: mockFieldValue,
  Timestamp: mockTimestamp,
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({ empty: true }),
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
};

// Mock Auth instance
const mockAuthInstance = {
  verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user' }),
  createUser: jest.fn().mockResolvedValue({ uid: 'new-user' }),
  updateUser: jest.fn().mockResolvedValue({ uid: 'updated-user' }),
  deleteUser: jest.fn().mockResolvedValue(undefined),
  getUser: jest.fn().mockResolvedValue({ uid: 'test-user' }),
  getUserByEmail: jest.fn().mockResolvedValue({ uid: 'test-user' }),
  setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
};

// Export mocks
const firebaseAdmin = {
  initializeApp: mockInitializeApp,
  app: {
    delete: jest.fn().mockResolvedValue(undefined),
  },
  apps: mockApps,
  credential: mockCredential,
  firestore: jest.fn(() => mockFirestoreInstance),
  auth: jest.fn(() => mockAuthInstance),
  // Add other Firebase Admin SDK methods as needed
};

// Add static methods to the mock
Object.defineProperty(firebaseAdmin, 'apps', {
  get: () => mockApps,
});

// Export the mock
module.exports = firebaseAdmin;
