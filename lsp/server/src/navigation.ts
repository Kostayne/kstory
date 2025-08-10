import type {
  Definition,
  Location,
  ReferenceParams,
  RenameParams,
  TextDocumentPositionParams,
  WorkspaceEdit,
} from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from './logger';
import type { WorkspaceManager } from './workspaceManager';

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
  document: TextDocument,
  workspaceManager?: WorkspaceManager
): Definition | null {
  const sectionName = getSectionNameAtPosition(document, params.position);

  if (!sectionName) {
    logger.debug(
      `No section name found at position ${params.position.line + 1}:${params.position.character}`
    );
    return null;
  }

  logger.debug(`Looking for definition of section: ${sectionName}`);

  // First try to find in current document
  let definition = findSectionDefinition(document, sectionName);

  // If not found in current document and workspace manager is available, search across workspace
  if (!definition && workspaceManager) {
    const workspaceDefinition = workspaceManager.findSectionDefinition(sectionName);
    if (workspaceDefinition) {
      definition = {
        uri: workspaceDefinition.uri,
        range: {
          start: { line: workspaceDefinition.line, character: 0 },
          end: { line: workspaceDefinition.line, character: 100 }, // Approximate end
        },
      };
      logger.info(
        `Found definition for section "${sectionName}" in workspace at ${workspaceDefinition.uri}:${workspaceDefinition.line + 1}`
      );
    }
  }

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
  document: TextDocument,
  workspaceManager?: WorkspaceManager
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

  // Add all goto references from current document
  const gotoReferences = findSectionReferences(document, sectionName);
  references.push(...gotoReferences);

  // If workspace manager is available, search for references across workspace
  if (workspaceManager) {
    const workspaceReferences = workspaceManager.findSectionReferences(sectionName);
    workspaceReferences.forEach((ref) => {
      references.push({
        uri: ref.uri,
        range: {
          start: { line: ref.line, character: ref.character },
          end: { line: ref.line, character: ref.character + sectionName.length },
        },
      });
    });
  }

  logger.info(
    `Found ${references.length} references for section "${sectionName}"`
  );

  return references;
}

// Generate rename workspace edit
export function generateRename(
  params: RenameParams,
  document: TextDocument
): WorkspaceEdit | null {
  const text = document.getText();
  const lines = text.split('\n');
  const changes: { [uri: string]: any[] } = {};
  const edits: any[] = [];

  // First, try to get section name from position
  let sectionName = getSectionNameAtPosition(document, params.position);
  
  // If not found, try to find section name from the current line
  if (!sectionName) {
    const currentLine = lines[params.position.line];
    
    // Check if we're on a section line
    if (currentLine.trim().startsWith('==')) {
      sectionName = currentLine.trim().substring(2).trim();
    }
    // Check if we're on a goto line
    else if (currentLine.includes('->') || currentLine.includes('=>')) {
      const gotoMatch = currentLine.match(GOTO_PATTERN);
      if (gotoMatch) {
        sectionName = gotoMatch[1];
      }
    }
  }

  if (!sectionName) {
    logger.debug(
      `No section name found at position ${params.position.line + 1}:${params.position.character}`
    );
    return null;
  }

  logger.debug(`Renaming section: ${sectionName} -> ${params.newName}`);

  // Find ALL occurrences of the section name in the document
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for section definition (== SectionName)
    if (line.trim().startsWith('==')) {
      const name = line.trim().substring(2).trim();
      if (name === sectionName) {
        const startChar = line.indexOf(sectionName);
        edits.push({
          range: {
            start: { line: i, character: startChar },
            end: { line: i, character: startChar + sectionName.length },
          },
          newText: params.newName,
        });
        logger.debug(`Found section definition at line ${i + 1}`);
      }
    }

    // Check for goto references (-> SectionName or => SectionName)
    if (line.includes('->') || line.includes('=>')) {
      const gotoMatches = line.matchAll(GOTO_MATCH_ALL_PATTERN);
      for (const match of gotoMatches) {
        const targetSection = match[1];
        if (targetSection === sectionName) {
          const startChar = line.indexOf(targetSection);
          edits.push({
            range: {
              start: { line: i, character: startChar },
              end: { line: i, character: startChar + targetSection.length },
            },
            newText: params.newName,
          });
          logger.debug(`Found goto reference at line ${i + 1}`);
        }
      }
    }
  }

  if (edits.length === 0) {
    logger.warn(`No occurrences found for section: ${sectionName}`);
    return null;
  }

  changes[document.uri] = edits;

  logger.info(
    `Renamed section "${sectionName}" to "${params.newName}" in ${edits.length} locations`
  );

  return {
    changes,
  };
}
