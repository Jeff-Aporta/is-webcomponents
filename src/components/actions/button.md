---
tag: iswc-button
tags:
  - iswc-button
category: actions
status: public
source: ./button.ts
style: ./button.css
preview: ./button.json
---
# `<iswc-button>`

## PropÃ³sito

Componente InSoft accesible y personalizable, escrito con JavaScript nativo,
Shadow DOM y sin frameworks.

Este mÃ³dulo registra `<iswc-button>`.

## CuÃ¡ndo usarlo

Acciones, selecciÃ³n de comandos y menÃºs interactivos.

## CuÃ¡ndo no usarlo

No usar como decoraciÃ³n ni reemplazar enlaces semÃ¡nticos para navegaciÃ³n simple.

## ImportaciÃ³n

```js
import './button.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-button color="success">Aprobado</iswc-button>
<iswc-button color="danger" variant="outlined">Eliminar</iswc-button>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `variant` | `filled` / `outlined` / `plain` / `ghost` / `soft` / `text` | Default `filled`. Ortogonal a `color`. |
| `shape` | `round` / `rect` / `pill` | Default `round`. Ortogonal a `color` y `variant`. |
| `hue` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `loading` | boolean | Fuente define default/restricciÃ³n. |
| `pill` | boolean | Fuente define default/restricciÃ³n. |
| `with-caret` | boolean | Fuente define default/restricciÃ³n. |
| `href` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `target` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `rel` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `download` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `type` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `title` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `form` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `formaction` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `formenctype` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `formmethod` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `formnovalidate` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `formtarget` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-focus` | Emitido cuando el componente recibe foco. |
| `iswc-blur` | Emitido cuando el componente pierde foco. |
| `iswc-click` | Emitido al hacer clic sobre el componente. |
| `iswc-invalid` | Emitido cuando la validaciÃ³n de formulario falla. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-focus` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-blur` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-click` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-invalid` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-button');
el.addEventListener('iswc-focus', (e) => {
  console.log('iswc-focus', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `setFocus()` | MÃ©todo pÃºblico declarado. |
| `checkValidity()` | MÃ©todo pÃºblico declarado. |
| `reportValidity()` | MÃ©todo pÃºblico declarado. |
| `setCustomValidity()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `:state(icon-button)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(loading)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(link)` | Estado usado por implementaciÃ³n/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-button-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-button-font-weight` | Token leÃ­do o definido por componente. |
| `--iswc-button-border-radius` | Token leÃ­do o definido por componente. |
| `--iswc-button-border-width` | Token leÃ­do o definido por componente. |
| `--iswc-button-transition-duration` | Token leÃ­do o definido por componente. |
| `--iswc-button-selected-hue` | Token leÃ­do o definido por componente. |
| `--iswc-button-selected-color` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-50` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-600` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-50` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-600` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-50` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-100` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-600` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-700` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--_bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--_bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--_bg-active` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-active` | Token leÃ­do o definido por componente. |
| `--_border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--_text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--_focus` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--_height` | Token leÃ­do o definido por componente. |
| `--_hpad` | Token leÃ­do o definido por componente. |
| `--_button-horizontal-indent` | Token leÃ­do o definido por componente. |
| `--_button-vertical-indent` | Token leÃ­do o definido por componente. |
| `--_button-start-start-radius` | Token leÃ­do o definido por componente. |
| `--_button-start-end-radius` | Token leÃ­do o definido por componente. |
| `--_button-end-start-radius` | Token leÃ­do o definido por componente. |
| `--_button-end-end-radius` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-600` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-800` | Token leÃ­do o definido por componente. |
| `--iswc-on-brand` | Token leÃ­do o definido por componente. |
| `--iswc-brand-soft` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-50` | Token leÃ­do o definido por componente. |
| `--iswc-brand-soft-active` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-100` | Token leÃ­do o definido por componente. |
| `--iswc-brand-text` | Token leÃ­do o definido por componente. |
| `--iswc-success-soft` | Token leÃ­do o definido por componente. |
| `--iswc-success-soft-active` | Token leÃ­do o definido por componente. |
| `--iswc-success-text` | Token leÃ­do o definido por componente. |
| `--iswc-warning-soft` | Token leÃ­do o definido por componente. |
| `--iswc-warning-soft-active` | Token leÃ­do o definido por componente. |
| `--iswc-warning-text` | Token leÃ­do o definido por componente. |
| `--iswc-danger-soft` | Token leÃ­do o definido por componente. |
| `--iswc-danger-soft-active` | Token leÃ­do o definido por componente. |
| `--iswc-danger-text` | Token leÃ­do o definido por componente. |
| `--_button-horizontal-indent-outlined` | Token leÃ­do o definido por componente. |
| `--_button-vertical-indent-outlined` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-button> â€” Web Component (vanilla).
> Define el custom element `iswc-button` automÃ¡ticamente al importarse.
> Usa Shadow DOM con CSS propio, es form-associated (participa en <form>),
> y expone parts + custom states para personalizaciÃ³n desde fuera.
> Atributos
>  color      brand | neutral | success | warning | danger | info | error   (default: brand)
>  variant   filled | outlined | plain | ghost | soft | text  (default: filled)
>  hue          number (0-360)  color propio para el highlight cuando estÃ¡
>                             [selected] dentro de <iswc-button-group>. Si no
>                             se define, el grupo usa su --iswc-accent.
>  disabled     boolean
>  loading      boolean
>  pill         boolean
>  with-caret   boolean
>  href         string   â†’ renderiza como <a>
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
>  aria-current                                              (se reenvÃ­an al inner)
> Slots
>  default   etiqueta del botÃ³n
>  start     icono / nodo a la izquierda
>  end       icono / nodo a la derecha
> CSS Parts:  ::part(button) ::part(label) ::part(start) ::part(end)
>             ::part(caret) ::part(spinner)
> Custom States: :state(loading) :state(disabled) :state(link) :state(icon-button)
> Events nativos (burbujean, composed:true): focus, blur, click
> Custom events (composed:true, bubbles:true â€” cruzan Shadow DOM y son
> consumibles desde React via addEventListener o React 19+ on<EventName>):
>   iswc-focus   â€” emitido al recibir foco (mismo momento que `focus`)
>   iswc-blur    â€” emitido al perder foco
>   iswc-click   â€” emitido al hacer click (mismo momento que `click`)
>   iswc-invalid â€” emitido cuando la validaciÃ³n de formulario falla
> Mapping para React:
>   onClick       â†’ click  (nativo, React 17+)
>   onFocus       â†’ focus  (nativo, React 17+)
>   onBlur        â†’ blur   (nativo, React 17+)
>   onIsFocus     â†’ iswc-focus   (React 19+  |  ref.addEventListener('iswc-focus', fn))
>   onIsBlur      â†’ iswc-blur
>   onIsClick     â†’ iswc-click
>   onIsInvalid   â†’ iswc-invalid
> El host expone los custom states :state(loading|disabled|link|icon-button)
> (y como fallback los atributos data-state-* equivalentes para entornos sin
> soporte de ElementInternals.states).
> Color Ã— appearance ortogonales: cada color enlaza roles `--_tone-*` a
> tokens relativos de is-base; cada variant solo consume esos roles.
> Tokens de familia X (brand|success|warning|danger|info|error):
>  --iswc-color-X, --iswc-color-X-strong/-stronger/-strongest/-pale/-paler
>  --iswc-X-text, --iswc-X-soft, --iswc-X-soft-active (brand â†’ --iswc-brand-*)
>  --iswc-button-font-family, --iswc-button-font-weight
>  --iswc-button-border-radius, --iswc-button-border-width
>  --iswc-button-transition-duration

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-button>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-pressed`, `aria-expanded`, `aria-haspopup`, `aria-current`, `aria-hidden`, `aria-disabled`, `aria-busy`.

## Ejemplo avanzado

```html
<div style="font-size: 1.25rem">
<iswc-button color="brand">Grande</iswc-button>
</div>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./button.ts)
- [CSS](./button.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./button.json)
