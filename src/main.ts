import { readFile } from 'node:fs/promises'
import { Lexer } from './lexer'
import { printToken } from './utils/printToken'
import { buildAstFromTokens, parseSimpleStatements } from './parser'
import { validateProgram } from './validator'

const args = process.argv.slice(2)
const isAstMode = args.includes('--ast')
const filename = args.find((a) => !a.startsWith('--')) || './test.ks'


const file = await readFile(filename)
const str = file.toString()

const lexer = new Lexer(str)
lexer.process()

const tokens = lexer.getTokens()



if (isAstMode) {
  const ast = buildAstFromTokens(tokens)
  // small debug: parse simple statements from the whole file (temporary)
  const simple = parseSimpleStatements(tokens)
  const issues = validateProgram(ast)
// biome-ignore lint/suspicious/noConsole: CLI output
  console.log(JSON.stringify({ ast, simple, issues }, null, 2))
} else {
  for (const t of tokens) {
    printToken(t)
  }
}