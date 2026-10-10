# 04 — Estilos SCSS

- **Fuente canónica `.scss`**, hermana del componente; el build la compila (`.tmp-scss/`) y publica la
  `.css` junto al módulo. Ningún `.css` vive en `src/` ni `view/`; ningún `<style>` ni constante CSS en un `.ts`.
- **Colores solo con tokens del kit** `--iswc-*` (siguen al tema y la paleta): fondos `--iswc-bg`,
  `--iswc-bg-soft`, `--iswc-bg-elev`, `--iswc-surface`; texto `--iswc-text`, `--iswc-text-soft`,
  `--iswc-text-dim`; bordes `--iswc-border`, `--iswc-border-soft`; acento `--iswc-accent`,
  `--iswc-brand-text`, `--iswc-on-accent`; estado `--iswc-color-{success,warning,danger,info}`
  (+ `-strong`, `-pale`). Sin hex, `rgb()`, `white`/`black`. Un tono nuevo = `color-mix()` de tokens.
- **`_tokens.scss`** (`@use "tokens" as t;`): escala `t.esp(1..10)` y `t.radio(sm|md|lg)`.
- **`_mixins.scss`** (`@use "mixins" as m;`): patrones repetidos (`m.host-bloque`, `m.una-linea`,
  `m.rotulo($opacidad)`). Un patrón entra cuando se repite en varias hojas.
- **Anidado al máximo** bajo la raíz de cada bloque (`.x { &:hover {…} .y {…} }`).
- **`prefers-reduced-motion`**: toda hoja con `transition`/`animation` declara el bloque que las apaga.
- Personalizar el kit solo con sus tokens y los `::part()` que expone (no inventar parts).
- `app.scss` es solo light DOM (página); oculta el body hasta `data-app-ready`.
