const esbuild = require('esbuild');

const serverConfig = {
  entryPoints: ['lsp/server/src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/lsp/server.js',
  sourcemap: true,
  external: [
    'vscode-languageserver',
    'vscode-languageserver-textdocument'
  ],
  alias: {
    '@': './src'
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false, // For debugging
  keepNames: true,
  logLevel: 'info'
};

const clientConfig = {
  entryPoints: ['lsp/client/src/extension.ts'],
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

// Build function
const fs = require('fs');
const path = require('path');

async function build() {
  try {
    // Build server
    await esbuild.build(serverConfig);
    console.log('✅ LSP server built successfully');
    
    // Build client
    await esbuild.build(clientConfig);
    console.log('✅ LSP client built successfully');
    
    // Copy files to lsp/dist/lsp for VS Code extension
    const lspDistDir = path.join(__dirname, 'lsp', 'dist', 'lsp');
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
    
    console.log('✅ Files copied to lsp/dist/lsp/');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Watch mode function
async function watch() {
  try {
    // Create contexts for server and client
    const serverContext = await esbuild.context(serverConfig);
    const clientContext = await esbuild.context(clientConfig);
    
    // Start watch mode for both
    await Promise.all([
      serverContext.watch(),
      clientContext.watch()
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
} else {
  build();
}
