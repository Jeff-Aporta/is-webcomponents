---
tag: iswc-tooltip
tags:
  - iswc-tooltip
category: feedback
status: public
source: ./tooltip.ts
style: ./tooltip.css
preview: ./tooltip.json
---
# `<iswc-tooltip>`

## PropÃ³sito

Tip breve anclado con for. Depende de iswc-popover.

Este mÃ³dulo registra `<iswc-tooltip>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './tooltip.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-button id="tip-target">Hover Me</iswc-button>
<iswc-tooltip for="tip-target">This is a tooltip</iswc-tooltip>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `for` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `open` | boolean | Fuente define default/restricciÃ³n. |
| `placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `trigger` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `distance` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `skidding` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `show-delay` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hide-delay` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `without-arrow` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-show` | no | sÃ­ | sÃ­ | sÃ­ |
| `iswc-after-show` | no | sÃ­ | sÃ­ | sÃ­ |
| `iswc-hide` | no | sÃ­ | sÃ­ | sÃ­ |
| `iswc-after-hide` | no | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-tooltip');
el.addEventListener('iswc-show', (e) => {
  console.log('iswc-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | MÃ©todo pÃºblico declarado. |
| `hide()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |
| `body` | Personalizable con `::part(body)`. |
| `base__arrow` | Flecha del tooltip. |
| `base__popup` | Panel flotante interno del tooltip. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--max-width` | Token leÃ­do o definido por componente. |
| `--arrow-color` | Token leÃ­do o definido por componente. |
| `--iswc-tooltip-bg` | Token leÃ­do o definido por componente. |
| `--iswc-tooltip-fg` | Token leÃ­do o definido por componente. |
| `--arrow-size` | Token leÃ­do o definido por componente. |
| `--iswc-tooltip-arrow-size` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-tooltip-font-size` | Token leÃ­do o definido por componente. |
| `--iswc-tooltip-line-height` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |
| `--iswc-mono` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-tooltip> â€” tip contextual anclado vÃ­a `for`.
> Attrs: for, open, placement, trigger, distance, skidding,
>        show-delay, hide-delay, disabled, without-arrow
> trigger (default "hover focus"): combina hover | focus | click. AdemÃ¡s
>   manual â†’ solo show()/hide(), y se cierra con click fuera o Escape
>   none   â†’ solo show()/hide(), sin cierre automÃ¡tico (lo controla el dueÃ±o)
> Methods: show(), hide()
> Events: iswc-show, iswc-after-show, iswc-hide, iswc-after-hide
> Parts: ::part(tooltip) ::part(body) ::part(base__popup) ::part(base__arrow)
> CSS: --max-width

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../helpers/floating.js`](../helpers/floating.js)

Tags del mÃ³dulo: `<iswc-tooltip>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-describedby`.

## Ejemplo avanzado

```html
<iswc-tooltip for="t-html" trigger="click" style="--max-width:22rem">
<p><strong>Resumen</strong></p>
<ul><li>â€¦</li></ul>
</iswc-tooltip>
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

- [JavaScript](./tooltip.ts)
- [CSS](./tooltip.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./tooltip.json)
