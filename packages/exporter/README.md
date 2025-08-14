# @kstory/exporter

CLI exporter for the KStory interactive fiction language.

## Installation

```bash
npm install -g @kstory/exporter
```

## Usage

```bash
kstory input.ks
kstory input.ks -o output.json
kstory input.ks --pretty --verbose
kstory input.ks --full
```

## Options

- `-o, --output <path>` - output JSON file path (default: input.json)
- `-p, --pretty` - pretty print JSON output
- `-v, --verbose` - verbose logging
- `-f, --full` - full JSON with position information (for LSP/editors)

## Development

### Local Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Development mode
pnpm run build:watch

# Testing
pnpm run test

# Linting
pnpm run lint
```

### Publishing

The package is automatically prepared for publishing with interactive version input:

1. **Interactive preparation**: When running `npm publish`, you'll be prompted to enter the @kstory/core version
2. **Version validation**: The script validates semantic version format
3. **Current version display**: Shows current versions of both packages for reference
4. **Manual preparation**: You can manually switch modes

```bash
# Interactive preparation for production (prompts for version)
npm run prepare:prod

# Return to development mode (restores workspace dependencies)
npm run prepare:dev

# Interactive version sync (manual)
npm run sync-versions
```

### Publishing from root project

```bash
# Publish only core
pnpm run publish:core

# Publish only exporter
pnpm run publish:exporter

# Publish all packages
pnpm run publish:all
```

### Example Interactive Process

When you run `npm publish`, you'll see something like this:

```
📦 Preparing to publish @kstory/exporter
📖 Current @kstory/core version: 1.0.0
📋 Current @kstory/exporter version: 1.0.0

🔢 Enter the version for @kstory/core dependency (e.g., 1.0.0, 1.2.3): 1.0.0
✅ Valid version: 1.0.0
✅ Replaced workspace dependency @kstory/core with ^1.0.0
📦 package.json prepared for production
```

## Dependencies

- **Development**: `@kstory/core: workspace:*` (local development)
- **Production**: `@kstory/core: ^1.0.0` (automatically on publish)

## Architecture

- `src/index.ts` - CLI logic and entry point
- `src/exporter.ts` - main export logic
- `src/converter.ts` - converter to full JSON format
- `src/converter-simple.ts` - converter to simple JSON format
- `scripts/prepare-prod.js` - prepare for production
- `scripts/prepare-dev.js` - return to development mode
