import {
    type Diagnostic,
    DiagnosticSeverity,
} from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from './logger';

const logger = Logger.getInstance();

// Function to create diagnostics
export function createDiagnostic(
  message: string,
  severity: DiagnosticSeverity,
  line: number,
  startChar: number,
  endChar: number
): Diagnostic {
  return {
    severity,
    range: {
      start: { line, character: startChar },
      end: { line, character: endChar },
    },
    message,
    source: 'kstory',
  };
}

// Simple syntax validation
export function validateDocument(document: TextDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const text = document.getText();
  const lines = text.split('\n');

  let isInReplica = false;
  let isInMultiComment = false;

  logger.debug(`Validating document: ${document.uri}`);

  lines.forEach((line, lineIndex) => {
    // Check multiline comments
    if (line.includes('/*')) {
      isInMultiComment = true;
    }
    if (line.includes('*/')) {
      isInMultiComment = false;
    }

    // Skip checks if in multiline comment
    if (isInMultiComment) {
      return;
    }

    // Check sections
    if (line.trim().startsWith('==')) {
      isInReplica = false; // Section ends replica
      const sectionName = line.trim().substring(2).trim();
      if (!sectionName) {
        const diagnostic = createDiagnostic(
          'Section name cannot be empty',
          DiagnosticSeverity.Error,
          lineIndex,
          0,
          line.length
        );
        diagnostics.push(diagnostic);
        logger.warn(`Empty section name at line ${lineIndex + 1}`);
      }
    }

    // Check replica start
    if (line.trim().startsWith('" ')) {
      isInReplica = true;
    }

    // Check replica end
    if (isInReplica) {
      if (line.trim().startsWith('->') || line.trim().startsWith('=>')) {
        isInReplica = false; // Goto ends replica
      } else if (line.trim().startsWith('@')) {
        isInReplica = false; // Tags end replica
      } else if (line.trim().startsWith('+')) {
        isInReplica = false; // Choices end replica
      } else if (line.trim().startsWith('==')) {
        isInReplica = false; // Sections end replica
      }
      // Replica continues after inline calls {call:...} and multiline comments
    }

    // Check goto
    if (line.includes('->') || line.includes('=>')) {
      const gotoMatch = line.match(/(?:->|=>)\s*([^,\s]+)/);
      if (gotoMatch) {
        const targetSection = gotoMatch[1];
        // Simple check - section should start with letter
        if (!/^[a-zA-Z]/.test(targetSection)) {
          const diagnostic = createDiagnostic(
            `Invalid section name: ${targetSection}`,
            DiagnosticSeverity.Warning,
            lineIndex,
            line.indexOf(targetSection),
            line.indexOf(targetSection) + targetSection.length
          );
          diagnostics.push(diagnostic);
          logger.warn(
            `Invalid section name "${targetSection}" at line ${lineIndex + 1}`
          );
        }
      }
    }

    // Check replicas - they start with " and space
    if (line.trim().startsWith('" ')) {
      // Replica is correct - starts properly
      // Don't check closing as replicas don't close explicitly
    } else if (
      line.includes('"') &&
      !line.trim().startsWith('" ') &&
      !isInReplica
    ) {
      // Quote exists but not at replica start and not inside replica - possible error
      const quoteIndex = line.indexOf('"');
      if (quoteIndex > 0 && line[quoteIndex - 1] !== ' ') {
        const diagnostic = createDiagnostic(
          'Replica should start with " and space',
          DiagnosticSeverity.Warning,
          lineIndex,
          quoteIndex,
          quoteIndex + 1
        );
        diagnostics.push(diagnostic);
        logger.warn(`Incorrect replica start at line ${lineIndex + 1}`);
      }
    }
  });

  logger.info(`Found ${diagnostics.length} diagnostics in document`);
  return diagnostics;
}
