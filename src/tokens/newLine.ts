import { type Token, TokenTypes } from '../token';

export function newLineToken(): Token {
  return {
    type: TokenTypes.NEWLINE,
  };
}
