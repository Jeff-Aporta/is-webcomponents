# Props & Events

Cómo declarar **atributos observados**, **propiedades públicas** y
**eventos custom** en un componente del kit, y cómo documentarlos en
el `.md`.

## 1. Atributos vs propiedades

| Característica | Atributo HTML | Propiedad JS |
| --- | --- | --- |
| Fuente de verdad | Sí (serializable, parseable) | No, refleja al atributo |
| Aparece en `el.outerHTML` | Sí | No |
| Puede ser un objeto/complex | No (siempre string) | Sí |
| Lo que el servidor serializa | Atributo | Atributo (si se refleja) |
| Lo que el JS asigna en caliente | Atributo | Propiedad |

Regla: **el atributo es la fuente de verdad; la propiedad es un atajo
de lectura/escritura que refleja al atributo**.

```ts
class IswcFoo extends ElementBase {
  static get observedAttributes(): string[] { return ['variant', 'shape']; }

  // El atributo es la fuente de verdad
  get variant(): string {
    return normalizeVariant(this.getAttribute('variant'), DEFAULT_VARIANT);
  }
  set variant(v: string | null | undefined) {
    if (v == null || v === '') this.removeAttribute('variant');
    else this.setAttribute('variant', normalizeVariant(v, DEFAULT_VARIANT));
  }
}
```

## 2. Tipos de atributo

### Booleanos

Presencia ⇒ `true`. **Nunca** uses `attr="false"`. El getter devuelve
`this.hasAttribute('foo')` y el setter usa `this.toggleAttribute('foo', v)`.

```ts
static get observedAttributes(): string[] { return ['disabled', 'loading', 'pill']; }

get disabled(): boolean { return this.hasAttribute('disabled'); }
set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }
```

`ElementBase` tiene un atajo: `this.setBooleanAttr('disabled', v)`.

### Enums

Valores en un set cerrado. Normaliza en el getter y el setter con una
constante compartida:

```ts
export const FOO_VARIANT = ['filled', 'outlined', 'plain'] as const;
export type FooVariant = typeof FOO_VARIANT[number];
export const DEFAULT_FOO_VARIANT: FooVariant = 'filled';

function normalizeVariant(v: string | null | undefined, def: FooVariant): FooVariant {
  return (FOO_VARIANT as readonly string[]).includes(v ?? '') ? v as FooVariant : def;
}

class IswcFoo extends ElementBase {
  static get observedAttributes(): string[] { return ['variant']; }
  get variant(): FooVariant { return normalizeVariant(this.getAttribute('variant'), DEFAULT_FOO_VARIANT); }
  set variant(v: string | null | undefined) {
    if (v == null || v === '') this.removeAttribute('variant');
    else this.setAttribute('variant', normalizeVariant(v, DEFAULT_FOO_VARIANT));
  }
}
```

`onAttributeChanged` debe **defender** del caso "el consumidor escribió
un valor fuera del contrato" volviendo al default:

```ts
onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
  if (name === 'variant' && newVal && !FOO_VARIANT.includes(newVal as FooVariant)) {
    this.setAttribute('variant', DEFAULT_FOO_VARIANT);
  }
}
```

### Números

Serializa como string. Normaliza en el getter con `Number(...)` y
defiende con `Number.isFinite`:

```ts
get hue(): number | null {
  const raw = this.getAttribute('hue');
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
set hue(v: number | string | null | undefined) {
  if (v == null || v === '') this.removeAttribute('hue');
  else this.setAttribute('hue', String(v));
}
```

Si el rango importa (p.ej. 0-360), clamp en el setter:

```ts
set hue(v: number | string | null | undefined) {
  if (v == null || v === '') this.removeAttribute('hue');
  else {
    const n = Number(v);
    const clamped = Number.isFinite(n) ? ((n % 360) + 360) % 360 : 0;
    this.setAttribute('hue', String(clamped));
  }
}
```

### URLs (href, src)

Pásalas por `new URL(...)` para validar. Si falla, no escribas el
atributo. **No** hagas `setAttribute('href', userInput)` directo: filtra
`javascript:` y otros esquemas peligrosos.

```ts
set href(v: string | null | undefined) {
  if (v == null || v === '') {
    this.removeAttribute('href');
    return;
  }
  try {
    const url = new URL(v, this.baseURI);
    if (!/^https?:$/.test(url.protocol) && !url.protocol.startsWith('data:')) {
      this.removeAttribute('href');
      return;
    }
    this.setAttribute('href', url.toString());
  } catch {
    this.removeAttribute('href');
  }
}
```

### Payloads complejos (objetos, arrays)

**No** serialices objetos a JSON en atributos. Usa **propiedades JS**:

```ts
class IswcFoo extends ElementBase {
  #data: unknown[] = [];

  get data(): unknown[] { return this.#data; }
  set data(v: unknown[] | null | undefined) {
    this.#data = Array.isArray(v) ? v : [];
    this.#render();
  }
}
```

Si el consumidor quiere declararlo en HTML, expón una **propiedad
reflejada** que no serializa:

```ts
// En el .md: "configúralo vía JS, no en HTML"
```

## 3. Propiedades públicas vs privadas

| Visibilidad | Convención | Notas |
| --- | --- | --- |
| Pública (API) | `get foo()` / `set foo(v)` | Documentada en el `.md`. |
| Privada de clase | `#foo` (campos privados TS) | Solo dentro de la clase. |
| Internas del kit (testing) | `get _foo()` (prefijo `_`) | Documenta como "interno, no usar desde fuera". |
| Estilo de atributo | `static styleAttrs` | Map atributo → CSS var. |

Reglas:

- **No** expongas `get _internals`, `get _shadowRoot` ni nada
  internable como público: rompe la encapsulación.
- **No** declares una propiedad `get isFoo()` para algo que ya tiene
  un atributo: el kit usa el atributo.
- **No** mezcles `size=...` y `pgSize=...` (legacy). Decide un nombre y
  mantenlo.

## 4. Eventos custom

Convención del kit: `iswc-<nombre>` (kebab-case), `composed: true`,
`bubbles: true` (salvo casos justificados).

```ts
import { emit } from '../../core/element.js';

class IswcFoo extends ElementBase {
  #boundClick = (e: Event) => {
    emit(this, 'iswc-click', { originalEvent: e });
  };

  onConnected() {
    this.shadowRoot!.querySelector('button')!
      .addEventListener('click', this.#boundClick);
  }

  onDisconnected() {
    this.shadowRoot!.querySelector('button')!
      ?.removeEventListener('click', this.#boundClick);
  }
}
```

`emit` está en [`core/element.ts`](https://github.com/Jeff-Aporta/iswc-root/blob/main/src/core/element.ts)
y centraliza el `new CustomEvent(name, { detail, bubbles, composed,
cancelable })`.

### `composed: true` siempre (casi)

Un evento con `composed: false` **no cruza el Shadow DOM**. Eso
significa que un consumidor que escucha `el.addEventListener('iswc-click', ...)`
sobre el host **no** lo recibe. Por defecto el kit emite con
`composed: true` para que React, Vue y vanilla JS puedan consumirlo
con `el.addEventListener` o con `onIswcClick` (React 19+).

Excepciones documentadas (raras):

- Eventos que solo le interesan a lógica interna del componente
  (`iswc-internal-render`).
- Eventos que **no** deben escapar del shadow por privacidad.

### `cancelable: true` cuando aplique

Si un consumidor puede `preventDefault()` para cancelar una acción
(antes de cerrar un dialog, antes de aplicar un cambio), marca el
evento como `cancelable: true` y respeta la cancelación:

```ts
#boundBeforeClose = () => {
  if (!emit(this, 'iswc-before-hide', { cancelable: true })) return false;
  // ... cerrar
};
```

`emit` devuelve `false` si el evento fue cancelado.

### Custom events vs nativos

- **`focus`, `blur`, `click`, `input`, `change`, `submit`** son nativos
  y burbujean por sí solos. Reenvíalos con un `iswc-*` solo si añades
  `detail` útil (p.ej. `validationMessage` en `iswc-invalid`).
- Si reenvías un evento nativo, **no** lo clones: re-emite con
  `emit(this, 'iswc-focus', { originalEvent: e })` y deja que el
  consumidor lea `event.detail.originalEvent` si quiere el nativo.

### Documentación

```md
### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-focus` | `{ originalEvent: FocusEvent }` | sí | sí | no |
| `iswc-blur`  | `{ originalEvent: FocusEvent }` | sí | sí | no |
| `iswc-click` | `{ originalEvent: MouseEvent }` | sí | sí | no |
| `iswc-before-hide` | — | sí | sí | sí |
| `iswc-hide` | — | sí | sí | no |
```

## 5. Trampas

- **No** leas `this.getAttribute('foo')` en el constructor: el atributo
  puede no estar. Lee en `onConnected`.
- **No** uses `el.setAttribute('disabled', false)`: eso escribe
  `disabled="false"`, que sigue siendo presencia ⇒ `true`. Usa
  `el.removeAttribute('disabled')`.
- **No** expongas una propiedad que no esté documentada en el `.md`:
  es API pública.
- **No** declares un custom event con `composed: false` "porque es
  interno": casi siempre es un error. Si es interno, no lo emitas
  fuera del shadow.
- **No** mezcles `name`/`value` en el host con `name`/`value` en el
  inner sin propagar: el form-associated real vive en el inner, y si
  no propagas, el form no recibe el valor.

## 6. Checklist

- [ ] `observedAttributes` coincide con la columna "Atributos
      observados" del `.md`.
- [ ] Booleanos: presencia ⇒ `true`. Sin `attr="false"`.
- [ ] Enums: constante compartida + normalización en getter/setter +
      defensa en `onAttributeChanged`.
- [ ] Números: `Number.isFinite` antes de aceptar.
- [ ] URLs: `new URL(...)` con filtro de esquema.
- [ ] Payloads complejos: solo vía propiedad JS.
- [ ] Custom events `iswc-*` con `composed: true`, `bubbles: true`.
- [ ] Custom events cancelables: respeta `preventDefault()`.
- [ ] Tablas "Atributos y propiedades", "Eventos" en el `.md`.
