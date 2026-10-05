#!/usr/bin/env python3
"""
fix-json-indent.py — Normalize JSON indentation across preview/component JSON.

After a previous refactor that converted `\n` strings into arrays of strings
(`asText()` joins them with `\n`), the leading whitespace from the original
multi-line strings was preserved on each array element. This script walks the
JSON, strips redundant leading/trailing whitespace from strings, and rewrites
the file with consistent 2-space indentation.

Exemptions:
- `code` blocks (kind="code") keep their array content untouched because
  indentation is meaningful for the syntax being displayed.
- Strings without leading whitespace are left as-is.
"""

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
TARGET_DIRS = [
    ROOT / "src" / "components",
    ROOT / "src" / "pages",
    ROOT / "dist" / "previews",
]


def clean_string(s: str) -> str:
    """Trim redundant leading/trailing whitespace from a string."""
    return s.strip()


def clean_array_of_strings(arr: list) -> list:
    """Strip leading/trailing whitespace from each string element."""
    return [clean_string(item) if isinstance(item, str) else item for item in arr]


def is_in_code_block(ctx: dict) -> bool:
    """Check if the current parent context is a kind='code' block."""
    return ctx.get("kind") == "code"


def walk(node: Any, ctx: dict) -> Any:
    """Recursively normalize strings in a JSON structure."""
    if isinstance(node, dict):
        new_ctx = dict(ctx)
        if "kind" in node and isinstance(node.get("kind"), str):
            new_ctx["kind"] = node["kind"]

        result = {}
        for key, value in node.items():
            if isinstance(value, str):
                # Standalone string value: trim leading/trailing whitespace.
                result[key] = clean_string(value)
            elif isinstance(value, list):
                if is_in_code_block(new_ctx):
                    # Code blocks keep their content untouched.
                    result[key] = walk_list(value, new_ctx)
                elif all(isinstance(item, str) for item in value):
                    # Array of strings: strip leading/trailing whitespace from each.
                    result[key] = clean_array_of_strings(value)
                else:
                    result[key] = walk_list(value, new_ctx)
            elif isinstance(value, dict):
                result[key] = walk(value, new_ctx)
            else:
                result[key] = value
        return result

    if isinstance(node, list):
        return walk_list(node, ctx)

    return node


def walk_list(arr: list, ctx: dict) -> list:
    """Recursively process a list."""
    if is_in_code_block(ctx) and all(isinstance(item, str) for item in arr):
        return list(arr)
    if all(isinstance(item, str) for item in arr):
        return clean_array_of_strings(arr)
    return [walk(item, ctx) for item in arr]


def main() -> int:
    changed_files = 0
    total_files = 0

    for target_dir in TARGET_DIRS:
        if not target_dir.exists():
            print(f"skip missing dir: {target_dir}", file=sys.stderr)
            continue

        for path in sorted(target_dir.rglob("*.json")):
            total_files += 1
            try:
                original = path.read_text(encoding="utf-8")
                data = json.loads(original)
                normalized = walk(data, ctx={})
                rewritten = json.dumps(normalized, indent=2, ensure_ascii=False)
                rewritten += "\n"

                if rewritten != original:
                    path.write_text(rewritten, encoding="utf-8", newline="\n")
                    changed_files += 1
                    print(f"fixed: {path.relative_to(ROOT)}")
            except json.JSONDecodeError as exc:
                print(f"ERROR parsing {path}: {exc}", file=sys.stderr)
                return 1
            except Exception as exc:
                print(f"ERROR processing {path}: {exc}", file=sys.stderr)
                return 1

    print(f"\nTotal: {changed_files}/{total_files} files changed")
    return 0


if __name__ == "__main__":
    sys.exit(main())