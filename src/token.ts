/** biome-ignore-all lint/style/useNamingConvention: <FOR ENUM> */
export const TokenTypes = {
  EOF: 'EOF',
  INDENT: 'INDENT',
  DEDENT: 'DEDENT',
  NEWLINE: 'NEWLINE',
  COMMENT: 'COMMENT', // # comment
  COMMENT_MULTILINE: 'COMMENT_MULTILINE', // /* comment */
  SECTION: 'SECTION', // ==
  IDENTIFIER: 'IDENTIFIER', // == name | @name
  GOTO: 'GOTO', // => | ->
  TAG: 'TAG', // @tag
  CHOICE: 'CHOICE', // +
  CHOICE_TAG: 'CHOICE_TAG', // @@tag
  CHOICE_TEXT_BEGIN: 'CHOICE_TEXT_BEGIN', // ```
  CHOICE_TEXT_END: 'CHOICE_TEXT_END', // ```

  // values
  BOOLEAN: 'BOOLEAN', // false / true
  INT: 'INT', // 12
  FLOAT: 'FLOAT', // 12.2
  STRING: 'STRING', // " Text
} as const

export type TokenType = typeof TokenTypes[keyof typeof TokenTypes]

export interface Token<T = never> {
  readonly type: TokenType
  readonly value?: T
}
