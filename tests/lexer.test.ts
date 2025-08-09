import { describe, it, expect } from 'bun:test'
import { Lexer } from '../src/lexer'
import { TokenTypes } from '../src/token'

const getTokenTypes = (src: string): string[] => {
  const lexer = new Lexer(src)
  lexer.process()
  return lexer.getTokens().map(t => t.type)
}

describe('Lexer: basic structures', () => {
  it('tokenizes section header and identifier', () => {
    const types = getTokenTypes('== Intro\n')
    expect(types).toContain(TokenTypes.SECTION)
    expect(types).toContain(TokenTypes.IDENTIFIER)
    expect(types.at(-1)).toBe(TokenTypes.EOF)
  })

  it('tokenizes goto with identifier using ->', () => {
    const types = getTokenTypes('-> Next\n')
    expect(types[0]).toBe(TokenTypes.GOTO)
    expect(types[1]).toBe(TokenTypes.IDENTIFIER)
  })

  it('tokenizes goto with identifier using =>', () => {
    const types = getTokenTypes('=> End\n')
    expect(types[0]).toBe(TokenTypes.GOTO)
    expect(types[1]).toBe(TokenTypes.IDENTIFIER)
  })

  it('tokenizes @tag and optional TAG_VALUE', () => {
    const types = getTokenTypes('@mood happy\n')
    expect(types[0]).toBe(TokenTypes.TAG)
    expect(types[1]).toBe(TokenTypes.TAG_VALUE)
  })

  it('tokenizes @@choice_tag and optional TAG_VALUE', () => {
    const types = getTokenTypes('@@flag enabled\n')
    expect(types[0]).toBe(TokenTypes.CHOICE_TAG)
    expect(types[1]).toBe(TokenTypes.TAG_VALUE)
  })

  it('tokenizes comments (# and /* */)', () => {
    const types = getTokenTypes('# note\n/*multi*/\n')
    expect(types).toContain(TokenTypes.COMMENT)
    expect(types).toContain(TokenTypes.COMMENT_MULTILINE_BEGIN)
    expect(types).toContain(TokenTypes.COMMENT_MULTILINE_END)
  })
})

describe('Lexer: choices', () => {
  it('tokenizes inline + choice text on the same line', () => {
    const types = getTokenTypes('+ Hello world\n')
    expect(types[0]).toBe(TokenTypes.CHOICE)
    expect(types).toContain(TokenTypes.CHOICE_TEXT_BOUND)
    expect(types).toContain(TokenTypes.CHOICE_TEXT)
  })

  it('tokenizes block choice text delimited by ```', () => {
    const src = '```Line1\n# c\nLine2```\n'
    const types = getTokenTypes(src)
    // Expect CHOICE_TEXT_BOUND begin and end plus embedded CHOICE_TEXT/NEWLINE/COMMENT tokens
    expect(types[0]).toBe(TokenTypes.CHOICE_TEXT_BOUND)
    expect(types).toContain(TokenTypes.CHOICE_TEXT)
    expect(types).toContain(TokenTypes.NEWLINE)
    expect(types).toContain(TokenTypes.COMMENT)
    // last closing bound appears before EOF
    expect(types.filter(t => t === TokenTypes.CHOICE_TEXT_BOUND).length).toBe(2)
  })
})

describe('Lexer: replicas and inline calls', () => {
  it('tokenizes replica begin, strings and replica end insertion', () => {
    const src = '" Hello world\n'
    const lexer = new Lexer(src)
    lexer.process()
    const tokens = lexer.getTokens()
    const types = tokens.map(t => t.type)

    expect(types[0]).toBe(TokenTypes.REPLICA_BEGIN)
    expect(types).toContain(TokenTypes.STRING)
    expect(types).toContain(TokenTypes.REPLICA_END)
  })

  it('keeps inline {call:...} inside STRING content (parser will split later)', () => {
    const src = '" Greet {call:say("x, y", nested(2))} world\n'
    const lexer = new Lexer(src)
    lexer.process()
    const tokens = lexer.getTokens()
    const stringValues = tokens.filter(t => t.type === TokenTypes.STRING).map(t => String(t.value ?? ''))
    expect(stringValues.some(v => v.includes('{call:say("x, y", nested(2))}'))).toBe(true)
  })
})

describe('Lexer: indentation tokens', () => {
  it('emits INDENT/DEDENT for 2-space based indentation', () => {
    const src = '+ a\n  " child\n" peer\n'
    const types = getTokenTypes(src)
    expect(types).toContain(TokenTypes.INDENT)
    expect(types).toContain(TokenTypes.DEDENT)
  })
})


