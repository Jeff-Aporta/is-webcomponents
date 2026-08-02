---
tag: is-copy-button
tags:
  - is-copy-button
category: actions
status: public
source: ./copy-button.js
style: ./copy-button.css
preview: ../../previews/actions/is-copy-button.html
---
# `<is-copy-button>`

## Propósito

Copia texto al portapapeles con feedback de éxito/error.

Este módulo registra `<is-copy-button>`.

## Cuándo usarlo

Acciones, selección de comandos y menús interactivos.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './copy-button.js';
```

## Ejemplo mínimo

```html
<is-copy-button value="https://insoft.com.co"></is-copy-button>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `from` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `copy-label` | string/según contrato | Fuente define default/restricción. |
| `success-label` | string/según contrato | Fuente define default/restricción. |
| `error-label` | string/según contrato | Fuente define default/restricción. |
| `feedback-duration` | string/según contrato | Fuente define default/restricción. |
| `tooltip` | string/según contrato | Fuente define default/restricción. |
| `tooltip-placement` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-error` | no | sí | sí | no |
| `is-copy` | sí | sí | sí | no |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `button` | Personalizable con `::part(button)`. |
| `copy-icon` | Personalizable con `::part(copy-icon)`. |
| `success-icon` | Personalizable con `::part(success-icon)`. |
| `error-icon` | Personalizable con `::part(error-icon)`. |

### Custom states

| Estado | Uso |
| --- | --- |
| `:state(success)` | Estado usado por implementación/CSS. |
| `:state(error)` | Estado usado por implementación/CSS. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-text-muted` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-tooltip-bg` | Token leído o definido por componente. |
| `--is-tooltip-font-size` | Token leído o definido por componente. |
| `--max-width` | Token leído o definido por componente. |
| `--is-color-success-600` | Token leído o definido por componente. |
| `--is-color-danger-600` | Token leído o definido por componente. |

### Integración con formularios

Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-copy-button> — Web Component (vanilla).
> Copia texto al portapapeles con feedback visual (éxito / error).
> Requiere contexto seguro (HTTPS o localhost) para clipboard.writeText().
> Compone <is-tooltip> (posicionamiento, flip, flecha) e <is-icon>. El tooltip
> va en `trigger="none"`: quién lo abre y con qué texto lo decide el estado de
> la copia (reposo / éxito / error), no el hover del propio tooltip.
> Atributos
>   value               string a copiar
>   from                id | id[attr] | id.prop  (gana sobre value)
>   copy-label          etiqueta / tooltip en reposo
>   success-label       tooltip tras copiar
>   error-label         tooltip si falla
>   feedback-duration   ms de feedback (default 1000)
>   tooltip             full | copy | none  (default full)
>   tooltip-placement   cualquier placement de is-popup: top | top-start |
>                       top-end | bottom* | left* | right*  (default top)
>   disabled            boolean
> Slots
>   (default)       trigger custom (opcional; si hay, oculta el botón interno)
>   copy-icon       icono en reposo
>   success-icon    icono de éxito
>   error-icon      icono de error
> Events (bubbles + composed): is-copy { value }, is-error
> Custom states: :state(success) :state(error)
> CSS Parts: button, copy-icon, success-icon, error-icon,
>            feedback (burbuja del tooltip), feedback-body

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)
- [`../feedback/tooltip.js`](../feedback/tooltip.js)

Tags del módulo: `<is-copy-button>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-live`, `aria-label`.

## Ejemplo avanzado

```html
<span id="my-phone">+57 300 123 4567</span>
<is-copy-button from="my-phone"></is-copy-button>
<is-copy-button from="my-input.value"></is-copy-button>
<is-copy-button from="my-link[href]"></is-copy-button>
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

- [JavaScript](./copy-button.js)
- [CSS](./copy-button.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/actions/is-copy-button.html)
