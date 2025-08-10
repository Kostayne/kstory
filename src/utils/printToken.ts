import { type Token, TokenTypes } from '@/token';

export const printToken = (token: Token<unknown>) => {
  let msg = `Type: ${token.type}`;

  if (token.value) {
    if (token.type !== TokenTypes.NEWLINE) {
      msg += `; Value: ${token.value}`;
    } else {
      msg += `\n`;
    }
  }

  // biome-ignore lint/suspicious/noConsole: <Utility function>
  console.log(msg);
};
