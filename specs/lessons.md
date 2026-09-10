# Lessons — catálogo de errores

Lecciones pagadas, agrupadas por tema. Cada fila: síntoma → regla/fix → guardián. Era el "diario" del repo (raíz y por categoría); ahora consolidado aquí y en [`constraints.md`](constraints.md) / [`componentes.md`](componentes.md) / [`cdn.md`](cdn.md).

## Iconos

| Lección | Regla | Guardián |
|---|---|---|
| SVG de icono servido como `<img>` → icono "congelado" en su color (negro sobre claro) | Inyectar inline (`resolveIconRaw` + innerHTML en shadow) y `#normalizeInlineSvg()` fuerza `fill`/`stroke: currentColor` | `icon-references`, `icon-currentcolor` |
| `currentColor` en SVG que sale del DOM (PNG/data-URI) → negro o invisible | Materializar el color al exportar | — |
| "Normalizar" todo a `viewBox="0 0 24 24"` → familias enteras en blanco (grid ≠ 24) | Usar `collections.json` (height real), no heurísticas de coordenadas | — |
| Iconos con paleta propia (banderas/logos/emoji) normalizados a `currentColor` → a medio pintar | Detectar paleta **por icono**, respetar el SVG | `icon-currentcolor` |
| `<iconify-icon>` / `api.iconify.design` en runtime → sistema duplicado / 404 | Sistema propio servido con el bundle | `no-iconify` |
| `fetch(..., { cache: 'force-cache' })` → iconos rotos persistidos en cache web | Usar `cache: 'default'`; `rawCache` en memoria | — |
| Hardcodear paths absolutos de iconos en dev → 404 con previews en `previews/<cat>/` | `rootFromBaseURI()` / `<base href>` | — |

## Tema y paleta

| Lección | Regla | Guardián |
|---|---|---|
| `color-scheme: dark` en `:root` → el CDN oscurece apps claras | Solo en `.theme-dark`/`.theme-light`; sin `html,body { background }` en base/palettes | `theme-contract` |
| Default de paleta `insoft` → marca incorrecta al pegar el CDN sin `data-palette` | Default `contapyme` en CSS/HTML/fallbacks/`DEFAULT_PALETTES[0]` | `palette-and-snippet-contract` |
| Dos grafías de marca conviviendo (`inSoft` / `insoft`) | Unificar a `InSoft` en texto visible (identificador `insoft` en minúsculas intacto) | `brand-casing` |
| Shadows con `#fff`/`rgb(0 0 0 / X%)` hardcodeados sin override light | Override `[data-theme="light"]`: blanco a 75–92%, negro a 9–13% | — |
| Halos/orbes con hues oscuros → manchas en light | `opacity` explícito (0.28–0.55) en light | — |

## Color × appearance (botones)

| Lección | Regla | Guardián |
|---|---|---|
| `color` y `variant` mezclados / matriz N×M | Dimensiones ortogonales: `color`→`--_tone-*`, `variant`→consume; una regla por color/variant | `button-color-appearance` |
| Fallbacks `--is-color-*-600` en `:host` → desajuste invisible con el tema | Fallback `var(--x, #hex)` solo en el sitio de uso | `token-vocabulary` |
| Hex de marca distinto en filled vs outlined (`#228be6` vs `--is-brand-text`) | Ambas apariencias por `--_tone-*` de la misma familia | `button-color-appearance` |
| `danger` / `error` casi indistinguibles | `danger: crimson` (destructivo), `error: red` (fallo); mover fallbacks a la vez | — |

## Enums / API / eventos

| Lección | Regla | Guardián |
|---|---|---|
| `variant="ghost"` inventado → se pinta con el default, sin síntoma | Verificar el enum (`VALID_*`/JSDoc) antes de usarlo; no inventar por analogía | `attr-enums` |
| Evento documentado que nadie emite (`is-invalid`) → listener que nunca salta | Escuchar el `invalid` nativo y reemitir; no envolver `checkValidity` | `button-events` |
| Preview enseñaba menos de lo que el componente acepta (`5 de 7 colores`) | Lo que falta no da error; mantener preview = fuente | `attr-enums` |
| `hasAttribute` no prueba tipo booleano | Marcar boolean solo con setter toggle o contrato explícito | — |

## CSS en shadow

| Lección | Regla | Guardián |
|---|---|---|
| `&[attr]` dentro de `:host {}` → compila a `:host[attr]`, no matchea el host | `:host([attr])` top-level (solo `&[attr]` correcto dentro de regla HIJA) | `shadow-css-scope` |
| `mi-tag .algo` en hoja adoptada por `mi-tag` → CSS muerto | `:host(mi-tag) .algo` / `::slotted(mi-tag)` | `shadow-css-scope` |
| `otro-tag::part(x)` sobre tag slotted → no cruza al light DOM proyectado | Estilar la clase interna desde el shadow del propio elemento | `shadow-css-scope` |
| `@import '../_shared/x.css'` en CSS de componente → 404 silencioso en dist | Reescribir al nombre publicado (`x.min.css`); `tests/css-imports` | `css-imports` |
| `animation: both` deja matriz identidad → overlay `fixed` desplazado | Usar `backwards`; overlays se auto-corrigen midiendo su origen real | — |
| `will-change: transform` con zoom `scale()` → SVG borroso | No rasterizar a escala 1 | — |

## Escala em

| Lección | Regla | Guardián |
|---|---|---|
| Escala em que no escala (`is-fab`: 0.75/1/1.25em salen iguales) | `:host { font-size: inherit }` + control nativo `font: inherit`; tono con `this.color` (no `this.variant`) | `em-scale-font-inherit` |
| `this.variant` usado para el tono semántico tras rename a `color` | `color` = familia; `variant` = apariencia | `em-scale-font-inherit` |

## Persistencia

| Lección | Regla | Guardián |
|---|---|---|
| Keys planas / `sessionStorage` / root `is-components` → fragmentado | Un solo `localStorage['is-webcomponents'][tag][storage-key]` vía `_shared/prefs.js`; opt-in | `prefs-contract` |
| Sidebar de columnas en template sin cablear | Cero lógica de UI en el shadow sin wire | — |

## Previews y galería

| Lección | Regla | Guardián |
|---|---|---|
| HTML gordo + lógica mezclada por tag (400+ líneas) | JSON `is-preview/v1` + `<is-preview-component>` + `behaviors/`; solo `_shell.html` | `preview-json-contract`, `preview-controller` |
| Migración HTML→JSON que pierde el body (sin secciones → JSON vacío) | Sin sections → un bloque `html` con el body; verificar tamaños/contenido clave | `preview-json-contract` |
| Utilería sin tab (`IsUi` en CDN/MD pero no en nav) | `helpers/` público = manifest + JSON + MD | `helpers-homogeneity` |
| `demo-code.js` snippet sin `data-theme`/`data-palette` → al pegarlo no hereda contexto | `withSnippetContext`/`stampContext` sella la raíz | `palette-and-snippet-contract` |
| Bloque «HTML puro equivalente» bajo demos → ruido | No llamar `renderDemoEquiv`; `equivHtml` opcional en JSON, no se pinta | `demo-equiv` |
| Lógica de preview en strings/`eval` → rompe tipado/debug/seguridad | Solo markup/CSS/código en el JSON; listeners en `behaviors/` | — |
| `#toaster`/`#grid` ausentes en el JSON → `TypeError` silencioso al montar | El `mount` crea el host o falla el UX; `ISComponentPreview.on(null,…)` no-op | `ux-gallery-invariants` |
| F5 al final del docs por `scrollIntoView` de CM | Paths `.min` en `<code>` (no `<is-code>`); editor nativo sin scrollIntoView | `gallery-sources-meta` |
| Visor de fuentes "vacío" con texto en el atributo | `dlg.show()` antes de `loadKind`; `refreshEditor` en `is-after-show`/`is-tab-show`; `paintOne` siempre `el.value=text`; chrome con `is-tab-group` | `gallery-sources-meta` |
| Modal de fuentes no full-page (`min(96vw)`/`70vh`) | `width="100vw"` `spacing="0"` + `::part(dialog)` stretch | `gallery-sources-meta` |

## Boot (galería)

| Lección | Regla | Guardián |
|---|---|---|
| FOUC + tags crudos + demos vacíos (boot serial con `await all`) | CSS `<link>`; await solo shell mínimo + `preview-component.min.js`; `setHostPreview` = `delete` + `whenDefined` | `gallery-boot` |
| `cdn-panel` → `src/.../cdn-snippet.js` cuelga el boot | Importar `dist/cdn/feedback/cdn-snippet.min.js` | `gallery-boot` |
| `previewHost.preview` asignado antes del upgrade del CE → own property que tapa el setter | `whenDefined` + `delete host.preview` antes de asignar | `gallery-boot` |
| Reimportar `preview-component` desde `src/` en Pages → 404 lucide/heroicons | Importar desde `dist/cdn/preview/preview-component.min.js`; prefetch solo `mdi`+`tabler` | `cdn-loader`, `icon-prefetch` |

## Loader / CDN

| Lección | Regla | Guardián |
|---|---|---|
| `load('actions')` + luego `load('is-button')` → doble fetch | Anti-redundancia: `has`/`skipped`; preferir categoría/tags | `load-plan` |
| `all.min.js` suelto en head → bundle enorme | Sin `all.min.js`/`category.*.min.js`; `load('all')` = jobs por tag | `cdn-folders` |
| Minificado sin rutas MD → LLM sin contexto | Banner `/*! … docs (LLM) */` + copiar `loader.md` al dist | `cdn-loader` |
| Carga categoría sin jobs (`planLoads(['actions'])` = []) | Marcar `coveredTag` después de empujar jobs del lote | `load-plan` |
| jsDelivr cachea 24 h; `@main` puede ser anterior a un componente nuevo | Consumidor: pedir por ruta propia `dist/cdn/<cat>/<comp>.min.js` además de `all.min.js` | — |
| Pin por SHA en jsDelivr → 403 "Package size exceeded" (>50 MB por iconos) | Usar `@main` | — |

## Diagramas

| Lección | Regla | Guardián |
|---|---|---|
| Motor de capas ve aristas entre grupos → entidades fuera de su cajón, cajones solapados | Un grupo = un sub-diagrama (layoutNodeLink solo con aristas internas) | `er-clusters` |
| "Todos los nodos tienen aristas" → 14 sueltas apiladas en capa 0 (tira vertical 4700px) | Nodos aislados aparte, en rejilla con `ratio` | `er-clusters` |
| `ratio` mal usado → empaquetado a tiras | Escala logarítmica; score `|log(ratio/guía)|` mínimo | `er-clusters` |
| Self-loop delegado al A* → colapsa a 1 celda (línea vertical con banderín) | Trazar a mano 4 esquinas (`M→out→up→back`) | `sequence-self-loop` |
| Leyenda medida sobre el centro del último actor → solapa | `baseW + boxW[n-1]/2 + 16`; grid máx 3 filas | `sequence-legend-grid` |
| `ifaceById` poblado antes de geometría → aristas a `(0,0)` | Rellenar el mapa auxiliar DESPUÉS del map de geometría | `component-diagram-ifaces` |
| Headless/PNG ilegible con geometry checks verdes | La cabecera cuenta para el ancho; etiquetas fuera de la figura entran al lienzo; `is-org-chart` (foreignObject) no vale para imagen exportada | `render-legibilidad` |

## Entorno (PowerShell, git, jsDelivr)

| Lección | Regla | Guardián |
|---|---|---|
| PowerShell interpreta `<`/`>` como redirección en `git commit -m` | Escribir mensaje con `git commit -F archivo.txt` | — |
| `&&` no funciona en PowerShell | Usar `;` o `cmd /c "... && ..."` | — |
| `wc -l`/`ls -la`/`rm -rf` no existen | `(git status --short -- path).Count`, `Get-ChildItem`, `Remove-Item -Recurse -Force` | — |
| `git show … > file` en UTF-16 → Node lee basura | `execSync('git show …', { encoding:'utf8' })` u `Out-File -Encoding utf8` | — |
| Mojibake UTF-8 al reescribir `.ts`/`.html` desde PowerShell | Editar desde Node `writeFileSync(p, s, 'utf8')` o herramienta de edición | `npm run test:e2e` (00 nav «Código») |
| Heredoc bash se come el escapado de una regex | Escribir archivos con la herramienta de edición (no `cat > file << 'EOF'`) | — |
| `git add assets/icons/` "colgado" (~60 s) | Esperar; el comando está corriendo | — |
| Bundles `bundle:true` colapsan `import.meta.url` | Los bundles (`category.*.min.js`/`all.min.js`) solo re-importan `.min.js` individuales (`bundle:false`) | `cdn-folders` |
| `rm -rf dist/cdn` y recopiar ~317k iconos en cada run → watcher de Live Server en bucle | Preservar `dist/assets/`; copia incremental; excluir rutas del watcher | — |

## Contenido no consolidado

Detalles de **inventario por tag** (tablas de componentes de cada categoría), listas de **dependencias compartidas** (`_shared/`, `../media/icon.js`, etc.) y textos repetidos de "Qué hacer"/"Que no hacer" genéricos no se transcriben aquí: viven en `manifest.ts`, en los `<categoría>/*.md` (que **no se borran**) y en [`componentes.md`](componentes.md) S-K6–S-K19. Tampoco se duplican los diagramas de "marca tipográfica / vídeo de otro repo" ni las notas operativas de un solo uso (ver reporte de consolidación).
