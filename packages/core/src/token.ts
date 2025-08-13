/** biome-ignore-all lint/style/useNamingConvention: <FOR ENUM> */
export const TokenTypes = {
  EOF: 'EOF',
  INDENT: 'INDENT',
  DEDENT: 'DEDENT',
  NEWLINE: 'NEWLINE',

  COMMENT: 'COMMENT', // # comment
  COMMENT_CONTENT: 'COMMENT_CONTENT', // comment content

  REPLICA_BEGIN: 'REPLICA_BEGIN', // "
  REPLICA_END: 'REPLICA_END',

  COMMENT_MULTILINE_BEGIN: 'COMMENT_MULTILINE_BEGIN', // /*
  COMMENT_MULTILINE_END: 'COMMENT_MULTILINE_END', // */

  GOTO: 'GOTO', // => | ->

  TAG: 'TAG', // @tag
  TAG_VALUE: 'TAG_VALUE', // @tag value

  SECTION: 'SECTION', // ==
  IDENTIFIER: 'IDENTIFIER', // == name | @name

  CHOICE: 'CHOICE', // +
  CHOICE_TAG: 'CHOICE_TAG', // @@tag
  CHOICE_TEXT: 'CHOICE_TEXT', // choice text content
  CHOICE_TEXT_BOUND: 'CHOICE_TEXT_BOUND', // ```

  // values
  BOOLEAN: 'BOOLEAN', // false / true
  INT: 'INT', // 12
  FLOAT: 'FLOAT', // 12.2
  STRING: 'STRING', // Text

  ERROR: 'ERROR', // for unknown tokens

  // function calls
  CALL: 'CALL', // @call:functionName()
  CALL_ARGUMENT: 'CALL_ARGUMENT', // function parameter
} as const;

export type TokenType = (typeof TokenTypes)[keyof typeof TokenTypes];

export interface Token<T = never> {
  readonly type: TokenType;
  readonly value?: T;
  // Optional source position (line and column) for better diagnostics
  readonly line?: number;
  readonly column?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}
