# Contributing to KStory

Thank you for your interest in contributing to KStory! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Setup
```bash
git clone https://github.com/kostayne/kstory.git
cd kstory
pnpm install
pnpm run build:exporter
```

## Development Workflow

### Building
```bash
# Build exporter
pnpm run build:exporter

# Build LSP components
pnpm run build:lsp

# Development with watch
pnpm run dev
```

### Testing
```bash
# Run tests
pnpm run test

# Lint code
npx @biomejs/biome check src/

# Format code
npx @biomejs/biome format src/
```

## Code Style

### TypeScript
- Use TypeScript for all new code
- Prefer explicit types over `any`
- Use early returns when possible
- Add JSDoc comments for public APIs

### Formatting
- Use Biome for linting and formatting
- Follow the existing code style
- Use meaningful variable and function names

## Pull Request Process

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Add tests** if applicable
5. **Run linting**: `npx @biomejs/biome check src/`
6. **Test your changes**: `pnpm run test`
7. **Commit your changes**: Use conventional commit messages
8. **Push to your fork**
9. **Submit a pull request**

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(exporter): add new export format`
- `fix(lexer): resolve infinite loop in choice parsing`
- `docs(readme): update installation instructions`

## Areas for Contribution

### High Priority
- **Bug fixes** in lexer, parser, or exporter
- **Performance improvements** for large files
- **Documentation** improvements
- **Test coverage** for edge cases

### Medium Priority
- **New language features** for .ks format
- **Additional export formats**
- **IDE integrations** beyond VS Code
- **CLI improvements**

### Low Priority
- **UI/UX improvements** for tools
- **Additional examples** and tutorials
- **Community tools** and utilities

## Reporting Issues

When reporting issues, please include:

1. **Description** of the problem
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Environment** (OS, Node.js version, etc.)
6. **Sample .ks file** if applicable