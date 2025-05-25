// Mock the logger first since it's used in other mocks
const mockLogInfo = jest.fn();
const mockLogError = jest.fn();

// Mock the logger module
jest.mock('../../shared/logger', () => ({
  logInfo: mockLogInfo,
  logError: mockLogError,
  logWarn: jest.fn(),
  logDebug: jest.fn(),
}));

// Mock Firestore
const mockGet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

// Mock Firestore document snapshot
const mockDocSnapshot = (data: any, id: string) => ({
  exists: !!data,
  id,
  data: () => data,
});

// Mock Firestore collection instance
const mockCollectionInstance = {
  where: jest.fn().mockReturnThis(),
  get: mockGet,
  doc: mockDoc,
};

// Mock Firestore document instance
const mockDocInstance = {
  get: mockGet,
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
};

// Import the function we want to test
import { getMyUserProfileData } from '../../user/getUserProfile';

// Mock firebase-functions
const mockHttpsError = jest.fn().mockImplementation((code: string, message: string, details?: any) => {
  const error = new Error(message) as any;
  error.code = code;
  error.details = details;
  return error;
});

// Mock firebase-functions
jest.mock('firebase-functions', () => ({
  https: {
    HttpsError: mockHttpsError,
    onCall: (handler: any) => (data: any, context: any) => {
      try {
        return Promise.resolve(handler(data, context));
      } catch (error) {
        return Promise.reject(error);
      }
    },
  },
  config: jest.fn(),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: mockCollection,
    doc: mockDoc,
  })),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe('getMyUserProfileData', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockCollection.mockReturnThis();
    mockDoc.mockReturnValue({
      get: mockGet,
    });
  });
  
  // Helper function to call the function under test
  const callGetMyUserProfileData = async (data: any, context: any) => {
    return getMyUserProfileData(data, context);
  };

  it('should return user profile data when user is authenticated and profile exists', async () => {
    // Setup mock document
    const userId = 'test-user-123';
    const userData = { name: 'Test User', email: 'test@example.com' };
    
    // Setup mock for Firestore
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => userData,
      id: userId,
    });
    
    mockCollection.mockReturnThis();
    mockDoc.mockReturnValue({ get: mockGet });

    // Call the function
    const result = await callGetMyUserProfileData({}, { 
      auth: { 
        uid: userId,
        token: { email: 'test@example.com' } 
      },
      rawRequest: { headers: { origin: 'http://localhost:3000' } }
    });

    // Verify the result
    expect(result).toEqual({
      success: true,
      data: {
        id: userId,
        ...userData,
      },
    });

    // Verify Firestore was called correctly
    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(mockDoc).toHaveBeenCalledWith(userId);
    expect(mockGet).toHaveBeenCalled();
  });

  it('should throw an unauthenticated error when user is not authenticated', async () => {
    // Call the function without auth context
    try {
      await callGetMyUserProfileData({}, { rawRequest: { headers: {} } });
      fail('Expected an error to be thrown');
    } catch (error: any) {
      expect(error.code).toBe('unauthenticated');
      expect(error.message).toBe('User must be authenticated to access profile data');
    }
    
    // Verify the error was created with the correct parameters
    expect(mockHttpsError).toHaveBeenCalledWith(
      'unauthenticated',
      'User must be authenticated to access profile data'
    );
  });

  it('should throw a not-found error when user profile does not exist', async () => {
    const userId = 'non-existent-user';
    
    // Setup mock for non-existent document
    mockGet.mockResolvedValueOnce({
      exists: false
    });
    
    mockCollection.mockReturnThis();
    mockDoc.mockReturnValue({ get: mockGet });

    try {
      await callGetMyUserProfileData({}, { 
        auth: { 
          uid: userId,
          token: { email: 'test@example.com' } 
        },
        rawRequest: { headers: { origin: 'http://localhost:3000' } }
      });
      fail('Expected an error to be thrown');
    } catch (error: any) {
      expect(error.code).toBe('not-found');
      expect(error.message).toBe('User profile not found');
    }
    
    // Verify the error was created with the correct parameters
    expect(mockHttpsError).toHaveBeenCalledWith(
      'not-found',
      'User profile not found'
    );
  });

  it('should handle Firestore errors', async () => {
    const userId = 'test-user-123';
    const errorMessage = 'Firestore error';
    
    // Setup mock to throw an error
    mockGet.mockRejectedValueOnce(new Error(errorMessage));
    
    mockCollection.mockReturnThis();
    mockDoc.mockReturnValue({ get: mockGet });

    try {
      await callGetMyUserProfileData({}, { 
        auth: { 
          uid: userId,
          token: { email: 'test@example.com' } 
        },
        rawRequest: { headers: { origin: 'http://localhost:3000' } }
      });
      fail('Expected an error to be thrown');
    } catch (error: any) {
      expect(error.code).toBe('internal');
      expect(error.message).toBe('Failed to fetch user profile');
    }
    
    // Verify the error was created with the correct parameters
    expect(mockHttpsError).toHaveBeenCalledWith(
      'internal',
      'Failed to fetch user profile',
      errorMessage
    );
  });
});
