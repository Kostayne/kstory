#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const corePackageJsonPath = path.join(__dirname, '..', '..', 'core', 'package.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to validate semantic version
function isValidSemVer(version) {
  // biome-ignore lint/performance/useTopLevelRegex: <it's ok>
  const semverRegex = /^\d+\.\d+\.\d+$/;
  return semverRegex.test(version);
}

// Function to prompt for version
function promptForVersion() {
  return new Promise((resolve) => {
    // Read current core version
    let currentCoreVersion = 'unknown';
    try {
      const corePackageJson = JSON.parse(fs.readFileSync(corePackageJsonPath, 'utf8'));
      currentCoreVersion = corePackageJson.version;
    } catch (error) {
      console.warn('⚠️  Could not read current core version');
    }

    console.log(`\n📦 Preparing to publish @kstory/exporter`);
    console.log(`📖 Current @kstory/core version: ${currentCoreVersion}`);
    console.log(`📋 Current @kstory/exporter version: ${packageJson.version}`);
    
    rl.question('\n🔢 Enter the version for @kstory/core dependency (e.g., 1.0.0, 1.2.3): ', (version) => {
      const trimmedVersion = version.trim();
      
      if (!trimmedVersion) {
        console.log('❌ Version cannot be empty');
        rl.close();
        process.exit(1);
      }
      
      if (!isValidSemVer(trimmedVersion)) {
        console.log('❌ Invalid version format. Use format: X.Y.Z (e.g., 1.0.0)');
        rl.close();
        process.exit(1);
      }
      
      const coreVersion = `^${trimmedVersion}`;
      console.log(`✅ Valid version: ${trimmedVersion}`);
      
      // Replace workspace dependencies with regular versions
      if (packageJson.dependencies['@kstory/core'] === 'workspace:*') {
        packageJson.dependencies['@kstory/core'] = coreVersion;
        console.log(`✅ Replaced workspace dependency @kstory/core with ${coreVersion}`);
      }
      
      // Write back
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log('📦 package.json prepared for production');
      
      rl.close();
      resolve();
    });
  });
}

// Run the interactive process
promptForVersion().catch((error) => {
  console.error('❌ Error during preparation:', error);
  process.exit(1);
});
