# Constitution — ISWC

Invariantes del kit. Un cambio aquí es decisión de producto, no de una sesión.

Flujo: [flujo-sdd.md](flujo-sdd.md).

## C-1 Un solo repo

- Repo: `Jeff-Aporta/is-webcomponents`. Galería + CDN + fuentes en el mismo árbol.
- Nombre canónico del kit: **`iswc-base`** en todo (prosa, rutas, carpetas, títulos, nombres); el nombre del repo en GitHub solo vive dentro de sus URLs (GitHub/jsDelivr/githack/raw/Pages) y en `REPO_GITHUB` hasta que se renombre ([ADR nomenclatura](adr.md#adr-nomenclatura-iswc-base-2026-11-04), guardián `nomenclatura`).
- Commits: solo si el usuario lo pide. Autor **Jeff-Aporta**. Sin `Co-authored-by`.
- Push: solo con pedido explícito.

## C-2 Dónde vive la verdad

| Pieza | Fuente |
|---|---|
| Inventario de tags | [`src/manifest.ts`](../src/manifest.ts) |
| Fuentes de componentes | `src/components/` |
| Previews | `src/previews/<cat>/<tag>.json` + `behaviors/` |
| Estilos / tokens | `src/styles/` (`--iswc-*`) |
| Artefactos CDN | `dist/cdn/` (generado; no editar a mano) |
| Contrato SDD | `specs/` (esta carpeta) |
| Diario operativo | [`lessons.md`](lessons.md) |
| Docs por tag (agentes) | `src/components/**/*.md` |

## C-3 Layout `src/`

- Toda la fuente de producto bajo `src/` (incl. `src/manifest.ts`). En la raíz: `scripts/`, `dist/`, `tests/`, `index.html`, `docs/` (HTML SEO generado).
- **Prohibido** recrear `components/`, `styles/`, `previews/`, `skills/` en la raíz del repo.
- Guardián: `tests/gobernanza/src-layout.test.ts`.

## C-4 Guardianes

- Los tests viven en `tests/*.test.mjs` y **se commitean**.
- Gate local: `deno task test` (guardianes con cooldown; `-- --sin-cooldown` corre todo) y `deno task test:all` (typecheck + test + audit).
- Ningún cambio de comportamiento entra sin spec y sin guardián que lo verifique. Detalle: [testing.md](testing.md).

## C-5 CDN

- Publicación: solo `dist/cdn/<categoria>/<tag>.min.js` (+ `.min.css` si aplica) y `loader.min.js`.
- **No** `all.min.js`, **no** `category.*.min.js`, **no** bundles sueltos en `dist/` raíz.
- Consumo: `loader.min.js` + `L.load(tags|categorias)` con anti-redundancia.

## C-6 Previews

- Un preview por tag = JSON `iswc-preview/v1` + chrome `<iswc-preview-component>`.
- Comportamiento en `src/previews/behaviors/<tag>.js`. **No** HTML por tag (salvo `_shell.html`).
