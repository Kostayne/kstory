import { readFile } from 'node:fs/promises'
import { Lexer } from './lexer'
import { printToken } from './utils/printToken'

const args = process.argv.slice(2)
const filename = args[0] || './test.ks'

const file = await readFile(filename)
const str = file.toString()

const lexer = new Lexer(str)
lexer.process()

const tokens = lexer.getTokens()

for (const t of tokens) {
  printToken(t)
}