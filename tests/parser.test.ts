import { beforeEach, describe, expect, it } from 'vitest';
import { Lexer } from '@/lexer';
import {
    getParserIssues,
    parseProgramFromTokens,
    parseSimpleStatements,
} from '@/parser';

const lex = (src: string) => {
  const lexer = new Lexer(src);
  lexer.process();
  return lexer.getTokens();
};

// Ensure parser issues buffer is reset before each test
beforeEach(() => {
  parseProgramFromTokens(lex('\n'));
});

describe('Parser: program sections', () => {
  it('creates implicit main when no sections', () => {
    const tokens = lex('" Hello\n');
    const { program } = parseProgramFromTokens(tokens);
    expect(program.sections.length).toBe(1);
    expect(program.sections[0].name).toBe('main');
    expect(program.sections[0].body.length).toBeGreaterThan(0);
  });

  it('parses explicit sections and bodies', () => {
    const src = '== Intro\n" hi\n== Next\n-> Intro\n';
    const tokens = lex(src);
    const { program } = parseProgramFromTokens(tokens);
    expect(program.sections.map((s) => s.name)).toEqual(['Intro', 'Next']);
    expect(program.sections[0].body[0].kind).toBe('Replica');
    expect(program.sections[1].body[0].kind).toBe('Goto');
  });

  it('reports issue if section has no name', () => {
    const { issues } = parseProgramFromTokens(lex('== \n'));
    expect(
      issues.find((i) => i.message.includes('Expected section name'))
    ).toBeTruthy();
  });
});

describe('Parser: simple statements', () => {
  it('parses Goto IDENTIFIER', () => {
    const stmts = parseSimpleStatements(lex('-> End\n'));
    expect(stmts.length).toBe(1);
    expect(stmts[0].kind).toBe('Goto');
    if (stmts[0].kind === 'Goto') expect(stmts[0].target).toBe('End');
  });

  it('emits error when Goto missing IDENTIFIER', () => {
    parseSimpleStatements(lex('->\n'));
    const issues = getParserIssues();
    expect(
      issues.find((i) =>
        i.message.includes('Goto must be followed by IDENTIFIER')
      )
    ).toBeTruthy();
  });

  it('parses Call with args and warns on empty call', () => {
    const withArgs = parseSimpleStatements(lex('@call:fn(1, "a")\n'));
    expect(withArgs[0].kind).toBe('Call');
    if (withArgs[0].kind === 'Call')
      expect(withArgs[0].args).toEqual(['1', '"a"']);

    parseSimpleStatements(lex('@call:fn\n'));
    const issues = getParserIssues();
    expect(
      issues.find((i) => i.message.includes('Empty or malformed call'))
    ).toBeTruthy();
  });

  it('parses Replica and splits inline {call:...} segments', () => {
    const stmts = parseSimpleStatements(
      lex('" Hello {call:say(1, "x")} world\n')
    );
    expect(stmts[0].kind).toBe('Replica');
    if (stmts[0].kind === 'Replica') {
      const replica = stmts[0];
      expect(replica.segments && replica.segments.length).toBeGreaterThan(1);
      const inline = replica.segments?.find((s) => s.kind === 'InlineCall');
      expect(inline).toBeTruthy();
    }
  });
});

describe('Parser: Choice', () => {
  it('parses inline choice text and optional body', () => {
    const src = '+ Hello\n  -> Next\n';
    const { program } = parseProgramFromTokens(lex(src));
    const section = program.sections[0];
    const choice = section.body[0];
    expect(choice.kind).toBe('Choice');
    if (choice.kind === 'Choice') {
      expect(choice.text).toBe(' Hello');
      expect(choice.body && choice.body[0].kind).toBe('Goto');
    }
  });

  it('attaches @tags and @@choice_tags correctly', () => {
    const src = '@ui dark\n@@only true\n+ Hello\n';
    const stmts = parseSimpleStatements(lex(src));
    expect(stmts[0].kind).toBe('Choice');
    if (stmts[0].kind === 'Choice') {
      expect(stmts[0].tags?.map((t) => t.name)).toContain('ui');
      expect(stmts[0].tags?.find((t) => t.name === 'ui')?.value).toBe(' dark');
      expect(stmts[0].choiceTags?.map((t) => t.name)).toContain('@only');
      expect(stmts[0].choiceTags?.find((t) => t.name === '@only')?.value).toBe(
        ' true'
      );
    }
  });
});
