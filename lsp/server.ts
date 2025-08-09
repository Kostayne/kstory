import {
    createConnection,
    type Definition,
    type DefinitionParams,
    type Diagnostic,
    DiagnosticSeverity,
    type DocumentSymbol,
    type DocumentSymbolParams,
    type InitializeParams,
    type InitializeResult,
    type Location,
    ProposedFeatures,
    SymbolKind,
    TextDocumentSyncKind,
    TextDocuments,
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
  const e = lspPos(tok.endLine, tok.endColumn);
  if (line < s.line || line > e.line) return false;
  if (line === s.line && ch < s.character) return false;
  if (line === e.line && ch > e.character) return false;
  return true;
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

  const sectionIndex = new Map<
    string,
    { uri: string; pos: { line: number; character: number } }
  >();
  for (const s of program.sections)
    sectionIndex.set(s.name.toLowerCase(), {
      uri: doc.uri,
      pos: lspPos(s.position?.line, s.position?.column),
    });

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

  if (hit.type === 'IDENTIFIER' && prev && prev.type === 'GOTO') {
    const def = sectionIndex.get(String(hit.value ?? '').toLowerCase());
    if (def)
      return {
        uri: def.uri,
        range: { start: def.pos, end: def.pos },
      } as Location;
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
          const def = sectionIndex.get(st.target.toLowerCase());
          if (def)
            return {
              uri: def.uri,
              range: { start: def.pos, end: def.pos },
            } as Location;
        }
      }
    }
  }
  return undefined;
});

// Wireup
documents.listen(connection);
connection.listen();
