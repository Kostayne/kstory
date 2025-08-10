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
  minify: false, // Для отладки
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
    'vscode',
    'vscode-languageclient'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: false, // Для отладки
  keepNames: true,
  logLevel: 'info'
};

// Функция для сборки
async function build() {
  try {
    // Сборка сервера
    await esbuild.build(serverConfig);
    console.log('✅ LSP server built successfully');
    
    // Сборка клиента
    await esbuild.build(clientConfig);
    console.log('✅ LSP client built successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Функция для watch режима
async function watch() {
  try {
    // Создаем контексты для сервера и клиента
    const serverContext = await esbuild.context(serverConfig);
    const clientContext = await esbuild.context(clientConfig);
    
    // Запускаем watch режим для обоих
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

// Запуск в зависимости от аргументов
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
