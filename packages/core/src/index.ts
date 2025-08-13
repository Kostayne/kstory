// Core types and interfaces
export type {
  AstCall,
  AstChoice,
  AstGoto,
  AstInlineCallSegment,
  AstProgram,
  AstReplica,
  AstSection,
  AstStatement,
  AstTag,
  AstTextSegment,
  SourcePosition,
} from './ast';
// Lexer exports
// biome-ignore lint/performance/noBarrelFile: Core package barrel file for external API
export { Lexer } from './lexer';

// Parser exports
export {
  ParseError,
  type ParseResult,
  type ParserIssue,
  parseAll,
  parseFromSource,
  parseProgramFromTokens,
} from './parser';
export type {
  Token,
  TokenType,
  TokenTypes,
} from './token';

// Token factory exports
export {
  callArgumentToken,
  callToken,
  choiceTagToken,
  choiceTextBoundToken,
  choiceTextToken,
  choiceToken,
  commentContentToken,
  commentToken,
  dedentToken,
  eofToken,
  gotoToken,
  identifierToken,
  indentToken,
  multiCommentBeginToken,
  multiCommentEndToken,
  newLineToken,
  replicaBeginToken,
  replicaEndToken,
  sectionToken,
  stringToken,
  tagToken,
  tagValueToken,
} from './tokenFactory';
// Utility exports
export { printToken } from './utils/printToken';
// Validator exports
export {
  type ValidationIssue,
  validateProgram,
  validateTokens,
} from './validator';
