# Previews controlados — JSON homogéneo + `is-preview-component`

## Objetivo

Un solo chrome (`<is-preview-component>`). **Cero HTML por componente.**
Toda la documentación/demo vive en JSON con interface compartida
(`PreviewDefinition`, `$schema: "is-preview/v1"`).

## Piezas

| Pieza | Rol |
| --- | --- |
| `src/previews/_kit/types.d.ts` | Interface canónica |
| `src/previews/<cat>/<tag>.json` | Datos del preview (sections/blocks) |
| `src/previews/behaviors/<tag>.js` | `mount`/`unmount` opcionales (sin eval) |
| `src/previews/catalog.js` | AUTO: `tag → { json, behavior? }` |
| `src/previews/registry.js` | `loadPreview(tag)` → `JsonPreview` |
| `src/components/layout/preview-component.js` | Shell split + TOC |
| `src/previews/_shell.html` | **Único** HTML: fullscreen `?tag=` |

## Schema (`is-preview/v1`)

```json
{
  "$schema": "is-preview/v1",
  "tag": "is-button",
  "category": "actions",
  "title": "<is-button>",
  "titleHtml": true,
  "description": "…",
  "styles": "/* CSS local */",
  "storageKey": "docs-is-button",
  "hasBehavior": false,
  "sections": [
    {
      "id": "intro",
      "title": "…",
      "lede": "…",
      "blocks": [
        { "kind": "demo", "html": "<is-button>Hola</is-button>" },
        { "kind": "callout", "html": "…" },
        { "kind": "code", "code": "…", "lang": "html" },
        { "kind": "table", "columns": ["A"], "rows": [["b"]] },
        { "kind": "html", "html": "<h3>…</h3>" },
        { "kind": "lede", "html": "…" }
      ]
    }
  ]
}
```

`kind` cerrados: `demo | callout | code | html | table | lede`.

## Qué va en JSON vs behavior

- **JSON:** markup de demos, snippets, CSS local, tablas, textos.
- **Behavior:** listeners, `whenDefined`, API live. Export `mount(ctx)` / `unmount(ctx)`.
- **NUNCA** lógica en string/`eval` dentro del JSON.

## Migración / regenerar catalog

```bash
node scripts/migrate-previews-to-json.mjs   # solo si reaparecen HTML
# catalog.js se regenera ahí; si solo añades un JSON a mano, añade la entrada en catalog.js
```

## Galería

`index.html` monta siempre `loadPreview(tag)` in-app. Fullscreen → `_shell.html?tag=`.

## Tests

- `tests/preview-json-contract.test.mjs` — todos los JSON + catalog ↔ manifest
- `tests/preview-controller.test.mjs` — kit + un solo HTML
- `tests/preview-paths.test.mjs` — refs de `_shell.html`
