export type SourcePosition = {
  line: number
  column: number
}

export type AstTag = {
  name: string
  value?: string
  position?: SourcePosition
  endPosition?: SourcePosition
}

export type AstGoto = {
  kind: 'Goto'
  target: string
  tags?: AstTag[]
  position?: SourcePosition
  endPosition?: SourcePosition
}

export type AstCall = {
  kind: 'Call'
  name: string
  args: string[]
  tags?: AstTag[]
  position?: SourcePosition
  endPosition?: SourcePosition
}

export type AstReplica = {
  kind: 'Replica'
  text: string
  tags?: AstTag[]
  position?: SourcePosition
  endPosition?: SourcePosition
  segments?: Array<AstTextSegment | AstInlineCallSegment>
}

export type AstTextSegment = {
  kind: 'Text'
  text: string
  position?: SourcePosition
  endPosition?: SourcePosition
}

export type AstInlineCallSegment = {
  kind: 'InlineCall'
  name: string
  args: string[]
  position?: SourcePosition
  endPosition?: SourcePosition
}

export type AstChoice = {
  kind: 'Choice'
  // Inline text after '+', when delimited by silent ``` bounds
  text?: string
  // Multiline choice text delimited by visible ``` bounds; stored as a single string with newlines
  richText?: string
  // Regular @tags attached before the choice
  tags?: AstTag[]
  // Choice-specific @@tags
  choiceTags?: AstTag[]
  // Body (statements) will be supported later
  body?: AstStatement[]
  position?: SourcePosition
  endPosition?: SourcePosition
}

export type AstStatement = AstGoto | AstCall | AstReplica | AstChoice

export type AstSection = {
  name: string
  tags?: AstTag[]
  body: AstStatement[]
  position?: SourcePosition
  endPosition?: SourcePosition
}

export type AstProgram = {
  sections: AstSection[]
}


