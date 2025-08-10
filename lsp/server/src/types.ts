// Common types for KStory LSP Server

export interface SectionInfo {
  name: string;
  line: number;
  column: number;
}

export interface ReplicaInfo {
  startLine: number;
  startColumn: number;
  endLine?: number;
  endColumn?: number;
  content: string;
}

export interface DocumentAnalysis {
  sections: SectionInfo[];
  replicas: ReplicaInfo[];
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
}

// LSP-specific types
export interface LSPConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableDiagnostics: boolean;
  enableCompletion: boolean;
  enableHover: boolean;
}

export interface CompletionContext {
  isInReplica: boolean;
  isInComment: boolean;
  isInSection: boolean;
  currentLine: string;
  currentChar: string;
  position: {
    line: number;
    character: number;
  };
}
