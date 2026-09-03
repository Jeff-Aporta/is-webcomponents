# Spec — Componentes `is-*`

Forma de los custom elements, `_shared/` y convenciones de API.

Diario: [`AGENTS.md`](../LLM.md) (carta, DO/DON'T, enums).

## Contexto

Cada tag es un Custom Element con Shadow DOM. El inventario y rutas de build salen de [`manifest.js`](../src/manifest.js).

## S-K1 Nomenclatura y categorías

- Prefijo obligatorio: `is-`.
- Categorías del manifest: `actions`, `feedback`, `forms`, `data`, `charts`, `diagrams`, `layout`, `navigation`, `helpers`, `media`, `isp`, `code`, …
- Sub-tags (p. ej. `is-tab-panel`) comparten `page` con el padre en nav; no son tabs propios.

## S-K2 Shadow DOM y estilos

- Tokens `--is-*` desde light DOM (`is-base.css` / paletas). Default paleta: `contapyme`.
- `adoptCss(shadowRoot, import.meta.url)` + CSS hermano `.css` cuando aplique.
- Scrollbars: `src/components/_shared/scrollbars.css` vía adopt (no reimportar en cada tag).
- Escala: preferir `em` / `font-size` en controles; no `size=` legacy.

## S-K3 Enums y eventos

- Valores de atributos enum: declarados en el `.js` (`VALID_*`) o MD del tag.
- Setters usan normalización (`intent.js`, `tone.js`) — valores inválidos → default, sin throw.
- Eventos custom: prefijo `is-` cuando son contrato público del tag.

## S-K4 `_shared/` y bases

- Reusar: `element-base.js`, `modal-base.js`, `form-control-mixin.js`, `intent.js`, `tone.js`, `upgrade-properties.js`, `dom-utils.js`.
- Nuevo helper solo si ≥3 usos o lógica no trivial; si no, inline en el tag.
- `helpers/` públicos = manifest + preview JSON + MD.

## S-K5 Diagramas e ISP

- Diagramas: payload declarativo + kind registry; no registrar `specs/` internos como CE.
- `isp/`: ports de ISP-SvelteComponents (`is-tree-view`, `is-form`, layouts…). Roles 3D documentados en MD del tag.

## Contratos

| Pieza | Contrato |
|---|---|
| Registro | entrada en `manifest.js` |
| Fuente | `src/components/<cat>/<name>.js` |
| Doc tag | `src/components/<cat>/<name>.md` |
| Preview | `src/previews/<cat>/<tag>.json` |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Manifest coherente | page/script/style existen | `tests/manifest-paths.test.ts` |
| Enums en previews | solo valores válidos | `tests/attr-enums.test.ts` |
| Tokens `--is-color-*` | vocabulario estable | `tests/token-vocabulary.test.ts` |
| Botones eventos/color | contrato UI | `tests/button-events.test.ts`, `tests/button-color-appearance.test.ts` |
| Escala em en controles | herencia font-size | `tests/em-scale-font-inherit.test.ts` |
| Helpers homogéneos | tab + json + md | `tests/helpers-homogeneity.test.ts` |
