#!/usr/bin/env python3
"""
fix-json-indent.py — Normalize JSON indentation across preview/component JSON.

After a previous refactor that converted `\n` strings into arrays of strings
(`asText()` joins them with `\n`), the leading whitespace from the original
multi-line strings was preserved on each array element. This script walks the
JSON and rounds the first-line leading whitespace of every string down to the
nearest multiple of 2 (preserving the hierarchical depth of HTML/code content).

Only strings whose first-line leading whitespace is NOT a multiple of 2 are
touched (rounded DOWN to the nearest multiple of 2). Strings already at a
proper depth are left alone. The same offset is applied to subsequent lines.

Exemptions:
- `code` blocks (kind="code") keep their array content untouched because
  indentation is meaningful for the syntax being displayed.
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


def normalize_string_leading_ws(s: str) -> str:
    """Round the leading whitespace of the first line down to a multiple of 2.

    Apply the same offset to subsequent lines so internal relative indentation
    is preserved. Skip if the first-line leading whitespace is already a
    multiple of 2 (or zero).
    """
    if not s:
        return s

    # Split into lines preserving the structure.
    lines = s.split("\n")
    first = lines[0]

    # Count leading whitespace (spaces/tabs).
    stripped = first.lstrip(" \t")
    leading_count = len(first) - len(stripped)
    if leading_count == 0:
        return s

    # Find the leading whitespace substring (spaces/tabs only).
    leading_ws = first[:leading_count]

    # Only normalize spaces; leave tabs alone.
    space_count = sum(1 for c in leading_ws if c == " ")
    tab_count = leading_count - space_count

    # If no spaces (all tabs) or already a multiple of 2, leave alone.
    if space_count == 0 or space_count % 2 == 0:
        return s

    # Round DOWN to the nearest multiple of 2.
    new_space_count = (space_count // 2) * 2
    # The offset (negative since we're shrinking) is applied to subsequent lines.
    delta = -(space_count - new_space_count)

    new_first = (" " * new_space_count) + ("\t" * tab_count) + stripped
    new_lines = [new_first]
    for line in lines[1:]:
        if delta > 0:
            # Add leading spaces (shouldn't happen here since delta is 0 or negative).
            new_lines.append((" " * delta) + line)
        elif delta < 0:
            # Strip up to `abs(delta)` leading spaces from subsequent lines.
            stripped_line = line.lstrip(" ")
            removed = -min(len(line) - len(stripped_line), delta)
            new_lines.append(line[removed:] if removed != 0 else line)
        else:
            new_lines.append(line)

    return "\n".join(new_lines)


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
            result[key] = walk_value(key, value, new_ctx)
        return result

    if isinstance(node, list):
        return walk_list(node, ctx)

    return node


def walk_value(key: str, value: Any, ctx: dict) -> Any:
    """Process a single key/value pair, threading through arrays of strings."""
    if isinstance(value, str):
        if is_in_code_block(ctx):
            return value
        return normalize_string_leading_ws(value)

    if isinstance(value, list):
        if is_in_code_block(ctx):
            return walk_list(value, ctx)
        # If all elements are strings, normalize each element's leading whitespace.
        if all(isinstance(item, str) for item in value):
            return [normalize_string_leading_ws(item) for item in value]
        return walk_list(value, ctx)

    if isinstance(value, dict):
        return walk(value, ctx)

    return value


def walk_list(arr: list, ctx: dict) -> list:
    """Recursively process a list."""
    if is_in_code_block(ctx) and all(isinstance(item, str) for item in arr):
        return list(arr)
    if all(isinstance(item, str) for item in arr):
        return [normalize_string_leading_ws(item) for item in arr]
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