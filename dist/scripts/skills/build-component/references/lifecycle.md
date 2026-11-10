<!-- @vendor 2026-10-14T14:46:42.343Z Jeff-Aporta/is-webcomponents@main skills/build-component/references/lifecycle.md -->
# Lifecycle

Ciclo de vida de un componente del kit: hooks, shadow, repintado reactivo,
upgrade de propiedades, controles de formulario y cleanup. La cadena de clases
es `HTMLElement` → [`IswcElement`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/iswc-element.ts)
(molde: shadow, hojas, upgrade, `deps`) → [`IswcReactive`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/iswc-reactive.ts)
(`@prop`/`@state`/`@watch`, repintado, `estado()`, `t()`) →
[`IswcFormControl`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/iswc-form-control.ts)
(form-associated). Un componente nuevo extiende `IswcReactive` (o
`IswcFormControl`); `IswcElement` solo si el cierre lo exige.

## 1. Hooks

| Hook | Cuándo corre | Notas |
| --- | --- | --- |
| `constructor()` | Una vez, al instanciar. | El molde ya crea el shadow (`static shadowInit`), clona `static template` y adopta `static css`. Solo `super()` + estado privado. |
| `render()` | En el primer pintado (síncrono, dentro de `connectedCallback`) y después en cada repintado (microtarea). | Devuelve `` html`…` `` de `core/plantilla.ts`, o `null` si el componente usa su `static template`. Sin efectos: solo describe el DOM. |
| `@watch('p')` | Antes de `render()`, una vez por propiedad vigilada que cambió. | `(anterior, nuevo)`; `{ esperarPrimerRender: true }` lo salta en el primer pintado. |
| `actualizado(cambios)` | Tras cada pintado. | `cambios`: `Map` nombre → valor anterior. Aquí van `this.estado(…)` y la sincronización de un DOM fijo. |
| `onConnected()` | En CADA conexión al DOM, después del primer pintado. | `ResizeObserver`, listeners globales. |
| `onDisconnected()` | Cada desconexión. | Limpia observers/listeners. |
| `onAttributeChanged(name, oldVal, newVal)` | Cualquier atributo observado, tras el guard de montado y de igualdad. | Úsalo para los de `static observed`; los `@prop` ya siguen a su atributo (para reaccionar a ellos, `@watch`). |

`connectedCallback` y `attributeChangedCallback` los implementa la cadena del
molde. Si los sobrescribes, **llama siempre a `super`**: sin eso los `@prop`
dejan de seguir a los atributos sin dar error (pasó con
`forms/utils/date-field-element`). Lo normal es usar los hooks de arriba.

## 2. Repintado

- Cada escritura que cambia el valor de un `@prop`/`@state` encola **un**
  repintado por microtarea: N escrituras en el mismo tick = 1 pintado.
- El **primer** pintado es síncrono, al conectar: quien lea el shadow justo
  después de insertar el elemento ya lo ve pintado.
- `actualizarAhora()` vacía la cola en síncrono; `await el.actualizacionCompleta`
  espera al pintado pendiente (pruebas y consumidores que leen el shadow
  después de escribir).
- Lo que el consumidor lee como API (`value`, `checked`, `validity`) se
  actualiza en el setter, no en el pintado.

## 3. Plantilla mínima

```ts
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive, prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { html } from '@jeff-aporta/iswc-base/core/plantilla.js';
import type { FooEventos } from './schemas/foo.schemas.js';
import css from 'iswc:css';

class IswcFoo extends IswcReactive {
  static override tag = 'iswc-foo';
  static override css = css;
  static override shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };
  static override deps = ['iswc-icon'];
  declare static events: FooEventos;
  @prop({ enum: ['filled', 'outlined'] }) accessor variant = 'outlined';
  @prop({ type: 'bool' }) accessor disabled = false;

  render() {
    return html`<div part="root" class=${`foo ${this.variant}`} aria-disabled=${this.disabled ? 'true' : null}><slot></slot></div>`;
  }

  override actualizado() {
    this.estado('disabled', this.disabled);
  }
}

define(IswcFoo);
```

`define(Clase)` registra la clase con su `static tag`; es idempotente
(gana el primero que define, por si el kit se carga dos veces). Nada de
`adoptCss(…, import.meta.url)`, `<link>` al `.css` hermano ni
`static get observedAttributes` a mano: `observedAttributes` = `static observed`
∪ `styleAttrs` ∪ los `@prop` de toda la cadena (también los de una clase base
que nunca se define).

## 4. Upgrade de propiedades

Típico problema: el usuario hace `el.variant = 'outlined'` **antes** de
que el custom element se haya registrado. La propiedad se asigna a la
instancia sin pasar por el setter y se pierde.

El molde llama a `upgradeProperties` **una sola vez** (la primera conexión),
también para cada `@prop`, y reescribe los valores sobre los setters reales.
**No** lo hagas a mano en el constructor.

```ts
// ❌ NO — re-implementación del upgrade y reflejo a mano
constructor() {
  super();
  const v = this.getAttribute('variant');
  if (v) (this as any).variant = v;
}
get variant() { return this.getAttribute('variant'); }
set variant(v: string) { this.setAttribute('variant', v); }

// ✅ SÍ — el molde recoge lo escrito antes del upgrade y @prop refleja
@prop() accessor variant = 'outlined';
```

## 5. Controles de formulario (`IswcFormControl`)

Solo si el componente participa en un `<form>` (inputs, textareas, combobox,
date-picker…). La base ya hace:

- `static formAssociated = true` e `internals` (null si el motor no lo admite).
- `name`, `disabled`, `required`, `readonly` reflejados; `label`, `hint`,
  `errorText`, `error`; `form`, `validity`, `validationMessage`,
  `willValidate` delegados en `internals`.
- `checkValidity`, `reportValidity`, `setCustomValidity` como el estándar;
  evento `iswc-invalid` al recibir `invalid` (tipo `IswcFormControlEventos`).
- Estados `:state(user-invalid)`/`:state(user-valid)` solo tras interactuar
  (primer cambio, salida tras editar, `reportValidity` o `invalid` nativo),
  `required`/`optional`, `disabled`, `readonly`.
- `formResetCallback`, `formDisabledCallback`, `formStateRestoreCallback`.

El control aporta:

```ts
class IswcFoo extends IswcFormControl {
  static override tag = 'iswc-foo';
  @prop({ attr: 'value', reflect: false, vacio: true }) accessor value = '';   // el atributo es el valor por defecto
  override valorFormulario() { return this.value || null; }                   // lo que entra en FormData
  override restablecer() { this.value = this.defaultValue; }                   // formResetCallback
  override get controlNativo() { return this.shadowRoot!.querySelector('input'); }  // validez nativa reflejada
  // override validar(): reglas propias; por defecto `required` + espejo del control nativo
}
```

El `<input>` / `<button>` interno sigue siendo el que el usuario toca: el
host le propaga `value`, `disabled`, etc. en `render()`/`actualizado()`.

## 6. Limpieza

- **`ResizeObserver`, `MutationObserver`, `IntersectionObserver`**:
  crear en `onConnected`, desconectar en `onDisconnected`. Si los dejas
  vivos, el GC no libera la instancia cuando se quita del DOM.
- **Listeners en `document` o `window`**: solo en `onConnected`, y
  quítalos en `onDisconnected`. Escape y clic fuera de un overlay **no**
  se escuchan a mano: van por la pila de capas de `core/position.ts`.
- **Timers y `requestAnimationFrame`**: guarda el id en un campo
  privado y `clearTimeout`/`cancelAnimationFrame` en `onDisconnected`.
- El observador de idioma (`lang`/`dir`) que usa `t()` lo da de alta y de
  baja el molde.

```ts
#ro: ResizeObserver | null = null;

override onConnected() {
  this.#ro = new ResizeObserver(() => this.#medir());
  this.#ro.observe(this);
}

override onDisconnected() {
  this.#ro?.disconnect();
  this.#ro = null;
}
```

## 7. `delegatesFocus: true`

Por defecto, hacer foco en el host **no** enfoca nada visible para el
usuario. Con `delegatesFocus: true` en `static shadowInit`, el primer
elemento focuseable del shadow recibe el foco cuando se enfoca el host
(y el estilo `:focus` se aplica a ese primer focuseable).

Recomendado para **todo** componente interactivo (botones, inputs,
links, combos, modales). Para contenedores no interactivos (cards,
callouts, layouts) déjalo en `false`.

## 8. Trampas

- **No** leas atributos en el constructor para "configurar" el estado:
  el parser puede no haberlos puesto aún. Los `@prop` ya tienen el valor
  correcto en el primer `render()`.
- **No** sobrescribas `connectedCallback`/`attributeChangedCallback` sin
  llamar a `super` (rompe `@prop`).
- **No** leas el shadow justo después de escribir una propiedad sin
  `actualizarAhora()` o `await el.actualizacionCompleta`.
- **No** escribas `#mounted = true` a mano: la base ya lo gestiona.
- **No** emitas eventos `iswc-*` antes de la primera conexión: el consumidor
  puede no estar escuchando todavía.

## 9. Checklist

- [ ] Base `IswcReactive` / `IswcFormControl`; `static tag/css/deps`,
      `import css from 'iswc:css'` y `define(Clase)` al final.
- [ ] Propiedades con `@prop`/`@state`; nada de setters que reflejan a mano.
- [ ] `render()` + `html` si el DOM depende del estado; si no,
      `static template` + `actualizado()`.
- [ ] Estados con `this.estado()` en `actualizado()`.
- [ ] Control de formulario: `valorFormulario`, `restablecer`, `controlNativo`
      (y `validar` si hay reglas propias).
- [ ] `delegatesFocus: true` en componentes interactivos.
- [ ] Observers y listeners globales: `onConnected` crea, `onDisconnected`
      destruye; overlays por la pila de capas.
- [ ] Eventos `iswc-*` declarados en `XEventos` y emitidos **tras** la
      primera conexión.
