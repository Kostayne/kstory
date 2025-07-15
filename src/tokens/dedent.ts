import { type Token, TokenTypes } from '../token';

export function dedentToken(): Token {
  return {
    type: TokenTypes.DEDENT,
  };
}
