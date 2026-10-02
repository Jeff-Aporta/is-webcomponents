#!/usr/bin/env bash
# sync-pins.sh — wrapper. La lógica vive en sync-pins.mjs (Windows / WSL / Git Bash).
# Ver cabecera de sync-pins.mjs para flags: --remote --dry-run --install-hook <sha>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if command -v node >/dev/null 2>&1; then
  exec node "$ROOT/scripts/sync-pins.mjs" "$@"
fi
exec deno run -A "$ROOT/scripts/sync-pins.mjs" "$@"
