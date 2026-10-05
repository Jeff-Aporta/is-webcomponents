# Lifecycle

Ciclo de vida de un componente del kit: hooks, shadow, upgrade de
propiedades, form-associated y cleanup. La clase base es
[`ElementBase`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/element-base.ts),
que centraliza el patrón repetido en ~150 componentes del repo.

## 1. Hooks de `ElementBase`

| Hook | Cuándo corre | Notas |
| --- | --- | --- |
| `constructor()` | Una vez, al instanciar. | `super()` primero, luego `initShadow()` + `adoptCss(...)`. |
| `onConnected()` | En CADA conexión al DOM (no solo la primera). | `this.mounted === true`. Útil para `ResizeObserver`, listeners globales. |
| `onDisconnected()` | Cada desconexión. | Limpia observers/listeners si quieres. |
| `onAttributeChanged(name, oldVal, newVal)` | Tras el guard de montado y de igualdad. | La base ya filtra `oldVal === newVal` y atributos previos al connect. |
| `attributeChangedCallback(...)` | Nivel DOM. **No** lo sobreescribas: usa `onAttributeChanged`. | La base lo delega. |

`ElementBase` **no** corre `onConnected` si no hay shadow todavía: en
el constructor, primero `super()`, luego `initShadow()`. Saltarse el
`initShadow` significa que `onConnected` corre sin `this.shadowRoot` y
muchos componentes rompen.

## 2. Plantilla mínima

```ts
import { adoptCss, defineElement } from '../../core/element.js';
import { ElementBase } from '../../core/element-base.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div part="root" class="foo">
    <slot></slot>
  </div>
`;

class IswcFoo extends ElementBase {
  static TEMPLATE = TEMPLATE;
  static get observedAttributes(): string[] { return ['variant', 'disabled']; }

  constructor() {
    super();
    this.initShadow({ mode: 'open', delegatesFocus: true });
    adoptCss(this.shadowRoot!, import.meta.url);
  }

  onConnected() { /* sync inicial */ }
  onAttributeChanged(name: string) {
    if (name === 'disabled') { /* … */ }
  }
}

defineElement('iswc-foo', IswcFoo);
```

`defineElement` registra el tag y, si el navegador no soporta Custom
Elements v1 (legacy), **no** falla en silencio: lo loguea. Si necesitas
soporte en navegadores muy viejos, usa el polyfill oficial o asume v1.

## 3. Upgrade de propiedades

Típico problema: el usuario hace `el.variant = 'outlined'` **antes** de
que el custom element se haya registrado. La propiedad se asigna al
prototipo de `HTMLElement` y se pierde.

`ElementBase.connectedCallback` llama a `upgradeProperties(this, ...)`
**una sola vez** (la primera conexión) y reescribe los valores perdidos
sobre los setters reales. **No** lo hagas a mano en el constructor.

```ts
// ❌ NO — re-implementación del upgrade
constructor() {
  super();
  for (const a of ['variant']) {
    const v = this.getAttribute(a);
    if (v) (this as any)[a] = v;
  }
}

// ✅ SÍ — heredar ElementBase ya lo hace
class IswcFoo extends ElementBase {
  static get observedAttributes(): string[] { return ['variant']; }
  get variant() { return this.getAttribute('variant'); }
  set variant(v: string) { this.setAttribute('variant', v); }
}
```

## 4. Form-associated custom elements

Solo aplica si el componente participa en un `<form>` (inputs, textareas,
combobox, date-picker, etc.). Pasos:

1. Marcar la clase con `static formAssociated = true;`.
2. En el constructor, llamar a `attachFormInternals(this)` desde
   [`_shared/form-associated.ts`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/_shared/form-associated.ts).
3. Implementar `formResetCallback()` para restaurar valores iniciales
   (capturar en el constructor con un `Map`).
4. Implementar `formDisabledCallback(disabled)` para reflejar el estado
   del `<form>` en el inner.
5. Implementar `formStateRestoreCallback(state)` para restaurar tras
   navegación/autocomplete.
6. **El form-associated real vive en el `<input>` / `<button>` interno
   del Shadow DOM**, no en el host. El `name`, `value`, `form`, etc.
   deben **propagarse al inner**. El host solo expone la API pública
   para que el consumidor no toque el shadow.

Patrón de reset:

```ts
#initialAttrs = new Map<string, string>();

constructor() {
  super();
  for (const a of OBSERVED) {
    if (this.hasAttribute(a)) this.#initialAttrs.set(a, this.getAttribute(a)!);
  }
}

formResetCallback() {
  for (const a of OBSERVED) {
    if (this.#initialAttrs.has(a)) this.setAttribute(a, this.#initialAttrs.get(a)!);
    else this.removeAttribute(a);
  }
}
```

## 5. Limpieza

- **`ResizeObserver`, `MutationObserver`, `IntersectionObserver`**:
  crear en `onConnected`, desconectar en `onDisconnected`. Si los dejas
  vivos, el GC no libera la instancia cuando se quita del DOM.
- **Listeners en `document` o `window`**: solo en `onConnected`, y
  quítalos en `onDisconnected`. Si el componente vive dentro de un SPA
  que se desmonta, esto evita memory leaks.
- **Timers y `requestAnimationFrame`**: guarda el id en un campo
  privado y `clearTimeout`/`cancelAnimationFrame` en
  `onDisconnected`.

```ts
#ro: ResizeObserver | null = null;

onConnected() {
  this.#ro = new ResizeObserver(() => this.#sync());
  this.#ro.observe(this);
}

onDisconnected() {
  this.#ro?.disconnect();
  this.#ro = null;
}
```

## 6. `delegatesFocus: true`

Por defecto, hacer foco en el host **no** enfoca nada visible para el
usuario. Con `delegatesFocus: true` en `attachShadow({...})`, el primer
elemento focuseable del shadow recibe el foco cuando se enfoca el host
(y el estilo `:focus` se aplica a ese primer focuseable).

Recomendado para **todo** componente interactivo (botones, inputs,
links, combos, modales). Para contenedores no interactivos (cards,
callouts, layouts) déjalo en `false`.

## 7. Trampas

- **No** leas `this.hasAttribute('foo')` en el constructor para
  "configurar" el estado: el atributo puede no estar aún porque el
  parser HTML todavía no ha llamado al `attributeChangedCallback` (o
  sí, pero el shadow no existe). Configura en `onConnected`.
- **No** hagas `super.connectedCallback()` si sobrescribes
  `connectedCallback`. Mejor usa `onConnected`.
- **No** escribas `#mounted = true` a mano: la base ya lo gestiona.
- **No** llames a `this.dispatchEvent(new CustomEvent('iswc-foo'))`
  antes de la primera conexión: el evento burbujea pero el consumidor
  puede no estar listo todavía. Usa `queueMicrotask` o espera al
  `onConnected`.

## 8. Checklist

- [ ] `super()` primero, `initShadow()` después, `adoptCss` por
      último.
- [ ] `onConnected` idempotente: corre en cada conexión.
- [ ] Upgrade de propiedades cubierto por la base.
- [ ] `formAssociated = true` solo si el componente entra en `<form>`.
- [ ] `formResetCallback` / `formDisabledCallback` /
      `formStateRestoreCallback` implementados.
- [ ] `delegatesFocus: true` en componentes interactivos.
- [ ] `ResizeObserver` y listeners globales: `onConnected` crea,
      `onDisconnected` destruye.
- [ ] Custom events `iswc-*` emitidos **tras** la primera conexión.
