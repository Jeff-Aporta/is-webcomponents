---
tag: iswc-carousel
tags:
  - iswc-carousel
  - iswc-carousel-item
category: navigation
status: public
source: ./carousel.ts
style: ./carousel.css
preview: ./carousel.json
---
# `<iswc-carousel>` / `<iswc-carousel-item>`

## PropÃ³sito

Carrusel tipo slides con paginaciÃ³n, autoplay, loop, navegaciÃ³n prev/next,
indicadores, scroll-snap y soporte para swipe en touch.

Este mÃ³dulo registra `<iswc-carousel>`, `<iswc-carousel-item>`.

## CuÃ¡ndo usarlo

OrientaciÃ³n, movimiento entre vistas y navegaciÃ³n jerÃ¡rquica o secuencial.

## CuÃ¡ndo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## ImportaciÃ³n

```js
import './carousel.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-carousel loop>
<iswc-carousel-item>Slide 1</iswc-carousel-item>
<iswc-carousel-item>Slide 2</iswc-carousel-item>
â€¦
</iswc-carousel>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `loop` | boolean | Fuente define default/restricciÃ³n. |
| `autoplay` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-controls` | boolean | Fuente define default/restricciÃ³n. |
| `without-indicators` | boolean | Fuente define default/restricciÃ³n. |
| `vertical` | boolean | Fuente define default/restricciÃ³n. |
| `slides-per-page` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `aspect-ratio` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `active` | lectura/escritura | Declarada por clase. |
| `autoplay` | lectura/escritura | Declarada por clase. |
| `loop` | lectura/escritura | Declarada por clase. |
| `vertical` | lectura/escritura | Declarada por clase. |
| `slidesPerPage` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `prev-icon` | Contenido proyectado. |
| `next-icon` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-carousel-slide-end` | Evento personalizado del componente (carousel slide end). |
| `iswc-carousel-change` | Evento personalizado del componente (carousel change). |
| `iswc-carousel-play` | Evento personalizado del componente (carousel play). |
| `iswc-carousel-pause` | Evento personalizado del componente (carousel pause). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-carousel-slide-end` | no | sÃ­ | sÃ­ | no |
| `iswc-carousel-change` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-carousel-play` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-carousel-pause` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-carousel');
el.addEventListener('iswc-carousel-slide-end', (e) => {
  console.log('iswc-carousel-slide-end', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `next()` | MÃ©todo pÃºblico declarado. |
| `prev()` | MÃ©todo pÃºblico declarado. |
| `pause()` | MÃ©todo pÃºblico declarado. |
| `play()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `viewport` | Personalizable con `::part(viewport)`. |
| `track` | Personalizable con `::part(track)`. |
| `indicators` | Personalizable con `::part(indicators)`. |
| `controls` | Personalizable con `::part(controls)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--aspect-ratio` | Token leÃ­do o definido por componente. |
| `--ctrl-bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-2` | Token leÃ­do o definido por componente. |
| `--ctrl-fg` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--ctrl-border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--indicator-active` | Token leÃ­do o definido por componente. |
| `--iswc-brand` | Token leÃ­do o definido por componente. |
| `--indicator` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-carousel> + <iswc-carousel-item> â€” Web Components (vanilla, zero dependencies).
> Carrusel tipo slides con paginaciÃ³n, autoplay, loop, navegaciÃ³n prev/next,
> indicadores y soporte para swipe en touch.
>   <iswc-carousel autoplay loop>
>     <iswc-carousel-item>â€¦</iswc-carousel-item>
>     <iswc-carousel-item>â€¦</iswc-carousel-item>
>     <iswc-carousel-item>â€¦</iswc-carousel-item>
>   </iswc-carousel>
> Atributos <iswc-carousel>
>   active             number (0-indexed)
>   loop               boolean                  (default false)
>   autoplay           number (ms)              (default 0 â€” desactivado)
>   without-controls   boolean                  (oculta prev/next)
>   without-indicators boolean                  (oculta indicators)
>   vertical           boolean                  (slides verticales)
>   slides-per-page    number                   (default 1)
>   aspect-ratio       string                   (CSS, e.g. "16/9")
> Atributos <iswc-carousel-item>
>   label              string (accesibilidad)
>   disabled           boolean
> Slots
>   <iswc-carousel>
>     (default)    items.
>     prev-icon    override del icono prev.
>     next-icon    override del icono next.
>   <iswc-carousel-item>
>     (default)   contenido del slide.
> Eventos
>   iswc-carousel-change detail: { from, to, item }
>   iswc-carousel-pause  detail: { reason: 'user' | 'auto' | 'visibility' }
>   iswc-carousel-play   detail: {}
>   iswc-carousel-slide-end (cuando termina swipe)
> CSS Parts
>   iswc-carousel: ::part(base) ::part(viewport) ::part(track) ::part(indicators) ::part(controls)
>   iswc-carousel-item: ::part(base)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-carousel>`, `<iswc-carousel-item>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-selected`.

## Ejemplo avanzado

```html
<iswc-carousel loop>
<iswc-carousel-item>Slide 1</iswc-carousel-item>
<iswc-carousel-item>Slide 2</iswc-carousel-item>
â€¦
</iswc-carousel>
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

- [JavaScript](./carousel.ts)
- [CSS](./carousel.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./carousel.json)
