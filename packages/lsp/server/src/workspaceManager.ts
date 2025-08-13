import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DocumentManager } from './documentManager';
import { Logger } from './logger';

const logger = Logger.getInstance();

// Regular expressions - defined at top level for performance
const CALL_PATTERN = /@call:(\w+)/;
const INLINE_CALL_PATTERN = /\{call:(\w+)/;

interface WorkspaceFile {
  uri: string;
  document: TextDocument;
  sections: string[];
  lastModified: number;
}

export class WorkspaceManager {
  private files = new Map<string, WorkspaceFile>();
  private documentManager: DocumentManager;

  public constructor(documentManager: DocumentManager) {
    this.documentManager = documentManager;
    logger.info('WorkspaceManager initialized');
  }

  // Add or update a file in workspace
  public addFile(document: TextDocument): void {
    const uri = document.uri;
    const sections = this.extractSections(document);

    this.files.set(uri, {
      uri,
      document,
      sections,
      lastModified: Date.now(),
    });

    logger.debug(
      `Added file to workspace: ${uri} with ${sections.length} sections`
    );
  }

  // Remove a file from workspace
  public removeFile(uri: string): void {
    this.files.delete(uri);
    logger.debug(`Removed file from workspace: ${uri}`);
  }

  // Get all sections across all files
  public getAllSections(): Map<string, string[]> {
    const allSections = new Map<string, string[]>();

    for (const [uri, file] of this.files) {
      allSections.set(uri, file.sections);
    }

    return allSections;
  }

  // Find section definition across all files
  public findSectionDefinition(
    sectionName: string
  ): { uri: string; line: number } | null {
    for (const [uri, file] of this.files) {
      const text = file.document.getText();
      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('==')) {
          const name = line.trim().substring(2).trim();
          if (name === sectionName) {
            return { uri, line: i };
          }
        }
      }
    }

    return null;
  }

  // Find all references to a section across all files
  public findSectionReferences(
    sectionName: string
  ): Array<{ uri: string; line: number; character: number }> {
    const references: Array<{ uri: string; line: number; character: number }> =
      [];

    for (const [uri, file] of this.files) {
      const text = file.document.getText();
      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for goto references (-> and =>)
        if (line.includes('->') || line.includes('=>')) {
          const gotoPattern = /(?:->|=>)\s*([^,\s]+)/g;
          let match: RegExpExecArray | null;

          match = gotoPattern.exec(line);
          while (match !== null) {
            const targetSection = match[1];
            if (targetSection === sectionName) {
              references.push({
                uri,
                line: i,
                character: match.index + match[0].indexOf(targetSection),
              });
            }
            match = gotoPattern.exec(line);
          }
        }
      }
    }

    return references;
  }

  // Get all function names across all files
  public getAllFunctions(): Map<string, string[]> {
    const allFunctions = new Map<string, string[]>();

    for (const [uri, file] of this.files) {
      const functions = this.extractFunctions(file.document);
      allFunctions.set(uri, functions);
    }

    return allFunctions;
  }

  // Find function definition across all files
  public findFunctionDefinition(
    functionName: string
  ): { uri: string; line: number } | null {
    for (const [uri, file] of this.files) {
      const text = file.document.getText();
      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('@call:') && line.includes(functionName)) {
          return { uri, line: i };
        }
      }
    }

    return null;
  }

  // Get workspace statistics
  public getWorkspaceStats() {
    return {
      totalFiles: this.files.size,
      totalSections: Array.from(this.files.values()).reduce(
        (sum, file) => sum + file.sections.length,
        0
      ),
      totalFunctions: Array.from(this.files.values()).reduce((sum, file) => {
        return sum + this.extractFunctions(file.document).length;
      }, 0),
      files: Array.from(this.files.keys()),
    };
  }

  // Extract sections from document
  private extractSections(document: TextDocument): string[] {
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

  // Extract function names from document
  private extractFunctions(document: TextDocument): string[] {
    const functions: string[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    lines.forEach((line) => {
      // Check for @call:function() pattern
      const callMatch = line.match(CALL_PATTERN);
      if (callMatch) {
        functions.push(callMatch[1]);
      }

      // Check for {call:function()} pattern
      const inlineCallMatch = line.match(INLINE_CALL_PATTERN);
      if (inlineCallMatch) {
        functions.push(inlineCallMatch[1]);
      }
    });

    return functions;
  }

  // Clear all workspace data
  public clear(): void {
    this.files.clear();
    logger.info('Workspace cleared');
  }
}
