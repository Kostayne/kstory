import {
    type CompletionItem,
    CompletionItemKind,
    type CompletionParams,
    createConnection,
    type Definition,
    type DefinitionParams,
    type Diagnostic,
    DiagnosticSeverity,
    type DocumentSymbol,
    type DocumentSymbolParams,
    type FoldingRange,
    FoldingRangeKind,
    type FoldingRangeParams,
    type Hover,
    type HoverParams,
    type InitializeParams,
    type InitializeResult,
    type Location,
    type PrepareRenameParams,
    ProposedFeatures,
    type Range,
    type ReferenceParams,
    type RenameParams,
    SymbolKind,
    TextDocumentSyncKind,
    TextDocuments,
    type TextEdit,
    type WorkspaceEdit,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { parseAll } from '../src/parser';

// Single connection/documents
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Capabilities
connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      documentFormattingProvider: false,
      documentSymbolProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      hoverProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['>', ' ', '@', ':'],
      },
      renameProvider: { prepareProvider: true },
      foldingRangeProvider: true,
    },
  };
});

// Diagnostics (push)
function toDiagnostics(source: string): Diagnostic[] {
  const { issues } = parseAll(source);
  return issues.map((i): Diagnostic => {
    const start = i.position
      ? { line: i.position.line - 1, character: i.position.column - 1 }
      : { line: 0, character: 0 };
    const end = i.endPosition
      ? { line: i.endPosition.line - 1, character: i.endPosition.column - 1 }
      : start;
    return {
      range: { start, end },
      severity:
        i.kind === 'Error'
          ? DiagnosticSeverity.Error
          : DiagnosticSeverity.Warning,
      source: 'kstory',
      message: i.message,
    };
  });
}

documents.onDidOpen((e) => {
  const diagnostics = toDiagnostics(e.document.getText());
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics });
});

documents.onDidChangeContent((change) => {
  const diagnostics = toDiagnostics(change.document.getText());
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

// Helpers
function lspPos(line?: number, column?: number) {
  return {
    line: Math.max(0, (line ?? 1) - 1),
    character: Math.max(0, (column ?? 1) - 1),
  };
}

function tokenCovers(line: number, ch: number, tok: any): boolean {
  if (
    !tok ||
    tok.line == null ||
    tok.column == null ||
    tok.endLine == null ||
    tok.endColumn == null
  )
    return false;
  const s = lspPos(tok.line, tok.column);
  let e = lspPos(tok.endLine, tok.endColumn);
  // If lexer didn't set a positive end, expand by token value length
  const val = typeof tok.value === 'string' ? tok.value : '';
  if (val && s.line === e.line && s.character === e.character) {
    e = { line: s.line, character: s.character + val.length };
  }
  if (line < s.line || line > e.line) return false;
  if (line === s.line && ch < s.character) return false;
  if (line === e.line && ch > e.character) return false;
  return true;
}

function wordAt(doc: TextDocument, pos: { line: number; character: number }): { text: string; startChar: number; endChar: number } | null {
  const lineText = doc.getText({ start: { line: pos.line, character: 0 }, end: { line: pos.line + 1, character: 0 } })
  const re = /[A-Za-z0-9_-]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(lineText)) !== null) {
    const start = m.index
    const end = m.index + m[0].length
    if (pos.character >= start && pos.character <= end) {
      return { text: m[0], startChar: start, endChar: end }
    }
  }
  return null
}

function buildSectionIndexFromText(doc: TextDocument): Map<string, { uri: string; pos: { line: number; character: number } }> {
  const out = new Map<string, { uri: string; pos: { line: number; character: number } }>();
  const lineCount = (doc as any).lineCount as number | undefined;
  const totalLines = typeof lineCount === 'number' ? lineCount : doc.getText().split(/\n/).length;
  for (let line = 0; line < totalLines; line++) {
    const txt = doc.getText({ start: { line, character: 0 }, end: { line: line + 1, character: 0 } });
    const m = /^\s*==\s*([A-Za-z0-9_-]+)/.exec(txt);
    if (m) {
      const name = m[1];
      out.set(name.toLowerCase(), { uri: doc.uri, pos: { line, character: txt.indexOf(name) } });
    }
  }
  return out;
}

function findGotoRefsFromText(doc: TextDocument, name: string): Location[] {
  const refs: Location[] = [];
  const lower = name.toLowerCase();
  const lineCount = (doc as any).lineCount as number | undefined;
  const totalLines = typeof lineCount === 'number' ? lineCount : doc.getText().split(/\n/).length;
  for (let line = 0; line < totalLines; line++) {
    const txt = doc.getText({ start: { line, character: 0 }, end: { line: line + 1, character: 0 } });
    const re = /(->|=>)\s*([A-Za-z0-9_-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(txt)) !== null) {
      if (m[2].toLowerCase() === lower) {
        const start = { line, character: m.index + m[0].indexOf(m[2]) };
        const end = { line, character: start.character + m[2].length };
        refs.push({ uri: doc.uri, range: { start, end } });
      }
    }
  }
  return refs;
}

// Document Symbols
function buildSymbols(source: string): DocumentSymbol[] {
  const { program } = parseAll(source);
  const res: DocumentSymbol[] = [];
  for (const section of program.sections) {
    const secRange = {
      start: lspPos(section.position?.line, section.position?.column),
      end: lspPos(section.endPosition?.line, section.endPosition?.column),
    };
    const sec: DocumentSymbol = {
      name: section.name,
      kind: SymbolKind.Namespace,
      range: secRange,
      selectionRange: { start: secRange.start, end: secRange.start },
      children: [],
    };
    for (const st of section.body) {
      const r = {
        start: lspPos(st.position?.line, st.position?.column),
        end: lspPos(st.endPosition?.line, st.endPosition?.column),
      };
      if (st.kind === 'Replica')
        sec.children!.push({
          name: st.text.length > 40 ? st.text.slice(0, 37) + '…' : st.text,
          kind: SymbolKind.String,
          range: r,
          selectionRange: { start: r.start, end: r.start },
        });
      else if (st.kind === 'Goto')
        sec.children!.push({
          name: `goto ${st.target}`,
          kind: SymbolKind.Event,
          range: r,
          selectionRange: { start: r.start, end: r.start },
        });
      else if (st.kind === 'Call')
        sec.children!.push({
          name: `@call:${st.name}(${st.args.join(', ')})`,
          kind: SymbolKind.Function,
          range: r,
          selectionRange: { start: r.start, end: r.start },
        });
      else if (st.kind === 'Choice') {
        const label =
          st.text ?? (st.richText ? st.richText.split('\n')[0] : 'choice');
        const ch: DocumentSymbol = {
          name: `+${label}`,
          kind: SymbolKind.Event,
          range: r,
          selectionRange: { start: r.start, end: r.start },
          children: [],
        };
        if (st.body) {
          for (const b of st.body) {
            const br = {
              start: lspPos(b.position?.line, b.position?.column),
              end: lspPos(b.endPosition?.line, b.endPosition?.column),
            };
            if (b.kind === 'Goto')
              ch.children!.push({
                name: `goto ${b.target}`,
                kind: SymbolKind.Event,
                range: br,
                selectionRange: { start: br.start, end: br.start },
              });
            else if (b.kind === 'Call')
              ch.children!.push({
                name: `@call:${b.name}(${b.args.join(', ')})`,
                kind: SymbolKind.Function,
                range: br,
                selectionRange: { start: br.start, end: br.start },
              });
            else if (b.kind === 'Replica')
              ch.children!.push({
                name: b.text.length > 40 ? b.text.slice(0, 37) + '…' : b.text,
                kind: SymbolKind.String,
                range: br,
                selectionRange: { start: br.start, end: br.start },
              });
          }
        }
        sec.children!.push(ch);
      }
    }
    res.push(sec);
  }
  return res;
}

connection.onDocumentSymbol((p: DocumentSymbolParams): DocumentSymbol[] => {
  const doc = documents.get(p.textDocument.uri);
  if (!doc) return [];
  return buildSymbols(doc.getText());
});

// Go to Definition for goto targets
connection.onDefinition((params: DefinitionParams): Definition | undefined => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return undefined;
  const text = doc.getText();
  const { tokens, program } = parseAll(text);

  // debug: log the source line and position
  try {
    const lineText = doc.getText({ start: { line: params.position.line, character: 0 }, end: { line: params.position.line + 1, character: 0 } });
    connection.console.info(`[def] pos=${params.position.line}:${params.position.character} line='${lineText.replace(/\n/g, '')}'`);
  } catch {}

  const sectionIndex = new Map<
    string,
    { uri: string; pos: { line: number; character: number } }
  >();
  for (const s of program.sections)
    sectionIndex.set(s.name.toLowerCase(), {
      uri: doc.uri,
      pos: lspPos(s.position?.line, s.position?.column),
    });
  // Merge textual index for robustness when lexer misclassifies
  const textIdx = buildSectionIndexFromText(doc);
  for (const [k, v] of textIdx) { if (!sectionIndex.has(k)) sectionIndex.set(k, v); }
  connection.console.info(`[def] sections=[${Array.from(sectionIndex.keys()).join(', ')}]`);

  const cur = params.position;
  let iHit = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (tokenCovers(cur.line, cur.character, tokens[i] as any)) {
      iHit = i;
      break;
    }
  }
  if (iHit === -1) return undefined;

  const hit = tokens[iHit] as any;
  let prev: any;
  for (let j = iHit - 1; j >= 0; j--) {
    const t: any = tokens[j];
    if (
      t.type === 'NEWLINE' ||
      t.type === 'COMMENT' ||
      t.type === 'COMMENT_CONTENT'
    )
      continue;
    prev = t;
    break;
  }
  connection.console.info(`[def] hit type=${hit?.type} value='${String(hit?.value ?? '')}' prev=${prev?.type}`);

  if (hit.type === 'IDENTIFIER' && prev && prev.type === 'GOTO') {
    const def = sectionIndex.get(String(hit.value ?? '').trim().toLowerCase());
    if (def)
      return {
        uri: def.uri,
        range: { start: def.pos, end: def.pos },
      } as Location;
    connection.console.info(`[def] goto IDENTIFIER not found: '${String(hit.value ?? '')}'`);
  }

  // Fallback: inside goto node span
  for (const s of program.sections) {
    for (const st of s.body) {
      if (st.kind === 'Goto') {
        const sPos = lspPos(st.position?.line, st.position?.column);
        const ePos = lspPos(st.endPosition?.line, st.endPosition?.column);
        const inside = !(
          cur.line < sPos.line ||
          (cur.line === sPos.line && cur.character < sPos.character) ||
          cur.line > ePos.line ||
          (cur.line === ePos.line && cur.character > ePos.character)
        );
        if (inside) {
          const def = sectionIndex.get(st.target.trim().toLowerCase());
          if (def)
            return {
              uri: def.uri,
              range: { start: def.pos, end: def.pos },
            } as Location;
          connection.console.info(`[def] inside Goto, unresolved target='${st.target}'`);
        }
      }
    }
  }
  // Fallback 2: use plain word under cursor to resolve to a section
  const w = wordAt(doc, cur)
  if (w) {
    const def = sectionIndex.get(w.text.trim().toLowerCase())
    if (def) return { uri: def.uri, range: { start: def.pos, end: def.pos } } as Location
    connection.console.info(`[def] word fallback not found: '${w.text}'`)
  }
  return undefined;
});

// References provider: section declaration and all goto usages
connection.onReferences((params: ReferenceParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  const { tokens, program } = parseAll(text);

  const cur = params.position;
  let iHit = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (tokenCovers(cur.line, cur.character, tokens[i] as any)) {
      iHit = i;
      break;
    }
  }
  if (iHit === -1) return [];

  const hit = tokens[iHit] as any;
  let prev: any;
  for (let j = iHit - 1; j >= 0; j--) {
    const t: any = tokens[j];
    if (
      t.type === 'NEWLINE' ||
      t.type === 'COMMENT' ||
      t.type === 'COMMENT_CONTENT'
    )
      continue;
    prev = t;
    break;
  }
  let name: string | null = null;
  if (hit.type === 'IDENTIFIER') {
    name = String(hit.value ?? '').toLowerCase();
  } else {
    const w = wordAt(doc, cur);
    if (w) name = w.text.trim().toLowerCase();
  }
  if (!name) return [];
  const out: Location[] = [];

  if (params.context.includeDeclaration) {
    for (const s of program.sections) {
      if (s.name.toLowerCase() === name) {
        const pos = lspPos(s.position?.line, s.position?.column);
        out.push({ uri: doc.uri, range: { start: pos, end: pos } });
      }
    }
  }

  for (const s of program.sections) {
    for (const st of s.body) {
      if (st.kind === 'Goto' && st.target.toLowerCase() === name) {
        const start = lspPos(st.position?.line, st.position?.column);
        const end = lspPos(st.endPosition?.line, st.endPosition?.column);
        out.push({ uri: doc.uri, range: { start, end } });
      }
    }
  }

  // Fallback: textual scan
  if (out.length === 0) {
    if (params.context.includeDeclaration) {
      const secIdx = buildSectionIndexFromText(doc);
      const decl = secIdx.get(name);
      if (decl) out.push({ uri: decl.uri, range: { start: decl.pos, end: decl.pos } });
    }
    out.push(...findGotoRefsFromText(doc, name));
  }

  connection.console.info(`[refs] name='${name}' total=${out.length} includeDecl=${params.context.includeDeclaration}`);
  return out;
});

// Hover provider: brief info on section and goto targets
connection.onHover((params: HoverParams): Hover | undefined => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return undefined;
  const text = doc.getText();
  const { tokens, program } = parseAll(text);

  const cur = params.position;
  let iHit = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (tokenCovers(cur.line, cur.character, tokens[i] as any)) {
      iHit = i;
      break;
    }
  }
  if (iHit === -1) return undefined;

  const hit = tokens[iHit] as any;
  let prev: any;
  for (let j = iHit - 1; j >= 0; j--) {
    const t: any = tokens[j];
    if (
      t.type === 'NEWLINE' ||
      t.type === 'COMMENT' ||
      t.type === 'COMMENT_CONTENT'
    )
      continue;
    prev = t;
    break;
  }
  if (hit.type !== 'IDENTIFIER') return undefined;

  const raw = String(hit.value ?? '');
  const key = raw.toLowerCase();

  if (prev && prev.type === 'SECTION') {
    const found = program.sections.find((s) => s.name.toLowerCase() === key);
    const count = found ? found.body.length : 0;
    return {
      contents: {
        kind: 'markdown',
        value: `**section** ${raw} — ${count} item(s)`,
      },
    };
  }

  if (prev && prev.type === 'GOTO') {
    const exists = program.sections.some((s) => s.name.toLowerCase() === key);
    return {
      contents: {
        kind: 'markdown',
        value: exists ? `goto → ${raw}` : `goto → ${raw} _(unresolved)_`,
      },
    };
  }

  return undefined;
});

// Rename support (prepare + apply). In-document only.
function tokenRange(tok: any): Range {
  const start = lspPos(tok.line, tok.column);
  let end = lspPos(tok.endLine, tok.endColumn);
  const val = typeof tok.value === 'string' ? tok.value : '';
  if (val && start.line === end.line && start.character === end.character) {
    end = { line: start.line, character: start.character + val.length };
  }
  return { start, end };
}

function prevSignificant(tokens: any[], idx: number): any | undefined {
  for (let j = idx - 1; j >= 0; j--) {
    const t = tokens[j];
    if (!t) break;
    if (
      t.type === 'NEWLINE' ||
      t.type === 'COMMENT' ||
      t.type === 'COMMENT_CONTENT'
    )
      continue;
    return t;
  }
  return undefined;
}

connection.onPrepareRename((params: PrepareRenameParams): { range: Range; placeholder: string } | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const { tokens } = parseAll(doc.getText());
  const cur = params.position;
  for (let i = 0; i < tokens.length; i++) {
    if (tokenCovers(cur.line, cur.character, tokens[i] as any)) {
      const hit: any = tokens[i];
      const prev = prevSignificant(tokens as any[], i);
      if (hit?.type === 'IDENTIFIER' && (prev?.type === 'SECTION' || prev?.type === 'GOTO')) {
        connection.console.info(`[rename:prepare] ok type=${prev?.type} value='${String(hit.value ?? '')}'`);
        return { range: tokenRange(hit), placeholder: String(hit.value ?? '') };
      }
      break;
    }
  }
  // Fallback: plain word on section header line
  const w = wordAt(doc, cur);
  if (w) {
    const idx = buildSectionIndexFromText(doc);
    if (idx.has(w.text.toLowerCase())) {
      const range: Range = { start: { line: cur.line, character: w.startChar }, end: { line: cur.line, character: w.endChar } };
      return { range, placeholder: w.text };
    }
  }
  return null;
});

connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const text = doc.getText();
  const { tokens, program } = parseAll(text);
  const cur = params.position;

  // Find target token and its context
  let iHit = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (tokenCovers(cur.line, cur.character, tokens[i] as any)) {
      iHit = i;
      break;
    }
  }
  if (iHit === -1) return null;
  const hit: any = tokens[iHit];
  const prev = prevSignificant(tokens as any[], iHit);
  if (hit?.type !== 'IDENTIFIER' || !(prev?.type === 'SECTION' || prev?.type === 'GOTO')) {
    // Fallback: allow rename on plain word matching a known section; update header and all gotos
    const w = wordAt(doc, cur);
    if (!w) return null;
    const idx = buildSectionIndexFromText(doc);
    const key = w.text.toLowerCase();
    if (!idx.has(key)) return null;

    const edits: TextEdit[] = [];
    const seen = new Set<string>();
    const pushEdit = (range: Range, newText: string) => {
      const k = `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
      if (seen.has(k)) return;
      seen.add(k);
      edits.push({ range, newText });
    };

    // header edit
    const decl = idx.get(key)!;
    const hdrStart = { line: decl.pos.line, character: decl.pos.character };
    const hdrEnd = { line: decl.pos.line, character: decl.pos.character + w.text.length };
    pushEdit({ start: hdrStart, end: hdrEnd }, params.newName);

    // all gotos
    for (const loc of findGotoRefsFromText(doc, w.text)) pushEdit(loc.range, params.newName);

    return edits.length ? ({ changes: { [doc.uri]: edits } } as WorkspaceEdit) : null;
  }

  const oldNameRaw = String(hit.value ?? '');
  const oldKey = oldNameRaw.toLowerCase();
  const newName = params.newName;

  const edits: TextEdit[] = [];
  const seen = new Set<string>();
  const pushEdit = (range: Range, newText: string) => {
    const key = `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
    if (seen.has(key)) return;
    seen.add(key);
    edits.push({ range, newText });
  };

  // If renaming at section header → also update the header IDENTIFIER
  if (prev?.type === 'SECTION') {
    pushEdit(tokenRange(hit), newName);
  }

  // Update all GOTO IDENTIFIER tokens matching the old name
  for (let i = 0; i < tokens.length; i++) {
    const t: any = tokens[i];
    if (t?.type !== 'IDENTIFIER') continue;
    const p = prevSignificant(tokens as any[], i);
    if (p?.type === 'GOTO' && String(t.value ?? '').toLowerCase() === oldKey) {
      pushEdit(tokenRange(t), newName);
    }
  }

  // Find the section header IDENTIFIER token matching the old name (if rename initiated from usage)
  if (prev?.type === 'GOTO') {
    for (let i = 0; i < tokens.length; i++) {
      const t: any = tokens[i];
      if (t?.type !== 'IDENTIFIER') continue;
      const p = prevSignificant(tokens as any[], i);
      if (
        p?.type === 'SECTION' &&
        String(t.value ?? '').toLowerCase() === oldKey
      ) {
        pushEdit(tokenRange(t), newName);
        break;
      }
    }
  }

  // Textual fallbacks to ensure completeness (only when renaming a section symbol)
  if (prev?.type === 'SECTION' || prev?.type === 'GOTO') {
    const idx = buildSectionIndexFromText(doc);
    const decl = idx.get(oldKey);
    if (decl) {
      const start = { line: decl.pos.line, character: decl.pos.character };
      const end = { line: decl.pos.line, character: decl.pos.character + oldNameRaw.length };
      pushEdit({ start, end }, newName);
    }

    const textRefs = findGotoRefsFromText(doc, oldNameRaw);
    for (const loc of textRefs) {
      pushEdit(loc.range, newName);
    }
  }

  if (edits.length === 0) return null;
  connection.console.info(`[rename] '${oldNameRaw}' -> '${newName}', edits=${edits.length}`);
  const we: WorkspaceEdit = { changes: { [doc.uri]: edits } };
  return we;
});

// Folding ranges: sections and choice bodies
connection.onFoldingRanges((params: FoldingRangeParams): FoldingRange[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  const { program } = parseAll(text);

  const ranges: FoldingRange[] = [];

  // Sections
  for (const s of program.sections) {
    const startLine = (s.position?.line ?? 1) - 1;
    const endLine = (s.endPosition?.line ?? startLine) - 1;
    if (endLine > startLine) {
      ranges.push({ startLine, endLine, kind: FoldingRangeKind.Region });
    }
  }

  // Choice bodies (only the body, not the header line)
  for (const s of program.sections) {
    for (const st of s.body) {
      if (st.kind === 'Choice' && st.body && st.body.length > 0) {
        let minLine: number | undefined;
        let maxLine: number | undefined;
        for (const b of st.body) {
          const sl = (b.position?.line ?? 0) - 1;
          const el = (b.endPosition?.line ?? sl) - 1;
          if (!Number.isFinite(sl) || !Number.isFinite(el)) continue;
          minLine = minLine === undefined ? sl : Math.min(minLine, sl);
          maxLine = maxLine === undefined ? el : Math.max(maxLine, el);
        }
        if (
          minLine !== undefined &&
          maxLine !== undefined &&
          maxLine > minLine
        ) {
          ranges.push({
            startLine: minLine,
            endLine: maxLine,
            kind: FoldingRangeKind.Region,
          });
        }
      }
    }
  }

  return ranges;
});

// Completion: sections after '->', tags after '@', call names after '@call:'
connection.onCompletion((params: CompletionParams): CompletionItem[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  const { tokens, program } = parseAll(text);

  const pos = params.position;
  const linePrefix = doc.getText({
    start: { line: pos.line, character: 0 },
    end: pos,
  });

  const sectionNames = Array.from(
    new Set(program.sections.map((s) => s.name))
  ).sort((a, b) => a.localeCompare(b));
  const tagSet = new Set<string>();
  const callSet = new Set<string>();
  for (const t of tokens as any[]) {
    if (t.type === 'TAG' || t.type === 'CHOICE_TAG') {
      const v = String(t.value ?? '');
      if (v) tagSet.add(v);
    }
    if (t.type === 'CALL') {
      const v = String(t.value ?? '');
      if (v) callSet.add(v);
    }
  }

  // If previous significant token is GOTO, prefer sections
  let prev: any | undefined;
  let hit = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (tokenCovers(pos.line, pos.character, tokens[i] as any)) {
      hit = i;
      break;
    }
  }
  for (let j = hit === -1 ? tokens.length - 1 : hit - 1; j >= 0; j--) {
    const t: any = tokens[j];
    if (!t) break;
    if (
      t.type === 'NEWLINE' ||
      t.type === 'COMMENT' ||
      t.type === 'COMMENT_CONTENT'
    )
      continue;
    prev = t;
    break;
  }

  if (prev && prev.type === 'GOTO') {
    return sectionNames.map<CompletionItem>((label) => ({
      label,
      kind: CompletionItemKind.Reference,
    }));
  }

  if (/(?:->|=>)\s*$/.test(linePrefix)) {
    return sectionNames.map<CompletionItem>((label) => ({
      label,
      kind: CompletionItemKind.Reference,
    }));
  }

  if (/@call:[\w-]*$/.test(linePrefix)) {
    return Array.from(callSet)
      .sort((a, b) => a.localeCompare(b))
      .map<CompletionItem>((label) => ({
        label,
        kind: CompletionItemKind.Function,
      }));
  }

  if (/@{1,2}[\w-]*$/.test(linePrefix)) {
    return Array.from(tagSet)
      .sort((a, b) => a.localeCompare(b))
      .map<CompletionItem>((label) => ({
        label,
        kind: CompletionItemKind.Keyword,
      }));
  }

  return [];
});

// Wireup
documents.listen(connection);
connection.listen();
