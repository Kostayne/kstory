import { readFile } from 'node:fs/promises'
import { Lexer } from './lexer'
import { printToken } from './utils/printToken'

const file = await readFile('./test.ks')
const str = file.toString()

const lexer = new Lexer(str)
lexer.process()

const tokens = lexer.getTokens()

for (const t of tokens) {
  printToken(t)
}