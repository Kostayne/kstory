#!/bin/bash

echo "🔧 Setting up git hooks..."

# Copy husky hooks to .git/hooks
cp .husky/pre-commit .git/hooks/pre-commit
cp .husky/pre-push .git/hooks/pre-push
cp .husky/commit-msg .git/hooks/commit-msg

# Make hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
chmod +x .git/hooks/commit-msg

echo "✅ Git hooks installed successfully!"
echo "📝 Available hooks:"
echo "   - pre-commit: linting and tests"
echo "   - pre-push: build and tests"
echo "   - commit-msg: conventional commits validation"
