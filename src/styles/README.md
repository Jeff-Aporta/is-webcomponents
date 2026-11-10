# src/styles — los tokens y los estilos compartidos

Los tokens del kit (los `--iswc-*`) y los estilos que se repiten en varios componentes.

## Piezas

- `_mixins.scss` — los mixins de color y de rol (`tones`, `brand-tones`, `velo`, `papel`…).
- `_kit.scss` — los estilos que el kit repite: el lienzo del diagrama, el visor opt-in, el lienzo
  SVG. Un mixin por familia.
- `_index.scss` — la entrada unica: `@forward 'mixins'; @forward 'kit';`.
- `system.scss`, `shell.scss`, `presentation.scss`, `is-base.scss` — el marco de la galeria.
- `palettes.scss` — GENERADO desde `palette-build.ts`. No se edita a mano.
- `chart-tokens.ts`, `color-tokens.ts` — los tokens en TS, para el JS que los necesita.

## Reglas

- Un mixin emite el CSS EXACTAMENTE igual que la regla que sustituye. Si el CSS cambia, no es un
  refactor: es un cambio de estilo (lo comprueba `deno task css:equivalente`).
- Ningun mixin envuelve nada en `:host(...)` por su cuenta: quien llama decide la especificidad.
- Sin `@import`: solo `@use` y `@forward`.
- `src/styles` es loadPath global del build: desde un componente se llega con `@use 'kit' as *;`.
- Los tokens se nombran `--iswc-*`; los que son de un componente, `--_algo` (privados).
