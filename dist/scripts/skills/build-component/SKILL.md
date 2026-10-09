---
name: build-component
description: >-
  Cómo construir un componente nuevo del kit iswc-* desde cero: anatomía
  obligatoria de su .md, CSS custom states con StateMachine, CSS parts y slots
  semánticos, diferencia entre atributos observados y propiedades JS, uso
  exclusivo de tokens --iswc-*, accesibilidad (aria + teclado + foco), tests
  con node:test + assert/strict, demo en demos/<cat>/<comp>/<comp>.html y
  convenciones de .ts/.css/.md. Usar cuando se vaya a crear un iswc-* nuevo,
  refactorizar uno existente para que cumpla el contrato, o revisar un PR que
  añade/renombra un componente del kit.
---

# Cómo construir un componente `iswc-*`

Convención obligatoria para cualquier **componente nuevo** del kit o para
**revisar uno existente**. Cubre los 10 puntos que un agente debe cumplir
antes de abrir PR. Las sub-guías viven en [`references/`](references/) y se
leen a demanda según el área que estés tocando.

## 1. Cuándo usarla

- Vas a crear un `<iswc-foo>` desde cero.
- Vas a refactorizar un componente existente para que cumpla el contrato
  del kit (estados, parts, slots, tokens, tests, doc, demo).
- Vas a revisar un PR que añade, renombra o mueve un componente.

Si lo que vas a hacer es **consumir** el kit (HTML con `<iswc-button>`,
estilos con tokens `--iswc-*`, etc.), esta skill **no** aplica: usa
[`../iswc-root/SKILL.md`](../iswc-root/SKILL.md).

## 2. Anatomía obligatoria (sección en el `.md`)

Todo componente del kit vive en `src/components/<category>/<name>.ts` y
lleva **un `.md` hermano** con la anatomía estándar. Esa sección es la
primera que un agente lee y la que mantiene `tests/llm-contract.test.ts`
fiel a la fuente.

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
## Reglas para LLM
## Fuentes
```

Reglas duras:

- El `.md` **no** se genera a mano sin对照 la fuente `.ts`; usa
  `node tests/llm-contract.test.ts` (o el extractor de cabeceras del kit)
  para que las tablas de Atributos observados / Custom states / CSS custom
  properties **matcheen** con el código.
- **Frontmatter obligatorio** al inicio del `.md` (lo lee
  `src/manifest.ts` y el manifest del catálogo):

  ```yaml
  ---
  tag: iswc-foo
  tags:
    - iswc-foo
  category: <actions|feedback|forms|data|charts|diagrams|layout|navigation|helpers|media|isp|overlays|code|preview|files>
  status: public | internal
  source: ./<name>.ts
  style: ./<name>.css
  preview: ./<name>.json
  ---
  ```

  `category` debe estar en la lista canónica del repo (ver
  `src/manifest.ts`); **`data-viz` no es categoría lógica** (los charts viven
  en `charts/`, los sub-folders `data-viz/` de demos/previews son alias).

Detalle: [`references/lifecycle.md`](references/lifecycle.md).

## 3. CSS custom states (StateMachine)

Todo componente declara **`static states = new StateMachine(...)`** (o
`get states()`) y documenta cada estado en la sección "Custom states" del
`.md`. La API pública son los custom states de
[`ElementInternals.states`](https://developer.mozilla.org/docs/Web/API/ElementInternals/states)
(`this._internals.states.add('foo')`), **no** un getter/setter JS.

Convenciones:

- Nombres en **kebab-case**: `loading`, `icon-button`, `without-line`,
  `selected`, `disabled`. **Nunca** `isLoading` / `is_loading`.
- Booleano: el state se **añade** cuando el atributo booleano está
  presente; se **quita** cuando se elimina.
- Enum (`shape="round|rect|pill"`): un state por valor opcional
  (`state(round)`, `state(rect)`, …). Evita `data-shape="round"` salvo que
  el navegador no soporte `ElementInternals.states` (fallback
  `data-state-*`).
- Documenta **siempre** cada state en la tabla "Custom states" del `.md`.
  Si lo consumes en CSS, debe aparecer en la columna "Uso" con el
  selector `:state(...)` que lo aplica.

Patrón mínimo:

```ts
// src/components/actions/foo.ts
import { ElementBase, setCustomState } from '../../core/element.js';

class IswcFoo extends ElementBase {
  static states = {
    loading: 'loading',
    iconButton: 'icon-button',
  };

  #internals: ElementInternals | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    // ...
    if ('attachInternals' in this) {
      try { this.#internals = this.attachInternals(); } catch {}
    }
  }

  onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
    if (name === 'loading') {
      setCustomState(this.#internals, 'loading', this.hasAttribute('loading'));
    }
  }
}
```

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

## 5. Atributos observados vs propiedades JS

Regla de oro: **lo que el HTML declara y el servidor serializa va como
atributo; lo que el JS asigna dinámicamente va como propiedad.** Las dos
cosas pueden coexistir; la mayoría de los componentes del kit reflejan
propiedad → atributo.

Convenciones:

- Lista los atributos observados en el array estático `OBSERVED` y expón
  `static get observedAttributes()` (o hereda de `ElementBase`, que ya lo
  gestiona).
- Cada propiedad pública tiene un getter que **lee** el atributo (fuente
  de verdad) y un setter que **escribe** el atributo. No guardes estado
  duplicado.
- Enums (`shape`, `variant`, `color`): el setter normaliza con la
  constante compartida (`BUTTON_SHAPE`, `VARIANT`, `INTENT`) y, si el
  valor está fuera del contrato, vuelve al default en `attributeChanged`.
- Booleanos: presencia de atributo ⇒ `true`. **Nunca** `attr="false"`.
- Refleja al host solo lo que el usuario ve (`disabled` ⇒
  `aria-disabled`, `loading` ⇒ `aria-busy`); **no** expongas detalles
  internos.
- `name`, `value`, `form`, `formaction`, etc.: propágalos al `<button>` /
  `<input>` interno del Shadow DOM. El form-associated real vive en ese
  inner, **no** en el host (ver §3 de
  [`references/lifecycle.md`](references/lifecycle.md)).

Patrón mínimo:

```ts
// src/components/actions/foo.ts
const OBSERVED = ['color', 'variant', 'shape', 'disabled', 'loading'];

class IswcFoo extends ElementBase {
  static get observedAttributes(): string[] {
    return [...OBSERVED, ...ARIA_FORWARD];
  }

  get shape(): string {
    return normalizeShape(this.getAttribute('shape'), DEFAULT_SHAPE);
  }
  set shape(v: string | null | undefined) {
    if (v == null || v === '') this.removeAttribute('shape');
    else this.setAttribute('shape', normalizeShape(v, DEFAULT_SHAPE));
  }

  onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
    if (name === 'shape' && newVal && !VALID_SHAPE.includes(newVal)) {
      this.setAttribute('shape', DEFAULT_SHAPE);
    }
  }
}
```

Detalle: [`references/props-events.md`](references/props-events.md).

## 6. Tokens `--iswc-*` (no hex literales)

- **Prohibido** escribir colores hex (`#fff`, `#0c1118`, `rgba(...)`,
  `hsl(...)`) dentro del `.css` del componente, salvo en el `:host` como
  **fallback final** de una custom property (`var(--iswc-bg, #0c1118)`).
- Todo color, espaciado, radio, fuente, sombra y transición debe salir
  de un **token `--iswc-*`** declarado en `src/styles/is-base.css` o
  `src/styles/palettes.css`.
- El prefijo **`--iswc-*`** es canónico. **`--pg-*` es legacy** y debe
  migrarse si aparece en código nuevo.
- Si necesitas un color que no existe, **primero** añádelo a
  `is-base.css` o a la paleta correspondiente (`insoft`, `contapyme`,
  `agrowin`), y luego consúmelo vía `var(--iswc-...)` desde el
  componente.
- Variables locales del componente: prefijo `--iswc-<componente>-*`
  (`--iswc-button-border-radius`, `--iswc-button-transition-duration`).
  Las privadas (solo dentro del Shadow) usan `--_foo`.

Patrón mínimo:

```css
/* src/components/actions/foo.css */
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
    region con "Cargando" / "Listo" para usuarios de screen reader.
  - **No** inventes roles ni propiedades ARIA. Si necesitas una nueva,
    documéntala en el `.md` y añádela a la tabla "Accesibilidad".
- **Focus management en modales** (`<iswc-dialog>`, `<iswc-drawer>`,
  popovers, tooltips, command palette): trapea foco, devuelve foco al
  último elemento activo al cerrar, usa `inert` o `aria-hidden` para el
  resto de la página mientras está abierto. Hereda de `ModalBase` o
  reusa el patrón.
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
- Cubre al menos:
  1. `customElements.define` no falla y el upgrade de propiedades
     funciona (asignar antes de `connect`).
  2. Reflejo atributo ↔ propiedad en cada `observedAttribute`.
  3. Custom states: presencia del atributo booleano ⇒ state activo.
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

## 9. Demo (`demos/<cat>/<comp>/<comp>.html`)

Estructura del repo:

```text
src/components/actions/foo.ts
src/components/actions/foo.css
src/components/actions/foo.md
demos/actions/foo/foo.html         ← demo del kit (carpeta por categoría)
demos/actions/foo/_testing/…       ← optativos: playgrounds y harnesses
```

Reglas del demo:

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
  <title>Demo: <iswc-foo> · iswc-root</title>
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

## Checklist pre-PR

Antes de abrir PR con un componente nuevo, verifica:

- [ ] §2 Anatomía en el `.md` con las 14 secciones en orden.
- [ ] §3 Custom states declarados en `static states` y documentados.
- [ ] §4 CSS parts y slots semánticos, documentados en "CSS parts" /
      "Slots" del `.md`.
- [ ] §5 Atributos observados y propiedades públicas coherentes;
      enums normalizados.
- [ ] §6 CSS sin hex literales (solo en fallback de variables `--iswc-*`).
- [ ] §7 a11y: `attachShadow({ delegatesFocus: true })`, reenvío de
      `aria-*`, atajos de teclado documentados.
- [ ] §8 `tests/<area>.test.ts` pasa y termina con
      `...: PASS — <resumen>`.
- [ ] §9 `demos/<category>/<name>/<name>.html` con tokens `--iswc-*` y
      anti-FOUC.
- [ ] §10 `.md` hermano con frontmatter, 14 secciones y "Reglas para
      LLM".
- [ ] `node tests/llm-contract.test.ts` y `node tests/run-all.mjs`
      pasan en verde.

## Referencias

| Tema | Documento |
| --- | --- |
| Ciclo de vida, hooks, upgrade, form-associated | [`references/lifecycle.md`](references/lifecycle.md) |
| Custom states, StateMachine, fallback `data-state-*` | [`references/states.md`](references/states.md) |
| CSS parts, slots semánticos, fallback | [`references/parts-slots.md`](references/parts-slots.md) |
| Atributos observados, props, eventos `iswc-*` | [`references/props-events.md`](references/props-events.md) |
| Tokens `--iswc-*`, temas, paletas, `palettes.css` | [`references/css-tokens.md`](references/css-tokens.md) |
| a11y: focus, teclado, ARIA, focus trap | [`references/accessibility.md`](references/accessibility.md) |

## Cómo se conecta con el resto

- Esta skill **no sustituye** a
  [`../iswc-root/SKILL.md`](../iswc-root/SKILL.md), que
  cubre el **consumo** del kit desde apps externas. Esta cubre la
  **construcción** de un componente dentro del repo.
- Para los `_shared/` (bases, mixins, helpers) ver la sección
  "Sistema de reutilización" de `AGENTS.md §8.6`.
- Para el sistema de iconos, ver `AGENTS.md §5` (la pieza más frágil
  del kit).
- Para los errores a evitar al modificar el repo, ver
  `AGENTS.md §6` (PowerShell, git, CSS warnings, etc.).
