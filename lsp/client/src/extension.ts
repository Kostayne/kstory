import * as path from 'path';
import type { ExtensionContext } from 'vscode';

import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  console.log('KStory LSP Client: Activating extension...');
  
  const serverModule = context.asAbsolutePath(
    path.join('..', 'dist', 'lsp', 'server.js')
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'kstory', pattern: '**/*.ks' },
    ],
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'kstoryLanguageClient',
    'KStory Language Client',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start().then(() => {
    console.log('KStory LSP Client: Language client started successfully');
  }).catch((error) => {
    console.error('KStory LSP Client: Failed to start language client:', error);
  });
}

export function deactivate(): Thenable<void> | undefined {
  console.log('KStory LSP Client: Deactivating extension...');
  
  if (!client) {
    return undefined;
  }
  
  return client.stop().then(() => {
    console.log('KStory LSP Client: Language client stopped successfully');
  }).catch((error) => {
    console.error('KStory LSP Client: Error stopping language client:', error);
  });
}
