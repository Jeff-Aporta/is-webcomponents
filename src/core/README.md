# src/core — el nucleo del kit

Lo que todos los componentes comparten: los moldes, las utilidades de DOM, el foco, el color y
el acceso al CDN. Si algo lo usan mas de un componente y no es un componente, vive aqui.

## Moldes

- `iswc-element.ts` — `IswcElement`: el molde base. Aplica el CSS, reparte los atributos observados y
  da la API comun (`connected`, `disconnected`, `render`).
- `iswc-reactive.ts` — `IswcReactive`: `@prop`, `@state`, `@watch` y `render()` con el `html` de
  `core/plantilla.ts`.
- `iswc-form-control.ts` — `IswcFormControl`: los controles de formulario (form-associated cuando
  hace falta, `FormControlValue`).

## Utilidades

- `dom.ts`, `attrs.ts` — el DOM y los atributos.
- `color.ts`, `code.ts`, `code-highlight.ts` — color y resaltado de codigo.
- `icon-loader.ts` — la carga de iconos.
- `iswc-storage.ts` — el almacen con prefijo `iswc:` (llaves de la app).
- `cdn-ref.ts` — el pin de `main` a SHA y los espejos del CDN. La fuente de `REPO_GITHUB`.

## Estilos

- `host-base.scss`, `focus-ring.scss`, `isp-modal-chrome.scss`, `diagram-kit.scss` — el CSS que
  comparten los componentes. Los estilos que se repiten en varios van a `src/styles/_kit.scss`.

## Reglas

- Un molde no sabe de un componente concreto: si lo necesita, se lo pasan por atributo o propiedad.
- Nada de estado global: lo compartido va por `@prop` o por una clase utilitaria.
- Lo que se exporta desde aqui es API publica: su forma no cambia sin avisar (ver las excepciones
  de `tests/gobernanza/sin-codigo-muerto.test.ts`).

## Guardianes

- `tests/gobernanza/molde-iswc-element.test.ts` — los moldes tienen la forma que espera el kit.
- `tests/gobernanza/reactivo.test.ts` — `@prop`/`@state`/`@watch` se usan como deben.
- `tests/gobernanza/sin-codigo-muerto.test.ts` — API publica y archivos sin importador.
