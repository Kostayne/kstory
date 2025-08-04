import { type Token, TokenTypes } from './token';

export function commentToken(value: string): Token<string> {
  return {
    type: TokenTypes.COMMENT,
    value: value,
  };
}

export function commentContentToken(value: string): Token<string> {
  return {
    type: TokenTypes.COMMENT_CONTENT,
    value: value,
  };
}

export function multiCommentBeginToken(): Token<string> {
  return {
    type: TokenTypes.COMMENT_MULTILINE_BEGIN,
    value: '/*',
  };
}

export function multiCommentEndToken(): Token<string> {
  return {
    type: TokenTypes.COMMENT_MULTILINE_END,
    value: '*/',
  };
}

export function newLineToken(): Token<string> {
  return {
    type: TokenTypes.NEWLINE,
    value: "\n"
  };
}

export function indentToken(): Token {
  return {
    type: TokenTypes.INDENT,
  };
}

export function dedentToken(): Token {
  return {
    type: TokenTypes.DEDENT,
  };
}

export function eofToken(): Token {
  return {
    type: TokenTypes.EOF,
  };
}

export function replicaBeginToken(): Token<string> {
  return {
    type: TokenTypes.REPLICA_BEGIN,
    value: '" '
  };
}

export function replicaEndToken(): Token {
  return {
    type: TokenTypes.REPLICA_END,
  };
}

export function stringToken(value: string): Token<string> {
  return {
    type: TokenTypes.STRING,
    value,
  };
}

export function choiceToken(val: string): Token<string> {
  return {
    type: TokenTypes.CHOICE,
    value: val,
  };
}

export function choiceTextBoundToken(silent = false): Token<string> {
  return {
    type: TokenTypes.CHOICE_TEXT_BOUND,
    value: silent ? '' : '```',
  };
}

export function choiceTagToken(val: string): Token<string> {
  return {
    type: TokenTypes.CHOICE_TAG,
    value: val,
  };
}

export function tagToken(val: string): Token<string> {
  return {
    type: TokenTypes.TAG,
    value: val,
  };
}

export function tagValueToken(val: string): Token<string> {
  return {
    type: TokenTypes.TAG_VALUE,
    value: val,
  };
}

export function sectionToken(): Token<string> {
  return {
    type: TokenTypes.SECTION,
    value: '== ',
  };
}

export function identifierToken(val: string): Token<string> {
  return {
    type: TokenTypes.IDENTIFIER,
    value: val,
  };
}

export function gotoToken(val: string): Token<string> {
  return {
    type: TokenTypes.GOTO,
    value: val,
  };
}

export function errorToken(val: string): Token<string> {
  return {
    type: TokenTypes.ERROR,
    value: val,
  };
}
