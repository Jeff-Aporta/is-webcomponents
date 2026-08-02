---
tag: is-tooltip
tags:
  - is-tooltip
category: feedback
status: public
source: ./tooltip.js
style: ./tooltip.css
preview: ../../previews/feedback/is-tooltip.html
---
# `<is-tooltip>`

## Propósito

Tip breve anclado con for. Depende de is-popover.

Este módulo registra `<is-tooltip>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './tooltip.js';
```

## Ejemplo mínimo

```html
<is-button id="tip-target">Hover Me</is-button>
<is-tooltip for="tip-target">This is a tooltip</is-tooltip>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `for` | string/según contrato | Fuente define default/restricción. |
| `open` | boolean | Fuente define default/restricción. |
| `placement` | string/según contrato | Fuente define default/restricción. |
| `trigger` | string/según contrato | Fuente define default/restricción. |
| `distance` | string/según contrato | Fuente define default/restricción. |
| `skidding` | string/según contrato | Fuente define default/restricción. |
| `show-delay` | string/según contrato | Fuente define default/restricción. |
| `hide-delay` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `without-arrow` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `for` | lectura/escritura | Declarada por clase. |
| `placement` | lectura/escritura | Declarada por clase. |
| `trigger` | lectura/escritura | Declarada por clase. |
| `distance` | lectura/escritura | Declarada por clase. |
| `skidding` | lectura/escritura | Declarada por clase. |
| `showDelay` | lectura/escritura | Declarada por clase. |
| `hideDelay` | lectura/escritura | Declarada por clase. |
| `withoutArrow` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-show` | no | sí | sí | sí |
| `is-after-show` | no | sí | sí | sí |
| `is-hide` | no | sí | sí | sí |
| `is-after-hide` | no | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |
| `hide()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |
| `body` | Personalizable con `::part(body)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--max-width` | Token leído o definido por componente. |
| `--arrow-color` | Token leído o definido por componente. |
| `--is-tooltip-bg` | Token leído o definido por componente. |
| `--is-tooltip-fg` | Token leído o definido por componente. |
| `--arrow-size` | Token leído o definido por componente. |
| `--is-tooltip-arrow-size` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-tooltip-font-size` | Token leído o definido por componente. |
| `--is-tooltip-line-height` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |
| `--is-mono` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-tooltip> — tip contextual anclado vía `for`.
> Attrs: for, open, placement, trigger, distance, skidding,
>        show-delay, hide-delay, disabled, without-arrow
> trigger (default "hover focus"): combina hover | focus | click. Además
>   manual → solo show()/hide(), y se cierra con click fuera o Escape
>   none   → solo show()/hide(), sin cierre automático (lo controla el dueño)
> Methods: show(), hide()
> Events: is-show, is-after-show, is-hide, is-after-hide
> Parts: ::part(tooltip) ::part(body) ::part(base__popup) ::part(base__arrow)
> CSS: --max-width

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../helpers/popup.js`](../helpers/popup.js)

Tags del módulo: `<is-tooltip>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-describedby`.

## Ejemplo avanzado

```html
<is-tooltip for="t-html" trigger="click" style="--max-width:22rem">
<p><strong>Resumen</strong></p>
<ul><li>…</li></ul>
</is-tooltip>
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

- [JavaScript](./tooltip.js)
- [CSS](./tooltip.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-tooltip.html)
