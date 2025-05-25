// First, set up all mocks before any imports
const mockGet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

// Create a mock HttpsError class
class MockHttpsError extends Error {
  constructor(public code: string, message: string, public details?: any) {
    super(message);
    this.name = 'HttpsError';
  }
}

// Mock firebase-functions module
jest.mock('firebase-functions', () => ({
  https: {
    HttpsError: MockHttpsError,
    onCall: (handler: any) => async (data: any, context: any) => {
      try {
        return await handler(data, context);
      } catch (error) {
        // Ensure the error is an instance of HttpsError
        if (error.name === 'HttpsError') {
          throw error;
        }
        throw new MockHttpsError('internal', 'Internal Server Error', error);
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

// Mock firebase-admin module
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

// Now import the function we want to test
import { getMyUserProfileData } from '../../user/getUserProfile';

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
      
      // Verify the error was created with the correct parameters
      expect(mockHttpsError).toHaveBeenCalledWith(
        'unauthenticated',
        'User must be authenticated to access profile data'
      );
    }
  });

  it('should throw a not-found error when user profile does not exist', async () => {
    const userId = 'non-existent-user';
    
    // Setup mock for non-existent document
    mockGet.mockResolvedValueOnce({
      exists: false,
      id: userId,
      data: () => undefined
    });
    
    // Setup the collection and doc mocks
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
      
      // Verify the error was created with the correct parameters
      expect(mockHttpsError).toHaveBeenCalledWith(
        'not-found',
        'User profile not found'
      );
    }
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
