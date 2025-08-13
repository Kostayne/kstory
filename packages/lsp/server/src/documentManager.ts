import type { AstProgram } from '@kstory/core';
import { parseFromSource } from '@kstory/core';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from './logger';

const logger = Logger.getInstance();

interface ParsedDocument {
  uri: string;
  version: number;
  program: AstProgram;
  issues: unknown[];
  lastModified: number;
}

export class DocumentManager {
  private cache = new Map<string, ParsedDocument>();

  public constructor() {
    logger.info('DocumentManager initialized with parser support');
  }

  public getParsedDocument(document: TextDocument): ParsedDocument | null {
    const uri = document.uri;
    const version = document.version;
    const cached = this.cache.get(uri);

    // Check if we have a valid cached version
    if (cached && cached.version === version) {
      return cached;
    }

    // Parse document using the parser
    const parsed = this.parseDocument(document);
    if (parsed) {
      this.cache.set(uri, parsed);
      logger.debug(`Parsed document ${uri} (version ${version})`);
    }

    return parsed;
  }

  private parseDocument(document: TextDocument): ParsedDocument | null {
    try {
      const text = document.getText();
      const { program, issues } = parseFromSource(text);

      return {
        uri: document.uri,
        version: document.version,
        program,
        issues,
        lastModified: Date.now(),
      };
    } catch (error) {
      logger.error(`Failed to parse document ${document.uri}: ${error}`);
      return null;
    }
  }

  public clearCache(uri?: string) {
    if (uri) {
      this.cache.delete(uri);
      logger.debug(`Cleared cache for ${uri}`);
    } else {
      this.cache.clear();
      logger.debug('Cleared all document cache');
    }
  }

  public getCacheStats() {
    return {
      size: this.cache.size,
      uris: Array.from(this.cache.keys()),
    };
  }
}
