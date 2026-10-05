# Parts & Slots

Cómo exponer **CSS parts** y declarar **slots semánticos** en un
componente del kit, y cómo documentarlos en el `.md`.

## 1. CSS parts

`part="..."` se aplica a nodos del Shadow DOM y permite al consumidor
estilizar el interior desde fuera **sin** tener que abrir el shadow
(lo cual es imposible con Shadow DOM cerrado).

### Cuándo exponer un part

- El contenedor raíz: casi siempre (`part="root"` o `part="button"`).
- Cada slot visible: `part="label"`, `part="start"`, `part="end"`,
  `part="header"`, `part="footer"`, `part="body"`, `part="actions"`.
- Cada elemento interactivo que pueda ser personalizado:
  `part="caret"`, `part="spinner"`, `part="close-button"`,
  `part="backdrop"`.
- Elementos puramente decorativos: **no** expongas un part (ruido).

### Nombres

- **kebab-case**, igual que los atributos HTML.
- Sin prefijo del kit (`iswc-`): ya estás dentro de un `<iswc-foo>`.
- Evitar nombres genéricos: `part="wrapper"`, `part="container"`.
  Prefiere `part="root"` o el nombre del elemento.
- Si el componente **es** un wrapper de un elemento nativo
  (`<iswc-button>` envuelve un `<button>` interno), expón
  `part="button"` para que el consumidor pueda estilizarlo como si
  fuera el nativo.

### Patrón

```ts
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <button part="button" class="btn" type="button">
    <span part="start"   class="btn__prefix"><slot name="start"></slot></span>
    <span part="label"   class="btn__label"><slot></slot></span>
    <span part="end"     class="btn__suffix"><slot name="end"></slot></span>
    <span part="caret"   class="btn__caret"   aria-hidden="true">
      <iswc-icon icon="mdi:chevron-down"></iswc-icon>
    </span>
    <span part="spinner" class="btn__spinner" aria-hidden="true">
      <iswc-icon icon="mdi:loading"></iswc-icon>
    </span>
  </button>
  <span class="btn__sr-status" part="sr-status" aria-live="polite" aria-atomic="true"></span>
`;
```

### Reglas

- `part="..."` puede repetirse: `part="label primary"` aplica dos parts
  a un mismo nodo (útil cuando quieres que el consumidor pueda
  seleccionar por categoría).
- `display: contents` **no** funciona en un nodo con `part`: el part
  queda inerte. Si necesitas que el nodo "no ocupe espacio en el
  layout", usa `display: block; height: 0; overflow: hidden;` o mueve
  el `part` a un hijo.
- **No** apliques `::part()` dentro de `:host { … }` con anidamiento
  profundo: mantenlos al nivel superior del CSS. Anidarlos causa
  errores de parseo en algunos bundlers (esbuild se queja con
  `:state(...)` dentro de `:host { ... }`).
- **No** expongas un part si no lo usas en la documentación ni en
  ningún consumer del kit.

### Documentación

```md
### CSS parts

| Part | Uso |
| --- | --- |
| `button` | El `<button>` interno. Personalizable con `::part(button)`. |
| `start` | Wrapper del slot `start`. Personalizable con `::part(start)`. |
| `label` | Wrapper del slot por defecto. Personalizable con `::part(label)`. |
| `end` | Wrapper del slot `end`. Personalizable con `::part(end)`. |
| `caret` | Chevron que aparece con `with-caret`. Personalizable con `::part(caret)`. |
| `spinner` | Spinner que aparece con `loading`. Personalizable con `::part(spinner)`. |
| `sr-status` | Region `aria-live` para anunciar estados a screen readers. Personalizable con `::part(sr-status)`. |
```

## 2. Slots

Los slots definen **qué contenido del consumidor entra al Shadow DOM**
del componente. La regla de oro: nombres **semánticos** y comportamiento
de fallback bien definido.

### Nombres canónicos

| Slot | Cuándo usarlo |
| --- | --- |
| `default` (sin nombre) | Contenido principal. Siempre presente. |
| `start` / `end` | Iconos/elementos antes/después del contenido principal. |
| `header` / `footer` | Cabecera/pie de un contenedor (card, dialog, drawer). |
| `label` | Etiqueta principal de un control (checkbox, switch, radio). |
| `icon` | Cuando hay **un** icono central (rating, rating-star). |
| `prefix` / `suffix` | Alternativa a start/end en algunos componentes legacy. |
| `body` | Contenido scrolleable principal de un modal/drawer. |
| `actions` | Botones de acción al pie de un modal/drawer/form. |
| `media` | Imagen/video de un card. |
| `panel` | Hijos tipados de un contenedor (tab-panel, stepper-step). |

**No** inventes nombres crípticos (`slot1`, `topThing`). El extractor
del `.md` no los reconocerá.

### Default slot

```ts
TEMPLATE.innerHTML = /* html */ `
  <div part="root" class="foo">
    <slot>Contenido por defecto</slot>
  </div>
`;
```

El contenido entre `<slot>…</slot>` es el **fallback** que se muestra
cuando el consumidor no proyecta nada. Si no quieres fallback, deja el
slot vacío.

### Slots con nombre

```ts
TEMPLATE.innerHTML = /* html */ `
  <div part="root" class="card">
    <header part="header"><slot name="header">Sin título</slot></header>
    <div part="body"><slot></slot></div>
    <footer part="footer"><slot name="actions"></slot></footer>
  </div>
`;
```

Consumidor:

```html
<iswc-card>
  <span slot="header">Mi título</span>
  Contenido principal del card.
  <iswc-button slot="actions">Cerrar</iswc-button>
</iswc-card>
```

### Slot detection (icon-only, label-only, etc.)

Si un slot debe cambiar el comportamiento del componente según tenga
contenido o no, escucha el evento `slotchange`:

```ts
constructor() {
  super();
  this.initShadow({ mode: 'open', delegatesFocus: true });
  this.shadowRoot!.querySelectorAll<HTMLSlotElement>('slot').forEach(slot => {
    slot.addEventListener('slotchange', () => this.#updateIconOnly());
  });
}

#updateIconOnly() {
  const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot:not([name])');
  const nodes = slot?.assignedNodes({ flatten: true }) ?? [];
  const isIconOnly =
    nodes.length === 1 && nodes[0].nodeType === 1; // único elemento hijo
  setCustomState(this.#internals, 'icon-button', isIconOnly);
}
```

### Reglas

- **No** proyectes el mismo nodo a dos slots. Si necesitas duplicar
  contenido, clónalo a mano en el light DOM del consumidor.
- **No** declares un slot con nombre y no lo expongas en la tabla
  "Slots" del `.md`.
- Si un slot **debe** existir para que el componente funcione
  (p.ej. `<iswc-tab-group>` necesita `<iswc-tab-panel slot="panel">`),
  documéntalo en "Errores comunes" y, si es posible, detecta el caso y
  lanza un warning en consola.
- Si el slot está vacío pero el componente tiene fallback útil
  (placeholder, mensaje, ejemplo), ponlo entre `<slot>…</slot>` y
  estilízalo con `:slotted(*:not([slot]))` o `::slotted(*)`.

### Documentación

```md
### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido principal del card. Sin nombre. |
| `header` | Cabecera. Default: texto "Sin título". |
| `actions` | Botones de acción al pie. Default vacío. |
```

## 3. `:slotted()` y selectores cruzando el shadow

CSS en el shadow puede estilizar el contenido proyectado con
`:slotted(selector)`. Reglas:

- Solo funciona en selectores de **un nivel**: `:slotted(iswc-button)`,
  no `:slotted(iswc-button foo)`.
- Para hijos de hijos, hay que delegar al componente hijo (que también
  tiene su propio shadow).
- **No** uses `:slotted(*)` para "estilizar cualquier cosa": limita
  el alcance. Prefiere selectores específicos
  (`:slotted(iswc-icon)`, `:slotted(.primary)`).

## 4. Trampas

- **No** expongas `part="root"` y `part="wrapper"` a la vez. Un solo
  part raíz.
- **No** olvides que `<slot>` y sus `assignedNodes` cambian con el
  `slotchange`: si cacheas referencias, se invalidan al reordenar el
  light DOM.
- **No** anides `<slot>` dentro de otro `<slot>`. Solo se proyecta
  contra el slot del componente padre, no contra los slots anidados.
- **No** proyectes un `<template>` o un `<script>` por slot: el
  navegador no los ejecuta, solo los mueve.

## 5. Checklist

- [ ] `part="..."` en el contenedor raíz y cada slot.
- [ ] Nombres en kebab-case, sin prefijo del kit.
- [ ] Slots con nombre **semánticos** (`start`, `end`, `header`,
      `footer`, `label`, etc.).
- [ ] Slots con fallback si aplica, o vacío si no.
- [ ] `slotchange` escuchado para detectar contenido dinámico.
- [ ] Tablas "CSS parts" y "Slots" en el `.md`.
- [ ] Test que verifica que el contenido proyectado aparece en el
      light DOM del host.
