import { resolve as resolvePath } from 'node:path';
import { type ExtensionContext, window, workspace } from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: ExtensionContext) {
  const output = window.createOutputChannel('KStory LSP');
  const nodePath = process.env.NODE_PATH ?? process.execPath;
  const serverCommand = nodePath;
  let root = workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    const activePath = window.activeTextEditor?.document?.uri?.fsPath;
    if (activePath) {
      root = resolvePath(activePath, '..');
    } else {
      output.appendLine('[client] no workspace and no active editor; deferring startup until a KStory document opens');
      const once = workspace.onDidOpenTextDocument((doc) => {
        if (doc.languageId === 'kstory') {
          const inferredRoot = resolvePath(doc.uri.fsPath, '..');
          output.appendLine(`[client] starting on first KStory doc; root=${inferredRoot}`);
          startClient(inferredRoot);
          once.dispose();
        }
      });
      context.subscriptions.push(once);
      return;
    }
  }
  output.appendLine(`[client] activate; nodePath=${nodePath}; root=${root}`);
  startClient(root);
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}

function startClient(root: string) {
  if (client) return;

  const nodePath = process.env.NODE_PATH ?? process.execPath;
  const serverCommand = nodePath;
  const serverModule = resolvePath(__dirname, '../../../dist/lsp/server.js');
  const serverArgs = [serverModule, '--stdio'];

  const serverOptions: ServerOptions = {
    command: serverCommand,
    args: serverArgs,
    options: { cwd: root },
    transport: TransportKind.stdio,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'kstory' },
      { scheme: 'untitled', language: 'kstory' },
    ],
    diagnosticCollectionName: 'kstory',
    outputChannel: window.createOutputChannel('KStory LSP (Server)'),
    traceOutputChannel: window.createOutputChannel('KStory LSP (Trace)'),
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.ks'),
    },
  };

  client = new LanguageClient(
    'kstoryLsp',
    'KStory Language Server',
    serverOptions,
    clientOptions
  );
  client.onDidChangeState((e) => {
    const label = e.newState === 1 ? 'Starting' : e.newState === 2 ? 'Running' : 'Stopped';
    window.setStatusBarMessage(`KStory LSP: ${label}`, 2000);
  });
  (client as any)._outputChannel?.appendLine?.(`[client] starting server: ${serverCommand} ${serverArgs.join(' ')} (cwd=${root})`);
  client.start();
}
 
