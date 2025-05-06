#!/bin/bash

# Update imports from old errorMonitoring to new path
find src/components -type f -name "*.tsx" -exec sed -i '' 's/import { errorMonitor } from '"'"'@\/lib\/errorMonitoring'"'"';/import { ErrorMonitor } from '"'"'@\/lib\/errors\/errorMonitoring'"'"';/g' {} \;

# Update captureException to reportError
find src/components -type f -name "*.tsx" -exec sed -i '' 's/errorMonitor\.captureException/ErrorMonitor.getInstance().reportError/g' {} \;

# Update other errorMonitoring imports
find src -type f -name "*.ts" -o -name "*.tsx" -exec sed -i '' 's/import { reportError } from '"'"'@\/lib\/errorMonitoring'"'"';/import { reportError } from '"'"'@\/lib\/errors\/errorMonitoring'"'"';/g' {} \;

# Update combined imports
find src -type f -name "*.ts" -o -name "*.tsx" -exec sed -i '' 's/import { reportError, errorMonitor } from '"'"'@\/lib\/errorMonitoring'"'"';/import { reportError, ErrorMonitor } from '"'"'@\/lib\/errors\/errorMonitoring'"'"';/g' {} \;

echo "Import paths updated!" 