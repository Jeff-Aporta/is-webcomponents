# Constitution — IS Web Components

Invariantes del kit. Un cambio aquí es decisión de producto, no de una sesión.

Flujo: [flujo-sdd.md](flujo-sdd.md).

## C-1 Un solo repo

- Repo: `Jeff-Aporta/is-webcomponents`. Galería + CDN + fuentes en el mismo árbol.
- Commits: solo si el usuario lo pide. Autor **Jeff-Aporta**. Sin `Co-authored-by`.
- Push: solo con pedido explícito.

## C-2 Dónde vive la verdad

| Pieza | Fuente |
|---|---|
| Inventario de tags | [`manifest.js`](../src/manifest.js) |
| Fuentes de componentes | `src/components/` |
| Previews | `src/previews/<cat>/<tag>.json` + `behaviors/` |
| Estilos / tokens | `src/styles/` (`--is-*`) |
| Artefactos CDN | `dist/cdn/` (generado; no editar a mano) |
| Contrato SDD | `specs/` (esta carpeta) |
| Diario operativo | [`AGENTS.md`](../LLM.md) |
| Docs por tag (agentes) | `src/components/**/*.md` |

## C-3 Layout `src/`

- Toda la fuente de producto bajo `src/` (incl. `src/manifest.js`). En la raíz: `scripts/`, `dist/`, `tests/`, `index.html`, `docs/` (HTML SEO generado).
- **Prohibido** recrear `components/`, `styles/`, `previews/`, `skills/` en la raíz del repo.
- Guardián: `tests/src-layout.test.ts`.

## C-4 Guardianes

- Los tests viven en `tests/*.test.mjs` y **se commitean**.
- Gate local: `node tests/run-all.ts` (sin servidor por defecto; con `PORT=8391` incluye tests de red).
- Ningún cambio de comportamiento entra sin spec y sin guardián que lo verifique. Detalle: [testing/spec.md](testing/spec.md).

## C-5 CDN

- Publicación: solo `dist/cdn/<categoria>/<tag>.min.js` (+ `.min.css` si aplica) y `loader.min.js`.
- **No** `all.min.js`, **no** `category.*.min.js`, **no** bundles sueltos en `dist/` raíz.
- Consumo: `loader.min.js` + `L.load(tags|categorias)` con anti-redundancia.

## C-6 Previews

- Un preview por tag = JSON `is-preview/v1` + chrome `<is-preview-component>`.
- Comportamiento en `src/previews/behaviors/<tag>.js`. **No** HTML por tag (salvo `_shell.html`).
