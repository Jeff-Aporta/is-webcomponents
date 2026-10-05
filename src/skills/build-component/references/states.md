# States

Cómo declarar y exponer **custom states** (`ElementInternals.states`)
desde un componente del kit, y cómo documentarlos en el `.md`.

## 1. Por qué `static states = StateMachine(...)`

El kit centraliza la declaración de estados en una constante estática
para que:

- Un agente pueda **leer el contrato** sin saltar al `.ts` a buscar
  `internals.states.add('foo')`.
- El extractor que sincroniza el `.md` con la fuente sepa qué filas
  generar en la tabla "Custom states".
- La convención sea **uniforme** entre los ~150 componentes del repo
  (no cada uno con su propio patrón).

El **tipo** del campo `states` es `Record<string, string>` donde la
clave es el nombre lógico (camelCase) y el valor es el nombre del
custom state (kebab-case). Ejemplo:

```ts
class IswcButton extends ElementBase {
  static states = {
    loading: 'loading',
    disabled: 'disabled',
    link: 'link',
    iconButton: 'icon-button',
  };
}
```

## 2. Cómo se activan

Un custom state se activa cuando la condición booleana se cumple. El
patrón recomendado usa el helper
[`setCustomState`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/_shared/form-associated.ts)
de `_shared/form-associated.ts`:

```ts
import { setCustomState } from '../_shared/form-associated.js';

class IswcFoo extends ElementBase {
  #internals: ElementInternals | null = null;

  constructor() {
    super();
    this.initShadow({ mode: 'open', delegatesFocus: true });
    if ('attachInternals' in this) {
      try { this.#internals = this.attachInternals(); } catch {}
    }
  }

  onAttributeChanged(name: string) {
    if (name === 'loading') {
      setCustomState(this.#internals, 'loading', this.hasAttribute('loading'));
    } else if (name === 'href') {
      setCustomState(this.#internals, 'link', this.hasAttribute('href'));
    }
  }
}
```

`setCustomState` tolera navegadores sin `ElementInternals.states`:
simplemente no hace nada. Internamente llama a `internals.states.add(...)`
o `.delete(...)`.

## 3. Nombres

- **kebab-case**, igual que los custom attributes del HTML.
- Longitud máxima recomendada: 24 caracteres.
- Sin prefijo `is-` ni `iswc-`: ya estás dentro de un `<iswc-foo>`, el
  namespace se sobreentiende.
- No uses **el mismo nombre que un atributo** del host: el consumidor
  puede esperar que `el.matches(':state(loading)')` refleje el
  atributo `loading`, pero la sombra lo gestiona la lógica
  independientemente. Si colisionan, documenta la diferencia en
  "Errores comunes" del `.md`.

Bien:

```ts
static states = {
  loading: 'loading',
  iconButton: 'icon-button',
  withoutLine: 'without-line',
  selected: 'selected',
  expanded: 'expanded',
  fullscreen: 'fullscreen',
};
```

Mal:

```ts
static states = {
  isLoading: 'isLoading',     // ❌ camelCase en el state
  iswc_loading: 'iswc_loading', // ❌ prefijo del kit
  loading: 'iswc-loading',    // ❌ prefijo dentro del kit
};
```

## 4. Enums como múltiples states

Si un atributo es una **enum** (`shape="round|rect|pill"`), una opción
común es exponer un state por valor opcional:

```ts
// `shape="round"` ⇒ :state(round) activo
// `shape="rect"`  ⇒ :state(rect)  activo
// (o ninguno)
static states = {
  round: 'round',
  rect:  'rect',
  pill:  'pill',
};

onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
  if (name === 'shape') {
    for (const v of Object.values(IswcFoo.states)) {
      setCustomState(this.#internals, v, v === newVal);
    }
  }
}
```

CSS:

```css
.foo:state(round) { border-radius: var(--iswc-foo-radius-round); }
.foo:state(rect)  { border-radius: 0; }
.foo:state(pill)  { border-radius: 999px; }
```

## 5. Fallback `data-state-*` para entornos sin soporte

`ElementInternals.states` llegó a todos los navegadores modernos, pero
algunos embebidos (webviews antiguos, iframes de admin legacy) no lo
soportan. Para esos, el kit usa **`data-state-*` como fallback**:

```ts
onAttributeChanged(name: string) {
  if (name === 'loading') {
    const on = this.hasAttribute('loading');
    setCustomState(this.#internals, 'loading', on);
    this.toggleAttribute('data-state-loading', on);
  }
}
```

El CSS debe cubrir **ambos** selectores:

```css
.foo:state(loading),
.foo[data-state-loading] {
  pointer-events: none;
  opacity: 0.6;
}
```

Documenta siempre el fallback en la tabla "Custom states" del `.md`
con la nota "Fallback `data-state-*`".

## 6. Tabla "Custom states" en el `.md`

```md
### Custom states

| Estado | Uso |
| --- | --- |
| `:state(loading)` | Mientras dura una operación asíncrona. `aria-busy="true"`. Fallback `data-state-loading`. |
| `:state(disabled)` | Refleja el atributo `disabled`. Saca del recorrido de tab. Fallback `data-state-disabled`. |
| `:state(icon-button)` | Cuando el slot default está vacío y solo hay icono. Ajusta padding. Fallback `data-state-icon-button`. |
| `:state(link)` | Cuando el atributo `href` está presente (renderiza `<a>` en vez de `<button>`). Fallback `data-state-link`. |
```

Si el state **no** se consume en CSS (es solo para tests o lógica
interna), no lo expongas: reduce la API pública y evita acoplamiento.

## 7. Tests

Cubre al menos:

1. `el.matches(':state(loading)')` es `true` cuando el atributo está
   presente.
2. `el.matches(':state(loading)')` es `false` cuando el atributo se
   quita.
3. Para enums: solo el state del valor activo es `true`.
4. El fallback `data-state-*` se aplica en el mismo ciclo que el
   custom state.

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/components/actions/foo.ts';

test('iswc-foo: state(loading) toggles with attribute', async () => {
  await customElements.whenDefined('iswc-foo');
  const el = document.createElement('iswc-foo');
  document.body.appendChild(el);
  assert.equal(el.matches(':state(loading)'), false);
  el.setAttribute('loading', '');
  assert.equal(el.matches(':state(loading)'), true);
  el.removeAttribute('loading');
  assert.equal(el.matches(':state(loading)'), false);
  document.body.removeChild(el);
});
```

## 8. Trampas

- **No** uses `this.dataset.loading = 'true'` como atajo: el kit ya
  define la convención `data-state-*`. Mezclar nombres rompe
  selectores en CSS.
- **No** declares states **inmutables** (que nunca se quitan) en un
  `static states` junto con states condicionales. Sepáralos: los
  inmutables van como clases CSS fijas en el template.
- **No** llames a `internals.states.add('foo')` antes de la primera
  conexión: el `internals` puede no estar listo. Espera al
  `onConnected`.
- **No** confundas `el.ariaHidden` (que **no** existe) con
  `el.setAttribute('aria-hidden', 'true')`. ARIA no se expone como
  propiedad automática.

## 9. Checklist

- [ ] `static states = { ... }` declarado en la clase.
- [ ] Cada state se activa/desactiva con `setCustomState(internals, name, bool)`.
- [ ] Nombres en kebab-case, sin prefijos del kit.
- [ ] Si el state se consume en CSS, hay **dos selectores**:
      `:state(name)` y `[data-state-name]`.
- [ ] Tabla "Custom states" en el `.md` con la columna "Uso".
- [ ] Test que cubre al menos el toggle atributo → state.
