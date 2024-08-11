const esbuild = require('esbuild');

const exporterConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/index.js',
  sourcemap: true,
  external: [
    '@kstory/core',
    'commander',
    'chalk',
    'ora',
    'glob'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false,
  keepNames: true,
  logLevel: 'info'
};

// Build function
async function build() {
  try {
    await esbuild.build(exporterConfig);
    console.log('✅ Exporter built successfully');
  } catch (error) {
    console.error('❌ Exporter build failed:', error);
    process.exit(1);
  }
}

// Watch mode function
async function watch() {
  try {
    const context = await esbuild.context(exporterConfig);
    await context.watch();
    console.log('👀 Watching exporter for changes...');
  } catch (error) {
    console.error('❌ Exporter watch failed:', error);
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
