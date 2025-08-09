import { type Token, TokenTypes } from './token'
import { type AstProgram, type AstStatement, type AstTag, type SourcePosition, type AstTextSegment, type AstInlineCallSegment } from './ast'

export class ParseError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'ParseError'
  }
}

export type ParserIssue = {
  kind: 'Error' | 'Warning'
  message: string
  position?: SourcePosition
  endPosition?: SourcePosition
}

let lastParserIssues: ParserIssue[] = []
export function getParserIssues(): ParserIssue[] {
  return lastParserIssues
}

function addParserIssue(issue: ParserIssue) {
  lastParserIssues.push(issue)
}

export type ParseResult = { program: AstProgram; issues: ParserIssue[] }

export function parseProgramFromTokens(tokens: Token<unknown>[]): ParseResult {
  const program = buildAstFromTokens(tokens)
  return { program, issues: getParserIssues() }
}

// Constants to avoid magic numbers
// Number of tokens that form a section header: [SECTION, IDENTIFIER]
const SECTION_HEADER_TOKEN_COUNT = 2
// Number of tokens consumed by a goto statement: [GOTO, IDENTIFIER]
const GOTO_TOKENS_CONSUMED = 2

// Parser entrypoint: builds AST from tokens. Will be expanded in next steps.
// Builds a high-level AST with sections and flat statements.
// At this stage, bodies contain only simple statements (Goto, Call, Replica).
export const buildAstFromTokens = (allTokens: Token<unknown>[]): AstProgram => {
  // start new parser issues buffer
  lastParserIssues = []
  const sections: AstProgram['sections'] = []

  // Find explicit sections by positions of SECTION tokens
  const sectionIndices = findSectionIndices(allTokens)

  if (sectionIndices.length === 0) {
    // No explicit sections → implicit main with parsed simple statements from whole file
    const body = parseSimpleStatements(allTokens)
    sections.push({ name: 'main', body, position: getTokenPosition(allTokens[0]), endPosition: getTokenEndPosition(allTokens[allTokens.length - 1]) })
    return { sections }
  }

  // Prelude before the first SECTION becomes implicit main (if any meaningful tokens exist)
  const prelude = allTokens.slice(0, sectionIndices[0])

  const hasPreludeContent = prelude.some(
    (t) => t.type !== TokenTypes.NEWLINE && t.type !== TokenTypes.COMMENT && t.type !== TokenTypes.COMMENT_CONTENT,
  )

  if (hasPreludeContent) {
    const body = parseSimpleStatements(prelude)
    sections.push({ name: 'main', body })
  }

  // Collect explicit sections names (identifier after SECTION)
  for (const idx of sectionIndices) {
    const sectionTok = allTokens[idx]
    const nextIdx = sectionIndices.find((v: number) => v > idx) ?? allTokens.length
    const nameTok = allTokens[idx + 1]

    if (!nameTok || nameTok.type !== TokenTypes.IDENTIFIER) {
      addParserIssue({
        kind: 'Error',
        message: 'Expected section name (IDENTIFIER) after SECTION token',
        position: getTokenPosition(sectionTok),
        endPosition: getTokenEndPosition(sectionTok),
      })
      // skip this malformed section body and continue with next
      continue
    }

    const name = String(nameTok.value ?? '')
    const sectionWindow = allTokens.slice(idx + SECTION_HEADER_TOKEN_COUNT, nextIdx)
    const body = parseSimpleStatements(sectionWindow)
    sections.push({ name, body, position: getTokenPosition(sectionTok), endPosition: getTokenEndPosition(allTokens[nextIdx - 1]) })
  }

  return { sections }
}

// Small step forward: parse only simple statements (Goto, Call) from a flat token window
// Parse a flat list of simple statements from a token window.
// This pass ignores indentation, tags and choices; it's meant as an incremental step.
// Parses a flat sequence of statements from a token window.
// Strategy:
// - Accumulate leading @tags and @@choice_tags in buffers (pendingTags / pendingChoiceTags)
// - Skip non-semantic tokens (newline/comments) between tags and the statement
// - Attach the accumulated tags to the next parsed statement, then reset buffers
type ParseOptions = { collectIssues?: boolean }

export const parseSimpleStatements = (tokens: Token<unknown>[], options: ParseOptions = { collectIssues: true }): AstStatement[] => {
  const result: AstStatement[] = []
  let currentIndex = 0
  // Regular tags meant for the very next statement
  let pendingTags: AstTag[] = []
  // Choice-only tags (begin with @@) meant for the next Choice node
  let pendingChoiceTags: AstTag[] = []

  while (currentIndex < tokens.length) {
    // Current token under consideration
    const currentToken = tokens[currentIndex]

    // Collect leading tags for the next statement
    if (currentToken.type === TokenTypes.TAG) {
      const { tags, nextStartIndex } = collectLeadingTags(tokens.slice(currentIndex))
      pendingTags.push(...tags)
      currentIndex += nextStartIndex
      continue
    }

    // Collect leading choice tags (start with @@). They are attached only to Choice
    if (currentToken.type === TokenTypes.CHOICE_TAG) {
      const { tags, nextStartIndex } = collectLeadingChoiceTags(tokens.slice(currentIndex))
      pendingChoiceTags.push(...tags)
      currentIndex += nextStartIndex
      continue
    }

    // Skip non-semantic tokens between tags and statements
    if (
      currentToken.type === TokenTypes.NEWLINE ||
      currentToken.type === TokenTypes.COMMENT ||
      currentToken.type === TokenTypes.COMMENT_CONTENT
    ) {
      currentIndex++
      continue
    }

    // Parse choice statements (text + optional body). Consumes choice-related tokens
    if (currentToken.type === TokenTypes.CHOICE) {
      const { node, nextIndex } = parseChoiceAt(tokens, currentIndex, pendingTags, pendingChoiceTags)
      result.push(node)
      pendingTags = []
      pendingChoiceTags = []
      currentIndex = nextIndex
      continue
    }

    // Parse goto statements: GOTO IDENTIFIER
    if (currentToken.type === TokenTypes.GOTO) {
      const nextToken = tokens[currentIndex + 1]
      if (!nextToken || nextToken.type !== TokenTypes.IDENTIFIER) {
        if (options.collectIssues) addParserIssue({
          kind: 'Error',
          message: 'Goto must be followed by IDENTIFIER',
          position: getTokenPosition(currentToken),
          endPosition: getTokenEndPosition(currentToken),
        })
        // sync: skip to end of line/body
        currentIndex++
        continue
      }
      result.push({
        kind: 'Goto',
        target: String(nextToken.value ?? ''),
        tags: pendingTags.length ? pendingTags : undefined,
        position: getTokenPosition(currentToken),
        endPosition: getTokenEndPosition(nextToken),
      })
      pendingTags = []
      currentIndex += GOTO_TOKENS_CONSUMED
      continue
    }

    // Parse function calls: CALL (CALL_ARGUMENT)*
    if (currentToken.type === TokenTypes.CALL) {
      const functionName = String(currentToken.value ?? '')
      const callArguments: string[] = []
      let argumentIndex = currentIndex + 1

      while (argumentIndex < tokens.length && tokens[argumentIndex].type === TokenTypes.CALL_ARGUMENT) {
        callArguments.push(String(tokens[argumentIndex].value ?? ''))
        argumentIndex++
      }

      // If we see a NEWLINE right after CALL (no args and likely broken), issue a warning and continue
      if (callArguments.length === 0 && tokens[argumentIndex]?.type === TokenTypes.NEWLINE) {
        if (options.collectIssues) addParserIssue({
          kind: 'Warning',
          message: `Empty or malformed call: ${functionName}()`,
          position: getTokenPosition(currentToken),
          endPosition: getTokenEndPosition(tokens[Math.max(currentIndex, argumentIndex)]),
        })
      }

      result.push({
        kind: 'Call',
        name: functionName,
        args: callArguments,
        tags: pendingTags.length ? pendingTags : undefined,
        position: getTokenPosition(currentToken),
        endPosition: getTokenEndPosition(tokens[Math.max(currentIndex, argumentIndex - 1)]),
      })
      pendingTags = []
      currentIndex = argumentIndex
      continue
    }

    // Parse replica blocks: REPLICA_BEGIN STRING* REPLICA_END
    if (currentToken.type === TokenTypes.REPLICA_BEGIN) {
      let scanIndex = currentIndex + 1
      const startPos = getTokenPosition(currentToken)
      const stringTokens: Token<unknown>[] = []

      while (scanIndex < tokens.length && tokens[scanIndex].type !== TokenTypes.REPLICA_END) {
        const t = tokens[scanIndex]
        if (t.type === TokenTypes.STRING) {
          stringTokens.push(t)
        }
        scanIndex++
      }

      const fullText = stringTokens.map(t => String(t.value ?? '')).join('')
      const pieces = buildTextPieces(stringTokens)
      const segments = splitTextIntoSegmentsWithPositions(fullText, pieces)

      const endTok = tokens[Math.min(scanIndex, tokens.length - 1)]
      const replicaNode = {
        kind: 'Replica',
        text: segments.filter(s => s.kind === 'Text').map(s => (s as AstTextSegment).text).join(''),
        segments: segments.length > 0 ? segments : undefined,
        tags: pendingTags.length ? pendingTags : undefined,
        position: startPos,
        endPosition: getTokenEndPosition(endTok),
      } as AstStatement

      result.push(replicaNode)
      pendingTags = []
      currentIndex = tokens[scanIndex]?.type === TokenTypes.REPLICA_END ? scanIndex + 1 : scanIndex
      continue
    }

    currentIndex++
  }

  return result
}

// Collect leading @tag entries at the very start of a token window
// Stops on the first non-tag token; returns collected tags and index to continue from
// Collect a run of leading @tags at the very start of a token window.
// Each tag can be followed by an optional TAG_VALUE token which becomes Tag.value.
export const collectLeadingTags = (
  tokens: Token<unknown>[],
): { tags: AstTag[]; nextStartIndex: number } => {
  const collected: AstTag[] = []
  let index = 0

  while (index < tokens.length) {
    const t = tokens[index]
    if (t.type !== TokenTypes.TAG) break

    const name = String(t.value ?? '')
    const maybeValue = tokens[index + 1]

    if (maybeValue && maybeValue.type === TokenTypes.TAG_VALUE) {
      collected.push({ name, value: String(maybeValue.value ?? '') })
      index += 2
      continue
    }

    collected.push({ name })
    index += 1
  }

  return { tags: collected, nextStartIndex: index }
}

// Collect leading @@choice_tag entries at the very start of a token window
// Stops on the first non-choice-tag token; returns collected tags and index to continue from
// Collect a run of leading @@choice_tags at the very start of a token window.
// Mirrors collectLeadingTags but for CHOICE_TAG tokens.
export const collectLeadingChoiceTags = (
  tokens: Token<unknown>[],
): { tags: AstTag[]; nextStartIndex: number } => {
  const collected: AstTag[] = []
  let index = 0

  while (index < tokens.length) {
    const t = tokens[index]
    if (t.type !== TokenTypes.CHOICE_TAG) break

    const name = String(t.value ?? '')
    const maybeValue = tokens[index + 1]

    if (maybeValue && maybeValue.type === TokenTypes.TAG_VALUE) {
      collected.push({ name, value: String(maybeValue.value ?? '') })
      index += 2
      continue
    }

    collected.push({ name })
    index += 1
  }

  return { tags: collected, nextStartIndex: index }
}

// Helper: find indices of SECTION tokens
function findSectionIndices(tokens: Token<unknown>[]): number[] {
  const indices: number[] = []

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    if (tokens[tokenIndex]?.type === TokenTypes.SECTION) {
      indices.push(tokenIndex)
    }
  }

  return indices
}

// Safely map token line/column into SourcePosition
function getTokenPosition(token?: Token<unknown>): SourcePosition | undefined {
  if (!token || typeof token.line !== 'number' || typeof token.column !== 'number') return undefined
  return { line: token.line, column: token.column }
}

// Safely map token endLine/endColumn into SourcePosition
function getTokenEndPosition(token?: Token<unknown>): SourcePosition | undefined {
  if (!token || typeof token.endLine !== 'number' || typeof token.endColumn !== 'number') return undefined
  return { line: token.endLine, column: token.endColumn }
}

// Utilities to split text with possible inline {call:...} segments
function splitTextIntoSegments(text: string, out: Array<AstTextSegment | AstInlineCallSegment>): void {
  let remaining = text
  while (remaining.length > 0) {
    const idx = remaining.indexOf('{call:')
    if (idx === -1) {
      out.push({ kind: 'Text', text: remaining })
      return
    }
    if (idx > 0) {
      out.push({ kind: 'Text', text: remaining.slice(0, idx) })
    }

    // Extract inline call content
    let i = idx + '{call:'.length
    let depth = 0
    let inQuotes = false
    while (i < remaining.length) {
      const ch = remaining[i]
      if (ch === '"' && remaining[i - 1] !== '\\') inQuotes = !inQuotes
      if (!inQuotes) {
        if (ch === '(' && remaining[i - 1] !== '\\') depth++
        if (ch === ')' && remaining[i - 1] !== '\\') depth--
        if (ch === '}' && depth <= 0) {
          i++
          break
        }
      }
      i++
    }

    const inlineSrc = remaining.slice(idx, i)
    out.push(parseInlineCallFromText(inlineSrc))
    remaining = remaining.slice(i)
  }
}

// TextPiece: describes how a slice of concatenated STRING tokens maps to source positions
type TextPiece = { start: number; end: number; startPos?: SourcePosition; endPos?: SourcePosition }

// Build mapping from global text offsets (within a replica) to per-token positions
function buildTextPieces(stringTokens: Token<unknown>[]): TextPiece[] {
  const pieces: TextPiece[] = []
  let offset = 0
  for (const t of stringTokens) {
    const text = String(t.value ?? '')
    const start = offset
    const end = offset + text.length
    pieces.push({ start, end, startPos: getTokenPosition(t), endPos: getTokenEndPosition(t) })
    offset = end
  }
  return pieces
}

// Map a global text span [start, end) to approximate start/end positions using TextPiece map
function mapSpanToPositions(start: number, end: number, pieces: TextPiece[]): { start?: SourcePosition; end?: SourcePosition } {
  let startPos: SourcePosition | undefined
  let endPos: SourcePosition | undefined

  for (const p of pieces) {
    if (startPos === undefined && start >= p.start && start <= p.end) {
      startPos = p.startPos
    }
    if (endPos === undefined && end >= p.start && end <= p.end) {
      endPos = p.endPos
    }
    if (startPos && endPos) break
  }

  return { start: startPos, end: endPos }
}

// Split concatenated text into Text and InlineCall segments with positional info
function splitTextIntoSegmentsWithPositions(
  text: string,
  pieces: TextPiece[],
): Array<AstTextSegment | AstInlineCallSegment> {
  const out: Array<AstTextSegment | AstInlineCallSegment> = []
  let globalOffset = 0

  while (globalOffset < text.length) {
    const idx = findNextInlineStart(text, globalOffset)
    if (idx === -1) {
      const span = mapSpanToPositions(globalOffset, text.length, pieces)
      if (text.length > globalOffset) {
        out.push({ kind: 'Text', text: text.slice(globalOffset), position: span.start, endPosition: span.end })
      }
      break
    }

    // Emit preceding text if any
    if (idx > globalOffset) {
      const span = mapSpanToPositions(globalOffset, idx, pieces)
      out.push({ kind: 'Text', text: text.slice(globalOffset, idx), position: span.start, endPosition: span.end })
    }

    // Scan inline content starting at '{call:'
    let i = idx + '{call:'.length
    let depth = 0
    let inQuote: '"' | "'" | null = null
    while (i < text.length) {
      const ch = text[i]
      const prev = text[i - 1]
      if ((ch === '"' || ch === "'") && prev !== '\\') {
        inQuote = inQuote ? (inQuote === ch ? null : inQuote) : ch
      } else if (!inQuote) {
        if (ch === '(' && prev !== '\\') depth++
        else if (ch === ')' && prev !== '\\') depth--
        else if (ch === '}' && prev !== '\\' && depth <= 0) { i++; break }
      }
      i++
    }

    // If unterminated, report issue and treat as plain text
    if (i > text.length) {
      const span = mapSpanToPositions(idx, text.length, pieces)
      addParserIssue({
        kind: 'Warning',
        message: 'Unterminated inline call',
        position: span.start,
        endPosition: span.end,
      })
      out.push({ kind: 'Text', text: text.slice(idx), position: span.start, endPosition: span.end })
      break
    }

    const inlineSrc = text.slice(idx, i)
    const parsed = parseInlineCallFromText(inlineSrc)
    const span = mapSpanToPositions(idx, i, pieces)
    parsed.position = span.start
    parsed.endPosition = span.end
    out.push(parsed)

    globalOffset = i
  }

  return out
}

// Find next unescaped "{call:" occurrence at or after fromIndex. No spaces allowed after ':'
function findNextInlineStart(text: string, fromIndex: number): number {
  for (let i = fromIndex; i <= text.length - 6; i++) {
    if (text[i] !== '{') continue
    // Check not escaped (odd number of preceding backslashes means escaped)
    let bs = 0
    for (let j = i - 1; j >= 0 && text[j] === '\\'; j--) bs++
    if (bs % 2 === 1) continue
    if (text[i + 1] === 'c' && text[i + 2] === 'a' && text[i + 3] === 'l' && text[i + 4] === 'l' && text[i + 5] === ':') {
      return i
    }
  }
  return -1
}
function parseInlineCallFromText(src: string): AstInlineCallSegment {
  // src shape: {call:name(...)} or {call:name}
  let inner = src.slice('{call:'.length, src.endsWith('}') ? src.length - 1 : src.length)
  inner = inner.trim()

  let name = ''
  const args: string[] = []
  const parenIndex = inner.indexOf('(')
  if (parenIndex === -1) {
    name = inner
  } else {
    name = inner.slice(0, parenIndex)
    const argStr = inner.slice(parenIndex + 1, inner.lastIndexOf(')'))
    // Split by commas at depth 0, honoring quotes and escapes
    let i = 0
    let buf = ''
    let inQuote: '"' | "'" | null = null
    let depth = 0
    while (i < argStr.length) {
      const ch = argStr[i]
      const prev = argStr[i - 1]
      if ((ch === '"' || ch === "'") && prev !== '\\') {
        inQuote = inQuote ? (inQuote === ch ? null : inQuote) : ch
        buf += ch
        i++
        continue
      }
      if (!inQuote) {
        if (ch === '(' && prev !== '\\') { depth++; buf += ch; i++; continue }
        if (ch === ')' && prev !== '\\') { depth--; buf += ch; i++; continue }
        if (ch === ',' && prev !== '\\' && depth === 0) {
          if (buf.trim().length > 0) args.push(buf.trim())
          buf = ''
          i++
          continue
        }
      }
      buf += ch
      i++
    }
    if (buf.trim().length > 0) args.push(buf.trim())
  }

  return { kind: 'InlineCall', name, args }
}

// Parse a Choice at startIndex.
// Handles:
// - Inline choice text bounded by silent CHOICE_TEXT_BOUND (value === ''): ```...```
// - Multiline choice text bounded by visible CHOICE_TEXT_BOUND (value === '```')
// - Optional INDENT/DEDENT body with nested indentation.
function parseChoiceAt(
  tokens: Token<unknown>[],
  startIndex: number,
  pendingTags: AstTag[],
  pendingChoiceTags: AstTag[],
): { node: AstStatement; nextIndex: number } {
  let index = startIndex + 1 // skip CHOICE
  let text: string | undefined
  let richText: string | undefined
  let body: AstStatement[] | undefined
  const position = getTokenPosition(tokens[startIndex])

  // Inline choice text: CHOICE_TEXT_BOUND(silent) CHOICE_TEXT? CHOICE_TEXT_BOUND(silent)
  if (tokens[index] && tokens[index].type === TokenTypes.CHOICE_TEXT_BOUND && (tokens[index].value as string) === '') {
    index += 1
    if (tokens[index] && tokens[index].type === TokenTypes.CHOICE_TEXT) {
      text = String(tokens[index].value ?? '')
      index += 1
    }
    if (tokens[index] && tokens[index].type === TokenTypes.CHOICE_TEXT_BOUND && (tokens[index].value as string) === '') {
      index += 1
    }
  } else if (tokens[index] && tokens[index].type === TokenTypes.CHOICE_TEXT_BOUND) {
    // Block choice text: CHOICE_TEXT_BOUND(visible) ... CHOICE_TEXT_BOUND(visible)
    const blockStartTok = tokens[index]
    index += 1
    const parts: string[] = []
    let foundClosingBound = false

    while (index < tokens.length) {
      const t = tokens[index]

      // End of block text
      if (t.type === TokenTypes.CHOICE_TEXT_BOUND) {
        index += 1
        foundClosingBound = true
        break
      }

      // Accumulate visible text tokens and structural newlines
      if (t.type === TokenTypes.CHOICE_TEXT) {
        parts.push(String(t.value ?? ''))
      } else if (t.type === TokenTypes.NEWLINE) {
        parts.push('\n')
      } else if (t.type === TokenTypes.COMMENT || t.type === TokenTypes.COMMENT_CONTENT) {
        // Preserve comment text inside choice text blocks
        parts.push(String(t.value ?? ''))
      }

      index += 1
    }

    richText = parts.join('')

    if (!foundClosingBound) {
      addParserIssue({
        kind: 'Warning',
        message: 'Unterminated choice text block (missing closing ```)',
        position: getTokenPosition(blockStartTok),
        endPosition: getTokenEndPosition(tokens[Math.min(index - 1, tokens.length - 1)]),
      })
    }
  }

  // Optional body: skip non-semantic tokens, then parse INDENT...DEDENT window
  // We compute indentation depth and slice the exact window for the body tokens.
  while (
    index < tokens.length &&
    (tokens[index].type === TokenTypes.NEWLINE ||
      tokens[index].type === TokenTypes.COMMENT ||
      tokens[index].type === TokenTypes.COMMENT_CONTENT)
  ) {
    index += 1
  }

  if (tokens[index] && tokens[index].type === TokenTypes.INDENT) {
    const bodyStart = index + 1
    let depth = 1
    let scan = bodyStart

  while (scan < tokens.length && depth > 0) {
      const t = tokens[scan]

      // Increase depth on nested INDENT to ensure we pair the correct closing DEDENT
      if (t.type === TokenTypes.INDENT) {
        depth += 1
      // Decrease depth on DEDENT; when it reaches 0, the body window is complete
      } else if (t.type === TokenTypes.DEDENT) {
        depth -= 1
      }

      // Advance to next token in the body scanning loop
      scan += 1
    }

    // Slice the exact token window representing the choice body (excluding the final DEDENT)
    const bodyTokens = tokens.slice(bodyStart, Math.max(bodyStart, scan - 1))
    body = parseSimpleStatements(bodyTokens)
    index = scan
  }

  const node = {
    kind: 'Choice',
    text,
    richText,
    tags: pendingTags.length ? pendingTags : undefined,
    choiceTags: pendingChoiceTags.length ? pendingChoiceTags : undefined,
    body,
    position,
    endPosition: getTokenEndPosition(tokens[Math.min(index - 1, tokens.length - 1)]),
  } as AstStatement

  return { node, nextIndex: index }
}


