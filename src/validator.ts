import type {
    AstProgram,
    AstSection,
    AstStatement,
    SourcePosition,
} from '@/ast';
import { type Token, TokenTypes } from '@/token';

export type ValidationIssue = {
  kind: 'Error' | 'Warning';
  message: string;
  position?: SourcePosition;
  endPosition?: SourcePosition;
};

// Minimal semantic validation pass
export function validateProgram(program: AstProgram): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check duplicate section names (case-insensitive)
  const seen = new Map<
    string,
    { count: number; position?: SourcePosition; endPosition?: SourcePosition }
  >();
  for (const section of program.sections) {
    const key = section.name.toLowerCase();
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, {
        count: 1,
        position: section.position,
        endPosition: section.endPosition,
      });
    } else {
      prev.count += 1;
    }
  }

  for (const [name, meta] of seen) {
    if (meta.count > 1) {
      issues.push({
        kind: 'Error',
        message: `Duplicate section name: ${name}`,
        position: meta.position,
        endPosition: meta.endPosition,
      });
    }
  }

  // Validate each section and its statements
  for (const section of program.sections) {
    issues.push(...validateSection(section));
  }

  // Cross-section checks
  const sectionNames = new Set(
    program.sections.map((s) => s.name.toLowerCase())
  );
  const referencedSections = new Set<string>();
  const gotoTargets = collectGotoTargets(program);

  for (const { target, position, endPosition } of gotoTargets) {
    const key = target.toLowerCase();
    if (!sectionNames.has(key)) {
      issues.push({
        kind: 'Error',
        message: `Goto target not found: '${target}'`,
        position,
        endPosition,
      });
    } else {
      referencedSections.add(key);
    }
  }

  for (const section of program.sections) {
    const key = section.name.toLowerCase();
    if (!referencedSections.has(key) && key !== 'main') {
      issues.push({
        kind: 'Warning',
        message: `Unreferenced section: '${section.name}'`,
        position: section.position,
        endPosition: section.endPosition,
      });
    }
  }

  return issues;
}

// Report lexer-level errors as issues
export function validateTokens(tokens: Token<unknown>[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const t of tokens) {
    if (t.type === TokenTypes.ERROR) {
      issues.push({
        kind: 'Error',
        message: `Lexing error: ${String(t.value ?? '').trim()}`,
        position:
          t.line !== undefined && t.column !== undefined
            ? { line: t.line, column: t.column }
            : undefined,
        endPosition:
          t.endLine !== undefined && t.endColumn !== undefined
            ? { line: t.endLine, column: t.endColumn }
            : undefined,
      });
    }
  }

  return issues;
}

// Validate a single section
function validateSection(section: AstSection): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (section.body.length === 0) {
    issues.push({
      kind: 'Warning',
      message: `Section '${section.name}' has no statements`,
      position: section.position,
      endPosition: section.endPosition,
    });
  }

  issues.push(...validateStatements(section.body, section.name));
  return issues;
}

// Validate a flat list of statements; recurses into choice bodies
function validateStatements(
  statements: AstStatement[],
  sectionName: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const statement of statements) {
    if (statement.kind === 'Call') {
      if (!statement.name || statement.name.trim().length === 0) {
        issues.push({
          kind: 'Error',
          message: `Empty call name in section '${sectionName}'`,
          position: statement.position,
          endPosition: statement.endPosition,
        });
      }

      continue;
    }

    if (statement.kind === 'Choice') {
      const hasInline =
        typeof statement.text === 'string' && statement.text.length > 0;
      const hasBlock =
        typeof statement.richText === 'string' && statement.richText.length > 0;

      if (hasInline && hasBlock) {
        issues.push({
          kind: 'Error',
          message: `Choice has both text and richText in section '${sectionName}'`,
          position: statement.position,
          endPosition: statement.endPosition,
        });
      }

      if (
        !hasInline &&
        !hasBlock &&
        (!statement.body || statement.body.length === 0)
      ) {
        issues.push({
          kind: 'Warning',
          message: `Empty choice in section '${sectionName}'`,
          position: statement.position,
          endPosition: statement.endPosition,
        });
      }

      // Duplicate @@choice_tag names within a single choice (case-insensitive)
      if (statement.choiceTags && statement.choiceTags.length > 0) {
        const seen = new Set<string>();
        for (const tag of statement.choiceTags) {
          const key = tag.name.toLowerCase();
          if (seen.has(key)) {
            issues.push({
              kind: 'Error',
              message: `Duplicate choice tag '${tag.name}' in section '${sectionName}'`,
              position: statement.position,
              endPosition: statement.endPosition,
            });
          } else {
            seen.add(key);
          }
        }
      }

      if (statement.body && statement.body.length > 0) {
        issues.push(...validateStatements(statement.body, sectionName));
      }

      continue;
    }

    if (statement.kind === 'Replica') {
      if (statement.text.trim().length === 0) {
        issues.push({
          kind: 'Warning',
          message: `Empty replica text in section '${sectionName}'`,
          position: statement.position,
          endPosition: statement.endPosition,
        });
      }
    }
  }

  return issues;
}

// Collect all Goto targets across the program (case preserved for messages)
function collectGotoTargets(
  program: AstProgram
): {
  target: string;
  position?: SourcePosition;
  endPosition?: SourcePosition;
}[] {
  const targets: {
    target: string;
    position?: SourcePosition;
    endPosition?: SourcePosition;
  }[] = [];

  for (const section of program.sections) {
    collectFromStatements(section.body);
  }

  return targets;

  function collectFromStatements(stmts: AstStatement[]) {
    for (const st of stmts) {
      if (st.kind === 'Goto') {
        targets.push({
          target: st.target,
          position: st.position,
          endPosition: st.endPosition,
        });
      } else if (st.kind === 'Choice' && st.body) {
        collectFromStatements(st.body);
      }
    }
  }
}
