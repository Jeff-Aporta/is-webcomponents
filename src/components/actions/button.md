---
tag: iswc-button
tags:
  - iswc-button
category: actions
status: public
source: ./button.js
style: ./button.css
preview: ./button.json
---
# `<iswc-button>`

## Propósito

Componente InSoft accesible y personalizable, escrito con JavaScript nativo,
Shadow DOM y sin frameworks.

Este módulo registra `<iswc-button>`.

## Cuándo usarlo

Acciones, selección de comandos y menús interactivos.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './button.js';
```

## Ejemplo mínimo

```html
<iswc-button color="success">Aprobado</iswc-button>
<iswc-button color="danger" variant="outlined">Eliminar</iswc-button>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |
| `variant` | `filled` / `outlined` / `plain` / `ghost` / `soft` / `text` | Default `filled`. Ortogonal a `color`. |
| `shape` | `round` / `rect` / `pill` | Default `round`. Ortogonal a `color` y `variant`. |
| `hue` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `loading` | boolean | Fuente define default/restricción. |
| `pill` | boolean | Fuente define default/restricción. |
| `with-caret` | boolean | Fuente define default/restricción. |
| `href` | string/según contrato | Fuente define default/restricción. |
| `target` | string/según contrato | Fuente define default/restricción. |
| `rel` | string/según contrato | Fuente define default/restricción. |
| `download` | string/según contrato | Fuente define default/restricción. |
| `type` | string/según contrato | Fuente define default/restricción. |
| `title` | string/según contrato | Fuente define default/restricción. |
| `name` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `form` | string/según contrato | Fuente define default/restricción. |
| `formaction` | string/según contrato | Fuente define default/restricción. |
| `formenctype` | string/según contrato | Fuente define default/restricción. |
| `formmethod` | string/según contrato | Fuente define default/restricción. |
| `formnovalidate` | string/según contrato | Fuente define default/restricción. |
| `formtarget` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `hue` | lectura/escritura | Declarada por clase. |
| `shape` | lectura/escritura | Refleja el atributo `shape`. |
| `validity` | solo lectura | Declarada por clase. |
| `validationMessage` | solo lectura | Declarada por clase. |
| `willValidate` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `end` | Contenido proyectado. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-focus` | Emitido cuando el componente recibe foco. |
| `iswc-blur` | Emitido cuando el componente pierde foco. |
| `iswc-click` | Emitido al hacer clic sobre el componente. |
| `iswc-invalid` | Emitido cuando la validación de formulario falla. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-focus` | sí | sí | sí | no |
| `iswc-blur` | sí | sí | sí | no |
| `iswc-click` | sí | sí | sí | no |
| `iswc-invalid` | según cabecera | según cabecera | según cabecera | según cabecera |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-button');
el.addEventListener('iswc-focus', (e) => {
  console.log('iswc-focus', e.detail);
});
```

</details>

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `setFocus()` | Método público declarado. |
| `checkValidity()` | Método público declarado. |
| `reportValidity()` | Método público declarado. |
| `setCustomValidity()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `button` | Personalizable con `::part(button)`. |
| `start` | Personalizable con `::part(start)`. |
| `label` | Personalizable con `::part(label)`. |
| `end` | Personalizable con `::part(end)`. |
| `caret` | Personalizable con `::part(caret)`. |
| `spinner` | Personalizable con `::part(spinner)`. |
| `sr-status` | Region `aria-live` para anuncios a lectores de pantalla (oculta visualmente). |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(icon-button)` | Estado usado por implementación/CSS. |
| `:state(loading)` | Estado usado por implementación/CSS. |
| `:state(disabled)` | Estado usado por implementación/CSS. |
| `:state(link)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-accent` | Token leído o definido por componente. |
| `--iswc-button-font-family` | Token leído o definido por componente. |
| `--iswc-button-font-weight` | Token leído o definido por componente. |
| `--iswc-button-border-radius` | Token leído o definido por componente. |
| `--iswc-button-border-width` | Token leído o definido por componente. |
| `--iswc-button-transition-duration` | Token leído o definido por componente. |
| `--iswc-button-selected-hue` | Token leído o definido por componente. |
| `--iswc-button-selected-color` | Token leído o definido por componente. |
| `--iswc-color-success-50` | Token leído o definido por componente. |
| `--iswc-color-success-100` | Token leído o definido por componente. |
| `--iswc-color-success-500` | Token leído o definido por componente. |
| `--iswc-color-success-600` | Token leído o definido por componente. |
| `--iswc-color-success-700` | Token leído o definido por componente. |
| `--iswc-color-warning-50` | Token leído o definido por componente. |
| `--iswc-color-warning-100` | Token leído o definido por componente. |
| `--iswc-color-warning-500` | Token leído o definido por componente. |
| `--iswc-color-warning-600` | Token leído o definido por componente. |
| `--iswc-color-warning-700` | Token leído o definido por componente. |
| `--iswc-color-danger-50` | Token leído o definido por componente. |
| `--iswc-color-danger-100` | Token leído o definido por componente. |
| `--iswc-color-danger-500` | Token leído o definido por componente. |
| `--iswc-color-danger-600` | Token leído o definido por componente. |
| `--iswc-color-danger-700` | Token leído o definido por componente. |
| `--iswc-font-family` | Token leído o definido por componente. |
| `--_bg` | Token leído o definido por componente. |
| `--iswc-control-bg` | Token leído o definido por componente. |
| `--_bg-hover` | Token leído o definido por componente. |
| `--iswc-control-bg-hover` | Token leído o definido por componente. |
| `--_bg-active` | Token leído o definido por componente. |
| `--iswc-control-bg-active` | Token leído o definido por componente. |
| `--_border` | Token leído o definido por componente. |
| `--iswc-control-border` | Token leído o definido por componente. |
| `--_text` | Token leído o definido por componente. |
| `--iswc-control-text` | Token leído o definido por componente. |
| `--_focus` | Token leído o definido por componente. |
| `--iswc-focus` | Token leído o definido por componente. |
| `--iswc-color-brand-500` | Token leído o definido por componente. |
| `--_height` | Token leído o definido por componente. |
| `--_hpad` | Token leído o definido por componente. |
| `--_button-horizontal-indent` | Token leído o definido por componente. |
| `--_button-vertical-indent` | Token leído o definido por componente. |
| `--_button-start-start-radius` | Token leído o definido por componente. |
| `--_button-start-end-radius` | Token leído o definido por componente. |
| `--_button-end-start-radius` | Token leído o definido por componente. |
| `--_button-end-end-radius` | Token leído o definido por componente. |
| `--iswc-color-brand-600` | Token leído o definido por componente. |
| `--iswc-color-brand-700` | Token leído o definido por componente. |
| `--iswc-color-brand-800` | Token leído o definido por componente. |
| `--iswc-on-brand` | Token leído o definido por componente. |
| `--iswc-brand-soft` | Token leído o definido por componente. |
| `--iswc-color-brand-50` | Token leído o definido por componente. |
| `--iswc-brand-soft-active` | Token leído o definido por componente. |
| `--iswc-color-brand-100` | Token leído o definido por componente. |
| `--iswc-brand-text` | Token leído o definido por componente. |
| `--iswc-success-soft` | Token leído o definido por componente. |
| `--iswc-success-soft-active` | Token leído o definido por componente. |
| `--iswc-success-text` | Token leído o definido por componente. |
| `--iswc-warning-soft` | Token leído o definido por componente. |
| `--iswc-warning-soft-active` | Token leído o definido por componente. |
| `--iswc-warning-text` | Token leído o definido por componente. |
| `--iswc-danger-soft` | Token leído o definido por componente. |
| `--iswc-danger-soft-active` | Token leído o definido por componente. |
| `--iswc-danger-text` | Token leído o definido por componente. |
| `--_button-horizontal-indent-outlined` | Token leído o definido por componente. |
| `--_button-vertical-indent-outlined` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-button> — Web Component (vanilla).
> Define el custom element `iswc-button` automáticamente al importarse.
> Usa Shadow DOM con CSS propio, es form-associated (participa en <form>),
> y expone parts + custom states para personalización desde fuera.
> Atributos
>  color      brand | neutral | success | warning | danger | info | error   (default: brand)
>  variant   filled | outlined | plain | ghost | soft | text  (default: filled)
>  hue          number (0-360)  color propio para el highlight cuando está
>                             [selected] dentro de <iswc-button-group>. Si no
>                             se define, el grupo usa su --iswc-accent.
>  disabled     boolean
>  loading      boolean
>  pill         boolean
>  with-caret   boolean
>  href         string   → renderiza como <a>
>  target       string
>  rel          string
>  download     string
>  type         button | submit | reset                       (default: button)
>  title        string
>  name         string   (form data)
>  value        string   (form data)
>  form, formaction, formenctype, formmethod,
>  formnovalidate, formtarget                                (form association)
>  aria-label, aria-pressed, aria-expanded, aria-haspopup,
>  aria-current                                              (se reenvían al inner)
> Slots
>  default   etiqueta del botón
>  start     icono / nodo a la izquierda
>  end       icono / nodo a la derecha
> CSS Parts:  ::part(button) ::part(label) ::part(start) ::part(end)
>             ::part(caret) ::part(spinner)
> Custom States: :state(loading) :state(disabled) :state(link) :state(icon-button)
> Events nativos (burbujean, composed:true): focus, blur, click
> Custom events (composed:true, bubbles:true — cruzan Shadow DOM y son
> consumibles desde React via addEventListener o React 19+ on<EventName>):
>   iswc-focus   — emitido al recibir foco (mismo momento que `focus`)
>   iswc-blur    — emitido al perder foco
>   iswc-click   — emitido al hacer click (mismo momento que `click`)
>   iswc-invalid — emitido cuando la validación de formulario falla
> Mapping para React:
>   onClick       → click  (nativo, React 17+)
>   onFocus       → focus  (nativo, React 17+)
>   onBlur        → blur   (nativo, React 17+)
>   onIsFocus     → iswc-focus   (React 19+  |  ref.addEventListener('iswc-focus', fn))
>   onIsBlur      → iswc-blur
>   onIsClick     → iswc-click
>   onIsInvalid   → iswc-invalid
> El host expone los custom states :state(loading|disabled|link|icon-button)
> (y como fallback los atributos data-state-* equivalentes para entornos sin
> soporte de ElementInternals.states).
> Color × appearance ortogonales: cada color enlaza roles `--_tone-*` a
> tokens relativos de is-base; cada variant solo consume esos roles.
> Tokens de familia X (brand|success|warning|danger|info|error):
>  --iswc-color-X, --iswc-color-X-strong/-stronger/-strongest/-pale/-paler
>  --iswc-X-text, --iswc-X-soft, --iswc-X-soft-active (brand → --iswc-brand-*)
>  --iswc-button-font-family, --iswc-button-font-weight
>  --iswc-button-border-radius, --iswc-button-border-width
>  --iswc-button-transition-duration

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<iswc-button>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-pressed`, `aria-expanded`, `aria-haspopup`, `aria-current`, `aria-hidden`, `aria-disabled`, `aria-busy`.

## Ejemplo avanzado

```html
<div style="font-size: 1.25rem">
<iswc-button color="brand">Grande</iswc-button>
</div>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./button.js)
- [CSS](./button.css)
- [Índice de categoría](./LLM.md)
- [Preview](./button.json)
