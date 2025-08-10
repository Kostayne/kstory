#!/bin/bash

# Script for packaging KStory LSP extension

echo "🔨 Packaging KStory LSP extension..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script directory
cd "$SCRIPT_DIR"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in $SCRIPT_DIR"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd ..
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ Dependency installation error"
    exit 1
fi

# Build with esbuild
echo "📦 Building with esbuild..."
pnpm run build:lsp

if [ $? -ne 0 ]; then
    echo "❌ Build error"
    exit 1
fi

# Return to lsp directory
cd lsp

# Check if vsce is available
if ! command -v vsce &> /dev/null; then
    echo "📦 Installing vsce..."
    pnpm add -g @vscode/vsce
fi

# Package the extension
echo "📦 Packaging extension..."
vsce package --no-dependencies

if [ $? -eq 0 ]; then
    echo "✅ Extension successfully packaged!"
    echo "📁 File: kstory-lsp-1.0.0.vsix"
    echo ""
    echo "🚀 To install, run:"
    echo "code --install-extension kstory-lsp-1.0.0.vsix"
    echo ""
    echo "🔍 To test:"
    echo "1. Open VS Code"
    echo "2. Create a test.ks file"
    echo "3. Check the icon in the file explorer"
else
    echo "❌ Packaging error"
    exit 1
fi
