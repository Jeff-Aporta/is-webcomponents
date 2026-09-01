# `code` para LLM

## Propósito

Edición, resaltado, formateo y anotación de código fuente en la UI. Categoría
dedicada a editores y utilidades de lenguajes/temas — no confundir con
`<is-md-editor>` (markdown) ni con el pintor de `<pre>` de documentación.

Chrome de galería relacionado (scripts, no tags): `scripts/view-sources.js` +
`scripts/demo-file-meta.js` + `scripts/component-sources.js`.

## Qué componente elegir

Elegir el módulo mínimo. Abrir el MD del módulo; no inferir API por el nombre.

| Necesidad | Componente / módulo |
| --- | --- |
| Editor editable con langs/temas/marks | `<is-code>` |
| Snippet de docs / CDN coloreado | `<is-code readonly compact>` vía `highlight-code.js` |
| Solo colorear un `<pre>` en docs | `highlight-code.js` (no es tag) |
| Markdown / prompts | `<is-md-editor>` / `<is-md-render>` |
| Ver JS/CSS/MD fuente del módulo en galería | botones `.file-meta` → `openViewSources` (no inventar modal) |
| Pesos `.min` CDN en galería | `.file-meta` + `<is-format-bytes autofit>` |
| Fórmula / ecuación (roadmap) | futuro `<is-latex>` — **aún no existe** |
| IDE documento `.tex` (roadmap) | futuro `<is-latex-doc>` — **aún no existe**; reutilizará `<is-code>` |

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-code>` | [code.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/code/code.md) | Editor CodeMirror 5: langs, theme JSON, format, marks, code↔json. `mode=block\|inline`. Snippets docs = `readonly compact`. |

**Nombre canónico:** el tag es **`is-code`**. El preview es `?s=` con
`{"component":"is-code"}`. **No** existe `is-code-editor` (rename histórico).

## Composición y relaciones

- Tooltips de documentación de marks: `<is-tooltip>` (feedback).
- Carga CM compartida con el pintor de docs: `_shared/highlight-code.js` +
  `_shared/code-cm.js`.
- Plugins de lenguaje: `_shared/code-langs.js` (`registerLanguage`).
- Formato: `_shared/code-format.js`. Tema: `_shared/code-theme.js`.
- Documento: `_shared/code-model.js` (`is-code-doc/v1`).
- Galería — fuentes: `scripts/component-sources.js` (paths + fetch local/raw) →
  `scripts/view-sources.js` (`<is-dialog class="is-view-sources">` + tabs +
  `<is-code>` readonly).
- Galería — meta de archivos: `scripts/demo-file-meta.js` (botones JS/CSS/MD +
  paths `.min` en `<is-code mode="inline">` + `<is-format-bytes>`).
- Dialog full-page: `<is-dialog>` (layout) con `width="100vw"` `spacing="0"` y
  CSS en `presentation.css` (`::part(dialog)` stretch).

## Reusar antes de crear

- `_shared/code-cm.js`, `code-langs.js`, `code-format.js`, `code-theme.js`, `code-model.js`
- `_shared/highlight-code.js`
- `_shared/adopt-css.js`, `_shared/form-associated.js`, `_shared/element-base.js`
- `<is-tooltip>` para tips anclados
- `<is-dialog>` + `<is-tab-group>` + `<is-copy-button>` + `<is-button>` + `<is-icon>`
  para cualquier visor de fuentes (no armar un modal nativo)
- `<is-format-bytes autofit>` para pesos (no formatear a mano)
- `localSourceUrl` / `rawSourceUrl` / `fetchSourceFile` / `resolveCdnMinPaths`
  en `component-sources.js` (no reinventar URLs ni sizes)
- Para langs nuevos (p. ej. `latex` cuando exista): `registerLanguage`, no un
  segundo editor

## Dependencias compartidas

CodeMirror **5.65.16** por CDN (jsDelivr). No CodeMirror 6. No npm del kit.
Los modos pesados (python) se cargan al activar el `lang`.

## Patrones comunes

- Texto plano vía `value` o contenido inicial; estructura vía `document` /
  `setDocument` / `code2json`.
- Temas y format como propiedades objeto o atributos JSON.
- Marks los aporta un sistema externo (linter, IA); el editor no diagnostica.
- Docs/snippets: `readonly` + `compact`; paths cortos en meta: `mode="inline"`.
- Barra de página de galería = **solo una** `.file-meta-page` tras el título
  del preview (fuentes + pesos). Sin hints literales (“sin minificar”, etc.).
  **No** repetir bajo cada `h2` ni dentro de cada paper/`is-demo`.
- Paths CDN en `.file-meta`: `<code class="file-meta__path">` (no `<is-code>` —
  evita que CodeMirror haga scrollIntoView y mande el F5 al final del docs).
- `#vsPath` del modal de fuentes = **URL absoluta con host** (`<a class="vs-path">`),
  no el `repoPath` relativo (`src/components/...`).
- Modal de fuentes = **full page** (`100%` viewport, sin radius/sombra; migrar
  instancia vieja si `#vsPath` no es `<a>` o falta `width="100vw"`).

## Qué hacer

- Leer `code.md`, JS, CSS y el preview del manifest (`code/is-code.json`).
- Registrar langs nuevos con `registerLanguage` (campo `heavy` + `load`).
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs`.
- Chrome de galería: cablear `view-sources.js` + `demo-file-meta.js` en
  `index.html` y `src/previews/_shell.html`.
- Al tocar fuentes/meta: correr `node --test tests/gallery-sources-meta.test.ts`.
- Paths CDN en galería: `resolveCdnMinPaths` + chips de path `.min` (sin mapa de bytes en dist).
- Roadmap LaTeX: diseñar/aprobar antes de scaffold; reutilizar `<is-code>` +
  motor math por CDN (KaTeX preferido); categoría `code`.
- Snippets de demos HTML: `lang="html"` en el JSON **o** dejar que bootstrap
  llame `inferLanguage` (no pre-marcar `data-cm="1"` en `render.js`).
- Tras tocar coloreado/formato: `node --test tests/code-infer-lang.test.ts`.

## Qué no hacer

- No usar CodeMirror 6 ni `@codemirror/*`.
- No inventar API de marks distinta a `is-code-doc/v1`.
- No reimplementar tooltips: usar `<is-tooltip>`.
- No meter Prettier/ESLint como dependencia npm del componente.
- **No** referirse al tag como `is-code-editor` ni abrir previews con ese
  `component` en `?s=`.
- **No** montar `.file-meta` bajo cada sección/`is-demo`: una sola `.file-meta-page`.
- **No** poner `position: sticky` en `.file-meta-page` (fluye con el scroll).
- **No** montar `.vs-page-bar` con textos de hint / “auditoría”.
- **No** mostrar en `#vsPath` solo `src/components/...` sin host.
- **No** dejar el dialog de fuentes a `min(96vw)` / altura limitada: es full page.
- **No** usar VP9/WebM ni inventar un segundo pintor de código para docs: es
  `<is-code>` / `highlight-code.js`.
- **No** crear `<is-latex>` / `<is-latex-doc>` sin pasar por diseño acordado y
  sin reutilizar `_shared/code-*` + `<is-dialog>` / layout existente.
- **No** escribir `.test.ts` en este repo (no hay pipeline TS de producto):
  guardianes = `tests/*.test.mjs`.
- **No** crear snippets HTML sin lang/inferencia: el default `javascript` pinta
  `<` como operador (cian) y “parece tema roto”.
- **No** declarar el visor listo porque `value` / `data-cm="1"` existen: CM
  puede estar vacío. Siempre asignar `el.value = text` en `paintOne`;
  `refresh()` tras `is-after-show` / `is-tab-show`.
- **No** omitir `is-tab-group` del chrome de galería (`GALLERY_CHROME_TAGS`).

## Errores conocidos y prevención

- `all.min.js` importa módulos en orden: un fallo de evaluación en un entry
  anterior puede impedir que se registren entries posteriores (p. ej.
  `is-split-panel`). Nunca dejar un `import` dentro de un bloque de comentario
  JSDoc.
- Fuente manda sobre preview. Ruta preview = `manifest.js.page`.
- **Rename `is-code-editor` → `is-code`:** URLs/bookmarks viejos y audits con
  `component: 'is-code-editor'` abren preview vacío. Fix: siempre `is-code`.
- **Barra legacy `.vs-page-bar`:** convivía con `.file-meta-page` y mostraba
  comentarios (“Archivos del repo sin minificar…”). Fix: solo `.file-meta*`;
  `mountPageButton` solo elimina `.vs-page-bar`; CSS `display: none` de
  seguridad. Guardián: `tests/gallery-sources-meta.test.ts`.
- **`#vsPath` relativo:** el usuario no podía copiar/abrir la URL real del
  Live Server. Fix: `absoluteSourceUrl` + `localSourceUrl(...).href` +
  `<a id="vsPath">`. Guardián: mismo test.
- **Modal fuentes no full-page:** `--width: min(96vw)` + panel `70vh` dejaba
  chrome a medias. Fix: `width="100vw"` `spacing="0"` + `::part(dialog)`
  stretch. Guardián: mismo test.
- **Snippets docs con runMode suelto:** no pintar `<pre>` a mano si el contrato
  es `<is-code readonly compact>`.
- **HTML coloreado como JS:** sin `lang` + `data-cm` prematuro. Fix:
  `inferLanguage` + softFormat; no `renderDemoEquiv`. Guardián:
  `tests/code-infer-lang.test.ts`.

- **F5 al final del docs:** CodeMirror `setValue`/`fromTextArea`/`refresh` hace
  scrollIntoView del cursor y mueve `is-main`. Fix: `#withOuterScroll` en
  `<is-code>`; paths de file-meta sin CM; `scroll-behavior: auto` en
  `is-main.main`; re-`restoreScroll` al montar la barra. Guardián:
  `tests/gallery-sources-meta.test.ts`.

- **Visor de fuentes en blanco con texto en el atributo:** getter devolvía seed
  si CM `getValue()` era `''`; `paintOne` saltaba el setter; CM medía 0 px en
  panel `hidden`. Fix: `show()` antes de cargar; `refreshEditor`; seed →
  `setValue` si el lienzo está vacío. Ver LLM.md error **#44**.

## Roadmap (no implementar sin diseño aprobado)

| Tag previsto | Rol | Reutilizar |
| --- | --- | --- |
| `<is-latex>` | Escritura/render de ecuaciones (todas las notaciones math) + export SVG/PNG | Motor math CDN; UI con `is-*` existentes |
| `<is-latex-doc>` | Editor de documento: TOC/estructura, BibTeX `\cite`, `\label`/`\ref`, highlight, autocomplete, auto-`\end{}`, símbolos escapados, export figuras | Editor = `<is-code>` + `registerLanguage('latex')`; layout = `is-split-panel` / `is-dialog`; pesos/format = helpers ya existentes |

Fases sugeridas (acordadas en brainstorm): (1) `<is-latex>` o (2) `<is-latex>` +
MVP de `<is-latex-doc>` sin BibTeX completo. **No** “todo de una vez”.

## Módulos internos

No hay tags internos en esta categoría. Los helpers viven en `_shared/code-*.js`.
Scripts de galería (no CE): `view-sources.js`, `demo-file-meta.js`,
`component-sources.js`.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
- Carta de leyes: [LLM.md raíz](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/LLM.md)
