// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array

// Mock fetch
require('jest-fetch-mock').enableMocks();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    route: '/mock-route',
    pathname: '/mock-path',
    query: {},
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
  usePathname: () => '/mock-path',
  useSearchParams: () => ({
    get: jest.fn().mockImplementation(key => `mock-${key}`),
    getAll: jest.fn().mockImplementation(key => [`mock-${key}`]),
    has: jest.fn().mockReturnValue(true),
    forEach: jest.fn(),
    entries: jest.fn().mockReturnValue([['key', 'value']]),
    keys: jest.fn().mockReturnValue(['key']),
    values: jest.fn().mockReturnValue(['value']),
  }),
}));

// Add any other global mocks here 