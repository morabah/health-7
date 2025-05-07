#!/usr/bin/env ts-node

/**
 * API Endpoint Validation Audit Script
 *
 * This script scans the codebase for API endpoint implementations and analyzes
 * their schema validation patterns, generating a report of endpoints that may
 * need improvement to follow the single source of truth pattern.
 *
 * Usage:
 *   npm run validate-api
 *
 * Output:
 *   - Console report of all endpoints and their validation score
 *   - JSON report file with detailed analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import { auditApiEndpointValidation } from '../src/lib/dataValidationUtils';

// Configuration
const API_DIRECTORIES = ['src/lib/api', 'src/lib/mockApi', 'src/firebase_backend/functions/src'];
const TS_EXTENSION = '.ts';
const OUTPUT_FILE = 'api-validation-audit.json';

// Function pattern detection regex
const API_FUNCTION_REGEX = /export\s+async\s+function\s+(\w+)\s*\(/g;

interface AuditResult {
  file: string;
  endpoint: string;
  score: number;
  issues: string[];
  details: {
    usesSchemaValidation: boolean;
    importsFromCentralSchema: boolean;
    usesZodSafeParse: boolean;
    validatesBeforeProcessing: boolean;
    returnsValidationErrors: boolean;
    inlineSchemaDefinitions: boolean;
  };
}

/**
 * Recursively find all TypeScript files in a directory
 */
function findTsFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return files;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // Recursively search in subdirectories
      files.push(...findTsFiles(itemPath));
    } else if (stat.isFile() && item.endsWith(TS_EXTENSION)) {
      // Add TypeScript files to result
      files.push(itemPath);
    }
  }

  return files;
}

async function main() {
  console.log('🔍 Starting API Endpoint Validation Audit');

  const results: AuditResult[] = [];

  // Process each directory
  for (const dir of API_DIRECTORIES) {
    console.log(`\nScanning directory: ${dir}`);

    try {
      // Find all TypeScript files
      const basePath = path.resolve(dir);
      const files = findTsFiles(basePath);
      console.log(`Found ${files.length} TypeScript files to process`);

      for (const filePath of files) {
        try {
          const fileContents = fs.readFileSync(filePath, 'utf8');

          // Extract function definitions
          const functionMatches = Array.from(fileContents.matchAll(API_FUNCTION_REGEX));

          if (functionMatches.length === 0) continue;

          console.log(`\nAnalyzing file: ${filePath}`);
          console.log(`Found ${functionMatches.length} API endpoints`);

          for (const match of functionMatches) {
            const functionName = match[1];
            const functionStart = match.index;

            if (functionStart === undefined) continue;

            // Extract the function code
            let braceCount = 0;
            let foundOpening = false;

            for (let i = functionStart; i < fileContents.length; i++) {
              if (fileContents[i] === '{') {
                braceCount++;
                foundOpening = true;
              } else if (fileContents[i] === '}') {
                braceCount--;
              }

              if (foundOpening && braceCount === 0) {
                // We've found the end of the function, but we don't need to store it
                break;
              }
            }

            // Pass the entire file content to the audit function
            // This allows it to check for imports at the top of the file
            const audit = auditApiEndpointValidation(functionName, fileContents);

            results.push({
              file: filePath,
              endpoint: functionName,
              score: audit.score,
              issues: audit.recommendations,
              details: {
                usesSchemaValidation: audit.usesSchemaValidation,
                importsFromCentralSchema: audit.importsFromCentralSchema,
                usesZodSafeParse: audit.usesZodSafeParse,
                validatesBeforeProcessing: audit.validatesBeforeProcessing,
                returnsValidationErrors: audit.returnsValidationErrors,
                inlineSchemaDefinitions: audit.inlineSchemaDefinitions,
              },
            });

            // Print result
            const scoreColor =
              audit.score >= 80
                ? '\x1b[32m' // green
                : audit.score >= 50
                  ? '\x1b[33m' // yellow
                  : '\x1b[31m'; // red

            console.log(`  ${scoreColor}${functionName}: ${audit.score}/100\x1b[0m`);

            if (audit.recommendations.length > 0) {
              console.log('  Issues:');
              audit.recommendations.forEach(rec => {
                console.log(`   - ${rec}`);
              });
            }
          }
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dir}:`, error);
    }
  }

  // Generate summary
  const totalEndpoints = results.length;
  if (totalEndpoints === 0) {
    console.log('\n⚠️ No API endpoints found for analysis');
    return;
  }

  const perfectEndpoints = results.filter(r => r.score === 100).length;
  const goodEndpoints = results.filter(r => r.score >= 80 && r.score < 100).length;
  const mediumEndpoints = results.filter(r => r.score >= 50 && r.score < 80).length;
  const poorEndpoints = results.filter(r => r.score < 50).length;

  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalEndpoints;

  console.log('\n📊 Validation Audit Summary');
  console.log('-------------------------');
  console.log(`Total API Endpoints: ${totalEndpoints}`);
  console.log(
    `Perfect Score (100): ${perfectEndpoints} (${Math.round((perfectEndpoints / totalEndpoints) * 100)}%)`
  );
  console.log(
    `Good Score (80-99): ${goodEndpoints} (${Math.round((goodEndpoints / totalEndpoints) * 100)}%)`
  );
  console.log(
    `Medium Score (50-79): ${mediumEndpoints} (${Math.round((mediumEndpoints / totalEndpoints) * 100)}%)`
  );
  console.log(
    `Poor Score (<50): ${poorEndpoints} (${Math.round((poorEndpoints / totalEndpoints) * 100)}%)`
  );
  console.log(`Average Score: ${Math.round(averageScore)}/100`);

  // Save detailed report
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        summary: {
          totalEndpoints,
          perfectEndpoints,
          goodEndpoints,
          mediumEndpoints,
          poorEndpoints,
          averageScore,
        },
        results: results.sort((a, b) => a.score - b.score),
      },
      null,
      2
    )
  );

  console.log(`\n💾 Detailed report saved to ${OUTPUT_FILE}`);
}

main().catch(error => {
  console.error('Error running validation audit:', error);
  process.exit(1);
});
