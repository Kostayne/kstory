import { type Token, TokenTypes } from '../token';

export function commentToken(value: string): Token<string> {
  return {
    type: TokenTypes.COMMENT,
    value: value
  };
};
