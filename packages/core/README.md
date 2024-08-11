# @kstory/core

Core parser and lexer for the KStory interactive fiction language.

## Features

- **Lexer**: Tokenizes KStory source code
- **Parser**: Builds Abstract Syntax Tree (AST) from tokens
- **AST Types**: TypeScript definitions for all AST nodes
- **Error Handling**: Comprehensive error reporting with position information

## Installation

```bash
npm install @kstory/core
# or
pnpm add @kstory/core
```

## Usage

```typescript
import { parseFromSource, Lexer } from '@kstory/core';

// Parse source code directly
const result = parseFromSource(`
== Chapter_One
" Hello, world!
+ Continue
  -> Chapter_Two
`);

console.log(result.program.sections);
console.log(result.issues);

// Use lexer directly
const lexer = new Lexer(sourceCode);
lexer.process();
const tokens = lexer.getTokens();
```

## API

### `parseFromSource(source: string): ParseResult`

Parses KStory source code and returns AST with any parsing issues.

### `Lexer`

Tokenizes source code into tokens.

### Types

- `AstProgram`: Root AST node
- `AstSection`: Story section/chapter
- `AstStatement`: Statement types (Replica, Choice, Goto, Call)
- `AstTag`: Metadata tags
- `ParseResult`: Result of parsing with program and issues

## Development

```bash
# Build
pnpm run build

# Test
pnpm run test

# Lint
pnpm run lint
```
