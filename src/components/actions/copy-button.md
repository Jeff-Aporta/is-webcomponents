---
tag: iswc-copy-button
tags:
  - iswc-copy-button
category: actions
status: public
source: ./copy-button.ts
style: ./copy-button.css
preview: ./copy-button.json
---
# `<iswc-copy-button>`

## PropÃ³sito

Copia texto al portapapeles con feedback de Ã©xito/error.

Este mÃ³dulo registra `<iswc-copy-button>`.

## CuÃ¡ndo usarlo

Acciones, selecciÃ³n de comandos y menÃºs interactivos.

## CuÃ¡ndo no usarlo

No usar como decoraciÃ³n ni reemplazar enlaces semÃ¡nticos para navegaciÃ³n simple.

## ImportaciÃ³n

```js
import './copy-button.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-copy-button value="https://insoft.com.co"></iswc-copy-button>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `from` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `copy-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `success-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `error-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `feedback-duration` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `tooltip` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `tooltip-placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `from` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `copyLabel` | lectura/escritura | Declarada por clase. |
| `successLabel` | lectura/escritura | Declarada por clase. |
| `errorLabel` | lectura/escritura | Declarada por clase. |
| `feedbackDuration` | lectura/escritura | Declarada por clase. |
| `tooltip` | lectura/escritura | Declarada por clase. |
| `tooltipPlacement` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `copy-icon` | Contenido proyectado. |
| `success-icon` | Contenido proyectado. |
| `error-icon` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-error` | Emitido cuando se produce un error. |
| `iswc-copy` | Evento personalizado del componente (copy). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-error` | no | sÃ­ | sÃ­ | no |
| `iswc-copy` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-copy-button');
el.addEventListener('iswc-error', (e) => {
  console.log('iswc-error', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `button` | Personalizable con `::part(button)`. |
| `copy-icon` | Personalizable con `::part(copy-icon)`. |
| `success-icon` | Personalizable con `::part(success-icon)`. |
| `error-icon` | Personalizable con `::part(error-icon)`. |
| `feedback` | Panel flotante que muestra el resultado del copy (success/error). |
| `feedback-body` | Cuerpo del panel `feedback` (mensaje + icono). |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(success)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(error)` | Estado usado por implementaciÃ³n/CSS. |
| `:state(disabled)` | Atributo `disabled` presente; el botón interno y el feedback lo reflejan. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-text-muted` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-tooltip-bg` | Token leÃ­do o definido por componente. |
| `--iswc-tooltip-font-size` | Token leÃ­do o definido por componente. |
| `--max-width` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-600` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-600` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validaciÃ³n.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-copy-button> â€” Web Component (vanilla).
> Copia texto al portapapeles con feedback visual (Ã©xito / error).
> Requiere contexto seguro (HTTPS o localhost) para clipboard.writeText().
> Compone <iswc-tooltip> (posicionamiento, flip, flecha) e <iswc-icon>. El tooltip
> va en `trigger="none"`: quiÃ©n lo abre y con quÃ© texto lo decide el estado de
> la copia (reposo / Ã©xito / error), no el hover del propio tooltip.
> Atributos
>   value               string a copiar
>   from                id | id[attr] | id.prop  (gana sobre value)
>   copy-label          etiqueta / tooltip en reposo
>   success-label       tooltip tras copiar
>   error-label         tooltip si falla
>   feedback-duration   ms de feedback (default 1000)
>   tooltip             full | copy | none  (default full)
>   tooltip-placement   cualquier placement de iswc-popover: top | top-start |
>                       top-end | bottom* | left* | right*  (default top)
>   disabled            boolean
> Slots
>   (default)       trigger custom (opcional; si hay, oculta el botÃ³n interno)
>   copy-icon       icono en reposo
>   success-icon    icono de Ã©xito
>   error-icon      icono de error
> Events (bubbles + composed): iswc-copy { value }, iswc-error
> Custom states: :state(success) :state(error)
> CSS Parts: button, copy-icon, success-icon, error-icon,
>            feedback (burbuja del tooltip), feedback-body

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`../feedback/tooltip.js`](../feedback/tooltip.js)
- [`./button.js`](./button.js) â€” la superficie clicable es un `<iswc-button variant="text">`.

Tags del mÃ³dulo: `<iswc-copy-button>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-live`, `aria-label`.

## Ejemplo avanzado

```html
<span id="my-phone">+57 300 123 4567</span>
<iswc-copy-button from="my-phone"></iswc-copy-button>
<iswc-copy-button from="my-input.value"></iswc-copy-button>
<iswc-copy-button from="my-link[href]"></iswc-copy-button>
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

- [JavaScript](./copy-button.ts)
- [CSS](./copy-button.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./copy-button.json)
