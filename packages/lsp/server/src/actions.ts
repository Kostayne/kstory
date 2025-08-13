import {
  type CodeAction,
  type CodeActionContext,
  CodeActionKind,
} from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from './logger';

const logger = Logger.getInstance();

// Regular expressions - defined once for performance
const GOTO_MATCH_ALL_PATTERN = /(?:->|=>)\s*([^,\s]+)/g;

// Check if section exists in document
function sectionExists(document: TextDocument, sectionName: string): boolean {
  const text = document.getText();
  const lines = text.split('\n');

  return lines.some((line) => {
    if (line.trim().startsWith('==')) {
      const name = line.trim().substring(2).trim();
      return name === sectionName;
    }
    return false;
  });
}

// Find missing sections in goto statements
function findMissingSections(document: TextDocument): Array<{
  sectionName: string;
  line: number;
  character: number;
}> {
  const missingSections: Array<{
    sectionName: string;
    line: number;
    character: number;
  }> = [];
  const text = document.getText();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for goto statements
    if (line.includes('->') || line.includes('=>')) {
      const gotoMatches = line.matchAll(GOTO_MATCH_ALL_PATTERN);
      for (const match of gotoMatches) {
        const targetSection = match[1];
        if (!sectionExists(document, targetSection)) {
          const startChar = line.indexOf(targetSection);
          missingSections.push({
            sectionName: targetSection,
            line: i,
            character: startChar,
          });
        }
      }
    }
  }

  return missingSections;
}

// Generate code actions
export function generateCodeActions(
  document: TextDocument,
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  },
  context: CodeActionContext
): CodeAction[] {
  const actions: CodeAction[] = [];
  const text = document.getText();
  const lines = text.split('\n');

  logger.debug(
    `Generating code actions for range: ${range.start.line}:${range.start.character} - ${range.end.line}:${range.end.character}`
  );

  // Check for missing sections in the current line
  const currentLine = lines[range.start.line];
  if (currentLine.includes('->') || currentLine.includes('=>')) {
    const gotoMatches = currentLine.matchAll(GOTO_MATCH_ALL_PATTERN);
    for (const match of gotoMatches) {
      const targetSection = match[1];
      if (!sectionExists(document, targetSection)) {
        // Action to create missing section
        const createSectionAction: CodeAction = {
          title: `Create section "${targetSection}"`,
          kind: CodeActionKind.QuickFix,
          diagnostics: context.diagnostics,
          edit: {
            changes: {
              [document.uri]: [
                {
                  range: {
                    start: { line: text.split('\n').length, character: 0 },
                    end: { line: text.split('\n').length, character: 0 },
                  },
                  newText: `\n== ${targetSection}\n" Content for ${targetSection}\n-> Section_One\n`,
                },
              ],
            },
          },
        };

        actions.push(createSectionAction);
        logger.debug(`Added action to create section: ${targetSection}`);
      }
    }
  }

  // Check for empty section names
  if (currentLine.trim().startsWith('==')) {
    const sectionName = currentLine.trim().substring(2).trim();
    if (!sectionName) {
      // Action to add section name
      const addSectionNameAction: CodeAction = {
        title: 'Add section name',
        kind: CodeActionKind.QuickFix,
        diagnostics: context.diagnostics,
        edit: {
          changes: {
            [document.uri]: [
              {
                range: {
                  start: {
                    line: range.start.line,
                    character: currentLine.length,
                  },
                  end: {
                    line: range.start.line,
                    character: currentLine.length,
                  },
                },
                newText: ' NewSection',
              },
            ],
          },
        },
      };

      actions.push(addSectionNameAction);
      logger.debug('Added action to add section name');
    }
  }

  // Check for incorrect replica syntax
  if (currentLine.includes('"') && !currentLine.trim().startsWith('" ')) {
    const quoteIndex = currentLine.indexOf('"');
    if (quoteIndex > 0 && currentLine[quoteIndex - 1] !== ' ') {
      // Action to fix replica syntax
      const fixReplicaAction: CodeAction = {
        title: 'Fix replica syntax (add space after quote)',
        kind: CodeActionKind.QuickFix,
        diagnostics: context.diagnostics,
        edit: {
          changes: {
            [document.uri]: [
              {
                range: {
                  start: { line: range.start.line, character: quoteIndex + 1 },
                  end: { line: range.start.line, character: quoteIndex + 1 },
                },
                newText: ' ',
              },
            ],
          },
        },
      };

      actions.push(fixReplicaAction);
      logger.debug('Added action to fix replica syntax');
    }
  }

  // Add action to create all missing sections
  const missingSections = findMissingSections(document);
  if (missingSections.length > 0) {
    const createAllSectionsAction: CodeAction = {
      title: `Create ${missingSections.length} missing section(s)`,
      kind: CodeActionKind.QuickFix,
      diagnostics: context.diagnostics,
      edit: {
        changes: {
          [document.uri]: [
            {
              range: {
                start: { line: text.split('\n').length, character: 0 },
                end: { line: text.split('\n').length, character: 0 },
              },
              newText:
                '\n' +
                missingSections
                  .map(
                    (section) =>
                      `== ${section.sectionName}\n" Content for ${section.sectionName}\n-> Section_One\n`
                  )
                  .join('\n'),
            },
          ],
        },
      },
    };

    actions.push(createAllSectionsAction);
    logger.debug(
      `Added action to create ${missingSections.length} missing sections`
    );
  }

  logger.info(`Generated ${actions.length} code actions`);
  return actions;
}
