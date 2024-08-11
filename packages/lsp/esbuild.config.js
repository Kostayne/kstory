const esbuild = require('esbuild');

const serverConfig = {
  entryPoints: ['server/src/server.ts'],
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
  minify: false,
  keepNames: true,
  logLevel: 'info'
};

const clientConfig = {
  entryPoints: ['client/src/extension.ts'],
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
  minify: false,
  keepNames: true,
  logLevel: 'info'
};

// Build function
async function build() {
  try {
    // Build server
    await esbuild.build(serverConfig);
    console.log('✅ LSP server built successfully');
    
    // Build client
    await esbuild.build(clientConfig);
    console.log('✅ LSP client built successfully');
    
    // Copy files to dist/lsp for VS Code extension
    const fs = require('fs');
    const path = require('path');
    
    const lspDistDir = path.join(__dirname, 'dist', 'lsp');
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
    
    console.log('✅ Files copied to dist/lsp/');
  } catch (error) {
    console.error('❌ LSP build failed:', error);
    process.exit(1);
  }
}

// Watch mode function
async function watch() {
  try {
    const serverContext = await esbuild.context(serverConfig);
    const clientContext = await esbuild.context(clientConfig);
    
    await Promise.all([
      serverContext.watch(),
      clientContext.watch()
    ]);
    
    console.log('👀 Watching LSP for changes...');
  } catch (error) {
    console.error('❌ LSP watch failed:', error);
    process.exit(1);
  }
}

// Run based on arguments
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watch();
} else if (args.includes('--server')) {
  esbuild.build(serverConfig).then(() => {
    console.log('✅ LSP server built successfully');
  }).catch((error) => {
    console.error('❌ Server build failed:', error);
    process.exit(1);
  });
} else if (args.includes('--client')) {
  esbuild.build(clientConfig).then(() => {
    console.log('✅ LSP client built successfully');
  }).catch((error) => {
    console.error('❌ Client build failed:', error);
    process.exit(1);
  });
} else {
  build();
}
