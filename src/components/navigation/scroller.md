---
tag: iswc-scroller
tags:
  - iswc-scroller
category: navigation
status: public
source: ./scroller.ts
style: ./scroller.css
preview: ./scroller.json
---
# `<iswc-scroller>`

## PropÃ³sito

Wrapper que aÃ±ade scroll horizontal (o vertical) con botones prev/next
automÃ¡ticos cuando el contenido del slot desborda. Ideal para
listas de pills, carruseles de chips, drawers inline, etc.

Este mÃ³dulo registra `<iswc-scroller>`.

## CuÃ¡ndo usarlo

OrientaciÃ³n, movimiento entre vistas y navegaciÃ³n jerÃ¡rquica o secuencial.

## CuÃ¡ndo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## ImportaciÃ³n

```js
import './scroller.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-scroller>
<iswc-button>Pills 1</iswc-button>
<iswc-button>Pills 2</iswc-button>
â€¦
</iswc-scroller>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `orientation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-scroll-buttons` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `orientation` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `scroll-button-start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `scroll-button-end` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-scroll-overflow` | Evento personalizado del componente (scroll overflow). |
| `iswc-scroll-position` | Evento personalizado del componente (scroll position). |
| `iswc-scroll-start` | Evento personalizado del componente (scroll start). |
| `iswc-scroll-end` | Evento personalizado del componente (scroll end). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-scroll-overflow` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-scroll-position` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-scroll-start` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |
| `iswc-scroll-end` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-scroller');
el.addEventListener('iswc-scroll-overflow', (e) => {
  console.log('iswc-scroll-overflow', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `scrollTo()` | MÃ©todo pÃºblico declarado. |
| `scrollBy()` | MÃ©todo pÃºblico declarado. |
| `getViewport()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `scroll-button` | Personalizable con `::part(scroll-button)`. |
| `viewport` | Personalizable con `::part(viewport)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--btn-size` | Token leÃ­do o definido por componente. |
| `--btn-bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-2` | Token leÃ­do o definido por componente. |
| `--btn-fg` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--btn-border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-scroller> â€” Web Component (vanilla, zero dependencies).
> AÃ±ade scroll horizontal con botones cuando el contenido del slot desborda.
> Atributos:
>   orientation            horizontal | vertical | both  (default 'horizontal')
>   without-scroll-buttons boolean                       (default false)
> Slots:
>   (default)               contenido a scrollear.
>   scroll-button-start     override del botÃ³n prev.
>   scroll-button-end       override del botÃ³n next.
> CSS Parts:
>   ::part(base)            contenedor scroller.
>   ::part(viewport)        viewport real (overflow:auto).
>   ::part(scroll-button)   botones prev/next.
> Eventos:
>   iswc-scroll-start    detail: { direction: -1 }
>   iswc-scroll-end      detail: { direction: +1 }
>   iswc-scroll-overflow detail: { overflowing: boolean }
>   iswc-scroll-position detail: { scrollLeft, scrollTop }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-scroller>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-scroller>
<iswc-button>Pills 1</iswc-button>
<iswc-button>Pills 2</iswc-button>
â€¦
</iswc-scroller>
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

- [JavaScript](./scroller.ts)
- [CSS](./scroller.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./scroller.json)
