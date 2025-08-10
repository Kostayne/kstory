import {
  createConnection,
  type InitializeResult,
  TextDocumentSyncKind,
  TextDocuments
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { generateCodeActions } from './actions';
import { generateCompletions } from './completion';
import { validateDocument } from './diagnostics';
import { DocumentManager } from './documentManager';
import { generateHover } from './hover';
import { Logger, LogLevel } from './logger';
import {
  generateDefinition,
  generateReferences,
  generateRename,
} from './navigation';
import { generateDocumentSymbols } from './symbols';
import { WorkspaceManager } from './workspaceManager';

export function initializeServer() {
  const logger = Logger.getInstance();

  // Set log level based on environment
  if (process.env.VSCODE_DEBUG_MODE === 'true') {
    logger.setLogLevel(LogLevel.DEBUG);
  }

  logger.info('Starting server...');

  const connection = createConnection();
  const documents = new TextDocuments(TextDocument);
  const documentManager = new DocumentManager();
  const workspaceManager = new WorkspaceManager(documentManager);

  connection.onInitialize((params) => {
    logger.info('Initializing...');

    const capabilities = params.capabilities;

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full,
        completionProvider: {
          resolveProvider: false,
          triggerCharacters: ['@', '+', '=', '-', '"', '{'],
        },
        hoverProvider: true,
        definitionProvider: true,
        referencesProvider: true,
        documentSymbolProvider: true,
        codeActionProvider: {
          codeActionKinds: ['quickfix', 'refactor'],
        },
        renameProvider: true,
        workspace: {
          workspaceFolders: {
            supported: true,
            changeNotifications: true,
          },
        },

      },
    };

    logger.info('Initialization complete');
    return result;
  });

  connection.onInitialized(() => {
    logger.info('Server initialized successfully');
    
    // Register workspace folder change notifications
    connection.workspace.onDidChangeWorkspaceFolders((event) => {
      logger.info('Workspace folders changed');
      event.added.forEach((folder) => {
        logger.info(`Added workspace folder: ${folder.uri}`);
      });
      event.removed.forEach((folder) => {
        logger.info(`Removed workspace folder: ${folder.uri}`);
      });
    });
  });

  // Autocompletion
  connection.onCompletion((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      logger.warn(`Document not found: ${params.textDocument.uri}`);
      return [];
    }

    return generateCompletions(params, document, documentManager, workspaceManager);
  });

  // Hover
  connection.onHover((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      logger.warn(`Document not found for hover: ${params.textDocument.uri}`);
      return null;
    }

    return generateHover(params, document);
  });

  // Go to Definition
  connection.onDefinition((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      logger.warn(
        `Document not found for definition: ${params.textDocument.uri}`
      );
      return null;
    }

    return generateDefinition(params, document, workspaceManager);
  });

  // Find References
  connection.onReferences((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      logger.warn(
        `Document not found for references: ${params.textDocument.uri}`
      );
      return [];
    }

    return generateReferences(params, document, workspaceManager);
  });

  // Document Symbols
  connection.onDocumentSymbol((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      logger.warn(`Document not found for symbols: ${params.textDocument.uri}`);
      return [];
    }

    return generateDocumentSymbols(document);
  });

  // Code Actions
  connection.onCodeAction((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      logger.warn(
        `Document not found for code actions: ${params.textDocument.uri}`
      );
      return [];
    }

    return generateCodeActions(document, params.range, params.context);
  });

  // Rename
  connection.onRenameRequest((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      logger.warn(`Document not found for rename: ${params.textDocument.uri}`);
      return null;
    }

    return generateRename(params, document);
  });

  // Handle document opening
  documents.onDidOpen((event) => {
    logger.info(`Document opened: ${event.document.uri}`);
    
    // Add document to workspace
    workspaceManager.addFile(event.document);
    
    const diagnostics = validateDocument(event.document, documentManager);
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics,
    });
  });

  // Handle document changes
  documents.onDidChangeContent((event) => {
    logger.debug(`Document changed: ${event.document.uri}`);
    
    // Update document in workspace
    workspaceManager.addFile(event.document);
    
    const diagnostics = validateDocument(event.document, documentManager);
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics,
    });
  });

  // Handle document closing
  documents.onDidClose((event) => {
    logger.info(`Document closed: ${event.document.uri}`);
    
    // Remove document from workspace
    workspaceManager.removeFile(event.document.uri);
    
    // Clear diagnostics and cache when closing
    documentManager.clearCache(event.document.uri);
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics: [],
    });
  });



  // Start listening
  documents.listen(connection);
  connection.listen();
  logger.info('Server is now listening');
}
