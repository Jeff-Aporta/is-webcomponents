<!-- @vendor 2026-10-14T14:46:42.343Z Jeff-Aporta/is-webcomponents@main skills/build-component/references/states.md -->
# States

Cómo exponer **custom states** (`ElementInternals.states`, selector
`:state(nombre)`) desde un componente del kit, y cómo documentarlos en el `.md`.

## 1. `this.estado(nombre, activo)`

`IswcReactive` (`core/iswc-reactive.ts`) trae el método:

- Con `CustomStateSet` disponible: `internals.states.add/delete(nombre)`.
- Sin él (webviews viejos, motores sin la API): cae al respaldo
  `[data-nombre]` en el host (`toggleAttribute('data-<nombre>', activo)`).
- `this.internals` es perezoso: un `attachInternals` por elemento, `null` si
  el motor no lo admite. Nada de `attachInternals` a mano ni de
  `setCustomState` (el módulo `core/form-associated` ya no existe).

El sitio natural es `actualizado(cambios)`, que corre tras cada pintado con
los valores ya actualizados:

```ts
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive, prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import css from 'iswc:css';

class IswcFoo extends IswcReactive {
  static tag = 'iswc-foo';
  static css = css;
  static shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };
  @prop({ type: 'bool' }) accessor loading = false;
  @prop() accessor href = '';

  override actualizado(): void {
    this.estado('loading', this.loading);
    this.estado('link', !!this.href);
  }
}
define(IswcFoo);
```

Los controles de formulario heredan de `IswcFormControl` los estados
`user-invalid`, `user-valid` (solo tras interactuar), `required`, `optional`,
`disabled` y `readonly`: no los repitas. Los componentes que siguen en el molde
`IswcElement` por peso (`iswc-button`) llevan sus `internals` y su propio
`estado` equivalente.

## 2. Nombres

- **kebab-case**, igual que los custom attributes del HTML.
- Longitud máxima recomendada: 24 caracteres.
- Sin prefijo `is-` ni `iswc-`: ya estás dentro de un `<iswc-foo>`, el
  namespace se sobreentiende.
- Un state con el **mismo nombre que un atributo** (`loading`) debe
  significar lo mismo; si difiere, documéntalo en "Errores comunes".

Bien: `loading`, `icon-button`, `without-line`, `selected`, `expanded`.
Mal: `isLoading` (camelCase), `iswc_loading` / `iswc-loading` (prefijo del kit).

## 3. Enums como múltiples states

Si una propiedad es una **enum** (`shape="round|rect|pill"`), una opción
común es exponer un state por valor:

```ts
const SHAPES = ['round', 'rect', 'pill'] as const;

@prop({ enum: SHAPES }) accessor shape = 'round';

override actualizado(): void {
  for (const v of SHAPES) this.estado(v, v === this.shape);
}
```

CSS:

```css
:host(:state(round)) .foo { border-radius: var(--iswc-foo-radius-round); }
:host(:state(rect)) .foo  { border-radius: 0; }
:host(:state(pill)) .foo  { border-radius: 999em; }
```

## 4. Respaldo `[data-nombre]`

Si el componente debe verse bien en motores sin `CustomStateSet`, el CSS
cubre **ambos** selectores:

```css
:host(:state(loading)),
:host([data-loading]) {
  pointer-events: none;
  opacity: 0.6;
}
```

Ojo: el respaldo comparte espacio de nombres con los `data-*` del
consumidor; no uses un state cuyo `data-*` choque con uno documentado.

## 5. Tabla "Custom states" en el `.md`

```md
### Custom states

| Estado | Uso |
| --- | --- |
| `:state(loading)` | Mientras dura una operación asíncrona. `aria-busy="true"`. Respaldo `[data-loading]`. |
| `:state(disabled)` | Refleja `disabled`. Saca del recorrido de tab. |
| `:state(icon-button)` | El slot default está vacío y solo hay icono. Ajusta padding. |
| `:state(link)` | Hay `href` (renderiza `<a>` en vez de `<button>`). |
```

Si el state **no** se consume en CSS (es solo para tests o lógica
interna), no lo expongas: reduce la API pública y evita acoplamiento.

## 6. Tests

Necesitan un navegador real (`:state()` no existe en Deno): página de casos
en `tests/_shared/paginas/` corrida por `correrCasos()` (modelo:
`tests/navegador/core-f8.test.ts`). Cubre al menos:

1. `el.matches(':state(loading)')` es `true` con la propiedad activa y
   `false` al quitarla, **después** de `await el.actualizacionCompleta`.
2. Para enums: solo el state del valor activo es `true`.

```ts
// tests/_shared/paginas/foo.ts — cada caso devuelve true o el motivo
export async function estadoLoading(): Promise<true | string> {
  const el = document.createElement('iswc-foo') as IswcFoo;
  document.body.append(el);
  el.loading = true;
  await el.actualizacionCompleta;
  if (!el.matches(':state(loading)')) return 'falta :state(loading)';
  el.removeAttribute('loading');
  await el.actualizacionCompleta;
  return el.matches(':state(loading)') ? 'sigue :state(loading)' : true;
}
```

## 7. Trampas

- **No** uses `this.dataset.loading = 'true'` como atajo: el respaldo lo
  pone `estado()`; mezclar nombres rompe selectores.
- **No** declares states **inmutables** (que nunca se quitan): van como
  clases CSS fijas en la plantilla.
- **No** leas `:state()` justo después de escribir la propiedad: el
  pintado (y `actualizado`) va por microtarea.
- **No** confundas `el.ariaHidden` con el atributo `aria-hidden`: ponlo
  en la plantilla.

## 8. Checklist

- [ ] Cada state se activa/desactiva con `this.estado(nombre, bool)` en
      `actualizado()`.
- [ ] Nombres en kebab-case, sin prefijos del kit.
- [ ] Si importa el respaldo, el CSS cubre `:state(x)` y `[data-x]`.
- [ ] Tabla "Custom states" en el `.md` con la columna "Uso".
- [ ] Caso de navegador que cubre al menos el toggle propiedad → state.
