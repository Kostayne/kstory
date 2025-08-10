import type {
    Definition,
    Location,
    ReferenceParams,
    TextDocumentPositionParams,
} from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from './logger';

const logger = Logger.getInstance();

// Regular expressions - defined once for performance
const GOTO_PATTERN = /(?:->|=>)\s*([^,\s]+)/;
const GOTO_MATCH_ALL_PATTERN = /(?:->|=>)\s*([^,\s]+)/g;

// Find section definition in document
function findSectionDefinition(
  document: TextDocument,
  sectionName: string
): Location | null {
  const text = document.getText();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('==')) {
      const name = line.trim().substring(2).trim();
      if (name === sectionName) {
        return {
          uri: document.uri,
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: line.length },
          },
        };
      }
    }
  }

  return null;
}

// Find all references to a section in document
function findSectionReferences(
  document: TextDocument,
  sectionName: string
): Location[] {
  const references: Location[] = [];
  const text = document.getText();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for goto references (-> and =>)
    if (line.includes('->') || line.includes('=>')) {
      const gotoMatches = line.matchAll(GOTO_MATCH_ALL_PATTERN);
      for (const match of gotoMatches) {
        const targetSection = match[1];
        if (targetSection === sectionName) {
          const startChar = line.indexOf(targetSection);
          references.push({
            uri: document.uri,
            range: {
              start: { line: i, character: startChar },
              end: { line: i, character: startChar + targetSection.length },
            },
          });
        }
      }
    }
  }

  return references;
}

// Get section name at cursor position
function getSectionNameAtPosition(
  document: TextDocument,
  position: { line: number; character: number }
): string | null {
  const text = document.getText();
  const lines = text.split('\n');
  const currentLine = lines[position.line];

  // Check if we're on a section line
  if (currentLine.trim().startsWith('==')) {
    const sectionName = currentLine.trim().substring(2).trim();
    if (sectionName) {
      return sectionName;
    }
  }

  // Check if we're on a goto line
  if (currentLine.includes('->') || currentLine.includes('=>')) {
    const gotoMatch = currentLine.match(GOTO_PATTERN);
    if (gotoMatch) {
      const targetSection = gotoMatch[1];
      return targetSection;
    }
  }

  // Check if cursor is on a section name in goto
  const lineBeforeCursor = currentLine.substring(0, position.character);
  const gotoMatch = lineBeforeCursor.match(GOTO_PATTERN);
  if (gotoMatch) {
    return gotoMatch[1];
  }

  return null;
}

// Generate definition location
export function generateDefinition(
  params: TextDocumentPositionParams,
  document: TextDocument
): Definition | null {
  const sectionName = getSectionNameAtPosition(document, params.position);

  if (!sectionName) {
    logger.debug(
      `No section name found at position ${params.position.line + 1}:${params.position.character}`
    );
    return null;
  }

  logger.debug(`Looking for definition of section: ${sectionName}`);

  const definition = findSectionDefinition(document, sectionName);

  if (definition) {
    logger.info(
      `Found definition for section "${sectionName}" at line ${definition.range.start.line + 1}`
    );
    return definition;
  } else {
    logger.warn(`Definition not found for section: ${sectionName}`);
    return null;
  }
}

// Generate references
export function generateReferences(
  params: ReferenceParams,
  document: TextDocument
): Location[] {
  const sectionName = getSectionNameAtPosition(document, params.position);

  if (!sectionName) {
    logger.debug(
      `No section name found at position ${params.position.line + 1}:${params.position.character}`
    );
    return [];
  }

  logger.debug(`Looking for references to section: ${sectionName}`);

  const references: Location[] = [];

  // Add definition if it exists
  const definition = findSectionDefinition(document, sectionName);
  if (definition) {
    references.push(definition);
    logger.debug(
      `Added definition reference at line ${definition.range.start.line + 1}`
    );
  }

  // Add all goto references
  const gotoReferences = findSectionReferences(document, sectionName);
  references.push(...gotoReferences);

  logger.info(
    `Found ${references.length} references for section "${sectionName}"`
  );

  return references;
}
