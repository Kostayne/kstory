import type { Token } from '../token';

export const printToken = (token: Token<unknown>) => {
  let msg = `Type: ${token.type}`;

  if (token.value) {
    msg += `; Value: ${token.value}`;
  }

  // biome-ignore lint/suspicious/noConsole: <Utility function>
  console.log(msg);
};
