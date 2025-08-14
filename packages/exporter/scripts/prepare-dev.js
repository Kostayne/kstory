#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Restore workspace dependencies for development
if (packageJson.dependencies['@kstory/core'] === '^1.0.0') {
  packageJson.dependencies['@kstory/core'] = 'workspace:*';
  console.log('✅ Restored workspace dependency @kstory/core');
}

// Write back
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log('🔧 package.json prepared for development');
