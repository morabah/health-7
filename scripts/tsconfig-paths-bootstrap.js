// Register TypeScript path aliases for direct use with tsc
import tsConfigPaths from 'tsconfig-paths';
import tsConfig from '../tsconfig.json';

// Register the path aliases from tsconfig.json
tsConfigPaths.register({
  baseUrl: tsConfig.compilerOptions.baseUrl,
  paths: tsConfig.compilerOptions.paths
});

console.log('TypeScript path aliases registered successfully!'); 