#!/usr/bin/env python3
"""
Migración masiva de `interface` / `type` a Zod schemas.

Para cada `src/**/*.ts` con declaraciones top-level:
  1. Extrae cada declaración (interface o type).
  2. Genera un Zod schema equivalente (o z.unknown() con TODO si es complejo).
  3. Crea `<basename>.schemas.ts` con los schemas y los types inferidos.
  4. Borra la declaración del archivo original e importa los types desde `.schemas.js`.
  5. Actualiza imports en otros archivos que apunten a este archivo.

Uso:
  python scripts/migrate-zod.py            # ejecuta
  python scripts/migrate-zod.py --dry-run  # solo muestra qué haría
"""
import re
import os
import sys
import glob
import argparse
from typing import Optional

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')

EXCLUDE_DIRS = []
EXCLUDE_FILES = ['.test.', '.schemas.', '.d.ts']


def is_excluded(path: str) -> bool:
    for ex in EXCLUDE_DIRS:
        if ex in path:
            return True
    for ex in EXCLUDE_FILES:
        if ex in path:
            return True
    return False


# ---------- TS type → Zod schema conversion ----------

def ts_type_to_zod(ts: str, known_types: set, depth: int = 0) -> str:
    """Convert a TS type expression to a Zod schema expression.

    Returns a Zod fragment (e.g. `z.string()`, `z.object({...})`).
    """
    ts = ts.strip()
    if not ts:
        return 'z.unknown()'
    if depth > 12:
        return 'z.unknown() /* TODO: depth limit */'

    # Strip outer parens
    while ts.startswith('(') and ts.endswith(')'):
        inner = ts[1:-1].strip()
        if _parens_balance(inner) == 0:
            ts = inner
        else:
            break

    # Primitives
    prim = {
        'string': 'z.string()',
        'number': 'z.number()',
        'boolean': 'z.boolean()',
        'bigint': 'z.bigint()',
        'symbol': 'z.symbol()',
        'null': 'z.null()',
        'undefined': 'z.undefined()',
        'void': 'z.void()',
        'any': 'z.any()',
        'unknown': 'z.unknown()',
        'never': 'z.never()',
        'object': 'z.object({})',
        'Date': 'z.date()',
        'Function': 'z.function({ input: [], output: z.unknown() })',
    }
    if ts in prim:
        return prim[ts]

    # Literal: 'a' | "a" | 1 | true | null
    lit = _try_literal(ts)
    if lit is not None:
        return f'z.literal({lit})'

    # Record: Record<K, V>  (check BEFORE bare references)
    rec = _try_record(ts)
    if rec is not None:
        k, v = rec
        kz = ts_type_to_zod(k, known_types, depth + 1)
        vz = ts_type_to_zod(v, known_types, depth + 1)
        return f'z.record({kz}, {vz})'

    # Partial<T>, Required<T>, Readonly<T>
    util = _try_utility(ts)
    if util is not None:
        return util

    # Array: T[] or Array<T> or ReadonlyArray<T>
    arr = _try_array(ts)
    if arr is not None:
        return f'z.array({ts_type_to_zod(arr, known_types, depth + 1)})'

    # Promise<T>
    pm = re.match(r'^Promise<(.+)>$', ts, re.DOTALL)
    if pm:
        inner = pm.group(1).strip()
        return f'z.promise({ts_type_to_zod(inner, known_types, depth + 1)})'

    # Set<T> / Map<K, V>
    sm = re.match(r'^Set<(.+)>$', ts, re.DOTALL)
    if sm:
        return f'z.set({ts_type_to_zod(sm.group(1).strip(), known_types, depth + 1)})'
    mm = re.match(r'^Map<(.+),\s*(.+)>$', ts, re.DOTALL)
    if mm:
        k = mm.group(1).strip()
        v = mm.group(2).strip()
        return f'z.map({ts_type_to_zod(k, known_types, depth + 1)}, {ts_type_to_zod(v, known_types, depth + 1)})'

    # Function: (a: T) => R or (a: T, b: T) => R
    fn = _try_function(ts)
    if fn is not None:
        return fn

    # Object literal: { foo: string; bar?: number }
    obj = _try_object_literal(ts, known_types)
    if obj is not None:
        return obj

    # Tuple: [T1, T2, ...]
    tup = _try_tuple(ts)
    if tup is not None:
        return tup

    # Intersection: A & B
    inter = _try_intersection(ts, known_types, depth)
    if inter is not None:
        return inter

    # Union: A | B (last because it's permissive)
    union = _try_union(ts, known_types, depth)
    if union is not None:
        return union

    # Reference to a known type
    if re.match(r'^\w+$', ts):
        if ts in known_types:
            return f'{ts}Schema'
        return f'z.unknown() /* TODO: ref {ts} */'

    # Generic reference: Foo<T> — handle as best effort
    gm = re.match(r'^(\w+)<(.+)>$', ts, re.DOTALL)
    if gm:
        base = gm.group(1)
        if base in known_types:
            # We can't easily do generic zod — use a comment + base schema
            return f'{base}Schema /* TODO: generic {ts} */'
        return f'z.unknown() /* TODO: ref {base}<...> */'

    return 'z.unknown() /* TODO: cannot convert */'


def _parens_balance(s: str) -> int:
    bal = 0
    for c in s:
        if c == '(':
            bal += 1
        elif c == ')':
            bal -= 1
    return bal


def _try_literal(ts: str) -> Optional[str]:
    if (ts.startswith("'") and ts.endswith("'") and ts.count("'") == 2) \
            or (ts.startswith('"') and ts.endswith('"') and ts.count('"') == 2):
        return ts
    if ts == 'true' or ts == 'false':
        return ts
    if re.match(r'^-?\d+(\.\d+)?$', ts):
        return ts
    return None


def _try_array(ts: str) -> Optional[str]:
    if ts.endswith('[]'):
        return ts[:-2].strip()
    m = re.match(r'^(?:ReadonlyArray|Array)<(.+)>$', ts, re.DOTALL)
    if m:
        return m.group(1).strip()
    return None


def _try_record(ts: str) -> Optional[tuple]:
    m = re.match(r'^Record<(.+),\s*(.+)>$', ts, re.DOTALL)
    if not m:
        return None
    k = m.group(1).strip()
    v = m.group(2).strip()
    return (k, v)


def _try_utility(ts: str) -> Optional[str]:
    m = re.match(r'^(Partial|Required|Readonly)<(.+)>$', ts, re.DOTALL)
    if m:
        return ts_type_to_zod(m.group(2).strip(), set(), 0)
    return None


def _try_function(ts: str) -> Optional[str]:
    if '=>' not in ts:
        return None
    # Find the top-level => (not inside parens)
    arrow_idx = _find_top_level_arrow(ts)
    if arrow_idx < 0:
        return None
    lhs = ts[:arrow_idx].strip()
    rhs = ts[arrow_idx + 2:].strip()
    if not lhs.startswith('(') or not lhs.endswith(')'):
        return None
    # Parse parameters
    params_str = lhs[1:-1].strip()
    params = _split_top_level(params_str, ',') if params_str else []
    inputs = []
    for p in params:
        p = p.strip()
        if not p:
            continue
        m = re.match(r'^(\w+)(\?)?:\s*(.+)$', p, re.DOTALL)
        if m:
            ptype_raw = m.group(3).strip()
        else:
            ptype_raw = p
        ptype = ts_type_to_zod(ptype_raw, set(), 0)
        inputs.append(ptype)
    out = ts_type_to_zod(rhs, set(), 0)
    if not inputs:
        return f'z.function({{ input: [], output: {out} }})'
    args = ', '.join(inputs)
    return f'z.function({{ input: [{args}], output: {out} }})'


def _find_top_level_arrow(s: str) -> int:
    """Find the `=>` at top level (not inside parens/braces/brackets/strings)."""
    depth = 0
    in_str = None
    i = 0
    while i < len(s):
        c = s[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in ('"', "'", '`'):
            in_str = c
            i += 1
            continue
        if c in '([{<':
            depth += 1
        elif c in ')]}>':
            depth -= 1
        elif depth == 0 and c == '=' and i + 1 < len(s) and s[i+1] == '>':
            return i
        i += 1
    return -1


def _try_object_literal(ts: str, known: set = None) -> Optional[str]:
    if not ts.startswith('{') or not ts.endswith('}'):
        return None
    if known is None:
        known = set()
    body = ts[1:-1].strip()
    if not body:
        return 'z.object({})'
    # Strip block comments from the body to avoid JSDoc comments being parsed as members
    body = _strip_block_comments(body)
    members = _split_object_members(body)
    parts = []
    for m in members:
        m = m.strip()
        if not m:
            continue
        # Method signature: name(params): RetType  or  name?: (params) => RetType
        # We try to detect and handle as function
        method = _try_method(m)
        if method is not None:
            parts.append(method)
            continue
        # foo?: T
        mm = re.match(r'^(\w+)(\?)?:\s*(.+?);?$', m, re.DOTALL)
        if mm:
            name = mm.group(1)
            optional = bool(mm.group(2))
            ftype = mm.group(3).strip().rstrip(';').strip()
            ztype = ts_type_to_zod(ftype, known, 0)
            if optional:
                ztype = _make_optional(ztype)
            parts.append(f'  {name}: {ztype},')
        else:
            parts.append(f'  /* TODO: member {m[:60]} */')
    return 'z.object({\n' + '\n'.join(parts) + '\n})'


def _try_method(member: str) -> Optional[str]:
    """Try to parse a method signature: name(params): RetType or name?(params): RetType."""
    m = re.match(r'^(\w+)(\?)?\((.*?)\)\s*:\s*(.+?);?$', member, re.DOTALL)
    if not m:
        return None
    name = m.group(1)
    optional = bool(m.group(2))
    params_str = m.group(3).strip()
    ret_type = m.group(4).strip()
    params = _split_top_level(params_str, ',') if params_str else []
    inputs = []
    for p in params:
        p = p.strip()
        if not p:
            continue
        pm = re.match(r'^(\w+)(\?)?:\s*(.+)$', p, re.DOTALL)
        if pm:
            ptype_raw = pm.group(3).strip()
        else:
            ptype_raw = 'unknown'
        ptype = ts_type_to_zod(ptype_raw, set(), 0)
        inputs.append(ptype)
    out = ts_type_to_zod(ret_type, set(), 0)
    args = ', '.join(inputs) if inputs else ''
    ztype = f'z.function({{ input: [{args}], output: {out} }})'
    if optional:
        ztype = _make_optional(ztype)
    return f'  {name}: {ztype},'


def _make_optional(ztype: str) -> str:
    """Make a zod type optional by appending .optional().

    For `z.string()` → `z.string().optional()`.
    For `z.array(z.string())` → `z.array(z.string()).optional()`.
    For `z.union([z.string(), z.null()])` → `z.union([z.string(), z.null()]).optional()`.
    """
    return ztype + '.optional()'


def _try_intersection(ts: str, known: set, depth: int) -> Optional[str]:
    parts = _split_top_level(ts, '&')
    if len(parts) < 2:
        return None
    schemas = [ts_type_to_zod(p.strip(), known, depth + 1) for p in parts]
    return f'z.intersection({", ".join(schemas)})'


def _try_union(ts: str, known: set, depth: int) -> Optional[str]:
    if '|' not in ts:
        return None
    parts = _split_top_level(ts, '|')
    if len(parts) < 2:
        return None
    schemas = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        schemas.append(ts_type_to_zod(p, known, depth + 1))
    if not schemas:
        return None
    if len(schemas) == 1:
        return schemas[0]
    return f'z.union([{", ".join(schemas)}])'


def _try_tuple(ts: str) -> Optional[str]:
    if not ts.startswith('[') or not ts.endswith(']'):
        return None
    inner = ts[1:-1].strip()
    if not inner:
        return 'z.tuple([])'
    parts = _split_top_level(inner, ',')
    schemas = [ts_type_to_zod(p.strip(), set(), 0) for p in parts if p.strip()]
    return f'z.tuple([{", ".join(schemas)}])'


def _split_top_level(s: str, sep: str) -> list:
    """Split `s` by `sep` only at top level (not inside parens/braces/brackets/strings).

    The arrow `=>` is not counted as a closing `>`, so generic brackets balance correctly.
    """
    out = []
    depth = 0
    cur = []
    in_str = None
    i = 0
    while i < len(s):
        c = s[i]
        if in_str:
            cur.append(c)
            if c == in_str and (i == 0 or s[i-1] != '\\'):
                in_str = None
            i += 1
            continue
        if c in ('"', "'", '`'):
            in_str = c
            cur.append(c)
            i += 1
            continue
        # Skip arrow function '=>' so '>' is not counted as closing
        if c == '=' and i + 1 < len(s) and s[i+1] == '>':
            cur.append('=>')
            i += 2
            continue
        if c in '([{':
            depth += 1
            cur.append(c)
            i += 1
            continue
        if c == '<':
            depth += 1
            cur.append(c)
            i += 1
            continue
        if c == '>':
            depth -= 1
            cur.append(c)
            i += 1
            continue
        if c in ')]}':
            depth -= 1
            cur.append(c)
            i += 1
            continue
        if depth == 0 and s[i:i+len(sep)] == sep:
            out.append(''.join(cur))
            cur = []
            i += len(sep)
            continue
        cur.append(c)
        i += 1
    out.append(''.join(cur))
    return out


def _split_object_members(body: str) -> list:
    """Split object-literal members by ; or newline at top level."""
    # Replace newlines with ; for splitting
    body = body.replace('\n', ';')
    return _split_top_level(body, ';')


# ---------- Declaration extraction ----------

def find_top_level_decls(content: str) -> list:
    """Find all top-level interface and type declarations."""
    decls = []
    lines = content.splitlines(keepends=True)
    line_starts = []
    cur = 0
    for line in lines:
        line_starts.append(cur)
        cur += len(line)
    line_starts.append(cur)

    decl_re = re.compile(r'^(export\s+)?(interface|type)\s+(\w+)')

    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith(' ') or line.startswith('\t'):
            i += 1
            continue
        m = decl_re.match(line)
        if not m:
            i += 1
            continue
        prefix = m.group(1) or ''
        kind = m.group(2)
        name = m.group(3)
        start = line_starts[i]

        if kind == 'interface':
            brace_idx = content.find('{', start)
            if brace_idx < 0:
                i += 1
                continue
            end_brace = _find_matching_brace(content, brace_idx)
            if end_brace < 0:
                i += 1
                continue
            line_idx = _line_at(content, end_brace)
            end_pos = line_starts[line_idx + 1] if line_idx + 1 < len(line_starts) else len(content)
            decl_text = content[start:end_pos]
            decls.append({
                'kind': 'interface',
                'name': name,
                'start': start,
                'end': end_pos,
                'prefix': prefix.strip(),
                'full': decl_text,
                'body': content[brace_idx+1:end_brace],
            })
            i = line_idx + 1
            continue
        else:
            # Find the `=` that separates name from value (at top level, not inside <>)
            eq_idx = _find_type_alias_eq(content, start)
            if eq_idx < 0:
                i += 1
                continue
            semi_idx = _find_statement_end(content, eq_idx)
            if semi_idx < 0:
                i += 1
                continue
            line_idx = _line_at(content, semi_idx)
            end_pos = line_starts[line_idx + 1] if line_idx + 1 < len(line_starts) else len(content)
            decl_text = content[start:end_pos]
            rhs = content[eq_idx+1:semi_idx].strip().rstrip(';').strip()
            decls.append({
                'kind': 'type',
                'name': name,
                'start': start,
                'end': end_pos,
                'prefix': prefix.strip(),
                'full': decl_text,
                'rhs': rhs,
            })
            i = line_idx + 1
            continue
    return decls


def _find_type_alias_eq(content: str, start: int) -> int:
    """Find the `=` that separates the name from the value in a type alias.

    For `type Foo<T = X> = Value;`, returns the position of the `=` before `Value`.
    Skips `=` inside `<>` generic brackets and `=>` arrows.
    """
    i = start
    depth = 0
    in_str = None
    in_line_comment = False
    in_block_comment = False
    # First, find the start of the name (after `type` and optional `export`)
    # We start from `start` which is the position of `type`
    # Skip `type` keyword
    while i < len(content) and content[i].isspace():
        i += 1
    if i < len(content) and content[i:i+4] == 'type':
        i += 4
    while i < len(content) and content[i].isspace():
        i += 1
    # Now i is at the start of the name
    # Walk forward, tracking depth of `<>` and `()`
    # The `=` we want is the first `=` at depth 0 after the name and optional generic
    while i < len(content):
        c = content[i]
        if in_line_comment:
            if c == '\n':
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == '*' and i + 1 < len(content) and content[i+1] == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c == '/' and i + 1 < len(content) and content[i+1] == '/':
            in_line_comment = True
            i += 2
            continue
        if c == '/' and i + 1 < len(content) and content[i+1] == '*':
            in_block_comment = True
            i += 2
            continue
        if c in ('"', "'", '`'):
            in_str = c
            i += 1
            continue
        if c == '=' and i + 1 < len(content) and content[i+1] == '>':
            i += 2
            continue
        if c in '([':
            depth += 1
            i += 1
            continue
        if c == '<':
            depth += 1
            i += 1
            continue
        if c == '>':
            depth -= 1
            i += 1
            continue
        if c in ')]':
            depth -= 1
            i += 1
            continue
        if c == '=' and depth == 0:
            return i
        i += 1
    return -1


def _find_matching_brace(s: str, open_idx: int) -> int:
    if s[open_idx] != '{':
        return -1
    depth = 0
    in_str = None
    in_line_comment = False
    in_block_comment = False
    i = open_idx
    while i < len(s):
        c = s[i]
        if in_line_comment:
            if c == '\n':
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == '*' and i + 1 < len(s) and s[i+1] == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c == '/' and i + 1 < len(s) and s[i+1] == '/':
            in_line_comment = True
            i += 2
            continue
        if c == '/' and i + 1 < len(s) and s[i+1] == '*':
            in_block_comment = True
            i += 2
            continue
        if c in ('"', "'", '`'):
            in_str = c
            i += 1
            continue
        # Skip arrow function '=>' so '>' is not counted
        if c == '=' and i + 1 < len(s) and s[i+1] == '>':
            i += 2
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def _find_statement_end(s: str, after_eq: int) -> int:
    depth = 0
    in_str = None
    in_line_comment = False
    in_block_comment = False
    i = after_eq
    while i < len(s):
        c = s[i]
        if in_line_comment:
            if c == '\n':
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == '*' and i + 1 < len(s) and s[i+1] == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c == '/' and i + 1 < len(s) and s[i+1] == '/':
            in_line_comment = True
            i += 2
            continue
        if c == '/' and i + 1 < len(s) and s[i+1] == '*':
            in_block_comment = True
            i += 2
            continue
        if c in ('"', "'", '`'):
            in_str = c
            i += 1
            continue
        # Skip arrow function '=>' so '>' is not counted
        if c == '=' and i + 1 < len(s) and s[i+1] == '>':
            i += 2
            continue
        if c in '([{':
            depth += 1
        elif c == '<':
            depth += 1
        elif c == '>':
            depth -= 1
        elif c in ')]}':
            depth -= 1
        elif c == ';' and depth == 0:
            return i
        i += 1
    return -1


def _line_at(s: str, pos: int) -> int:
    return s.count('\n', 0, pos)


# ---------- Schema generation ----------

def generate_schema_for_decl(decl: dict, all_decl_names: set) -> str:
    name = decl['name']
    if decl['kind'] == 'interface':
        return generate_interface_schema(name, decl['body'], all_decl_names)
    else:
        return generate_type_schema(name, decl['rhs'], all_decl_names)


def _strip_block_comments(s: str) -> str:
    """Remove block comments (/* ... */) from a string, preserving newlines for line numbers."""
    out = []
    i = 0
    in_str = None
    in_line_comment = False
    while i < len(s):
        c = s[i]
        if in_line_comment:
            if c == '\n':
                in_line_comment = False
                out.append(c)
            i += 1
            continue
        if in_str:
            out.append(c)
            if c == '\\' and i + 1 < len(s):
                out.append(s[i+1])
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c == '/' and i + 1 < len(s) and s[i+1] == '/':
            in_line_comment = True
            i += 2
            continue
        if c == '/' and i + 1 < len(s) and s[i+1] == '*':
            # Skip to end of block comment, preserving newlines
            j = i + 2
            while j < len(s):
                if s[j] == '*' and j + 1 < len(s) and s[j+1] == '/':
                    j += 2
                    break
                if s[j] == '\n':
                    out.append('\n')
                j += 1
            i = j
            continue
        if c in ('"', "'", '`'):
            in_str = c
            out.append(c)
            i += 1
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def generate_interface_schema(name: str, body: str, all_decl_names: set) -> str:
    # Strip block comments first to avoid JSDoc comments being parsed as members
    body = _strip_block_comments(body)
    members = _split_object_members(body)
    parts = []
    for m in members:
        m = m.strip().rstrip(';').strip()
        if not m:
            continue
        # Method signature: name(params): RetType
        method = _try_method(m)
        if method is not None:
            parts.append(method)
            continue
        if ':' not in m:
            parts.append(f'  /* TODO: skip member {m[:60]} */')
            continue
        mm = re.match(r'^(\w+)(\?)?:\s*(.+)$', m, re.DOTALL)
        if not mm:
            parts.append(f'  /* TODO: parse fail {m[:60]} */')
            continue
        fname = mm.group(1)
        optional = bool(mm.group(2))
        ftype = mm.group(3).strip()
        ztype = ts_type_to_zod(ftype, all_decl_names, 0)
        if optional:
            ztype = _make_optional(ztype)
        parts.append(f'  {fname}: {ztype},')
    body_text = '\n'.join(parts) if parts else ''
    return (
        f'export const {name}Schema = z.object({{\n{body_text}\n}});\n'
        f'export type {name} = z.infer<typeof {name}Schema>;\n'
    )


def generate_type_schema(name: str, rhs: str, all_decl_names: set) -> str:
    ztype = ts_type_to_zod(rhs, all_decl_names, 0)
    return (
        f'export const {name}Schema = {ztype};\n'
        f'export type {name} = z.infer<typeof {name}Schema>;\n'
    )


# ---------- File processing ----------

def process_file(path: str, dry_run: bool = False) -> dict:
    with open(path, encoding='utf-8') as f:
        content = f.read()

    decls = find_top_level_decls(content)
    if not decls:
        return {'file': path, 'decls': 0, 'migrated': False}

    all_decl_names = {d['name'] for d in decls}

    schema_parts = [
        '/**',
        f' * {os.path.basename(path)} — Zod schemas para los tipos extraídos de este módulo.',
        ' *',
        ' * Generado por `scripts/migrate-zod.py`. Refinar manualmente las',
        ' * entradas marcadas con TODO cuando se quiera validación runtime.',
        ' */',
        'import { z } from "zod";',
        '',
    ]
    for d in decls:
        schema_parts.append(generate_schema_for_decl(d, all_decl_names))
        schema_parts.append('')

    schema_text = '\n'.join(schema_parts)
    schema_path = path[:-3] + '.schemas.ts'

    new_content = content
    for d in reversed(decls):
        new_content = new_content[:d['start']] + new_content[d['end']:]

    if decls:
        names = [d['name'] for d in decls]
        import_path = _to_import_path(path, schema_path)
        import_line = f'import type {{ {", ".join(names)} }} from "{import_path}";\n'
        new_content = _insert_import(new_content, import_line)

    # Clean up consecutive blank lines (>2) in new_content
    new_content = re.sub(r'\n{3,}', '\n\n', new_content)

    result = {
        'file': path,
        'schema': schema_path,
        'decls': [d['name'] for d in decls],
        'migrated': True,
    }

    if not dry_run:
        with open(schema_path, 'w', encoding='utf-8') as f:
            f.write(schema_text)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)

    return result


def _to_import_path(orig_path: str, schema_path: str) -> str:
    rel = os.path.relpath(schema_path, os.path.dirname(orig_path))
    rel = rel.replace('\\', '/')
    if rel.endswith('.ts'):
        rel = rel[:-3] + '.js'
    if not rel.startswith('.'):
        rel = './' + rel
    return rel


def _insert_import(content: str, import_line: str) -> str:
    lines = content.splitlines(keepends=True)
    last_import_idx = -1
    in_block = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import '):
            last_import_idx = i
            if 'from' not in stripped and stripped.endswith('{'):
                in_block = True
        elif in_block:
            if 'from' in stripped or stripped.endswith(';') or '}' in stripped:
                last_import_idx = i
                in_block = False
        else:
            if stripped and not stripped.startswith('//') and not stripped.startswith('/*') and not stripped.startswith('*') and not stripped.startswith('*/'):
                break
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_line)
    else:
        idx = 0
        while idx < len(lines):
            stripped = lines[idx].strip()
            if not stripped or stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*') or stripped.startswith('*/'):
                idx += 1
            else:
                break
        lines.insert(idx, import_line)
    return ''.join(lines)


# ---------- Import update across the codebase ----------

def collect_migration_info(results: list) -> dict:
    info = {}
    for r in results:
        if not r.get('migrated'):
            continue
        info[r['file']] = {
            'schema_path': r['schema'],
            'decls': r['decls'],
        }
    return info


def update_cross_file_imports(migration_info: dict, dry_run: bool = False) -> list:
    changes = []
    type_to_schema = {}
    for orig_path, info in migration_info.items():
        for name in info['decls']:
            type_to_schema[name] = (orig_path, info['schema_path'])

    all_files = glob.glob(os.path.join(SRC, '**/*.ts'), recursive=True)
    for f in all_files:
        if is_excluded(f):
            continue
        if f in migration_info:
            continue
        with open(f, encoding='utf-8') as fp:
            content = fp.read()
        new_content, file_changes = _update_imports_in_file(content, f, type_to_schema)
        if file_changes:
            changes.append({'file': f, 'changes': file_changes})
            if not dry_run:
                with open(f, 'w', encoding='utf-8') as fp:
                    fp.write(new_content)
    return changes


def _update_imports_in_file(content: str, file_path: str, type_to_schema: dict) -> tuple:
    changes = []
    import_re = re.compile(
        r"^(import\s+type\s*\{([^}]+)\}\s*from\s*['\"]([^'\"]+)['\"];?)$",
        re.MULTILINE,
    )

    def replace_import(m):
        prefix = m.group(1)
        names_str = m.group(2)
        from_path = m.group(3)
        names = [n.strip() for n in names_str.split(',') if n.strip()]
        migrated_names = []
        for n in names:
            n_clean = re.sub(r'\s+as\s+\w+', '', n).strip()
            if n_clean in type_to_schema:
                migrated_names.append((n_clean, type_to_schema[n_clean]))
        if not migrated_names:
            return m.group(0)
        by_target = {}
        for n, (orig, schema) in migrated_names:
            by_target.setdefault(schema, []).append(n)
        if len(by_target) == 1:
            schema_path = list(by_target.keys())[0]
            new_from = _compute_relative_import(file_path, schema_path)
            new_names = [n for n, _ in migrated_names]
            new_line = f'import type {{ {", ".join(new_names)} }} from "{new_from}";'
            changes.append((prefix, new_line))
            return new_line
        else:
            new_lines = []
            for schema_path, ns in by_target.items():
                new_from = _compute_relative_import(file_path, schema_path)
                new_lines.append(f'import type {{ {", ".join(ns)} }} from "{new_from}";')
            changes.append((prefix, '\n'.join(new_lines)))
            return '\n'.join(new_lines)

    new_content = import_re.sub(replace_import, content)
    return new_content, changes


def _compute_relative_import(from_file: str, to_file: str) -> str:
    rel = os.path.relpath(to_file, os.path.dirname(from_file))
    rel = rel.replace('\\', '/')
    if rel.endswith('.ts'):
        rel = rel[:-3] + '.js'
    if not rel.startswith('.'):
        rel = './' + rel
    return rel


# ---------- Main ----------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--skip-update-imports', action='store_true')
    args = parser.parse_args()

    files = []
    for p in glob.glob(os.path.join(SRC, '**/*.ts'), recursive=True):
        if is_excluded(p):
            continue
        with open(p, encoding='utf-8') as f:
            c = f.read()
        types = re.findall(r'^(?:export\s+)?type\s+(\w+)', c, re.MULTILINE)
        ifs = re.findall(r'^(?:export\s+)?interface\s+(\w+)', c, re.MULTILINE)
        if types or ifs:
            files.append(p)

    files.sort()
    if args.limit:
        files = files[:args.limit]

    print(f'Found {len(files)} files to migrate')
    results = []
    for f in files:
        try:
            r = process_file(f, dry_run=args.dry_run)
            results.append(r)
            if r['migrated']:
                print(f"  {os.path.relpath(f, ROOT)}: {len(r['decls'])} decls -> {os.path.relpath(r['schema'], ROOT)}")
        except Exception as e:
            print(f"  ERROR in {os.path.relpath(f, ROOT)}: {e}")
            import traceback
            traceback.print_exc()

    migrated = [r for r in results if r.get('migrated')]
    total_decls = sum(len(r['decls']) for r in migrated)
    print(f'\n=== Summary ===')
    print(f'Files migrated: {len(migrated)}')
    print(f'Declarations migrated: {total_decls}')

    if not args.dry_run and not args.skip_update_imports:
        print('\nUpdating cross-file imports...')
        info = collect_migration_info(results)
        changes = update_cross_file_imports(info, dry_run=False)
        print(f'Updated {len(changes)} files with import changes')

    return 0


if __name__ == '__main__':
    sys.exit(main())
