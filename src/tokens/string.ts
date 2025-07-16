import { type Token, TokenTypes } from '../token';

export function stringToken(value: string): Token<string> {
  return {
    type: TokenTypes.STRING,
    value,
  };
}
