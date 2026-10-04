---
tag: iswc-popover
tags:
  - iswc-popover
category: helpers
status: public
source: ./popover.js
style: ./popover.css
preview: ./popover.json
---
# `<iswc-popover>`

## Propósito

Panel flotante con contenido interactivo. Ancla con for.
Cierra con Escape, click fuera o data-popover="close".
El posicionamiento (flip, shift, auto-size, arrow) lo hace un `<iswc-floating>` interno — el wrapper aporta ancla declarativa, ciclo de vida y accesibilidad.

Este módulo registra `<iswc-popover>`.

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
<iswc-button id="pop1">Show popover</iswc-button>
<iswc-popover for="pop1">
…contenido…
<iswc-button data-popover="close">Dismiss</iswc-button>
</iswc-popover>
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


| Evento | Descripción |
| --- | --- |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animación de apertura. |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-after-hide` | Emitido tras finalizar la animación de cierre. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-show` | no | sí | sí | sí |
| `iswc-after-show` | no | sí | sí | sí |
| `iswc-hide` | no | sí | sí | sí |
| `iswc-after-hide` | no | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-popover');
el.addEventListener('iswc-show', (e) => {
  console.log('iswc-show', e.detail);
});
```

</details>

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
| `popup__arrow` | Flecha del popover. |
| `popup__hover-bridge` | Puente invisible que mantiene el hover entre trigger y popup. |
| `popup__popup` | Panel flotante interno del popover. |

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
| `--iswc-radius` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-shadow` | Token leído o definido por componente. |
| `--iswc-font-family` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-popover> — panel flotante con contenido interactivo, anclado vía `for`.
> Es el wrapper de alto nivel sobre `<iswc-floating>` (el building block de
> posicionamiento). Popover añade: anchor declarativo por id, ciclo de
> vida (mostrar / ocultar), accesibilidad del ancla (aria-haspopup +
> aria-expanded), `data-popover="close"` en hijos para cerrar y la marca
> de "panel activo global" para que sólo haya un popover visible a la vez.
> Como ya no hay diferencia funcional entre un panel flotante y un popover,
> API pública: solo `<iswc-popover>`. El building block interno es `<iswc-floating>` (no usar en apps).
> Attrs: for, open, placement, distance, skidding, without-arrow,
>        strategy, flip, shift, arrow, auto-size, boundary,
>        flip-fallback-placements, flip-fallback-strategy,
>        flip-padding, shift-padding, auto-size-padding
> Props: anchor (Element | string | VirtualElement)
> Methods: show(), hide(), reposition()
> Events: iswc-show, iswc-after-show, iswc-hide, iswc-after-hide (cancelables),
>         iswc-reposition { placement, x, y }, iswc-hover-bridge { hovering }
> Parts: ::part(body) ::part(dialog) ::part(popup) ::part(arrow)
>        ::part(hover-bridge) ::part(anchor)
> CSS: --max-width --arrow-size --show-duration --hide-duration
>        --auto-size-available-width --auto-size-available-height
> data-popover="close" en hijos cierra el popover.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./floating.js`](./floating.js) (interno)

Tags del módulo: `<iswc-popover>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-haspopup`, `aria-expanded`.

## Ejemplo avanzado

```html
<iswc-button id="pop1">Show popover</iswc-button>
<iswc-popover for="pop1">
…contenido…
<iswc-button data-popover="close">Dismiss</iswc-button>
</iswc-popover>
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
- [Preview](./popover.json)
