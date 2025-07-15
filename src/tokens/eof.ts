import type { Token } from '../token';

export function eofToken(): Token {
  return {
    type: 'EOF',
  }
}
