import type { Hover, TextDocumentPositionParams } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from './logger';

const logger = Logger.getInstance();

// Regular expressions - defined once for performance
const GOTO_PATTERN = /(?:->|=>)\s*([^,\s]+)/;
const ATCALL_PATTERN = /@call:\w*\([^)]*$/;
const INLINE_CALL_PATTERN = /\{call:\w*\([^)]*$/;
const GOTO_SECTION_PATTERN = /(?:->|=>)\s*([^,\s]+)$/;

// Check if we're inside a function call
function isInsideFunctionCall(line: string, charIndex: number): boolean {
  // Check if we're inside @call:function() or {call:function()}
  const beforeCursor = line.substring(0, charIndex);
  
  // Check for @call:function()
  const atCallMatch = beforeCursor.match(ATCALL_PATTERN);
  if (atCallMatch) {
    return true;
  }
  
  // Check for {call:function()
  const inlineCallMatch = beforeCursor.match(INLINE_CALL_PATTERN);
  if (inlineCallMatch) {
    return true;
  }
  
  return false;
}

// Get section information at position
function getSectionAtPosition(
  document: TextDocument,
  position: { line: number; character: number }
): { name: string; line: number } | null {
  const text = document.getText();
  const lines = text.split('\n');
  const currentLine = lines[position.line];
  
  // Check if we're on a section line
  if (currentLine.trim().startsWith('==')) {
    const sectionName = currentLine.trim().substring(2).trim();
    if (sectionName) {
      return { name: sectionName, line: position.line };
    }
  }
  
  return null;
}

// Get goto target information
function getGotoTarget(
  document: TextDocument,
  position: { line: number; character: number }
): { target: string; line: number } | null {
  const text = document.getText();
  const lines = text.split('\n');
  const currentLine = lines[position.line];
  
  // Check if we're on a goto line
  if (currentLine.includes('->') || currentLine.includes('=>')) {
    const gotoMatch = currentLine.match(GOTO_PATTERN);
    if (gotoMatch) {
      const targetSection = gotoMatch[1];
      return { target: targetSection, line: position.line };
    }
  }
  
  return null;
}

// Check if section exists in document
function sectionExists(document: TextDocument, sectionName: string): boolean {
  const text = document.getText();
  const lines = text.split('\n');
  
  return lines.some(line => {
    if (line.trim().startsWith('==')) {
      const name = line.trim().substring(2).trim();
      return name === sectionName;
    }
    return false;
  });
}

// Generate hover content
export function generateHover(
  params: TextDocumentPositionParams,
  document: TextDocument
): Hover | null {
  const text = document.getText();
  const lines = text.split('\n');
  const currentLine = lines[params.position.line];
  const currentChar = currentLine[params.position.character];

  logger.debug(`Generating hover at line ${params.position.line + 1}, char: ${currentChar}`);

  // Hover for sections
  const section = getSectionAtPosition(document, params.position);
  if (section) {
    return {
      contents: {
        kind: 'markdown',
        value: [
          `**Section: ${section.name}**`,
          '',
          'Defines a new section in the story.',
          '',
          '**Usage:**',
          '```kstory',
          `== ${section.name}`,
          '" Some content',
          '-> OtherSection',
          '```',
          '',
          '**Tip:** Right-click and select "Rename Symbol" to rename this section and update all references.'
        ].join('\n')
      }
    };
  }

  // Hover for goto targets
  const goto = getGotoTarget(document, params.position);
  if (goto) {
    const exists = sectionExists(document, goto.target);
    const status = exists ? '✅' : '❌';
    
    return {
      contents: {
        kind: 'markdown',
        value: [
          `**Goto: ${goto.target}** ${status}`,
          '',
          exists ? 'Section exists in document.' : '**Warning:** Section not found!',
          '',
          '**Usage:**',
          '```kstory',
          `-> ${goto.target}`,
          '```',
          '',
          '**Alternative syntax:**',
          '```kstory',
          `=> ${goto.target}`,
          '```',
          '',
          '**Tip:** Right-click and select "Rename Symbol" to rename this section and update all references.'
        ].join('\n')
      }
    };
  }

  // Hover for keywords
  if (currentChar === '@') {
    return {
      contents: {
        kind: 'markdown',
        value: [
          '**Tag/Function Call**',
          '',
          '**Available options:**',
          '- `@tag` - Define a tag',
          '- `@@choice` - Define a choice-specific tag',
          '- `@call:function()` - Call a function',
          '',
          '**Examples:**',
          '```kstory',
          '@meta info',
          '@call:init("param")',
          '@@choice enabled',
          '```'
        ].join('\n')
      }
    };
  }

  if (currentChar === '+') {
    return {
      contents: {
        kind: 'markdown',
        value: [
          '**Choice**',
          '',
          'Defines a user choice option.',
          '',
          '**Usage:**',
          '```kstory',
          '+ Choice text',
          '  -> TargetSection',
          '```',
          '',
          '**With tags:**',
          '```kstory',
          '+ Choice text',
          '  @@enabled true',
          '  -> TargetSection',
          '```'
        ].join('\n')
      }
    };
  }

  // Replica starts with " and space, but not inside function calls
  if (currentChar === '"' && !isInsideFunctionCall(currentLine, params.position.character)) {
    return {
      contents: {
        kind: 'markdown',
        value: [
          '**Replica**',
          '',
          'Starts a character dialogue.',
          '',
          '**Features:**',
          '- Continues until next token',
          '- Can contain inline calls',
          '- Supports multiline text',
          '',
          '**Usage:**',
          '```kstory',
          '" Hello {call:func()} world',
          '  continues here',
          '-> NextSection',
          '```'
        ].join('\n')
      }
    };
  }

  if (currentChar === '{') {
    return {
      contents: {
        kind: 'markdown',
        value: [
          '**Inline Call**',
          '',
          'Function call within replica text.',
          '',
          '**Usage:**',
          '```kstory',
          '" Hello {call:func("param")} world',
          '```',
          '',
          '**Note:** Replica continues after the call.'
        ].join('\n')
      }
    };
  }

  // Hover for section references in goto
  const lineBeforeCursor = currentLine.substring(0, params.position.character);
  const gotoMatch = lineBeforeCursor.match(GOTO_SECTION_PATTERN);
  if (gotoMatch) {
    const targetSection = gotoMatch[1];
    const exists = sectionExists(document, targetSection);
    const status = exists ? '✅' : '❌';
    
    return {
      contents: {
        kind: 'markdown',
        value: [
          `**Section Reference: ${targetSection}** ${status}`,
          '',
          exists ? 'Section exists in document.' : '**Warning:** Section not found!',
          '',
          '**Usage:**',
          '```kstory',
          `-> ${targetSection}`,
          '```'
        ].join('\n')
      }
    };
  }

  return null;
}
