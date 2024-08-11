import { type DocumentSymbol, SymbolKind } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from './logger';

const logger = Logger.getInstance();

// Regular expressions - defined once for performance
const ATCALL_PATTERN = /@call:(\w+)/;
const INLINE_CALL_PATTERN = /\{call:(\w+)/;

// Get all sections from document
function getSections(document: TextDocument): Array<{
  name: string;
  line: number;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
}> {
  const sections: Array<{
    name: string;
    line: number;
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
  }> = [];
  const text = document.getText();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('==')) {
      const sectionName = line.trim().substring(2).trim();
      if (sectionName) {
        sections.push({
          name: sectionName,
          line: i,
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: line.length }
          }
        });
      }
    }
  }

  return sections;
}

// Get choices within a section
function getChoicesInSection(
  lines: string[],
  startLine: number,
  endLine: number
): Array<{
  name: string;
  line: number;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
}> {
  const choices: Array<{
    name: string;
    line: number;
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
  }> = [];

  for (let i = startLine + 1; i <= endLine; i++) {
    const line = lines[i];
    if (line.trim().startsWith('+')) {
      const choiceText = line.trim().substring(1).trim();
      if (choiceText) {
        choices.push({
          name: choiceText,
          line: i,
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: line.length }
          }
        });
      }
    }
  }

  return choices;
}

// Get function calls in document
function getFunctionCalls(document: TextDocument): Array<{
  name: string;
  line: number;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
}> {
  const calls: Array<{
    name: string;
    line: number;
    range: { start: { line: number; character: number }; end: { line: number; character: number } };
  }> = [];
  const text = document.getText();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for @call:function()
    const callMatch = line.match(ATCALL_PATTERN);
    if (callMatch) {
      const functionName = callMatch[1];
      const startChar = line.indexOf(functionName);
      calls.push({
        name: functionName,
        line: i,
        range: {
          start: { line: i, character: startChar },
          end: { line: i, character: startChar + functionName.length }
        }
      });
    }

    // Check for {call:function()}
    const inlineCallMatch = line.match(INLINE_CALL_PATTERN);
    if (inlineCallMatch) {
      const functionName = inlineCallMatch[1];
      const startChar = line.indexOf(functionName);
      calls.push({
        name: functionName,
        line: i,
        range: {
          start: { line: i, character: startChar },
          end: { line: i, character: startChar + functionName.length }
        }
      });
    }
  }

  return calls;
}

// Generate document symbols
export function generateDocumentSymbols(document: TextDocument): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  const text = document.getText();
  const lines = text.split('\n');

  logger.debug(`Generating document symbols for: ${document.uri}`);

  // Get all sections
  const sections = getSections(document);
  
  sections.forEach((section, index) => {
    // Find the end of this section (next section or end of file)
    const nextSection = sections[index + 1];
    const endLine = nextSection ? nextSection.line - 1 : lines.length - 1;
    
    // Get choices within this section
    const choices = getChoicesInSection(lines, section.line, endLine);
    
    // Create section symbol with proper ranges
    const sectionSymbol: DocumentSymbol = {
      name: section.name,
      kind: SymbolKind.Namespace,
      range: section.range,
      selectionRange: {
        start: { line: section.line, character: 3 }, // After "== "
        end: { line: section.line, character: Math.min(3 + section.name.length, section.range.end.character) }
      },
      children: choices.map(choice => ({
        name: choice.name,
        kind: SymbolKind.EnumMember,
        range: choice.range,
        selectionRange: {
          start: { line: choice.line, character: 2 }, // After "+ "
          end: { line: choice.line, character: Math.min(2 + choice.name.length, choice.range.end.character) }
        }
      }))
    };

    symbols.push(sectionSymbol);
  });

  // Add function calls as top-level symbols
  const functionCalls = getFunctionCalls(document);
  functionCalls.forEach(call => {
    const callSymbol: DocumentSymbol = {
      name: `@call:${call.name}`,
      kind: SymbolKind.Function,
      range: call.range,
      selectionRange: call.range // Use the same range for selection
    };

    symbols.push(callSymbol);
  });

  logger.info(`Generated ${symbols.length} document symbols`);
  return symbols;
}
