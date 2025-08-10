import {
  createConnection,
  type InitializeResult,
  TextDocumentSyncKind,
  TextDocuments,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { generateCompletions } from './completion';
import { validateDocument } from './diagnostics';
import { generateHover } from './hover';
import { Logger, LogLevel } from './logger';

const logger = Logger.getInstance();

// Set log level based on environment
if (process.env.VSCODE_DEBUG_MODE === 'true') {
  logger.setLogLevel(LogLevel.DEBUG);
}

logger.info('Starting server...');

const connection = createConnection();

const documents = new TextDocuments(TextDocument);

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
    },
  };

  logger.info('Initialization complete');
  return result;
});

connection.onInitialized(() => {
  logger.info('Server initialized successfully');
});

// Autocompletion
connection.onCompletion((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    logger.warn(`Document not found: ${params.textDocument.uri}`);
    return [];
  }

  return generateCompletions(params, document);
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

// Handle document opening
documents.onDidOpen((event) => {
  logger.info(`Document opened: ${event.document.uri}`);
  const diagnostics = validateDocument(event.document);
  connection.sendDiagnostics({
    uri: event.document.uri,
    diagnostics,
  });
});

// Handle document changes
documents.onDidChangeContent((event) => {
  logger.debug(`Document changed: ${event.document.uri}`);
  const diagnostics = validateDocument(event.document);
  connection.sendDiagnostics({
    uri: event.document.uri,
    diagnostics,
  });
});

// Handle document closing
documents.onDidClose((event) => {
  logger.info(`Document closed: ${event.document.uri}`);
  // Clear diagnostics when closing
  connection.sendDiagnostics({
    uri: event.document.uri,
    diagnostics: [],
  });
});

documents.listen(connection);

connection.listen();

logger.info('Server is now listening');
