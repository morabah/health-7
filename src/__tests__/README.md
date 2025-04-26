# Health App Testing

This directory contains the test files for the Health App project. Tests are implemented using Jest and follow a pattern of placing tests close to the code being tested while maintaining a clear directory structure.

## Test Structure

- `__tests__/utils/` - Tests for utility functions
- `__tests__/components/` - Tests for React components (to be added)
- `__tests__/hooks/` - Tests for custom React hooks (to be added)

## Running Tests

To run all tests:

```bash
npm test
```

To run a specific test or group of tests:

```bash
npm test -- src/__tests__/utils/availabilityUtils.test.ts
```

## Coverage

Test coverage reports are generated automatically when running tests. The coverage report can be found in the `coverage` directory after running tests.

## Creating New Tests

When creating new tests:

1. Place tests in the appropriate directory mirroring the source code structure
2. Name test files with a `.test.ts` or `.test.tsx` suffix
3. Import the module to be tested and any testing utilities
4. Create test suites using `describe` blocks to group related tests
5. Write individual test cases using `it` or `test` functions
6. Use mocks when needed to isolate the unit being tested

## Example Test Structure

```typescript
import { myFunction } from '@/path/to/module';

describe('MyModule', () => {
  describe('myFunction', () => {
    it('should handle valid input correctly', () => {
      // Arrange
      const input = 'valid input';
      
      // Act
      const result = myFunction(input);
      
      // Assert
      expect(result).toBe(expected);
    });
    
    it('should handle invalid input correctly', () => {
      // Test invalid input case
    });
  });
});
``` 