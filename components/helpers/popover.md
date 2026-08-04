---
tag: is-popover
tags:
  - is-popover
category: helpers
status: public
source: ./popover.js
style: ./popover.css
preview: ../../previews/helpers/is-popover.html
---
# `<is-popover>`

## Propósito

Panel flotante con contenido interactivo. Ancla con for.
Cierra con Escape, click fuera o data-popover="close".
El posicionamiento (flip, shift, auto-size, arrow) lo hace un `<is-floating>` interno — el wrapper aporta ancla declarativa, ciclo de vida y accesibilidad.

Este módulo registra `<is-popover>`.

## Cuándo usarlo

Formato, observación y posicionamiento reutilizable sobre APIs nativas.

## Cuándo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## Importación

```js
import './popover.js';
```

## Ejemplo mínimo

```html
<is-button id="pop1">Show popover</is-button>
<is-popover for="pop1">
…contenido…
<is-button data-popover="close">Dismiss</is-button>
</is-popover>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `for` | string/según contrato | Fuente define default/restricción. |
| `open` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `for` | lectura/escritura | Declarada por clase. |
| `anchor` | lectura/escritura | Declarada por clase. |
| `placement` | lectura/escritura | Declarada por clase. |
| `distance` | lectura/escritura | Declarada por clase. |
| `skidding` | lectura/escritura | Declarada por clase. |
| `withoutArrow` | lectura/escritura | Declarada por clase. |
| `strategy` | lectura/escritura | Declarada por clase. |
| `flip` | lectura/escritura | Declarada por clase. |
| `shift` | lectura/escritura | Declarada por clase. |
| `arrow` | lectura/escritura | Declarada por clase. |
| `autoSize` | lectura/escritura | Declarada por clase. |
| `boundary` | lectura/escritura | Declarada por clase. |
| `flipFallbackPlacements` | lectura/escritura | Declarada por clase. |
| `flipFallbackStrategy` | lectura/escritura | Declarada por clase. |
| `flipPadding` | lectura/escritura | Declarada por clase. |
| `shiftPadding` | lectura/escritura | Declarada por clase. |
| `autoSizePadding` | lectura/escritura | Declarada por clase. |
| `hoverBridge` | lectura/escritura | Declarada por clase. |

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
| `reposition()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `popup` | Personalizable con `::part(popup)`. |
| `dialog` | Personalizable con `::part(dialog)`. |
| `body` | Personalizable con `::part(body)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--max-width` | Token leído o definido por componente. |
| `--arrow-size` | Token leído o definido por componente. |
| `--show-duration` | Token leído o definido por componente. |
| `--hide-duration` | Token leído o definido por componente. |
| `--auto-size-available-width` | Token leído o definido por componente. |
| `--auto-size-available-height` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-popover> — panel flotante con contenido interactivo, anclado vía `for`.
> Es el wrapper de alto nivel sobre `<is-floating>` (el building block de
> posicionamiento). Popover añade: anchor declarativo por id, ciclo de
> vida (mostrar / ocultar), accesibilidad del ancla (aria-haspopup +
> aria-expanded), `data-popover="close"` en hijos para cerrar y la marca
> de "panel activo global" para que sólo haya un popover visible a la vez.
> Como ya no hay diferencia funcional entre un panel flotante y un popover,
> API pública: solo `<is-popover>`. El building block interno es `<is-floating>` (no usar en apps).
> Attrs: for, open, placement, distance, skidding, without-arrow,
>        strategy, flip, shift, arrow, auto-size, boundary,
>        flip-fallback-placements, flip-fallback-strategy,
>        flip-padding, shift-padding, auto-size-padding
> Props: anchor (Element | string | VirtualElement)
> Methods: show(), hide(), reposition()
> Events: is-show, is-after-show, is-hide, is-after-hide (cancelables),
>         is-reposition { placement, x, y }, is-hover-bridge { hovering }
> Parts: ::part(body) ::part(dialog) ::part(popup) ::part(arrow)
>        ::part(hover-bridge) ::part(anchor)
> CSS: --max-width --arrow-size --show-duration --hide-duration
>        --auto-size-available-width --auto-size-available-height
> data-popover="close" en hijos cierra el popover.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./floating.js`](./floating.js) (interno)

Tags del módulo: `<is-popover>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-haspopup`, `aria-expanded`.

## Ejemplo avanzado

```html
<is-button id="pop1">Show popover</is-button>
<is-popover for="pop1">
…contenido…
<is-button data-popover="close">Dismiss</is-button>
</is-popover>
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

- [JavaScript](./popover.js)
- [CSS](./popover.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/helpers/is-popover.html)
