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
| `src/previews/catalog.ts` | AUTO: `tag → { json, behavior? }` |
| `src/previews/registry.ts` | `loadPreview(tag)` → `JsonPreview` |
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
        {
          "kind": "demo",
          "html": "<is-button>Hola</is-button>"
        },
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

### Texto vs markup en los bloques

El render pinta unos campos con `textContent` y otros con `innerHTML`. Meter
markup donde va texto no da error: se lee literal en pantalla.

| Campo | Se pinta con | Qué admite |
| --- | --- | --- |
| `code` (kind `code`) | `pre.textContent` | Solo el código. El color lo pone CodeMirror |
| `columns[]` (kind `table`) | `th.textContent` | Solo la etiqueta de la columna |
| `rows[][]`, `html`, `lede` | `innerHTML` | Markup y entidades (`&lt;`) |

`lang` es opcional y solo vale `html | js | css` (y sus alias). Si sobra, mejor
omitirlo: `resolveMode()` deduce el modo del texto. Lo que **no** vale es
mentirlo — `lang: "html"` sobre JavaScript hace que CodeMirror tokenice como
htmlmixed, que no produce ni un token, y el bloque sale sin una gota de color.
`tests/preview-blocks.test.ts` vigila las tres cosas.

## El contenido llega después: `is-preview-ready`

El docs es UNA página que monta los previews desde JSON, así que cuando los
módulos de `scripts/` arrancan todavía no hay nada que decorar. Al terminar de
montar, `is-preview-component` emite `is-preview-ready` (bubbles + composed, con
`detail.tag`) y ahí se reengancha todo lo que decora el contenido:

| Módulo | Qué hace al oírlo |
| --- | --- |
| `highlight-pre.js` | Repinta los `pre.code` del preview nuevo |
| `docs-chrome.js` | Pone el botón de copiar en esos `<pre>` |
| `cdn-panel.js` | Monta el `<is-cdn-snippet>` del componente |
| `preview-chrome.js` | Devuelve la barra de tema/paleta al `main` |

Dos detalles que se pagan caro si se olvidan: `renderDefinition()` **vacía** el
`main`, así que lo que se inyecte ahí hay que remontarlo en cada preview (los
handlers son idempotentes); y el tag sale de `detail.tag`, nunca de la ruta —
`location.pathname` es `index.html` o `_shell.html`, no hay una página por
componente. Así se perdió el panel «Consumo por CDN» de todos los componentes.

`tests/preview-ready-hooks.test.ts` verifica el emisor, los cuatro oyentes y
que las dos páginas carguen `cdn-panel.js`.

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
node scripts/migrate-previews-to-json.ts   # solo si reaparecen HTML
# catalog.js se regenera ahí; si solo añades un JSON a mano, añade la entrada en catalog.js
```

## Galería

`index.html` monta siempre `loadPreview(tag)` in-app. Fullscreen → `_shell.html?tag=`.

## Tests

- `tests/preview-json-contract.test.ts` — todos los JSON + catalog ↔ manifest
- `tests/preview-controller.test.ts` — kit + un solo HTML
- `tests/preview-paths.test.ts` — refs de `_shell.html`
- `tests/home-invariants.test.ts` — estructura del home: envoltorios, ids que
  consulta el behavior y que el behavior compile
- `tests/preview-blocks.test.ts` — texto vs markup en `code` y `columns`, y
  `lang` coherente con el código
- `tests/preview-ready-hooks.test.ts` — quién emite y quién escucha
  `is-preview-ready`

Tras tocar el kit hay que reconstruir `dist/`: `all.min.js` importa
`layout/preview-component.min.js`, ese bundle registra `is-preview-component`
antes que la copia de `src/`, y el `customElements.get` de la fuente cede. Con
el JSON nuevo y el bundle viejo la página se pinta con las reglas de ayer.
