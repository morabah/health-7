# TypeScript Path Aliases

This project uses path aliases to simplify imports. For example, instead of writing relative paths like `../../../utils/someModule`, we can use `@/utils/someModule`.

## Configuration

Path aliases are configured in multiple places to ensure they work across all tools:

1. **tsconfig.json** - The main TypeScript configuration file includes path mappings:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

2. **tsconfig.test.json** - A specialized configuration for direct TypeScript checking:
   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "module": "CommonJS",
       "esModuleInterop": true,
       "baseUrl": ".",
       "paths": {
         "@/*": ["src/*"]
       }
     }
   }
   ```

3. **jest.config.js** - Configuration for path alias resolution in tests:
   ```javascript
   moduleNameMapper: {
     '^@/(.*)$': '<rootDir>/src/$1',
   }
   ```

4. **Next.js** - Automatically supports path aliases from tsconfig.json

## Usage

### In Code

```typescript
// Instead of this:
import { someFunction } from '../../../utils/helpers';

// Use this:
import { someFunction } from '@/utils/helpers';
```

### Type Checking

To run TypeScript type checking with proper path resolution:

```bash
# Check all files
npm run typecheck

# Watch mode for development
npm run typecheck:watch
```

### Testing

Jest automatically resolves path aliases in tests:

```bash
npm test
```

## Troubleshooting

If you encounter path resolution issues:

1. Verify imports use the `@/` prefix correctly
2. For direct `tsc` commands, always use the project flag: `tsc -p tsconfig.test.json`
3. For ESLint, make sure the TypeScript ESLint plugin is configured properly
4. After adding new files, restart any running watch processes 