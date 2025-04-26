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

# Database Schema Validation Tests

This directory contains Jest test files for validating various aspects of the Health Appointment System, including the critical database schema validation tests.

## Schema Validation (`db_schema_validation.test.ts`)

The database schema validation tests ensure that all data in the application conforms to the Zod schemas defined in `src/types/schemas.ts`, which serve as the single source of truth for data structure and validation rules.

### Key Features

- **Comprehensive Entity Validation**: Tests all core entity types (Users, Patients, Doctors, Appointments, Notifications) against their respective Zod schemas.

- **Detailed Error Reporting**: When validation fails, the tests provide detailed reports on exactly which fields failed validation and why, making debugging easier.

- **Performance Metrics**: Reports on validation execution time and throughput to help identify potential bottlenecks.

- **Error Formatting Utilities**: Includes a `formatZodErrors` helper function that transforms complex Zod error objects into a more readable format with field-specific error messages.

- **Edge Case Testing**: Includes test cases with intentionally invalid data to verify that validation correctly identifies problematic data.

- **Summary Statistics**: Generates validation reports with statistics grouped by entity type, showing valid/invalid counts for each category.

- **Logging Integration**: Integrates with the application logging system to record validation results.

### How to Run

To run only the database schema validation tests:

```bash
npm run test -- -t "Database Schema Validation"
```

To run all tests:

```bash
npm run test
```

### Implementation Details

The tests use mock data defined within the test file and mock the localDb functions to avoid making actual API calls. This approach ensures the tests can run quickly and reliably in any environment.

Each entity type has its own test case, and there are two comprehensive tests:

1. **`Validates database entries against all schemas with detailed reports`**: Runs all validations and generates a detailed report with breakdowns by entity type.

2. **`Creates schema validation report with timing metrics`**: Similar to the above but includes performance metrics for monitoring validation efficiency.

## Related Files

- **`src/types/schemas.ts`**: Contains the Zod schemas that define the data structure and validation rules
- **`src/types/enums.ts`**: Contains the enums used in the schemas
- **`src/lib/localDb.ts`**: Provides access to the local database
- **`src/lib/logger.ts`**: Used for logging validation results
- **`src/utils/validation.ts`**: Contains validation utilities and logs validation task completion

## Data Contract Adherence

These tests play a critical role in enforcing the data contract between frontend and backend. By validating data against the Zod schemas, they help ensure:

1. **Consistency**: All data flowing through the system conforms to the expected structure
2. **Type Safety**: All data has the correct types as defined in the schemas
3. **Validation**: All business rules encoded in the schemas are respected

## Extending the Tests

When adding new entity types or modifying existing schemas, be sure to:

1. Update the mock data to include examples of the new/modified entities
2. Add or update the corresponding validation test cases
3. Update the comprehensive validation tests to include the new entity type 