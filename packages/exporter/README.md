# @kstory/exporter

CLI exporter for the KStory interactive fiction language.

## Features

- **JSON Export**: Convert `.ks` files to JSON format
- **Multiple Formats**: Simple (optimized) and full (with position data) export modes
- **CLI Interface**: Easy-to-use command line interface
- **Pretty Printing**: Formatted JSON output
- **Verbose Logging**: Detailed export information

## Installation

```bash
npm install @kstory/exporter
# or
pnpm add @kstory/exporter
```

## Usage

### Command Line

```bash
# Basic export
kstory story.ks

# Pretty print output
kstory story.ks --pretty

# Full format with position data
kstory story.ks --full --pretty

# Custom output file
kstory story.ks -o output.json

# Verbose logging
kstory story.ks --verbose
```

### Programmatic

```typescript
import { exportKsToJson } from '@kstory/exporter';

// Export to JSON
exportKsToJson('story.ks', 'output.json', {
  pretty: true,
  verbose: true,
  full: false
});
```

## CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--output` | `-o` | Output file path (default: input.json) |
| `--pretty` | `-p` | Pretty print JSON output |
| `--verbose` | `-v` | Enable verbose logging |
| `--full` | `-f` | Export full JSON with position data |
| `--help` | `-h` | Show help information |
| `--version` | `-V` | Show version information |

## Export Formats

### Simple Format (Default)
Optimized for game engines with minimal metadata.

### Full Format
Includes position data for development tools and debugging.

## Development

```bash
# Build
pnpm run build

# Watch mode
pnpm run build:watch

# Test
pnpm run test

# Lint
pnpm run lint
```
