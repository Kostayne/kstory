import { type Token, TokenTypes } from '../token';

export function tagToken(val: string): Token<string> {
  return {
    type: TokenTypes.TAG,
    value: val,
  };
}
