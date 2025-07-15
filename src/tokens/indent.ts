import { type Token, TokenTypes } from '../token';

export function indentToken(): Token {
  return {
    type: TokenTypes.INDENT,
  };
}
