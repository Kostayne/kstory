# KStory

A language server and CLI tools for the KStory interactive fiction scripting language.

## What is KStory?

KStory is a development toolset for creating interactive fiction and visual novels. It provides a simple scripting language (`.ks`) for writing stories with choices, branching narratives, and dialogue, along with tools to convert these stories into formats that can be used in games and applications.

## Why KStory?

### **The Problem**
When creating interactive stories, writers and developers face several challenges:

- **Complex integration**: Writers need to learn programming languages or complex scripting systems
- **Content management**: Story changes require technical intervention
- **Performance issues**: Large story files can slow down games
- **Collaboration barriers**: Writers and developers work in different formats

### **The Solution**
KStory separates content creation from technical implementation:

- **Simple syntax**: Write stories in a human-readable format
- **Direct export**: Convert stories to JSON for game engines
- **Performance optimized**: Two export modes (simple for games, full for development)
- **Team workflow**: Writers and developers can work independently

## Core Features

### **Language Server (LSP)**
- Syntax highlighting and error checking for `.ks` files
- Autocomplete and navigation in VS Code
- Real-time validation and diagnostics

### **CLI Exporter**
- Convert `.ks` files to JSON format
- Simple mode: Optimized for game engines (smaller files)
- Full mode: Includes position data for development tools
- Pretty printing and verbose logging options

### **Story Format**
The `.ks` format supports:
- **Sections**: Organize story into chapters or scenes
- **Dialogue**: Write character conversations
- **Choices**: Create branching story paths
- **Functions**: Call game logic and variables
- **Tags**: Add metadata and annotations

## Use Cases

### **Visual Novels**
Create branching narratives with multiple endings and character routes.

### **Interactive Fiction**
Build text-based adventures and choose-your-own-path stories.

### **Game Dialogue Systems**
Integrate complex dialogue trees into existing games.

### **Educational Content**
Create interactive learning experiences with branching scenarios.

## Getting Started

### **Installation**

#### **From Source**
```bash
git clone https://github.com/kostayne/kstory.git
cd kstory
pnpm install
pnpm run build:exporter
```

#### **Global Installation (when published)**
```bash
npm install -g kstory
# or
pnpm add -g kstory
```

### **Writing a Story**
Create a `.ks` file (see `examples/basic-story.ks` for a complete example):
```ks
# Single line comment
/*
  Multiline comment
*/

@author Author Name
@title Story Title

== Chapter_One
" Hello, welcome to the story!

+ Continue reading
  @@color blue
  @@action continue
  -> Chapter_Two

+ Skip to action
  @@color red
  @@action skip
  ```
  This is a multiline text block
  that can span multiple lines
  ```
  -> Chapter_Action

== Chapter_Two
@author Narrator
" Here's more of the story...
-> Chapter_One
```

### **Exporting for Games**
```bash
# Simple format for game engines
node dist/exporter/index.js story.ks --pretty

# Full format with position data
node dist/exporter/index.js story.ks --full --pretty
```

## Technical Details

### **Export Formats**

**Simple Format** (Default)
```json
{
  "metadata": {
    "version": "1.0.0",
    "exportedAt": "2025-08-11T15:37:12.794Z",
    "parserIssues": []
  },
  "sections": [
    {
      "name": "Chapter_One",
      "statements": [
        {
          "kind": "Replica",
          "text": "Hello, welcome to the story!"
        },
        {
          "kind": "Choice",
          "choiceText": "Continue reading",
          "body": [
            {
              "kind": "Goto",
              "target": "Chapter_Two"
            }
          ]
        }
      ]
    }
  ]
}
```

**Full Format** (with `--full` flag)
Includes position data for development tools and debugging.

### **Performance**
- Simple export: ~60% smaller than full export
- Fast parsing of large story files
- Memory efficient processing

## Development

### **Building**
```bash
# Build exporter
pnpm run build:exporter

# Build LSP components
pnpm run build:lsp

# Development with watch
pnpm run dev
```

### **Testing**
```bash
# Run tests
pnpm run test

# Lint code
npx @biomejs/biome check src/
```

## Project Structure
```
kstory/
├── src/                    # Core source code
│   ├── lexer.ts           # Tokenizer for .ks files
│   ├── parser.ts          # AST parser
│   ├── ast.ts             # Type definitions
│   └── exporter/          # CLI exporter
├── lsp/                   # Language Server Protocol
├── tests/                 # Test files
└── dist/                  # Built output
```

## Benefits

### **For Writers**
- Focus on storytelling, not technical syntax
- Easy to read and edit story files
- Version control friendly format
- No programming knowledge required

### **For Developers**
- Clean JSON output for easy integration
- Performance optimized exports
- Standardized format across projects
- Reduced development time for dialogue systems

### **For Teams**
- Parallel development of content and features
- Clear separation of concerns
- Easy content updates without code changes
- Consistent workflow across projects

## Limitations

- Currently supports basic interactive fiction features
- Limited to text-based content (no images or audio)
- Requires custom integration for specific game engines
- No built-in story validation beyond syntax

## License

MIT License - see [LICENSE](LICENSE) file for details.