<!-- @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/iswc-foundation/references/04-estilos.md -->
# 04 — Estilos SCSS

- **Fuente canónica `.scss`**, hermana del componente; el build la compila (`.tmp-scss/`) y la incrusta en su módulo
  (`import css from 'iswc:css'` + `static css = css`: el molde del kit crea una hoja por clase y la adopta). Ningún
  `.css` vive en `src/` ni `view/`; ningún `<style>` ni constante CSS escrita a mano en un `.ts`.
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

**Paletas (25) y Panda.** `data-palette` acepta una de las 25 paletas generales
del kit (`src/styles/palettes.json`): rojos `cardenal` `rubi` `granate`;
naranjas/amarillos `citrino` `marte` `jupiter` `cobre` `ambar`; verdes `iguana`
`esmeralda` `peridoto` `jade` `menta` `olivino`; azules/cianes `delfin`
(default) `zafiro` `turquesa` `neptuno` `aguamarina` `lapislazuli`;
violetas/rosas `orquidea` `amatista` `flamenco` `tanzanita`; neutro `luna`.
Cada una tiene main (`--iswc-color-brand`), contraste (`--iswc-color-contrast`,
`--iswc-contrast-text`, `--iswc-contrast-soft`), bright (`--iswc-color-bright`),
superficies y textos tintados por su tono. `data-panda` en el mismo nodo que
`data-theme` invierte solo el fondo de la página (`--iswc-bg-page`); papeles,
componentes y textos siguen el tema. El usuario elige ambas con `<iswc-palette-selector>`
(persisten en `iswc:app-cfg` → `palette`, `panda`); `initApp({ palette, panda })`
fija los valores iniciales.
