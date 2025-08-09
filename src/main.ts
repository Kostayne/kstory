import { readFile } from 'node:fs/promises'
import { Lexer } from './lexer'
import { printToken } from './utils/printToken'
import { parseSimpleStatements, parseProgramFromTokens } from './parser'
import { validateProgram, validateTokens } from './validator'

const args = process.argv.slice(2)
const isAstMode = args.includes('--ast')
const filename = args.find((a) => !a.startsWith('--')) || './test.ks'


const file = await readFile(filename)
const str = file.toString()

const lexer = new Lexer(str)
lexer.process()

const tokens = lexer.getTokens()



if (isAstMode) {
  const { program: ast, issues: parserIssues } = parseProgramFromTokens(tokens)
  // small debug: parse simple statements from the whole file (temporary)
  const simple = parseSimpleStatements(tokens, { collectIssues: false })
  const issues = validateProgram(ast)
  const lexIssues = validateTokens(tokens)
// biome-ignore lint/suspicious/noConsole: CLI output
  console.log(JSON.stringify({ ast, simple, issues, lexIssues, parserIssues }, null, 2))
} else {
  for (const t of tokens) {
    printToken(t)
  }
}