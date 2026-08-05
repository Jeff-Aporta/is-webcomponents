# Previews controlados — `is-preview-component` + `ISComponentPreview`

## Objetivo

Homogeneizar la documentación/demo de cada `is-*`: mismo chrome, misma tipología
de bloques, sin HTML gordo por componente. El **comportamiento** no se expresa
como string/`eval`: vive en métodos reales de una clase controladora.

## Piezas

| Pieza | Rol |
| --- | --- |
| `src/previews/_kit/types.d.ts` | Tipos: `PreviewDefinition`, `PreviewSection`, `PreviewBlock`, … |
| `src/previews/_kit/ISComponentPreview.js` | Clase base: `definition` + `mount`/`unmount` + `this.on()` |
| `src/previews/_kit/render.js` | Pinta sections/blocks → DOM |
| `src/components/layout/preview-component.js` | `<is-preview-component>` shell (split + TOC) |
| `src/previews/<cat>/<tag>.preview.js` | Controlador concreto (datos + mount) |
| `src/previews/registry.js` | `tag → import()` de controladores |
| `src/previews/_shell.html` | Pantalla completa / deep-link `?tag=` |
| HTML legado `*.html` | Shell mínimo si migrado; iframe completo si no |

## Qué va en string (OK)

- Markup estático de demos (`block.kind === 'demo'`, HTML)
- Snippets de código (`kind: 'code'`)
- CSS local del preview (`definition.styles`)
- Tablas / callouts / ledes

## Qué NO va en string

- Listeners (`is-change`, clicks de API live)
- Lógica de `whenDefined`, logs, toggles de props
- Todo eso: `mount(ctx)` con `this.on(el, type, handler)` (AbortController)

## Migrar un preview

1. Crear `src/previews/<cat>/is-foo.preview.js` extendiendo `ISComponentPreview`.
2. Registrar en `registry.js` → `LOADERS`.
3. Sustituir el HTML por shell mínimo (ver `is-button-group.html`).
4. Probar: galería (host in-app) + iframe/fullscreen (`_shell.html?tag=`).
5. `node tests/preview-controller.test.mjs`

## Shell de la galería

`index.html` usa `<is-preview-component>` si `hasControlledPreview(tag)`; si no,
iframe al HTML legado. No borrar HTML no migrados.

## DO / DON'T

- DO: un `.preview.js` por tag migrado; HTML ≤ shell.
- DO: tipar bloques con `kind` discriminado.
- DON'T: `eval`, `new Function`, ni `onclick="..."` generados desde strings de lógica.
- DON'T: reinventar el chrome (split/TOC/demo) fuera de `is-preview-component`.
