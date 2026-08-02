---
tag: is-popup
tags:
  - is-popup
category: helpers
status: internal
source: ./popup.js
style: ./popup.css
---
# `<is-popup>`

## Propósito

<is-popup> — ancla un panel flotante a un elemento (building block).

Este módulo registra `<is-popup>`.

## Cuándo usarlo

Formato, observación y posicionamiento reutilizable sobre APIs nativas.

## Cuándo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## Importación

```js
import './popup.js';
```

## Ejemplo mínimo

```html
<is-popup></is-popup>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | boolean | Fuente define default/restricción. |
| `placement` | string/según contrato | Fuente define default/restricción. |
| `distance` | string/según contrato | Fuente define default/restricción. |
| `skidding` | string/según contrato | Fuente define default/restricción. |
| `strategy` | string/según contrato | Fuente define default/restricción. |
| `flip` | boolean | Fuente define default/restricción. |
| `shift` | boolean | Fuente define default/restricción. |
| `arrow` | boolean | Fuente define default/restricción. |
| `arrow-placement` | string/según contrato | Fuente define default/restricción. |
| `arrow-padding` | string/según contrato | Fuente define default/restricción. |
| `auto-size` | string/según contrato | Fuente define default/restricción. |
| `boundary` | string/según contrato | Fuente define default/restricción. |
| `hover-bridge` | boolean | Fuente define default/restricción. |
| `flip-fallback-placements` | string/según contrato | Fuente define default/restricción. |
| `flip-fallback-strategy` | string/según contrato | Fuente define default/restricción. |
| `flip-padding` | string/según contrato | Fuente define default/restricción. |
| `shift-padding` | string/según contrato | Fuente define default/restricción. |
| `auto-size-padding` | string/según contrato | Fuente define default/restricción. |
| `anchor` | string/según contrato | Fuente define default/restricción. |
| `horizontal` | string/según contrato | Fuente define default/restricción. |
| `vertical` | string/según contrato | Fuente define default/restricción. |
| `both` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `active` | lectura/escritura | Declarada por clase. |
| `placement` | lectura/escritura | Declarada por clase. |
| `distance` | lectura/escritura | Declarada por clase. |
| `skidding` | lectura/escritura | Declarada por clase. |
| `strategy` | lectura/escritura | Declarada por clase. |
| `flip` | lectura/escritura | Declarada por clase. |
| `shift` | lectura/escritura | Declarada por clase. |
| `arrow` | lectura/escritura | Declarada por clase. |
| `arrowPlacement` | lectura/escritura | Declarada por clase. |
| `arrowPadding` | lectura/escritura | Declarada por clase. |
| `autoSize` | lectura/escritura | Declarada por clase. |
| `boundary` | lectura/escritura | Declarada por clase. |
| `hoverBridge` | lectura/escritura | Declarada por clase. |
| `flipFallbackPlacements` | lectura/escritura | Declarada por clase. |
| `flipFallbackStrategy` | lectura/escritura | Declarada por clase. |
| `flipPadding` | lectura/escritura | Declarada por clase. |
| `shiftPadding` | lectura/escritura | Declarada por clase. |
| `autoSizePadding` | lectura/escritura | Declarada por clase. |
| `anchor` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `anchor` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-reposition` | sí | sí | sí | no |
| `is-hover-bridge` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `reposition()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `anchor` | Personalizable con `::part(anchor)`. |
| `popup` | Personalizable con `::part(popup)`. |
| `arrow` | Personalizable con `::part(arrow)`. |
| `hover-bridge` | Personalizable con `::part(hover-bridge)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--arrow-size` | Token leído o definido por componente. |
| `--auto-size-available-width` | Token leído o definido por componente. |
| `--auto-size-available-height` | Token leído o definido por componente. |
| `--arrow-color` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--show-duration` | Token leído o definido por componente. |
| `--hide-duration` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--arrow-border-color` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-popup> — ancla un panel flotante a un elemento (building block).
> Slots: anchor | default (contenido)
> Attrs: active, placement, distance, skidding, strategy, flip, shift,
>        arrow, arrow-placement, arrow-padding, auto-size, boundary,
>        hover-bridge, flip-fallback-placements, flip-fallback-strategy,
>        flip-padding, shift-padding, auto-size-padding, anchor (id externo)
> Props: anchor (Element | string | VirtualElement)
> Methods: reposition()
> Events: is-reposition  { placement, x, y }
>         is-hover-bridge { hovering }
> Parts: ::part(popup) ::part(arrow) ::part(hover-bridge) ::part(anchor)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/position.js`](../_shared/position.js)

Tags del módulo: `<is-popup>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`.

## Ejemplo avanzado

```html
<is-popup></is-popup>
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

- [JavaScript](./popup.js)
- [CSS](./popup.css)
- [Índice de categoría](./LLM.md)
