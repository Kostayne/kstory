const esbuild = require('esbuild');
const { execSync } = require('child_process');

const coreConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/index.mjs',
  sourcemap: true,
  external: [],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false,
  keepNames: true,
  logLevel: 'info'
};

const coreConfigCjs = {
  ...coreConfig,
  format: 'cjs',
  outfile: 'dist/index.cjs'
};

// Export configuration for reuse
module.exports = {
  getConfig: () => coreConfig
};

// Build function
async function build() {
  try {
    // Build ESM version
    await esbuild.build(coreConfig);
    console.log('✅ Core package ESM built successfully');
    
    // Build CJS version
    await esbuild.build(coreConfigCjs);
    console.log('✅ Core package CJS built successfully');
    
    // Generate TypeScript declarations
    execSync('npx tsc --emitDeclarationOnly', { stdio: 'inherit' });
    console.log('✅ TypeScript declarations generated successfully');
    
    console.log('✅ Core package built successfully (dual format + types)');
  } catch (error) {
    console.error('❌ Core build failed:', error);
    process.exit(1);
  }
}

// Watch mode function
async function watch() {
  try {
    const context = await esbuild.context(coreConfig);
    await context.watch();
    console.log('👀 Watching core package for changes...');
  } catch (error) {
    console.error('❌ Core watch failed:', error);
    process.exit(1);
  }
}

// Run based on arguments
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watch();
} else {
  build();
}
