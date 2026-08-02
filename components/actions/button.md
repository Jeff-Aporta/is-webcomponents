---
tag: is-button
tags:
  - is-button
category: actions
status: public
source: ./button.js
style: ./button.css
preview: ../../previews/actions/is-button.html
---
# `<is-button>`

## Propósito

Componente Insoft accesible y personalizable, escrito con JavaScript nativo,
Shadow DOM y sin frameworks.

Este módulo registra `<is-button>`.

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
<is-button variant="success">Aprobado</is-button>
<is-button variant="danger" appearance="outlined">Eliminar</is-button>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `variant` | string/según contrato | Fuente define default/restricción. |
| `appearance` | string/según contrato | Fuente define default/restricción. |
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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-focus` | sí | sí | sí | no |
| `is-blur` | sí | sí | sí | no |
| `is-click` | sí | sí | sí | no |
| `is-invalid` | según cabecera | según cabecera | según cabecera | según cabecera |

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
| `--is-accent` | Token leído o definido por componente. |
| `--is-button-font-family` | Token leído o definido por componente. |
| `--is-button-font-weight` | Token leído o definido por componente. |
| `--is-button-border-radius` | Token leído o definido por componente. |
| `--is-button-border-width` | Token leído o definido por componente. |
| `--is-button-transition-duration` | Token leído o definido por componente. |
| `--is-button-selected-hue` | Token leído o definido por componente. |
| `--is-button-selected-color` | Token leído o definido por componente. |
| `--is-color-success-50` | Token leído o definido por componente. |
| `--is-color-success-100` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-color-success-600` | Token leído o definido por componente. |
| `--is-color-success-700` | Token leído o definido por componente. |
| `--is-color-warning-50` | Token leído o definido por componente. |
| `--is-color-warning-100` | Token leído o definido por componente. |
| `--is-color-warning-500` | Token leído o definido por componente. |
| `--is-color-warning-600` | Token leído o definido por componente. |
| `--is-color-warning-700` | Token leído o definido por componente. |
| `--is-color-danger-50` | Token leído o definido por componente. |
| `--is-color-danger-100` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-color-danger-600` | Token leído o definido por componente. |
| `--is-color-danger-700` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--_bg` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--_bg-hover` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--_bg-active` | Token leído o definido por componente. |
| `--is-control-bg-active` | Token leído o definido por componente. |
| `--_border` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--_text` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--_focus` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--_height` | Token leído o definido por componente. |
| `--_hpad` | Token leído o definido por componente. |
| `--_button-horizontal-indent` | Token leído o definido por componente. |
| `--_button-vertical-indent` | Token leído o definido por componente. |
| `--_button-start-start-radius` | Token leído o definido por componente. |
| `--_button-start-end-radius` | Token leído o definido por componente. |
| `--_button-end-start-radius` | Token leído o definido por componente. |
| `--_button-end-end-radius` | Token leído o definido por componente. |
| `--is-color-brand-600` | Token leído o definido por componente. |
| `--is-color-brand-700` | Token leído o definido por componente. |
| `--is-color-brand-800` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |
| `--is-brand-soft` | Token leído o definido por componente. |
| `--is-color-brand-50` | Token leído o definido por componente. |
| `--is-brand-soft-active` | Token leído o definido por componente. |
| `--is-color-brand-100` | Token leído o definido por componente. |
| `--is-brand-text` | Token leído o definido por componente. |
| `--is-success-soft` | Token leído o definido por componente. |
| `--is-success-soft-active` | Token leído o definido por componente. |
| `--is-success-text` | Token leído o definido por componente. |
| `--is-warning-soft` | Token leído o definido por componente. |
| `--is-warning-soft-active` | Token leído o definido por componente. |
| `--is-warning-text` | Token leído o definido por componente. |
| `--is-danger-soft` | Token leído o definido por componente. |
| `--is-danger-soft-active` | Token leído o definido por componente. |
| `--is-danger-text` | Token leído o definido por componente. |
| `--_button-horizontal-indent-outlined` | Token leído o definido por componente. |
| `--_button-vertical-indent-outlined` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-button> — Web Component (vanilla).
> Define el custom element `is-button` automáticamente al importarse.
> Usa Shadow DOM con CSS propio, es form-associated (participa en <form>),
> y expone parts + custom states para personalización desde fuera.
> Atributos
>  variant      brand | neutral | success | warning | danger   (default: brand)
>  appearance   filled | outlined | plain                     (default: filled)
>  hue          number (0-360)  color propio para el highlight cuando está
>                             [selected] dentro de <is-button-group>. Si no
>                             se define, el grupo usa su --is-accent.
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
>   is-focus   — emitido al recibir foco (mismo momento que `focus`)
>   is-blur    — emitido al perder foco
>   is-click   — emitido al hacer click (mismo momento que `click`)
>   is-invalid — emitido cuando la validación de formulario falla
> Mapping para React:
>   onClick       → click  (nativo, React 17+)
>   onFocus       → focus  (nativo, React 17+)
>   onBlur        → blur   (nativo, React 17+)
>   onIsFocus     → is-focus   (React 19+  |  ref.addEventListener('is-focus', fn))
>   onIsBlur      → is-blur
>   onIsClick     → is-click
>   onIsInvalid   → is-invalid
> El host expone los custom states :state(loading|disabled|link|icon-button)
> (y como fallback los atributos data-state-* equivalentes para entornos sin
> soporte de ElementInternals.states).
> CSS variables del componente (todas con fallback, override-friendly):
>  --is-color-brand-{50..950}
>  --is-color-neutral-{50..950}
>  --is-color-success-{50..950}
>  --is-color-warning-{50..950}
>  --is-color-danger-{50..950}
>  --is-button-font-family, --is-button-font-weight
>  --is-button-border-radius, --is-button-border-width
>  --is-button-transition-duration

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-button>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-pressed`, `aria-expanded`, `aria-haspopup`, `aria-current`, `aria-hidden`, `aria-disabled`, `aria-busy`.

## Ejemplo avanzado

```html
<div style="font-size: 1.25rem">
<is-button variant="brand">Grande</is-button>
</div>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

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
- [Preview](../../previews/actions/is-button.html)
