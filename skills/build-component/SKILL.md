---
name: build-component
description: >-
  Cómo construir un componente nuevo del kit iswc-* desde cero: anatomía
  obligatoria de su .md, molde reactivo (IswcReactive / IswcFormControl con
  @prop, @state, @watch y render() con html), textos por t(), eventos tipados,
  CSS custom states con this.estado(), CSS parts y slots semánticos, overlays
  por la pila de capas, uso exclusivo de tokens --iswc-*, accesibilidad (aria +
  teclado + foco), tests y los cuatro archivos obligatorios: .ts, .scss, .md y
  .json iswc-preview/v1. Usar cuando se vaya a crear un iswc-* nuevo,
  refactorizar uno existente para que cumpla el contrato, o revisar un PR que
  añade/renombra un componente del kit.
---
<!-- @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/build-component/SKILL.md -->

# Cómo construir un componente `iswc-*`

Convención obligatoria para cualquier **componente nuevo** del kit o para
**revisar uno existente**. Cubre los 10 puntos que un agente debe cumplir
antes de abrir PR. La forma canónica del `.ts` (molde reactivo, F8) es la de
`specs/componentes.md` S-K2; aquí va resumida en §3 y §5. Las sub-guías viven en [`references/`](references/) y se
leen a demanda según el área que estés tocando.

## 1. Cuándo usarla

- Vas a crear un `<iswc-foo>` desde cero.
- Vas a refactorizar un componente existente para que cumpla el contrato
  del kit (estados, parts, slots, tokens, tests, doc, demo).
- Vas a revisar un PR que añade, renombra o mueve un componente.

Si lo que vas a hacer es **consumir** el kit (HTML con `<iswc-button>`,
estilos con tokens `--iswc-*`, etc.), esta skill **no** aplica: usa
[`../iswc-base/SKILL.md`](../iswc-base/SKILL.md).

## 2. Los cuatro archivos y la anatomía del `.md`

Todo tag público se entrega con **cuatro archivos**, mismo nombre y misma carpeta. Es la
misma arquitectura en el kit y en las apps; solo cambia dónde se registra.

| Archivo | Contenido |
| --- | --- |
| `<name>.ts` | Clase, atributos, eventos. Sin CSS dentro. Tipos con Zod en `schemas/`. |
| `<name>.scss` | Estilos con tokens `--iswc-*` y medidas en `em`. |
| `<name>.md` | Ficha para agentes: UTF-8 sin BOM, frontmatter y las secciones de abajo. |
| `<name>.json` | Demo `iswc-preview/v1` con un bloque `demo` con `target` y `controls`. |

Casos especiales, declarados en el `.json`:

- **Subcomponente** definido en el `.ts` del padre: lleva su `.md` y su `.json`, y declara
  `"anatomy": { "scss": "padre.scss" }`.
- **Página, módulo o light DOM** sin hoja: `"anatomy": {}` y entrada en `SIN_HOJA`.
- **Sin playground posible** (API imperativa, chrome de la galería): entrada en
  `SIN_PLAYGROUND`, con el motivo. Es la excepción, no un atajo.

Lo verifica `tests/.audit/motor/validators/cuatro-archivos.ts`, tanto en
`tests/gobernanza/contrato-cuatro-archivos.test.ts` como en `deno task audit`. Un tag
registrado con `define(Clase)` y fuera de `src/manifest.ts` también falla.

Estructura canónica del `.md` (mínimo):

```md
# `<iswc-foo>`

## Propósito
## Cuándo usarlo
## Cuándo no usarlo
## Importación
## Ejemplo mínimo
## API
  ### Atributos y propiedades
    #### Atributos observados
    #### Propiedades públicas
  ### Slots
  ### Eventos
  ### Métodos y propiedades públicas
  ### CSS parts
  ### Custom states
  ### CSS custom properties
### Integración con formularios (si aplica)
## Comportamiento
## Dependencias y componentes relacionados
## Accesibilidad
## Ejemplo avanzado
## Errores comunes
## SCSS del kit

El SCSS del kit vive en `src/styles/kit/`, y se carga desde cualquier componente con:

```scss
@use 'kit' as *;
```

`src/styles` es loadPath global del build, asi que el `@use` resuelve sin ruta. El modulo tiene
tres parciales: `_funciones.scss` (las funciones), `_mixins.scss` (los mixins genericos) y
`_familias.scss` (las bases por familia). `_kit.scss` es la fachada: solo hace `@forward`.

### El contrato de los mixins

1. El mixin emite **exactamente** el CSS que sustituye: mismos valores, mismo orden, misma
   especificidad. Si el CSS cambia, no es un refactor, es un cambio de estilo.
2. El mixin **no elige la especificidad**: quien llama decide. Ningun mixin envuelve nada en
   `:host(...)` por su cuenta: se llaman DENTRO de `:host { }`.
3. Solo `@use` y `@forward`: nunca `@import` de Sass.

### Un ejemplo real (`src/components/forms/input.scss`)

```scss
@use 'kit' as *;

:host {
  --iswc-input-border-radius: var(--iswc-radius-sm);
  --iswc-input-border: var(--iswc-control-border);
  --_focus: var(--iswc-input-focus);
  display: block;
  inline-size: var(--iswc-field-width);
  font-family: var(--iswc-sans, inherit);
  box-sizing: border-box;

  .label {
    font-size: 0.875em;
    font-weight: 500;
    color: var(--iswc-text-soft, inherit);
    inline-size: fit-content;
    @include oculto;
  }

  .base {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    block-size: var(--iswc-control-height);
    border: 0.0625em solid var(--_border);
    &:focus-within { @include foco-visible(var(--_focus), 2px, 1px); }
  }
}
```

Lo que se ha movido al modulo: el `display: none !important` del `[hidden]` (`oculto`), el anillo
de foco (`foco-visible`) y el resto de patrones que se repiten. El resto es del componente.

### Los mixins que hay

| Mixin | Que emite | Con argumentos |
|---|---|---|
| `oculto` | `display: none !important` | no |
| `foco-visible($color, $grosor, $separacion)` | `outline` + `outline-offset` | si |
| `deshabilitado($opacidad)` | `opacity` + `pointer-events: none` | si |
| `no-permitido($opacidad)` | `cursor: not-allowed` + `opacity` | si |
| `reset-boton($padding, $borde)` | `background`, `color` y `font` heredados | si |
| `truncar($lineas)` | elipsis en una linea o en varias | si |
| `scrollbar($color, $grosor)` | la barra fina, con su color | si |
| `llenar-host` | `inset: 0` + los dos tamaños | no |
| `transicion($props...)` | `transition` | si |
| `flex($gap, $align, $dir)` | una fila flexible | si |
| `flex-centro($gap)` | una fila centrada | si |
| `flex-extremos($gap)` | una fila con los extremos pegados | si |
| `grid-auto($min, $ajuste)` | columnas automaticas | si |
| `tamanos($mapa)` | los tamanos de un control, por `[size=…]` | si |
| `tonos($mapa)` | los tonos de un control, por `[color=…]` | si |
| `campo-base($etiqueta, $ayuda, $tamEtiqueta, $tamAyuda)` | la etiqueta y el texto de apoyo | si |
| `capa-base($fondo, $borde, $radio, $sombra)` | la superficie flotante | si |
| `grafico-base($rejilla)` | los tokens de lectura de un grafico | si |
| `tarjeta-base($fondo, $borde, $radio)` | la tarjeta | si |
| `host-lienzo-diagrama` | el `:host` de los diagramas | no |
| `wrap-lienzo-diagrama($vacio)` | el `.wrap` de los diagramas | si |
| `visor-abrible($selector)` | el cursor del visor opt-in | si |
| `lienzo-svg($clase)` | el lienzo donde se dibuja | si |

### Las funciones

| Funcion | Que devuelve |
|---|---|
| `em($px, $base: 16)` | el valor en `em` (la unidad del kit) |
| `escala($paso)` | el token de espaciado (`2xs`…`2xl`) |
| `tono($nombre, $variante)` | el color de una familia y su rampa |
| `espacio($n)` | el token de espaciado mas cercano a un valor |

### Cuando escribir el CSS a mano

Cuando el bloque es **de este componente** (su geometria, sus tokens propios, sus estados
propios). Cuando el bloque es **del kit** (un patron que ya tienen otros componentes), es un
`@include`. El guardian `tests/gobernanza/scss-simple.test.ts` avisa de los bloques de 4 o mas
declaraciones repetidos entre archivos, y de los `.scss` que usan un patron del kit sin cargar
el modulo.

### Medir

`deno task css:equivalente` compila cada `.scss` y lo compara con la foto: el CSS puede cambiar
de forma (espacios, saltos de linea) pero no de contenido. La foto se toma antes de un lote con
`deno task css:equivalente --guardar`.

```bash
deno task css:equivalente --guardar   # antes del lote
# ... los cambios ...
deno task css:equivalente             # despues: 0 distintos
```

## Reglas para LLM

- **Toda estructura de UI es un componente.** Si un render, una vista o un visor arma
  `<figure>`, `<dl>`, filas, pies o cajas con HTML suelto, esa estructura se convierte en un
  `iswc-*` (o se reusa uno del catálogo). Solo el markup interno del shadow queda como HTML.
- **Demo con playground obligatoria**: el `.json` `iswc-preview/v1` lleva ≥1 bloque `demo` con
  `controls` y el tag entra en `src/manifest.ts` (galería).
- Un componente de app candidato a subir al kit trae `"reuso": { "candidato": "iswc-base", … }`
  en su `.json`; al subirlo, se quita el marcador y se reemplaza el de la app por el `iswc-*`.
## Fuentes
```

Reglas duras:

- El `.md` se escribe leyendo la fuente `.ts`: las tablas de atributos, custom states
  y CSS custom properties deben coincidir con el código.
- **Frontmatter obligatorio** al inicio del `.md` (lo lee
  `src/manifest.ts` y el manifest del catálogo):

  ```yaml
  ---
  tag: iswc-foo
  tags:
    - iswc-foo
  category: <la categoría del tag en src/manifest.ts>
  status: public | internal
  source: ./<name>.ts
  style: ./<name>.scss
  preview: ./<name>.json
  ---
  ```

  `category` es la del manifest, que puede diferir de la carpeta: los archivos de
  `charts/` publican en `data-viz`. `source`, `style` y `preview` son rutas relativas
  que existen: un subcomponente apunta al `.ts` y al `.scss` del padre, y `style` se
  omite solo si no hay hoja. En `src/` no hay `.css`: se compila el `.scss`.

Detalle: [`references/lifecycle.md`](references/lifecycle.md).

## 3. Forma canónica del `.ts` y CSS custom states

Base, por orden de preferencia:

| Caso | Base |
| --- | --- |
| Componente con atributos o estado | `IswcReactive` (`core/iswc-reactive.ts`) |
| Control de formulario (entra en `FormData`, valida) | `IswcFormControl` (`core/iswc-form-control.ts`) |
| Props como objeto validado con Zod | `PropsElement` (ya es `IswcReactive`) |
| Diálogo / cajón | `ModalBase` (`layout/utils/modal-base.ts`) |
| Solo si el cierre lo exige (peso medido) | `IswcElement` (`core/iswc-element.ts`), como `iswc-button` |

Los **custom states** son la API de estado para CSS (`:state(loading)`), con
`this.estado('nombre', activo)`: usa `ElementInternals.states` y, si el motor
no lo admite, cae al respaldo `[data-nombre]`. Nada de `attachInternals` a
mano (el molde da `this.internals` perezoso) ni de `setCustomState` (el módulo
`core/form-associated` ya no existe).

Convenciones:

- Nombres en **kebab-case**: `loading`, `icon-button`, `without-line`,
  `selected`, `disabled`. **Nunca** `isLoading` / `is_loading`.
- Booleano: el state se **añade** cuando la propiedad es `true` y se
  **quita** cuando es `false`. Se calcula en `actualizado(cambios)`, que corre
  tras cada pintado.
- Enum (`shape="round|rect|pill"`): un state por valor opcional
  (`state(round)`, `state(rect)`, …).
- Los de formulario (`user-invalid`, `user-valid`, `required`, `optional`,
  `disabled`, `readonly`) los pone `IswcFormControl`: no los repitas.
- Documenta **siempre** cada state en la tabla "Custom states" del `.md`.
  Si lo consumes en CSS, debe aparecer en la columna "Uso" con el
  selector `:state(...)` que lo aplica.

Patrón mínimo:

```ts
// src/components/actions/foo.ts
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive, prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import type { FooEventos } from './schemas/foo.schemas.js';
import css from 'iswc:css';

class IswcFoo extends IswcReactive {
  static override tag = 'iswc-foo';
  static override css = css;
  static override template = TEMPLATE;                 // DOM fijo; o render() con html (§5)
  static override shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };
  declare static events: FooEventos;
  @prop({ type: 'bool' }) accessor loading = false;
  @prop() accessor href = '';

  override actualizado(): void {
    this.estado('loading', this.loading);
    this.estado('link', !!this.href);
  }
}
define(IswcFoo);
```

Todo miembro que sobreescriba uno de la base lleva **`override`**: los hooks
(`onConnected`, `onDisconnected`, `onAttributeChanged`, `connectedCallback`,
`attributeChangedCallback`, `render`, `actualizado`, `initShadow`, `emit`…) y los
estáticos (`tag`, `css`, `template`, `shadowInit`, `observed`, `deps`). El repo
tiene `noImplicitOverride` en `tsconfig.json` (lo ve el gate) y en `deno.json`
(lo ve el editor): un miembro sin `override` es un error **TS4114** en los dos
lados, y el gate y el LSP deben coincidir. Para migrar código viejo:
`deno run -A scripts/codemods/override.mjs` (es idempotente y añade el
modificador donde falte).

Detalle: [`references/states.md`](references/states.md).

## 4. CSS parts y slots

### CSS parts

- Expón **`part="..."`** en los nodos internos del Shadow DOM que el
  consumidor necesita personalizar desde fuera. Mínimo recomendado: el
  contenedor raíz, cada slot y cada elemento interactivo.
- Nombres en **kebab-case**: `part="button"`, `part="label"`,
  `part="start"`, `part="end"`, `part="caret"`, `part="spinner"`.
- Documenta cada part en la tabla "CSS parts" del `.md` con su
  selector `::part(...)`.
- Reglas:
  - **No** expongas un part si solo lo usa el CSS interno (es ruido).
  - **No** uses `::part()` dentro de `:host { … }` con anidamiento
    profundo; mantenlos al nivel superior del CSS.
  - `display: contents` **no** funciona en nodos con `part`.

### Slots

- Declara **slots semánticos** (`default`, `start`, `end`, `header`,
  `footer`, `label`, etc.). Evita nombres crípticos como `slot1`.
- Si un slot **debe** existir para que el componente funcione (ej.
  `<iswc-tab-group>` necesita `<iswc-tab-panel>` con `slot="panel"`),
  documéntalo en "Errores comunes" del `.md`.
- **No** proyectes el mismo nodo a dos slots.
- Si el slot está vacío pero el componente tiene fallback, ponlo dentro
  del `<slot></slot>` y estilízalo con `:slotted(*:not([slot]))` o
  similar.

Detalle: [`references/parts-slots.md`](references/parts-slots.md).

## 5. Propiedades, `render()`, textos y eventos

Regla de oro: **lo que el HTML declara y el servidor serializa va como
atributo; lo que el JS asigna dinámicamente va como propiedad.** Con el molde
reactivo las dos cosas se declaran **una sola vez** con `@prop`.

Convenciones:

- `@prop()` = texto reflejado al atributo en kebab-case (`labelPlacement` ↔
  `label-placement`). Opciones: `type: 'bool' | 'num' | 'json'`, `enum: LISTA`
  (fuera de la lista → el defecto, sin throw), `attr: 'otro'` o `attr: false`,
  `reflect: false`, `vacio: true` (conserva `x=""`). El valor inicial del campo
  es el defecto.
- `@state()` para estado interno que repinta sin atributo; `@watch('prop')`
  para reaccionar `(anterior, nuevo)` antes de pintar.
- **Nunca** un par get/set que lee y escribe el atributo a mano, ni
  `static observed` con un atributo que ya es `@prop` (lo suma `IswcReactive`
  a `observedAttributes`). Lo vigila `tests/gobernanza/reactivo.test.ts`.
- Booleanos: presencia de atributo ⇒ `true`. **Nunca** `attr="false"`.
- **DOM que depende del estado**: `render()` devuelve `` html`…` `` de
  `core/plantilla.ts` (`${x}` hijo, `a=${x}`, `?a=${x}`, `.p=${x}`,
  `@e=${fn}`, listas con `repetir(items, clave, plantilla)`). Si el DOM es
  fijo, `static template` y sincroniza en `actualizado(cambios)`. El repintado
  va por microtarea (el primero, síncrono al conectar): quien lea el shadow
  tras escribir usa `actualizarAhora()` o `await el.actualizacionCompleta`.
- **Textos de interfaz** (etiquetas, `aria-label`, mensajes) por
  `this.t('clave', ...args)`. Registra tus términos en español al cargar el
  módulo con `registrarTerminos('es', { … })` (`core/localize.ts`) y su
  traducción en `src/core/i18n/en.ts`. Nunca un `aria-label` literal.
- **Eventos**: `this.emit('iswc-x', detail)` (bubbles + composed) y su tipo
  en `schemas/<tag>.schemas.ts`:
  `export type FooEventos = { 'iswc-x': { value: string } };` enlazado con
  `declare static events: FooEventos;`. La tabla «Eventos» del `.md` y el
  campo `events` del `.json` los genera `scripts/sondas/eventos.ts`.
- Refleja al host solo lo que el usuario ve (`disabled` ⇒
  `aria-disabled`, `loading` ⇒ `aria-busy`); **no** expongas detalles
  internos.
- Control de formulario: `IswcFormControl` ya trae `name`, `disabled`,
  `required`, `readonly`, `label`, `hint`, `errorText`, `error` y la validez;
  tú das `valorFormulario()`, `restablecer()`, `get controlNativo()` y, si
  hace falta, `validar()` (ver [`references/lifecycle.md`](references/lifecycle.md)).

Patrón mínimo:

```ts
// src/components/actions/foo.ts
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive, prop, state } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { html } from '@jeff-aporta/iswc-base/core/plantilla.js';
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
import type { FooEventos } from './schemas/foo.schemas.js';
import css from 'iswc:css';

registrarTerminos('es', { quitar: 'Quitar' });

const SHAPES = ['round', 'rect', 'pill'] as const;

class IswcFoo extends IswcReactive {
  static override tag = 'iswc-foo';
  static override css = css;
  static override shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };
  declare static events: FooEventos;           // { 'iswc-remove': void }
  @prop({ enum: SHAPES }) accessor shape = 'round';
  @prop() accessor label = '';
  @prop({ type: 'bool' }) accessor removable = false;
  @state() accessor activo = false;

  render() {
    return html`<span part="base" class=${`foo ${this.shape}`}>
      <span part="label">${this.label}</span>
      <button part="remove" ?hidden=${!this.removable} aria-label=${this.t('quitar')} @click=${this.#quitar}>×</button>
    </span>`;
  }
  #quitar() { this.emit('iswc-remove'); }
}
define(IswcFoo);
```

Detalle: [`references/props-events.md`](references/props-events.md).

## 6. Tokens `--iswc-*` (no hex literales)

- **Prohibido** escribir colores hex (`#fff`, `#0c1118`, `rgba(...)`,
  `hsl(...)`) dentro del `.scss` del componente, salvo en el `:host` como
  **fallback final** de una custom property (`var(--iswc-bg, #0c1118)`).
- Todo color, espaciado, radio, fuente, sombra y transición debe salir
  de un **token `--iswc-*`** declarado en `src/styles/is-base.css` o
  `src/styles/palettes.css`.
- El prefijo **`--iswc-*`** es canónico. **`--pg-*` es legacy** y debe
  migrarse si aparece en código nuevo.
- Si necesitas un color que no existe, **primero** añádelo a
  `is-base.css` o a la paleta correspondiente (una de las 25 de
  `src/styles/palettes.json`, vía sus semillas), y luego consúmelo vía `var(--iswc-...)` desde el
  componente.
- Variables locales del componente: prefijo `--iswc-<componente>-*`
  (`--iswc-button-border-radius`, `--iswc-button-transition-duration`).
  Las privadas (solo dentro del Shadow) usan `--_foo`.

Patrón mínimo:

```css
/* src/components/actions/foo.scss */
:host {
  --_bg:        var(--iswc-control-bg,        #f1f3f5);
  --_bg-hover:  var(--iswc-control-bg-hover,  #e9ecef);
  --_text:      var(--iswc-control-text,      #212529);
  --_radius:    var(--iswc-foo-border-radius, 6px);
  --_duration:  var(--iswc-foo-transition-duration, 120ms);
  display: inline-flex;
}

.foo {
  background: var(--_bg);
  color:      var(--_text);
  border-radius: var(--_radius);
  transition: background var(--_duration);
}
.foo:hover { background: var(--_bg-hover); }
```

Detalle: [`references/css-tokens.md`](references/css-tokens.md).

## 7. Accesibilidad (a11y)

- **Semántica primero**: usa el elemento HTML correcto
  (`<button>`, `<a>`, `<input>`, `<dialog>`) **dentro** del Shadow DOM
  del componente. No reinventes roles en el host.
- **Focus**: `attachShadow({ mode: 'open', delegatesFocus: true })` para
  que el foco se delegue al primer elemento focuseable del shadow.
- **Teclado**: `Enter` y `Space` activan botones y links;
  `Arrow*` navegan listas/tabs/menus; `Escape` cierra modales; `Home`/
  `End` llevan al primero/último. Documenta los atajos en "Comportamiento"
  del `.md`.
- **ARIA**:
  - Reenvía `aria-label`, `aria-pressed`, `aria-expanded`,
    `aria-haspopup`, `aria-current`, `aria-controls` al inner que tiene el
    role real.
  - Usa `aria-disabled` (no `disabled`) si necesitas un control visible
    pero no interactivo; combina con `tabindex="-1"` para sacarlo del
    recorrido de tab.
  - `aria-busy="true"` mientras dura `loading`; emite un `aria-live`
    region con `this.t('cargando')` / `this.t('listo')` para usuarios de
    screen reader (nunca el texto literal).
  - **No** inventes roles ni propiedades ARIA. Si necesitas una nueva,
    documéntala en el `.md` y añádela a la tabla "Accesibilidad".
- **Focus management en overlays**: por la **pila de capas** de
  `core/position.ts`, nunca una trampa propia. Modal: `abrirCapaModal(host,
  { cerrar, inicial? })` / `cerrarCapaModal(host)` (pone `inert` alrededor
  cruzando shadows, cicla Tab por los enfocables con shadows, Escape solo
  para la capa de arriba, devuelve el foco); `inertizar: false` si convive
  con otras ventanas (`iswc-window`). Flotante (menú, listbox, picker):
  `createPopupDismiss`, que se apila sin `inert`. Diálogos y cajones heredan
  de `ModalBase`, que ya lo hace.
- **Contraste**: usa los tokens `--iswc-*` ya calibrados para ambos
  temas. Si dudas, corre `tests/theme-contract.test.mjs` (verifica que
  los 2 temas y 3 paletas pasan el contrato).

Detalle: [`references/accessibility.md`](references/accessibility.md).

## 8. Tests (`*.test.ts` con `node:test` + `assert/strict`)

Convenciones (ver `AGENTS.md §7` y `§8`):

- Nombre: `tests/<area>.test.ts`. Patrón
  [`node:test`](https://nodejs.org/api/test.html) con
  `import assert from 'node:assert/strict'`.
- Si el test depende de un servidor, arráncalo con
  [`node:http`](https://nodejs.org/api/http.html) en `await using` o
  `try/finally`. No asumas que `scripts/serve.mjs` está corriendo.
- Exit code distinto de 0 en el primer fallo. Mensajes de `assert`
  útiles, incluyendo archivo + ruta + valor real.
- **No** crees snapshots binarios (Playwright traces, etc.). `tests/`
  está tracked en git (no en `.gitignore`).
- Lo que necesita DOM real (repintado, `:state()`, foco, `FormData`) va en
  `tests/navegador/`: una página de casos en `tests/_shared/paginas/<x>.ts`
  (cada caso devuelve `true` o el motivo) que `correrCasos()` de
  `tests/_shared/pagina.ts` empaqueta y corre en Edge headless (modelo:
  `tests/navegador/core-f8.test.ts`). Tras escribir una propiedad,
  `await el.actualizacionCompleta` antes de leer el shadow. Cada caso
  prepara su propio estado: nunca depender del caso anterior (el cooldown
  salta los verdes).
- Cubre al menos:
  1. `customElements.define` no falla y el upgrade de propiedades
     funciona (asignar antes de `connect`).
  2. Reflejo atributo ↔ propiedad en cada `@prop`.
  3. Custom states: propiedad booleana activa ⇒ `:state(...)` activo.
  4. Slots: contenido proyectado aparece en el light DOM del host.
  5. Eventos custom (`iswc-focus`, `iswc-blur`, `iswc-click`, …) burbujean
     y son `composed: true`.
  6. Accesibilidad básica: el componente es focuseable por teclado y
     emite los `aria-*` correctos.
  7. Form-associated (si aplica): `name` / `value` entran en
     `FormData`, `reset` restaura valores iniciales, `disabled` se
     respeta.
- El test **debe** terminar con
  `console.log('<area>.test.ts: PASS — <resumen>')` para que el runner
  `tests/run-all.mjs` lo pueda enumerar.

Patrón mínimo:

```ts
// tests/foo.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/components/actions/foo.ts';

test('iswc-foo: define + upgrade + reflect', async () => {
  await customElements.whenDefined('iswc-foo');
  const el = document.createElement('iswc-foo');
  el.setAttribute('variant', 'outlined');
  document.body.appendChild(el);
  assert.equal(el.variant, 'outlined');
  assert.ok(el.matches(':state(foo)'));
  document.body.removeChild(el);
});

console.log('foo.test.ts: PASS — upgrade + reflect + state');
```

## 9. Demo (`<name>.json` `iswc-preview/v1`)

El demo del componente es su `.json`: lo pinta la galería y lo copia el bundle a
`dist/previews/`. Lleva un bloque `demo` con `target`, que apunta a la instancia, y
`controls`, y entra en `src/manifest.ts` y en `src/previews/catalog.ts`.

```text
src/components/actions/foo.ts
src/components/actions/foo.scss
src/components/actions/foo.md
src/components/actions/foo.json    ← demo con playground
demos/actions/foo/foo.html         ← solo si hace falta una página aparte
```

Reglas de una página aparte en `demos/`:

- **Una** demo por componente, ruta canónica
  `demos/<category>/<name>/<name>.html`. El árbol `demos/<category>/`
  raíz **no** admite archivos sueltos.
- **Paths** desde la demo:
  `../../dist/cdn/<category>/<name>.min.js?h=<pin>`,
  `../../dist/cdn/core/is-base.min.css?h=<pin>`. Las demos cargan el
  bundle ya construido.
- **Cero** `npm install` / `vite` / bundler. Sirve con
  `deno task dev` (puerto 8391) o `node scripts/serve.mjs`.
- **Tokens `--iswc-*`** en el CSS del demo. Hex solo en `:host` como
  fallback final.
- Estructura interna recomendada:
  1. `<header>` con nombre del componente y un párrafo de qué muestra.
  2. Una o más `<section>` por prop importante (color × variant, sizes,
     estados, slots, eventos). Cada sección con un `<h2>` y ejemplos
     `<iswc-foo>` con valores representativos.
  3. Anti-FOUC: `iswc-foo:not(:defined) { visibility: hidden; }`.
  4. `<script type="module">` con `await import(...)`,
     `await customElements.whenDefined(...)`, y los listeners de
     eventos a mostrar.
  5. Al final, marca
     `document.documentElement.dataset.<name>Ready = '1'` para que el
     shell de la galería sepa que la demo está lista.

Patrón mínimo (extracto):

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Demo: <iswc-foo> · iswc-base</title>
  <style>
    html, body {
      margin: 0; padding: 24px; min-height: 100%;
      background: var(--iswc-bg, #0c1118);
      color: var(--iswc-text, #e2e8f0);
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    body { display: grid; gap: 24px; }
    section { background: var(--iswc-surface, #131a24); border: 1px solid var(--iswc-border, rgba(255,255,255,0.08)); border-radius: 10px; padding: 16px; }
    iswc-foo:not(:defined) { visibility: hidden; }
  </style>
</head>
<body>
  <header><h1>Demo: <code>&lt;iswc-foo&gt;</code></h1></header>

  <section>
    <h2>Variants</h2>
    <iswc-foo>Default</iswc-foo>
    <iswc-foo variant="outlined">Outlined</iswc-foo>
  </section>

  <script type="module">
    await import('../../dist/cdn/actions/foo.min.js?h=y48m0u');
    await customElements.whenDefined('iswc-foo');
    document.documentElement.dataset.fooReady = '1';
  </script>
</body>
</html>
```

## 10. Doc (`.md` hermano del `.ts`)

Repite aquí lo esencial de §2: el `.md` que vive al lado del `.ts` en
`src/components/<category>/<name>.md` **no** es un README promocional,
es la **fuente canónica** de la API para agentes y humanos. Por
convención lleva:

1. **Frontmatter** con `tag`, `tags`, `category`, `status`, `source`,
   `style`, `preview`.
2. **`# <iswc-foo>`** como H1.
3. Secciones en este orden:
   `Propósito`, `Cuándo usarlo`, `Cuándo no usarlo`, `Importación`,
   `Ejemplo mínimo`, `API` (sub-secciones Atributos y propiedades,
   Slots, Eventos, Métodos y propiedades públicas, CSS parts, Custom
   states, CSS custom properties, Integración con formularios si
   aplica), `Comportamiento`, `Dependencias y componentes
   relacionados`, `Accesibilidad`, `Ejemplo avanzado`, `Errores
   comunes`, `Reglas para LLM`, `Fuentes`.
4. Las tablas de API se generan (o sincronizan) con el `.ts`; un
   extractor del kit las rellena desde el JSDoc del componente y
   los custom states / parts / slots del template.
5. **`Reglas para LLM`** es la sección que un agente lee para
   entender trampas y usos indebidos. Mantenla corta: 5-10 bullets
   con la info que **no** se ve en las tablas.

```md
## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.
```

---

## 11. Documentar el componente

Esta skill es la **carta de escritura** de las guías que viven junto a cada
componente en `src/components/<carpeta>/<modulo>.md`. No describe la API
del componente (eso es el MD del módulo): describe **cómo debe escribirse
ese MD** para que las LLMs y los humanos lo lean igual y le saque jugo el
catálogo.

### Cuándo usarla

- Estás creando la ficha de un componente nuevo (`<iswc-foo>`) en
  `src/components/<carpeta>/<modulo>.md`.
- Estás revisando una ficha existente para alinearla con el resto del
  catálogo.
- Un agente necesita saber qué secciones son obligatorias, cuáles son
  opcionales y en qué orden van.
- Vas a regenerar o reorganizar el catálogo (`catalog.md`, `reference.md`).

### Dos formatos, según dónde viva el componente

La ficha es uno de los cuatro archivos de todo componente, con `.ts`, `.scss` y `.json`.
Hay dos formatos y cada uno tiene su guardián:

| | Kit (`iswc-*`) | App (`<prefijo>-*`) |
| --- | --- | --- |
| Frontmatter | `tag`, `tags`, `category`, `status`, `source`, `style`, `preview` | `name`, `description` |
| H2 obligatorios | `Propósito`, `Cuándo usarlo`, `Cuándo no usarlo`, `Importación`, `Ejemplo mínimo`, `API` (o `Atributos`), `Comportamiento`, `Accesibilidad`, `Reglas para LLM` | `Anatomía`, `Atributos observados`, `Props`, `Eventos`, `Slots`, `Ejemplos` |
| Guardián | `tests/gobernanza/contrato-cuatro-archivos.test.ts` y `deno task audit` | `tests/vistas/contrato-componentes.test.ts` |

La ficha del kit se lee sin conocer la app, por eso dice cuándo usarlo y cómo importarlo.
Lo que sigue describe el contenido común de ambas.

### Estructura de la ficha

Orden de las tablas de API. Las opcionales se omiten si el componente no las usa.

#### 1. Anatomía (obligatoria)

Frontmatter + identidad del componente. Ver
[`references/anatomy-section.md`](references/anatomy-section.md).

- Frontmatter YAML (`tag`, `tags`, `category`, `status`, `source`, `style`,
  `preview`). UTF-8 sin BOM: el `---` es el primer byte. `category` es la del manifest;
  `style` apunta al `.scss`, y en un subcomponente al del padre.
- `# <iswc-foo>` como título H1.
- Primer párrafo: **una sola frase** que diga qué es el componente y que
  confirme que es Web Component vanilla con Shadow DOM.

#### 2. Atributos observados

Tabla con `Atributo | Tipo | Notas`. Solo atributos que el componente
observa: los de cada `@prop` (el atributo es el nombre en kebab-case o el
`attr` de sus opciones; `type: 'bool'` = booleano por presencia, `enum` =
valores admitidos y defecto), los heredados de la base (`IswcFormControl`
aporta `name`, `disabled`, `required`, `readonly`, `label`, `hint`,
`error-text`, `error`), los de `static observed` y los `styleAttrs`; es lo
que el molde une en `observedAttributes`. Un `@prop({ attr: false })` o un
`@state()` **no** es atributo. No listar atributos HTML globales a menos que
el componente los reenvíe explícitamente.

#### 3. Props (propiedades públicas)

Tabla con `Propiedad | Acceso | Notas`. Diferenciar **lectura/escritura**
de **solo lectura** y **solo escritura**. Indicar si refleja atributo (un
`@prop` refleja salvo `reflect: false`). Los `@state()` son internos: no van.
Si el componente pinta por microtarea, decir que el shadow se lee tras
`await el.actualizacionCompleta`.

#### 4. Custom states

Tabla con `Estado | Uso`: los que el código pone con `this.estado('x', …)`
y los heredados (`IswcFormControl`: `user-invalid`, `user-valid`,
`required`, `optional`, `disabled`, `readonly`). Ver
[`references/custom-states.md`](references/custom-states.md). Si el
componente no expone custom states, **omitir la tabla entera**, no
dejarla vacía.

#### 5. Eventos (emitidos / escuchados)

Dos sub-secciones:

- **Eventos emitidos** — tabla `Evento | detail | cancelable` **generada**,
  no escrita a mano: la escribe la sonda `scripts/sondas/eventos.ts` desde el
  tipo `XEventos` de `schemas/<tag>.schemas.ts` enlazado con
  `declare static events` (incluye los de la base, p. ej. `iswc-invalid` de
  `IswcFormControlEventos`). Va entre los marcadores
  `<!-- eventos: generado por scripts/sondas/eventos.ts desde declare static events -->`
  y `<!-- /eventos -->`; la misma sonda escribe el campo `events` de la
  ficha `.json`. Para cambiar un evento se cambia el tipo y se corre
  `deno run -A --no-check scripts/sondas/eventos.ts` (`--comprobar` solo
  informa). Todos burbujean y son `composed` salvo excepción documentada
  en prosa.
- **Eventos escuchados** — lista corta de eventos que el componente
  escucha de `document`, `window` u otros elementos. Si no escucha nada,
  omitir.

#### 6. Slots

Tabla con `Slot | Uso`. Slots vacíos o por defecto van como `default`.
Si el componente no usa slots, omitir.

#### 7. CSS parts

Tabla con `Part | Uso`. Solo las parts que el shadow expone con
`exportparts` o `part=`. Ver
[`references/visual-style.md`](references/visual-style.md) para
convenciones de nombrado.

#### 8. Ejemplos

Bloques `html` con casos reales. **Siempre** un ejemplo mínimo primero,
luego opcionalmente uno avanzado. Ver
[`references/code-blocks.md`](references/code-blocks.md).

### Convenciones

- **Tono directo, sin ambigüedades.** Frases cortas. Sin "podría", "tal
  vez", "sirve para" cuando la realidad es "sirve para". Reservar la voz
  pasiva para casos donde el actor es irrelevante.
- **Bloques de código con lenguaje (`html`, `css`, `js`).** Nunca ` ``` ` sin
  lenguaje. Ver [`references/code-blocks.md`](references/code-blocks.md).
- **Tablas para listar props, eventos, slots, parts y states.** Listas
  solo cuando el ítem es único o la tabla no aporta (p.ej. una sola
  propiedad).
- **Tokens `--iswc-*` para colores y espacios.** Nunca `#hex` ni `px` en
  la guía (salvo ejemplos muy concretos).
- **Headings H2 (`##`) para secciones, H3 (`###`) para sub-tablas.**
  No saltar niveles.
- **Saltos de línea simples.** No envolver párrafos a 80 columnas; los
  agentes los re-escriben igual y el line wrapping del repo lo gestiona
  el editor.

### Cross-linking

Cada ficha **debe** enlazar a:

1. La skill del kit:
   [`../iswc-base/SKILL.md`](../iswc-base/SKILL.md).
2. Componentes relacionados (mismo grupo, primos cercanos o dependencias).
   P.ej. `<iswc-button-group>` enlaza a `<iswc-button>`.
3. Dependencias de código (`_shared/*.js`, primos del mismo paquete).

Los enlaces a guías hermanas deben usar la ruta **relativa** dentro de
`src/components/`:

```md
[`./button.scss`](./button.scss)
[`../_shared/adopt-css.js`](../_shared/adopt-css.js)
[`../media/icon.md`](../media/icon.md)
```

Los enlaces a la skill del kit van con la ruta desde `skills/`:

```md
[Skill del kit](../iswc-base/SKILL.md)
```

### Validación

Antes de mergear cambios en la ficha de un componente:

1. `tests/gobernanza/contrato-cuatro-archivos.test.ts`: frontmatter, rutas y secciones.
2. `tests/gobernanza/eventos.test.ts`: la tabla «Eventos» y el `events` de la
   ficha coinciden con la sonda (E2) y lo emitido con lo declarado (E1).
3. `tests/gobernanza/preview-paths.test.ts` si la ficha cambia ejemplos que
   referencian archivos del preview.
4. `deno task audit`: incluye la misma regla por componente.

Si cualquiera falla, **primero** justifica la rotura con un cambio en el
componente y luego ajusta la guía — nunca al revés.

### Errores comunes

- Inventar API por similitud con otro componente (p.ej. añadir un
  atributo `size` que el módulo no declara).
- Listar atributos que el componente no observa (un `@state()` o un
  `@prop({ attr: false })` no es atributo).
- Editar a mano la tabla «Eventos» o el `events` del `.json`: se pisa en la
  siguiente corrida de la sonda.
- Documentar textos de interfaz fijos en español como si fueran API: salen
  de `t()` y cambian con `lang`; documentar el atributo que los sobrescribe.
- Dejar la tabla de custom states vacía cuando el componente no expone
  ninguno: mejor omitirla.
- Olvidar el frontmatter o dejar `preview` apuntando a un archivo que
  no existe.
- Escribir `style: ./x.css`: en `src/` solo hay `.scss`.
- Rellenar "Accesibilidad" o "Reglas para LLM" con frases genéricas: di lo que este
  componente hace.
- Poner `iswc-popup` (eliminado) en cualquier ejemplo o enlace.
- Mezclar `iswc-*` con tags nativos o de otros frameworks en un mismo
  ejemplo.
- Empezar la ficha con prosa introductoria larga en vez de ir directo al
  grano.
- Usar `#hex` o `px` en ejemplos de tokens; siempre `var(--iswc-*)` o
  `em`.


---


## Checklist pre-PR

Antes de abrir PR con un componente nuevo, verifica:

- [ ] §2 Los cuatro archivos: `.ts`, `.scss`, `.md` y `.json`.
- [ ] §2 Anatomía en el `.md` con las secciones en orden.
- [ ] §3 Base correcta (`IswcReactive` / `IswcFormControl`; `IswcElement`
      solo si el cierre lo exige) y custom states con `this.estado()`,
      documentados.
- [ ] §4 CSS parts y slots semánticos, documentados en "CSS parts" /
      "Slots" del `.md`.
- [ ] §5 Propiedades con `@prop` (sin setters que reflejan a mano), enums
      con `enum`, DOM por `render()` + `html` si depende del estado, textos
      por `t()` con sus términos en `core/i18n/en.ts`, eventos en el tipo
      `XEventos` + `declare static events` y la sonda
      `scripts/sondas/eventos.ts` corrida.
- [ ] §6 CSS sin hex literales (solo en fallback de variables `--iswc-*`).
- [ ] §7 a11y: `attachShadow({ delegatesFocus: true })`, reenvío de
      `aria-*`, atajos de teclado documentados.
- [ ] §8 `tests/<area>.test.ts` pasa y termina con
      `...: PASS — <resumen>`.
- [ ] §9 `.json` `iswc-preview/v1` con playground (`target` y `controls`), y entrada en
      `src/manifest.ts` y `src/previews/catalog.ts`.
- [ ] Fila en `skills/iswc-base/SKILL.md` y `skills/iswc-base/catalog.md`.
- [ ] Ninguna estructura de UI del componente o de sus consumidores queda como HTML suelto
      fuera de un shadow (todo es componente).
- [ ] §10 `.md` hermano con frontmatter, secciones y "Reglas para LLM".
- [ ] `tests/gobernanza/contrato-cuatro-archivos.test.ts`,
      `tests/gobernanza/reactivo.test.ts`, `tests/gobernanza/eventos.test.ts`,
      `tests/gobernanza/a11y-patrones.test.ts` y `deno task test:all` pasan
      en verde.

## Referencias

| Tema | Documento |
| --- | --- |
| Ciclo de vida, repintado, upgrade, `IswcFormControl` | [`references/lifecycle.md`](references/lifecycle.md) |
| Custom states con `this.estado()`, respaldo `data-*` | [`references/states.md`](references/states.md) |
| CSS parts, slots semánticos, fallback | [`references/parts-slots.md`](references/parts-slots.md) |
| `@prop`/`@state`/`@watch`, `render()`, `t()`, eventos tipados | [`references/props-events.md`](references/props-events.md) |
| Tokens `--iswc-*`, temas, paletas, `palettes.css` | [`references/css-tokens.md`](references/css-tokens.md) |
| a11y: focus, teclado, ARIA, pila de capas | [`references/accessibility.md`](references/accessibility.md) |

## Cómo se conecta con el resto

- Esta skill **no sustituye** a
  [`../iswc-base/SKILL.md`](../iswc-base/SKILL.md), que
  cubre el **consumo** del kit desde apps externas. Esta cubre la
  **construcción** de un componente dentro del repo.
- Para los `_shared/` (bases, mixins, helpers) ver la sección
  "Sistema de reutilización" de `AGENTS.md §8.6`.
- Para el sistema de iconos, ver `AGENTS.md §5` (la pieza más frágil
  del kit).
- Para los errores a evitar al modificar el repo, ver
  `AGENTS.md §6` (PowerShell, git, CSS warnings, etc.).