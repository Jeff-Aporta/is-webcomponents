<!-- @vendor 2026-10-13T14:13:48.240Z Jeff-Aporta/is-webcomponents@main skills/build-component/references/props-events.md -->
# Props & Events

Cómo declarar **propiedades reactivas** (con su atributo), **textos de
interfaz** y **eventos custom** en un componente del kit, y cómo
documentarlos en el `.md`. Todo sobre `IswcReactive`
([`core/iswc-reactive.ts`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/iswc-reactive.ts)).

## 1. Atributos vs propiedades

| Característica | Atributo HTML | Propiedad JS |
| --- | --- | --- |
| Fuente de verdad | Sí (serializable, parseable) | Refleja al atributo |
| Aparece en `el.outerHTML` | Sí | No |
| Puede ser un objeto/complex | No (siempre string) | Sí |
| Lo que el servidor serializa | Atributo | Atributo (si se refleja) |
| Lo que el JS asigna en caliente | Atributo | Propiedad |

Las dos caras se declaran **una vez** con `@prop`: el decorador crea el par
get/set, el atributo (kebab-case del nombre), la conversión de tipo, el
reflejo y el repintado. **Nunca** un par get/set que lee y escribe el atributo
a mano, ni el atributo repetido en `static observed` (los dos los vigila
`tests/gobernanza/reactivo.test.ts`).

```ts
import { IswcReactive, prop, state, watch } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';

class IswcFoo extends IswcReactive {
  static override tag = 'iswc-foo';
  @prop() accessor label = '';                                  // texto ↔ `label`
  @prop({ enum: FOO_VARIANT }) accessor variant: FooVariant = 'filled';
  @prop({ type: 'bool' }) accessor disabled = false;            // presencia
  @prop({ type: 'num' }) accessor max: number | null = null;
  @prop({ attr: 'prefix' }) accessor prefixText = '';           // otro nombre de atributo
  @prop({ reflect: false }) accessor filtro = '';               // lee el atributo, no lo escribe
  @prop({ vacio: true }) accessor hint = '';                    // `hint=""` tiene significado
  @state() accessor abierto = false;                            // interno, sin atributo

  @watch('variant')
  alCambiarVariante(antes: FooVariant, ahora: FooVariant) { /* antes de pintar */ }
}
```

Semántica: el valor inicial del campo es el defecto; escribir `null` o
`undefined` quita el atributo y vuelve al defecto; el texto vacío cuenta
como ausente salvo `vacio: true`. Lo escrito antes del upgrade lo recoge el
molde.

## 2. Tipos

### Booleanos

`@prop({ type: 'bool' })`: presencia ⇒ `true`. **Nunca** `attr="false"`.

### Enums

Constante compartida y `enum`: fuera de la lista ⇒ el defecto, sin throw y
sin reescribir el atributo a mano.

```ts
export const FOO_VARIANT = ['filled', 'outlined', 'plain'] as const;   // o INTENT / TONE de core/attrs
@prop({ enum: FOO_VARIANT }) accessor variant: FooVariant = 'filled';
```

Normalizaciones que no son una lista (alias, `normalizeIntent`): un getter
derivado o un `@watch`, nunca un setter que reescribe el atributo.

### Números

`@prop({ type: 'num' })`: `Number(...)` con `Number.isFinite`; vacío o
inválido ⇒ el defecto. Si el rango importa (0–360), acótalo al usarlo
(`render()`, `@watch`), no reescribiendo el atributo.

### URLs (href, src)

`@prop() accessor href = ''` y valida al **usarla**: en `render()` pasa por
`new URL(v, this.baseURI)` y filtra `javascript:` y otros esquemas
peligrosos antes de ponerla en el `<a>` interno.

### Payloads complejos (objetos, arrays)

**No** serialices objetos grandes en atributos. Propiedad sin atributo:

```ts
@prop({ attr: false, type: 'json' }) accessor data: unknown[] = [];
```

Con `type: 'json'` y atributo, el atributo se parsea con `JSON.parse` (útil
para configuraciones pequeñas en HTML). Si las props son un objeto validado
con Zod, la base es `PropsElement`.

## 3. Propiedades públicas vs privadas

| Visibilidad | Convención | Notas |
| --- | --- | --- |
| Pública (API) | `@prop` / getter de solo lectura | Documentada en el `.md`. |
| Estado interno que repinta | `@state()` | No es API. |
| Privada de clase | `#foo` (campos privados TS) | Solo dentro de la clase. |
| Estilo de atributo | `static styleAttrs` | Map atributo → CSS var. |

Reglas:

- **No** expongas `get _internals`, `get _shadowRoot` ni nada
  internable como público: rompe la encapsulación.
- **No** declares una propiedad `get isFoo()` para algo que ya tiene
  un atributo: el kit usa el atributo.
- **No** mezcles `size=...` y `pgSize=...` (legacy). Decide un nombre y
  mantenlo.

## 4. Textos de interfaz (`t()`)

Etiquetas, `aria-label`, mensajes y placeholders por defecto salen de
`this.t('clave', ...args)` en el idioma heredado (`lang` propio, de un
ancestro —cruzando shadows—, del documento o del navegador; base `es`):

```ts
import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';

registrarTerminos('es', { quitarFiltro: 'Quitar filtro', resultados: (n: number) => `${n} resultados` });

render() {
  return html`<button aria-label=${this.t('quitarFiltro')}>×</button><span>${this.t('resultados', this.total)}</span>`;
}
```

- Claves en camelCase español; función cuando hay plural o interpolación.
- Los términos comunes (`cerrar`, `limpiar`, `cargando`, `campoObligatorio`,
  `buscar`, `sinResultados`…) ya están en `core/localize.ts`: no los
  repitas.
- Cada término propio lleva su traducción en `src/core/i18n/en.ts` (lo
  verifica `tests/navegador/textos-f8.test.ts`).
- Un atributo del consumidor (`label`, `placeholder`) sigue mandando sobre
  el texto por defecto.
- Cambiar `lang` repinta solo los componentes que usan `t()`.

## 5. Eventos custom

Convención del kit: `iswc-<nombre>` (kebab-case), `composed: true`,
`bubbles: true` (salvo casos justificados). Se emiten con `this.emit` (o
`emit` / `emitCancelable` de
[`core/iswc-element.ts`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/iswc-element.ts)).

### Declarar el tipo (obligatorio)

Cada componente declara sus eventos en un tipo de una línea en
`schemas/<tag>.schemas.ts` y lo enlaza en la clase (campo `declare`: cero
bytes en runtime):

```ts
// schemas/foo.schemas.ts
export type FooEventos = { 'iswc-click': { originalEvent: MouseEvent }; 'iswc-before-hide': void; 'iswc-hide': void };

// foo.ts
import type { FooEventos } from './schemas/foo.schemas.js';
class IswcFoo extends IswcReactive {
  declare static events: FooEventos;
}
```

Si la base ya emite eventos, súmalos: `IswcFormControlEventos & { … }`
(`iswc-invalid`), `ModalBaseEventos` (dialog, drawer). Todo `iswc-*` emitido
debe estar declarado y todo lo declarado debe emitirse
(`tests/gobernanza/eventos.test.ts`).

### `composed: true` siempre (casi)

Un evento con `composed: false` **no cruza el Shadow DOM**: un consumidor
que escucha sobre el host desde fuera de un shadow ancestro no lo recibe.
Excepciones documentadas (raras): `iswc-hide` de `<iswc-tooltip>` no
burbujea para no cerrar al diálogo ancestro.

### `cancelable: true` cuando aplique

Si un consumidor puede `preventDefault()` para cancelar una acción
(antes de cerrar un dialog, antes de aplicar un cambio):

```ts
if (!emitCancelable(this, 'iswc-before-hide')) return;   // false = cancelado
// … cerrar
```

### Custom events vs nativos

- **`focus`, `blur`, `click`, `input`, `change`, `submit`** son nativos
  y burbujean por sí solos. Reenvíalos con un `iswc-*` solo si añades
  `detail` útil (p.ej. `{ value }` en `iswc-change`).

### Documentación

La tabla «Eventos» del `.md` y el campo `events` de la ficha `.json` **no se
escriben a mano**: los genera la sonda `scripts/sondas/eventos.ts` desde
`declare static events` (`deno run -A --no-check scripts/sondas/eventos.ts`;
`--comprobar` solo informa lo desfasado).

## 6. Trampas

- **No** leas `this.getAttribute('foo')` en el constructor: el atributo
  puede no estar. Los `@prop` ya tienen el valor en el primer `render()`.
- **No** uses `el.setAttribute('disabled', false)`: escribe
  `disabled="false"`, que sigue siendo presencia ⇒ `true`. Usa
  `el.disabled = false` o `el.removeAttribute('disabled')`.
- **No** expongas una propiedad que no esté documentada en el `.md`:
  es API pública.
- **No** leas el shadow justo después de escribir una propiedad: el
  repintado va por microtarea (`await el.actualizacionCompleta`).
- **No** mezcles `name`/`value` en el host con `name`/`value` en el
  inner sin propagar: en controles de formulario usa `IswcFormControl`.

## 7. Checklist

- [ ] Propiedades con `@prop` (tipo, `enum`, `attr`), estado con `@state`.
- [ ] Ningún setter que refleja a mano ni atributo repetido en `static observed`.
- [ ] Booleanos: presencia ⇒ `true`. Sin `attr="false"`.
- [ ] URLs validadas al usarlas; payloads complejos sin atributo.
- [ ] Textos por `t()` con términos registrados y traducidos en `core/i18n/en.ts`.
- [ ] Eventos `iswc-*` en el tipo `XEventos` + `declare static events`,
      `composed: true`, `bubbles: true`; cancelables respetan `preventDefault()`.
- [ ] Sonda de eventos corrida; tabla "Atributos y propiedades" del `.md` al día.
