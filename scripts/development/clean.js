#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const cleanAll = process.argv.includes('--all');

const dirsToClean = [
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
  'apps/web/.next',
  'apps/web/dist',
  'apps/api/dist',
  'packages/shared/dist',
];

if (cleanAll) {
  dirsToClean.push(
    'node_modules',
    'apps/web/node_modules',
    'apps/api/node_modules',
    'packages/shared/node_modules',
  );
}

console.log(`[Clean] Starting workspace cleanup (cleanAll=${cleanAll})...`);

for (const relPath of dirsToClean) {
  const targetPath = path.join(rootDir, relPath);
  if (fs.existsSync(targetPath)) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`  - Removed ${relPath}`);
    } catch (err) {
      console.error(`  ! Failed to remove ${relPath}: ${err.message}`);
    }
  }
}

console.log('[Clean] Cleanup completed successfully.');
