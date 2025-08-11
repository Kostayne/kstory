# KStory

> **Transform your stories into interactive experiences** 🎭

A powerful language server and CLI tools for the KStory interactive fiction scripting language. Write branching narratives, visual novels, and interactive stories with a simple, human-readable syntax.

## ✨ What is KStory?

KStory is a development toolset that bridges the gap between storytelling and game development. It provides a simple scripting language (`.ks`) for writing stories with choices, branching narratives, and dialogue, along with professional tools to convert these stories into formats that can be used in games and applications.

### 🎯 The Vision
Imagine a world where writers can focus purely on storytelling while developers seamlessly integrate their work into games. KStory makes this vision a reality.

## 🚀 Why KStory?

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

## 🛠️ Core Features

### **Story Format**
The `.ks` format supports:
- **Sections**: Organize story into chapters or scenes
- **Dialogue**: Write character conversations
- **Choices**: Create branching story paths
- **Functions**: Call game logic and variables
- **Tags**: Add metadata and annotations

## 📚 The KStory Language

### **Simple & Intuitive Syntax**
KStory uses a clean, readable syntax that feels natural to writers:

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

### **Key Language Features**

| Feature | Syntax | Description |
|---------|--------|-------------|
| **Sections** | `== ChapterName` | Define story chapters or scenes |
| **Dialogue** | `" Text here` | Character speech and narration |
| **Choices** | `+ Choice text` | Player decisions with branching |
| **Functions** | `@call:functionName(args)` | Call game logic |
| **Tags** | `@@tagName value` | Add metadata and styling |
| **Goto** | `-> TargetSection` | Navigate between sections |

## 🎮 Use Cases

### **Visual Novels**
Create branching narratives with multiple endings and character routes.

### **Interactive Fiction**
Build text-based adventures and choose-your-own-path stories.

### **Game Dialogue Systems**
Integrate complex dialogue trees into existing games.

### **Educational Content**
Create interactive learning experiences with branching scenarios.

## 🚀 Getting Started

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

### **Your First Story**
1. Create a `.ks` file with your story
2. Use the simple syntax to write dialogue and choices
3. Export to JSON for your game engine

### **Exporting for Games**
```bash
# Simple format for game engines
node dist/exporter/index.js story.ks --pretty

# Full format with position data
node dist/exporter/index.js story.ks --full --pretty
```

## 🔧 Technical Details

### **Export Formats**

**Simple Format** (Default) - Optimized for production
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

**Full Format** (with `--full` flag) - Includes position data for development tools and debugging.

### **Performance**
- Simple export: ~60% smaller than full export
- Fast parsing of large story files
- Memory efficient processing

## 💡 Benefits

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

## 🛠️ Development

### **Building**
```bash
# Build all components
pnpm run build

# Build individual components
pnpm run build:exporter
pnpm run build:lsp
pnpm run build:client
pnpm run build:server

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

## 📁 Project Structure
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

## 🔧 Tools & Infrastructure

### **Language Server (LSP)**
- Syntax highlighting and error checking for `.ks` files
- Autocomplete and navigation in VS Code
- Real-time validation and diagnostics

### **CLI Exporter**
- Convert `.ks` files to JSON format
- Simple mode: Optimized for game engines (smaller files)
- Full mode: Includes position data for development tools
- Pretty printing and verbose logging options

## ⚠️ Limitations

- Currently supports basic interactive fiction features
- Limited to text-based content (no images or audio)
- Requires custom integration for specific game engines
- No built-in story validation beyond syntax

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Ready to transform your stories?** Start with the [basic example](examples/basic-story.ks) and unleash your creativity! 🎭✨