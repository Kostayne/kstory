import { type Token, TokenTypes } from '../token';

export function multiCommentToken(value: string): Token<string> {
  return {
    type: TokenTypes.COMMENT_MULTILINE,
    value,
  };
}
