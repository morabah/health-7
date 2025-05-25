// Mock Firebase Functions
const mockHttpsError = jest.fn().mockImplementation((code: string, message: string, details?: any) => ({
  code,
  message,
  details,
  toJSON: () => ({
    code,
    message,
    details,
  }),
}));

const mockHttps = {
  onCall: jest.fn((handler) => handler),
  onRequest: jest.fn((handler) => handler),
  HttpsError: mockHttpsError,
};

const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockConfig = jest.fn();

const mockFunctions = {
  https: mockHttps,
  config: mockConfig,
  logger: mockLogger,
  runWith: jest.fn().mockReturnThis(),
  region: jest.fn().mockReturnThis(),
};

// Add the logger to the mock
(mockFunctions as any).logger = mockLogger;

// Add the config function to the mock
(mockFunctions as any).config = mockConfig;

// Add the region function to the mock
(mockFunctions as any).region = jest.fn().mockReturnThis();

// Add the runWith function to the mock
(mockFunctions as any).runWith = jest.fn().mockReturnThis();

// Add the onRequest function to the mock
(mockFunctions as any).onRequest = jest.fn();

// Add the onCall function to the mock
(mockFunctions as any).onCall = jest.fn();

// Add the HttpsError class to the mock
(mockFunctions as any).HttpsError = mockHttpsError;

// Add the logger to the default export
const mockDefaultExport = {
  ...mockFunctions,
  logger: mockLogger,
};

// Export the mock
export const https = mockHttps;
export const config = mockConfig;
export const logger = mockLogger;
export const HttpsError = mockHttpsError;
export default mockDefaultExport;
