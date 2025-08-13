import type {
  AstInlineCallSegment,
  AstProgram,
  AstSection,
  AstStatement,
  AstTag,
  AstTextSegment,
  ParserIssue,
} from '@kstory/core';

export interface JsonExport {
  metadata: {
    version: string;
    exportedAt: string;
    parserIssues: JsonParserIssue[];
  };
  sections: JsonSection[];
}

export interface JsonParserIssue {
  kind: 'Error' | 'Warning';
  message: string;
  position?: JsonPosition;
  endPosition?: JsonPosition;
}

export interface JsonPosition {
  line: number;
  column: number;
}

export interface JsonSection {
  name: string;
  tags?: JsonTag[];
  statements: JsonStatement[];
  position?: JsonPosition;
  endPosition?: JsonPosition;
}

export interface JsonTag {
  name: string;
  value?: string;
  position?: JsonPosition;
  endPosition?: JsonPosition;
}

export interface JsonStatement {
  kind: 'Goto' | 'Call' | 'Replica' | 'Choice';
  tags?: JsonTag[];
  position?: JsonPosition;
  endPosition?: JsonPosition;
  // Goto specific
  target?: string;
  // Call specific
  name?: string;
  args?: string[];
  // Replica specific
  text?: string;
  segments?: JsonSegment[];
  // Choice specific
  choiceText?: string;
  richText?: string;
  choiceTags?: JsonTag[];
  body?: JsonStatement[];
}

export interface JsonSegment {
  kind: 'Text' | 'InlineCall';
  text?: string;
  name?: string;
  args?: string[];
  position?: JsonPosition;
  endPosition?: JsonPosition;
}

export function convertAstToJson(
  program: AstProgram,
  issues: ParserIssue[]
): JsonExport {
  return {
    metadata: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      parserIssues: issues.map(convertParserIssue),
    },
    sections: program.sections.map(convertSection),
  };
}

function convertParserIssue(issue: ParserIssue): JsonParserIssue {
  return {
    kind: issue.kind,
    message: issue.message,
    position: issue.position ? convertPosition(issue.position) : undefined,
    endPosition: issue.endPosition
      ? convertPosition(issue.endPosition)
      : undefined,
  };
}

function convertSection(section: AstSection): JsonSection {
  return {
    name: section.name,
    tags: section.tags?.map(convertTag),
    statements: section.body.map(convertStatement),
    position: section.position ? convertPosition(section.position) : undefined,
    endPosition: section.endPosition
      ? convertPosition(section.endPosition)
      : undefined,
  };
}

function convertStatement(statement: AstStatement): JsonStatement {
  const base: JsonStatement = {
    kind: statement.kind,
    tags: statement.tags?.map(convertTag),
    position: statement.position
      ? convertPosition(statement.position)
      : undefined,
    endPosition: statement.endPosition
      ? convertPosition(statement.endPosition)
      : undefined,
  };

  switch (statement.kind) {
    case 'Goto':
      return {
        ...base,
        target: statement.target,
      };

    case 'Call':
      return {
        ...base,
        name: statement.name,
        args: statement.args,
      };

    case 'Replica':
      return {
        ...base,
        text: statement.text,
        segments: statement.segments?.map(convertSegment),
      };

    case 'Choice':
      return {
        ...base,
        choiceText: statement.text,
        richText: statement.richText,
        choiceTags: statement.choiceTags?.map(convertTag),
        body: statement.body?.map(convertStatement),
      };

    default:
      return base;
  }
}

function convertTag(tag: AstTag): JsonTag {
  return {
    name: tag.name,
    value: tag.value,
    position: tag.position ? convertPosition(tag.position) : undefined,
    endPosition: tag.endPosition ? convertPosition(tag.endPosition) : undefined,
  };
}

function convertSegment(
  segment: AstTextSegment | AstInlineCallSegment
): JsonSegment {
  const base: JsonSegment = {
    kind: segment.kind,
    position: segment.position ? convertPosition(segment.position) : undefined,
    endPosition: segment.endPosition
      ? convertPosition(segment.endPosition)
      : undefined,
  };

  if (segment.kind === 'Text') {
    return {
      ...base,
      text: segment.text,
    };
  } else if (segment.kind === 'InlineCall') {
    return {
      ...base,
      name: segment.name,
      args: segment.args,
    };
  }

  return base;
}

function convertPosition(position: {
  line: number;
  column: number;
}): JsonPosition {
  return {
    line: position.line,
    column: position.column,
  };
}
