import {
  createConnection,
  type InitializeResult,
  TextDocumentSyncKind,
  TextDocuments,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

console.log('KStory LSP Server: Starting server...');

const connection = createConnection();

const documents = new TextDocuments(TextDocument);

connection.onInitialize((params) => {
  console.log('KStory LSP Server: Initializing...');
  
  const capabilities = params.capabilities;

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        resolveProvider: false,
      },
    },
  };

  console.log('KStory LSP Server: Initialization complete');
  return result;
});

connection.onInitialized(() => {
  console.log('KStory LSP Server: Server initialized successfully');
});

// Обработка открытия документов
documents.onDidOpen((event) => {
  console.log('KStory LSP Server: Document opened:', event.document.uri);
});

// Обработка закрытия документов
documents.onDidClose((event) => {
  console.log('KStory LSP Server: Document closed:', event.document.uri);
});

documents.listen(connection);

connection.listen();

console.log('KStory LSP Server: Server is now listening');
