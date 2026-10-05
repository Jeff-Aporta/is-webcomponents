# Accesibilidad

Cómo hacer que un componente del kit sea accesible: semántica,
teclado, foco, ARIA, focus management, contraste. Esta guía aplica a
todo `iswc-*` y se complementa con
[`AGENTS.md §6.7`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/AGENTS.md)
(reglas duras) y la sección "Accesibilidad" del `.md` del componente.

## 1. Semántica primero

- **Usa el elemento HTML correcto dentro del Shadow DOM**:
  - `<button>` para acciones (no `<div role="button">`).
  - `<a href>` para navegación (no `<div role="link">`).
  - `<input type="text|number|…">` para captura (no `<div contenteditable>`).
  - `<dialog>` para modales nativos cuando aplique; en el kit se
    prefiere `<iswc-dialog>` con focus management propio.
  - `<select>` + `<iswc-option>` (custom) o `<iswc-combobox>`.
- El **role** lo tiene el inner, no el host. Reenvía los `aria-*` que
  apliquen al inner, **no** los pongas solo en el host.
- **No** cambies la semántica implícita. Si un `<button>` debe ser
  un link, sustituye el inner por un `<a>` (como hace
  `<iswc-button>` con `href`).

## 2. Foco

### `delegatesFocus: true`

```ts
this.attachShadow({ mode: 'open', delegatesFocus: true });
```

`delegatesFocus: true` hace que el navegador delegue el foco al primer
elemento focuseable del shadow cuando el host recibe foco, y que el
`:focus` visible se pinte **en el primer focuseable**, no en el host.

Recomendado para todo componente interactivo. Para contenedores no
interactivos (cards, callouts, layouts), déjalo en `false`.

### Orden de tabulación

- **No** pongas `tabindex` en el host "para arreglar el orden". El
  orden de tab lo define el inner (el `<button>`, `<a>`, `<input>`).
- Si necesitas sacar el control del recorrido mientras está
  deshabilitado, pon `tabindex="-1"` en el inner (no en el host).
- Si un consumidor quiere que **el host** sea el control accesible (p.ej.
  `<iswc-check-icon-button>` envuelve `<iswc-button>`), propaga el
  `tabindex` del host al inner. Sin esto, hay dos paradas de tab.

```ts
#syncDisabled() {
  const disabled = this.hasAttribute('disabled');
  this.#btn.setAttribute('tabindex', disabled ? '-1' : (this.getAttribute('tabindex') ?? null));
}
```

### `:focus-visible`

- **No** uses `:focus` para el anillo de foco (se ve al hacer click).
- Usa `:focus-visible` para que el anillo solo aparezca con teclado.
- Tokeniza el color: `outline: 2px solid var(--iswc-focus, var(--iswc-color-brand, dodgerblue));`.

```css
.foo:focus-visible {
  outline: 2px solid var(--iswc-focus, var(--iswc-color-brand, dodgerblue));
  outline-offset: 2px;
}
```

## 3. Teclado

### Reglas por componente

| Componente | Teclas | Comportamiento |
| --- | --- | --- |
| `<iswc-button>`, `<iswc-icon-button>` | `Enter`, `Space` | Activan la acción. |
| `<iswc-input>`, `<iswc-textarea>` | Todo | Comportamiento nativo. |
| `<iswc-checkbox>` | `Space` | Alterna checked. |
| `<iswc-radio-group>` | `Arrow*`, `Space` | Mueve selección; `Space` activa. |
| `<iswc-switch>` | `Space`, `Enter` | Alterna. |
| `<iswc-select>`, `<iswc-combobox>` | `Enter`, `Space`, `Arrow*`, `Home`, `End`, `Esc` | Abre/cierra y navega. |
| `<iswc-tab-group>` | `Arrow*`, `Home`, `End` | Cambia tab activo. |
| `<iswc-dialog>`, `<iswc-drawer>` | `Esc` | Cierra. `Tab` cicla dentro del modal. |
| `<iswc-tree>`, `<iswc-tree-item>` | `Arrow*`, `Home`, `End`, `Enter` | Navega y expande/colapsa. |
| `<iswc-tooltip>`, `<iswc-popover>` | `Esc` | Cierra. |

Documenta los atajos en la sección "Comportamiento" del `.md` y en
"Reglas para LLM".

### Patrón: keydown handler

```ts
#onKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      this.#move(+1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      this.#move(-1);
      break;
    case 'Home':
      e.preventDefault();
      this.#moveTo(0);
      break;
    case 'End':
      e.preventDefault();
      this.#moveToLast();
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      this.#activate();
      break;
    case 'Escape':
      if (this.open) { this.open = false; e.stopPropagation(); }
      break;
  }
};
```

Reglas:

- `e.preventDefault()` para teclas que tú gestionas (flechas,
  `Space` cuando es toggle).
- **No** captures teclas que ya gestiona el navegador (Tab, Shift+Tab).
- `Escape` debe **propagarse** al documento si es global, pero **no**
  debe cerrar un modal cuando el foco está en un sub-modal.
- Si el componente es un input, **no** instales un `keydown` global:
  solo en el inner.

## 4. ARIA

### Cuándo usar ARIA

ARIA es **complemento** de la semántica, no sustituto. Orden de
prioridad:

1. Elemento HTML nativo correcto (`<button>`, `<a>`, `<input>`).
2. Atributos HTML estándar (`type`, `role`, `tabindex`).
3. ARIA (`aria-label`, `aria-pressed`, `aria-expanded`, …).
4. JavaScript (focus management, eventos custom).

### Atributos que **siempre** se reenvían al inner

| Atributo | Cuándo |
| --- | --- |
| `aria-label` | Cuando el contenido del slot no es texto (icon-only). |
| `aria-labelledby` | Cuando el label es externo y tiene id. |
| `aria-describedby` | Para hints y errores. |
| `aria-pressed` | Toggle (button, switch). |
| `aria-expanded` | Disclosure (accordion, dropdown). |
| `aria-haspopup` | Trigger de menu/dialog/listbox. |
| `aria-current` | Navegación activa (breadcrumb, tab). |
| `aria-controls` | Trigger de un panel relacionado. |
| `aria-disabled` | Visible pero no interactivo. |
| `aria-busy` | Cargando. |
| `aria-live` | Region que anuncia cambios (polite/assertive). |

Patrón:

```ts
const ARIA_FORWARD = [
  'aria-label', 'aria-labelledby', 'aria-describedby',
  'aria-pressed', 'aria-expanded', 'aria-haspopup',
  'aria-current', 'aria-controls', 'aria-busy', 'aria-disabled',
];

onAttributeChanged(name: string) {
  if (ARIA_FORWARD.includes(name)) {
    const v = this.getAttribute(name);
    if (v == null) this.#btn.removeAttribute(name);
    else this.#btn.setAttribute(name, v);
  }
}
```

### Cuándo **no** añadir ARIA

- `role="button"` sobre un `<button>` → **no** necesario.
- `aria-label` cuando ya hay texto visible → confunde al screen
  reader. Si el texto cambia, deja que el screen reader lo lea.
- `aria-hidden="true"` en un nodo que tiene contenido interactivo →
  **nunca**.

## 5. Form-associated

Si el componente es form-associated (ver
[`lifecycle.md`](lifecycle.md#4-form-associated-custom-elements)):

- `name` y `value` deben funcionar como en un `<input>` nativo.
- `disabled` y `readonly` se respetan.
- `required` activa la validación nativa.
- `aria-invalid` se aplica al inner.
- `aria-describedby` puede apuntar a un nodo externo (hint) o a un
  nodo interno (error-text) que vive en el Shadow DOM. Para
  externos, propaga el id al inner; para internos, mantén el
  `ElementInternals` o usa `aria-describedby` con un id del light
  DOM.

## 6. Focus management en modales

Modal = `<iswc-dialog>`, `<iswc-drawer>`, `<iswc-popconfirm>`,
`<iswc-command-palette>`, `<iswc-window>`, `<iswc-pdf-viewer>`, etc.

Reglas:

1. **Al abrir**:
   - Guarda el `document.activeElement` en un `#lastFocus`.
   - Mueve el foco al primer focuseable del modal (o al indicado
     por `autofocus`).
   - Marca el resto del documento con `inert` o `aria-hidden="true"`
     (no `display: none`, que rompe la transición).
2. **Mientras está abierto**:
   - Trapea `Tab` y `Shift+Tab` para que no salga del modal.
   - `Escape` cierra (cancelable con `iswc-before-hide`).
   - Click fuera (si `light-dismiss`) cierra.
3. **Al cerrar**:
   - Devuelve el foco a `#lastFocus`.
   - Quita `inert` / `aria-hidden` del documento.

El kit tiene [`ModalBase`](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/_shared/modal-base.ts)
que ya gestiona todo esto. **Úsalo** en vez de reimplementar.

```ts
import { ModalBase } from '../_shared/modal-base.js';

class IswcDialog extends ModalBase {
  static __TEMPLATE = TEMPLATE;
  get modalClass() { return '.dialog'; }
  get closeAttr()  { return 'data-dialog'; }
  #animateOpen()  { /* dialog-specific keyframes */ }
  #animateClose() { /* dialog-specific keyframes */ }
}
```

## 7. Live regions (anuncios)

Para anunciar cambios dinámicos (loading, error, éxito), usa una
region `aria-live` con `aria-atomic="true"`:

```html
<span class="btn__sr-status" part="sr-status" aria-live="polite" aria-atomic="true"></span>
```

```ts
const sr = this.shadowRoot?.querySelector('.btn__sr-status');
if (sr) sr.textContent = loading ? 'Cargando' : 'Listo';
```

- `aria-live="polite"` para cambios no urgentes (cargando, listo).
- `aria-live="assertive"` solo para errores críticos.
- **No** uses `aria-live` para mensajes decorativos: confunde al
  screen reader.

## 8. Contraste y tema

- Tokens `--iswc-*` ya están calibrados para **WCAG AA** en light y
  dark.
- **No** declares colores en el componente que rompan el contraste.
  Si necesitas un color nuevo, añádelo a `is-base.css` o a la
  paleta y deja que el sistema lo calibre.
- El icono debe tener un color heredable (`currentColor` o
  `fill="currentColor"`). `<iswc-icon>` ya lo normaliza con
  `#normalizeInlineSvg()`. Si usas otro icono, asegúrate.

## 9. Tests

Un test mínimo de a11y:

```ts
test('iswc-foo: keyboard activation', async () => {
  await customElements.whenDefined('iswc-foo');
  const el = document.createElement('iswc-foo');
  document.body.appendChild(el);
  el.focus();
  assert.equal(document.activeElement, el);
  // Simula Enter
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  // Verifica que el evento se emitió
  let clicked = false;
  el.addEventListener('iswc-click', () => { clicked = true; });
  // ... y que la acción se ejecutó
  document.body.removeChild(el);
});

test('iswc-foo: aria-label is forwarded', async () => {
  await customElements.whenDefined('iswc-foo');
  const el = document.createElement('iswc-foo');
  el.setAttribute('aria-label', 'Cerrar');
  document.body.appendChild(el);
  const inner = el.shadowRoot!.querySelector('[role]')!;
  assert.equal(inner.getAttribute('aria-label'), 'Cerrar');
  document.body.removeChild(el);
});
```

## 10. Trampas

- **No** uses `tabindex="0"` en el host. El foco se delega al inner
  con `delegatesFocus: true`.
- **No** pongas `role="button"` sobre un `<button>`: redundante y
  confunde.
- **No** añadas `aria-label` cuando el contenido del slot es texto:
  el screen reader ya lo lee.
- **No** cierres un modal con click fuera sin avisar al consumidor:
  expone `iswc-before-hide` cancelable.
- **No** uses `inert` o `display: none` en el host: rompe la
  transición y el foco no llega.
- **No** asumas que el navegador maneja ARIA: hay diferencias entre
  Safari, Firefox y Chrome. Lo más portable es **delegar al inner**
  y dejar que el navegador haga su trabajo.

## 11. Checklist

- [ ] Elemento HTML nativo correcto dentro del Shadow DOM.
- [ ] `attachShadow({ mode: 'open', delegatesFocus: true })`.
- [ ] `:focus-visible` con token `--iswc-focus`.
- [ ] Atajos de teclado documentados en "Comportamiento" del `.md`.
- [ ] `aria-*` reenviados al inner que tiene el role real.
- [ ] Modales heredan de `ModalBase`.
- [ ] Live region para cambios dinámicos.
- [ ] Test mínimo de activación por teclado y reenvío de ARIA.
