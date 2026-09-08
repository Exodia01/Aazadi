#!/usr/bin/env bash
# sync-monthly.sh - Linux/macOS monthly sync script for Aazadi
# Delegates to the Bun-based sync which handles catalog extraction,
# writing, git commit and push.

set -e

echo "🔄 Aazadi: Starting monthly free models catalog sync..."

# Locate the repo root (directory containing this script)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v bun &>/dev/null; then
  echo "❌ Bun is required. Install it from https://bun.sh" >&2
  exit 1
fi

echo "📦 Using Bun sync at $SCRIPT_DIR"
cd "$SCRIPT_DIR"

if [[ "$1" == "--force" ]]; then
  bun run src/sync/refresh-free-models.ts --run --force
else
  bun run sync:monthly
fi

echo ""
echo "🎉 Aazadi monthly sync complete!"
echo "   Catalog: $SCRIPT_DIR/catalog/free-models-catalog.json"