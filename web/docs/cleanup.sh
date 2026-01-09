#!/bin/bash
# Clean up old .md files that have .mdx equivalents

echo "Cleaning up old markdown files..."

# Getting Started
rm -f src/content/docs/getting-started/installation.md
rm -f src/content/docs/getting-started/introduction.md
rm -f src/content/docs/getting-started/quick-start.md

# Guide
rm -f src/content/docs/guide/variables-and-types.md
rm -f src/content/docs/guide/functions.md
rm -f src/content/docs/guide/control-flow.md

# Examples
rm -f src/content/docs/examples/fibonacci.md
rm -f src/content/docs/examples/hello-world.md
rm -f src/content/docs/examples/factorial.md

# Reference
rm -f src/content/docs/reference/builtins.md

# Clean build artifacts
rm -rf .astro
rm -rf dist
rm -rf node_modules

echo "Cleanup complete!"
echo ""
echo "Run these commands to rebuild:"
echo "  npm install"
echo "  npm run dev"
