const esbuild = require('esbuild');

const serverConfig = {
  entryPoints: ['packages/lsp/server/src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/lsp/server.js',
  sourcemap: true,
  external: [
    'vscode-languageserver',
    'vscode-languageserver-textdocument',
    '@kstory/core'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false, // For debugging
  keepNames: true,
  logLevel: 'info'
};

const clientConfig = {
  entryPoints: ['packages/lsp/client/src/extension.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/lsp/client.js',
  sourcemap: true,
  external: [
    'vscode'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false, // For debugging
  keepNames: true,
  logLevel: 'info'
};

const coreConfig = {
  entryPoints: ['packages/core/src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'packages/core/dist/index.js',
  sourcemap: true,
  external: [],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false,
  keepNames: true,
  logLevel: 'info'
};

const exporterConfig = {
  entryPoints: ['src/exporter/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/exporter/index.js',
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
  minify: false, // For debugging
  keepNames: true,
  logLevel: 'info'
};

// Build function
const fs = require('fs');
const path = require('path');

async function build() {
  try {
    // Build core package first
    await esbuild.build(coreConfig);
    console.log('✅ Core package built successfully');
    
    // Build server
    await esbuild.build(serverConfig);
    console.log('✅ LSP server built successfully');
    
    // Build client
    await esbuild.build(clientConfig);
    console.log('✅ LSP client built successfully');
    
    // Build exporter
    await esbuild.build(exporterConfig);
    console.log('✅ Exporter built successfully');
    
    // Copy files to packages/lsp/dist/lsp for VS Code extension
    const lspDistDir = path.join(__dirname, 'packages', 'lsp', 'dist', 'lsp');
    if (!fs.existsSync(lspDistDir)) {
      fs.mkdirSync(lspDistDir, { recursive: true });
    }
    
    fs.copyFileSync(
      path.join(__dirname, 'dist', 'lsp', 'server.js'),
      path.join(lspDistDir, 'server.js')
    );
    fs.copyFileSync(
      path.join(__dirname, 'dist', 'lsp', 'client.js'),
      path.join(lspDistDir, 'client.js')
    );
    
    console.log('✅ Files copied to packages/lsp/dist/lsp/');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Watch mode function
async function watch() {
  try {
    // Create contexts for all packages
    const coreContext = await esbuild.context(coreConfig);
    const serverContext = await esbuild.context(serverConfig);
    const clientContext = await esbuild.context(clientConfig);
    const exporterContext = await esbuild.context(exporterConfig);
    
    // Start watch mode for all
    await Promise.all([
      coreContext.watch(),
      serverContext.watch(),
      clientContext.watch(),
      exporterContext.watch()
    ]);
    
    console.log('👀 Watching for changes...');
  } catch (error) {
    console.error('❌ Watch failed:', error);
    process.exit(1);
  }
}

// Run based on arguments
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watch();
} else if (args.includes('--all')) {
  build();
} else if (args.includes('--client')) {
  esbuild.build(clientConfig).then(() => {
    console.log('✅ LSP client built successfully');
  }).catch((error) => {
    console.error('❌ Client build failed:', error);
    process.exit(1);
  });
} else if (args.includes('--server')) {
  esbuild.build(serverConfig).then(() => {
    console.log('✅ LSP server built successfully');
  }).catch((error) => {
    console.error('❌ Server build failed:', error);
    process.exit(1);
  });
} else if (args.includes('--core')) {
  esbuild.build(coreConfig).then(() => {
    console.log('✅ Core package built successfully');
  }).catch((error) => {
    console.error('❌ Core build failed:', error);
    process.exit(1);
  });
} else if (args.includes('--exporter')) {
  esbuild.build(exporterConfig).then(() => {
    console.log('✅ Exporter built successfully');
  }).catch((error) => {
    console.error('❌ Exporter build failed:', error);
    process.exit(1);
  });
} else {
  build();
}
