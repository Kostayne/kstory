import type {
    AstInlineCallSegment,
    AstProgram,
    AstSection,
    AstStatement,
    AstTag,
    AstTextSegment,
} from '@/ast';
import type { ParserIssue } from '@/parser';

export interface SimpleJsonExport {
  metadata: {
    version: string;
    exportedAt: string;
    parserIssues: SimpleParserIssue[];
  };
  sections: SimpleSection[];
}

export interface SimpleParserIssue {
  kind: 'Error' | 'Warning';
  message: string;
}

export interface SimpleSection {
  name: string;
  tags?: SimpleTag[];
  statements: SimpleStatement[];
}

export interface SimpleTag {
  name: string;
  value?: string;
}

export interface SimpleStatement {
  kind: 'Goto' | 'Call' | 'Replica' | 'Choice';
  // Goto
  target?: string;
  // Call
  name?: string;
  args?: string[];
  // Replica
  text?: string;
  segments?: SimpleSegment[];
  // Choice
  choiceText?: string;
  choiceTags?: SimpleTag[];
  body?: SimpleStatement[];
  tags?: SimpleTag[];
}

export interface SimpleSegment {
  kind: 'Text' | 'InlineCall';
  text?: string;
  name?: string;
  args?: string[];
}

export function convertAstToSimpleJson(
  ast: AstProgram,
  issues: ParserIssue[]
): SimpleJsonExport {
  return {
    metadata: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      parserIssues: issues.map((issue) => ({
        kind: issue.kind,
        message: issue.message,
      })),
    },
    sections: ast.sections.map(convertSectionToSimple),
  };
}

function convertSectionToSimple(section: AstSection): SimpleSection {
  return {
    name: section.name,
    tags: section.tags?.map(convertTagToSimple),
    statements: section.body?.map(convertStatementToSimple) || [],
  };
}

function convertTagToSimple(tag: AstTag): SimpleTag {
  return {
    name: tag.name,
    value: tag.value,
  };
}

function convertStatementToSimple(statement: AstStatement): SimpleStatement {
  switch (statement.kind) {
    case 'Goto':
      return {
        kind: 'Goto',
        target: statement.target,
        tags: statement.tags?.map(convertTagToSimple),
      };

    case 'Call':
      return {
        kind: 'Call',
        name: statement.name,
        args: statement.args,
        tags: statement.tags?.map(convertTagToSimple),
      };

    case 'Replica':
      return {
        kind: 'Replica',
        text: statement.text,
        segments: statement.segments?.map(convertSegmentToSimple),
        tags: statement.tags?.map(convertTagToSimple),
      };

    case 'Choice':
      return {
        kind: 'Choice',
        choiceText: statement.text || statement.richText || '',
        tags: statement.tags?.map(convertTagToSimple),
        choiceTags: statement.choiceTags?.map(convertTagToSimple),
        body: statement.body?.map(convertStatementToSimple),
      };

    default:
      return { kind: 'Goto', target: 'unknown' };
  }
}

function convertSegmentToSimple(
  segment: AstTextSegment | AstInlineCallSegment
): SimpleSegment {
  if (segment.kind === 'Text') {
    return {
      kind: 'Text',
      text: segment.text,
    };
  } else if (segment.kind === 'InlineCall') {
    return {
      kind: 'InlineCall',
      name: segment.name,
      args: segment.args,
    };
  }
  return { kind: 'Text', text: 'unknown' };
}
