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

## Páginas completas (el home)

Un preview normal es la ficha de un componente y le basta el chrome. Una página
completa trae su propio layout, y para eso hay cuatro campos:

| Campo | Dónde | Para qué |
| --- | --- | --- |
| `mainClass` | definition | Clases del `is-main` del chrome, que es el scroller |
| `wrapperClass` | definition | Contenedor de todas las secciones |
| `prelude` | definition | HTML fijo antes de las secciones, dentro del wrapper |
| `hideTitle` | section | No pintar el `<h2>`: el markup ya trae su encabezado |
| `as` / `className` / `ariaLabel(ledby)` | section | Contenedor propio de la sección |

El wrapper no es decorativo: es donde la página declara sus custom properties.
Si ese nodo falta, un `var(--propia)` se resuelve vacío, la declaración entera
se descarta y el efecto desaparece **sin error en consola** — así se perdió el
titular del home, que se pinta con `background-clip: text` sobre un degradado de
`--hue-*` y quedó con relleno transparente sobre nada.

`hideTitle` exige `title` igual: es la etiqueta del TOC.

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
- `tests/home-invariants.test.mjs` — estructura del home: envoltorios, ids que
  consulta el behavior y que el behavior compile

Tras tocar el kit hay que reconstruir `dist/`: `all.min.js` importa
`layout/preview-component.min.js`, ese bundle registra `is-preview-component`
antes que la copia de `src/`, y el `customElements.get` de la fuente cede. Con
el JSON nuevo y el bundle viejo la página se pinta con las reglas de ayer.
