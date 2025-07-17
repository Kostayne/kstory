import { type Token, TokenTypes } from '../token';

export function tagValueToken(val: string): Token<string> {
  return {
    type: TokenTypes.TAG_VALUE,
    value: val,
  };
}
