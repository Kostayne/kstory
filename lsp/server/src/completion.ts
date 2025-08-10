import type {
  CompletionItem,
  TextDocumentPositionParams,
} from 'vscode-languageserver/node';
import { CompletionItemKind } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DocumentManager } from './documentManager';
import { Logger } from './logger';
import type { WorkspaceManager } from './workspaceManager';

const logger = Logger.getInstance();

// Regular expressions - defined once for performance
const ATCALL_PATTERN = /@call:\w*\([^)]*$/;
const INLINE_CALL_PATTERN = /\{call:\w*\([^)]*$/;

// Check if we're inside a function call
function isInsideFunctionCall(line: string, charIndex: number): boolean {
  // Check if we're inside @call:function() or {call:function()}
  const beforeCursor = line.substring(0, charIndex);

  // Check for @call:function()
  const atCallMatch = beforeCursor.match(ATCALL_PATTERN);
  if (atCallMatch) {
    return true;
  }

  // Check for {call:function()
  const inlineCallMatch = beforeCursor.match(INLINE_CALL_PATTERN);
  if (inlineCallMatch) {
    return true;
  }

  return false;
}

// Get all sections from document
export function getSections(
  document: TextDocument,
  documentManager?: DocumentManager
): string[] {
  // Try to use parser if available
  if (documentManager) {
    const parsed = documentManager.getParsedDocument(document);
    if (parsed && parsed.program.sections) {
      return parsed.program.sections.map((section: any) => section.name);
    }
  }

  // Fallback to regex-based parsing
  const sections: string[] = [];
  const text = document.getText();
  const lines = text.split('\n');

  lines.forEach((line) => {
    if (line.trim().startsWith('==')) {
      const sectionName = line.trim().substring(2).trim();
      if (sectionName) {
        sections.push(sectionName);
      }
    }
  });

  return sections;
}

// Check if we're inside a replica
export function isInsideReplica(lines: string[], currentLine: number): boolean {
  let isInReplica = false;

  for (let i = 0; i <= currentLine; i++) {
    const line = lines[i];
    if (line.trim().startsWith('" ')) {
      isInReplica = true;
    } else if (isInReplica) {
      // Replica ends before these tokens
      if (
        line.trim().startsWith('->') ||
        line.trim().startsWith('=>') ||
        line.trim().startsWith('@') ||
        line.trim().startsWith('+') ||
        line.trim().startsWith('==')
      ) {
        isInReplica = false;
      }
      // Replica continues after inline calls {call:...} and multiline comments
    }
  }

  return isInReplica;
}

// Generate completion items
export function generateCompletions(
  params: TextDocumentPositionParams,
  document: TextDocument,
  documentManager?: DocumentManager,
  workspaceManager?: WorkspaceManager
): CompletionItem[] {
  const text = document.getText();
  const lines = text.split('\n');
  const currentLine = lines[params.position.line];
  const currentChar = currentLine[params.position.character - 1];

  const completions: CompletionItem[] = [];
  const isInReplica = isInsideReplica(lines, params.position.line);

  logger.debug(
    `Generating completions at line ${params.position.line + 1}, char: ${currentChar}, inReplica: ${isInReplica}`
  );

  // Autocomplete keywords
  if (currentChar === '@') {
    completions.push(
      {
        label: '@call:',
        kind: CompletionItemKind.Function,
        detail: 'Function call',
        documentation: 'Call a function with parameters',
      },
      {
        label: '@tag',
        kind: CompletionItemKind.Variable,
        detail: 'Tag',
        documentation: 'Define a tag',
      },
      {
        label: '@@choice',
        kind: CompletionItemKind.Variable,
        detail: 'Choice tag',
        documentation: 'Define a choice-specific tag',
      }
    );
  }

  // Autocomplete sections for goto
  if (
    currentChar === '-' ||
    currentLine.includes('->') ||
    currentLine.includes('=>')
  ) {
    // Get sections from current document
    const sections = getSections(document, documentManager);
    sections.forEach((section) => {
      completions.push({
        label: section,
        kind: CompletionItemKind.Reference,
        detail: 'Section',
        documentation: `Go to section: ${section}`,
      });
    });

    // If workspace manager is available, add sections from other files
    if (workspaceManager) {
      const allSections = workspaceManager.getAllSections();
      allSections.forEach((fileSections, fileUri) => {
        if (fileUri !== document.uri) {
          fileSections.forEach((section) => {
            completions.push({
              label: section,
              kind: CompletionItemKind.Reference,
              detail: `Section (${fileUri.split('/').pop()})`,
              documentation: `Go to section: ${section} in ${fileUri.split('/').pop()}`,
            });
          });
        }
      });
    }
  }

  // Autocomplete keywords
  if (currentChar === '=') {
    completions.push({
      label: '==',
      kind: CompletionItemKind.Keyword,
      detail: 'Section',
      documentation: 'Define a new section',
    });
  }

  if (currentChar === '+') {
    completions.push({
      label: '+',
      kind: CompletionItemKind.Keyword,
      detail: 'Choice',
      documentation: 'Define a choice option',
    });
  }

  // Replica starts with " and space, doesn't close explicitly, but not inside function calls
  if (
    currentChar === '"' &&
    !isInsideFunctionCall(currentLine, params.position.character)
  ) {
    completions.push({
      label: '" ',
      kind: CompletionItemKind.Text,
      detail: 'Replica',
      documentation: 'Start a character replica (continues until next token)',
    });
  }

  // Inside replica you can use inline calls
  if (currentChar === '{') {
    completions.push({
      label: '{call:',
      kind: CompletionItemKind.Function,
      detail: 'Inline call',
      documentation:
        'Inline function call within replica (replica continues after)',
    });
  }

  // Autocomplete goto inside replica (ends replica)
  if (currentChar === '-' && isInReplica) {
    completions.push(
      {
        label: '->',
        kind: CompletionItemKind.Keyword,
        detail: 'Goto (ends replica)',
        documentation:
          'Go to section (comma-separated for multiple) - ends current replica',
      },
      {
        label: '=>',
        kind: CompletionItemKind.Keyword,
        detail: 'Goto (ends replica)',
        documentation:
          'Go to section (alternative syntax) - ends current replica',
      }
    );
  }

  // Autocomplete tags inside replica (ends replica)
  if (currentChar === '@' && isInReplica) {
    completions.push(
      {
        label: '@tag',
        kind: CompletionItemKind.Variable,
        detail: 'Tag (ends replica)',
        documentation: 'Define a tag - ends current replica',
      },
      {
        label: '@call:',
        kind: CompletionItemKind.Function,
        detail: 'Function call (ends replica)',
        documentation: 'Call a function - ends current replica',
      }
    );
  }

  logger.debug(`Generated ${completions.length} completion items`);
  return completions;
}
