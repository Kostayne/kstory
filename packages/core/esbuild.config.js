const esbuild = require('esbuild');

const coreConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/index.js',
  sourcemap: true,
  external: [],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false,
  keepNames: true,
  logLevel: 'info'
};

// Export configuration for reuse
module.exports = {
  getConfig: () => coreConfig
};

// Build function
async function build() {
  try {
    await esbuild.build(coreConfig);
    console.log('✅ Core package built successfully');
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
