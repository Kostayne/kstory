# Husky Git Hooks

This project uses Husky to automate git hooks and ensure code quality.

## Hooks

### pre-commit
Runs before each commit:
- **lint-staged**: Formats and lints staged files
- **tests**: Runs all tests (without watch mode) to ensure nothing is broken

### pre-push
Runs before pushing to remote:
- **build**: Builds all packages to ensure everything compiles
- **tests**: Runs all tests (without watch mode)

### commit-msg
Runs after commit message is written:
- **commitlint**: Validates commit message format

## Commit Message Format

This project follows [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Reverting previous commits

### Examples
```bash
feat: add new parser functionality
fix(core): resolve token parsing issue
docs: update README with new examples
style: format code with biome
test: add unit tests for lexer
```

## Lint-staged Configuration

Automatically runs on staged files:
- **JavaScript/TypeScript**: Biome check and format
- **JSON/Markdown/YAML**: Biome format only

## Disabling Hooks

To skip hooks for a specific commit:
```bash
git commit --no-verify -m "your message"
```

To skip hooks for a specific push:
```bash
git push --no-verify
```

## Troubleshooting

If hooks fail:
1. Check the error message
2. Fix the issues (linting, tests, etc.)
3. Stage the fixes: `git add .`
4. Try committing again

### Manual Hook Setup

If hooks don't work automatically, run:
```bash
pnpm run setup:hooks
```

This will copy the hooks from `.husky/` to `.git/hooks/` and make them executable.

## Testing Commands

This project uses different test commands:

```bash
# Run tests without watch mode (for CI/hooks)
pnpm run test

# Run tests in watch mode (for development)
pnpm run test:watch

# Run tests for specific packages
pnpm run test:core        # Core package tests
pnpm run test:exporter    # Exporter package tests
pnpm run test:lsp         # LSP package tests (if available)
```

## Manual Hook Execution

You can run hooks manually:
```bash
# Run pre-commit checks
npx husky run .husky/pre-commit

# Run pre-push checks
npx husky run .husky/pre-push

# Check commit message
npx commitlint --edit .git/COMMIT_EDITMSG
```
