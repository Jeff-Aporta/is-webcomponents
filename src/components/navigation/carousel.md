---
tag: is-carousel
tags:
  - is-carousel
  - is-carousel-item
category: navigation
status: public
source: ./carousel.js
style: ./carousel.css
preview: ../../previews/navigation/is-carousel.json
---
# `<is-carousel>` / `<is-carousel-item>`

## Propósito

Carrusel tipo slides con paginación, autoplay, loop, navegación prev/next,
indicadores, scroll-snap y soporte para swipe en touch.

Este módulo registra `<is-carousel>`, `<is-carousel-item>`.

## Cuándo usarlo

Orientación, movimiento entre vistas y navegación jerárquica o secuencial.

## Cuándo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## Importación

```js
import './carousel.js';
```

## Ejemplo mínimo

```html
<is-carousel loop>
<is-carousel-item>Slide 1</is-carousel-item>
<is-carousel-item>Slide 2</is-carousel-item>
…
</is-carousel>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | string/según contrato | Fuente define default/restricción. |
| `loop` | boolean | Fuente define default/restricción. |
| `autoplay` | string/según contrato | Fuente define default/restricción. |
| `without-controls` | boolean | Fuente define default/restricción. |
| `without-indicators` | boolean | Fuente define default/restricción. |
| `vertical` | boolean | Fuente define default/restricción. |
| `slides-per-page` | string/según contrato | Fuente define default/restricción. |
| `aspect-ratio` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-carousel-slide-end` | no | sí | sí | no |
| `is-carousel-change` | sí | sí | sí | no |
| `is-carousel-play` | sí | sí | sí | no |
| `is-carousel-pause` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `next()` | Método público declarado. |
| `prev()` | Método público declarado. |
| `pause()` | Método público declarado. |
| `play()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--aspect-ratio` | Token leído o definido por componente. |
| `--ctrl-bg` | Token leído o definido por componente. |
| `--is-bg-2` | Token leído o definido por componente. |
| `--ctrl-fg` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--ctrl-border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--indicator-active` | Token leído o definido por componente. |
| `--is-brand` | Token leído o definido por componente. |
| `--indicator` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-carousel> + <is-carousel-item> — Web Components (vanilla, zero dependencies).
> Carrusel tipo slides con paginación, autoplay, loop, navegación prev/next,
> indicadores y soporte para swipe en touch.
>   <is-carousel autoplay loop>
>     <is-carousel-item>…</is-carousel-item>
>     <is-carousel-item>…</is-carousel-item>
>     <is-carousel-item>…</is-carousel-item>
>   </is-carousel>
> Atributos <is-carousel>
>   active             number (0-indexed)
>   loop               boolean                  (default false)
>   autoplay           number (ms)              (default 0 — desactivado)
>   without-controls   boolean                  (oculta prev/next)
>   without-indicators boolean                  (oculta indicators)
>   vertical           boolean                  (slides verticales)
>   slides-per-page    number                   (default 1)
>   aspect-ratio       string                   (CSS, e.g. "16/9")
> Atributos <is-carousel-item>
>   label              string (accesibilidad)
>   disabled           boolean
> Slots
>   <is-carousel>
>     (default)    items.
>     prev-icon    override del icono prev.
>     next-icon    override del icono next.
>   <is-carousel-item>
>     (default)   contenido del slide.
> Eventos
>   is-carousel-change detail: { from, to, item }
>   is-carousel-pause  detail: { reason: 'user' | 'auto' | 'visibility' }
>   is-carousel-play   detail: {}
>   is-carousel-slide-end (cuando termina swipe)
> CSS Parts
>   is-carousel: ::part(base) ::part(viewport) ::part(track) ::part(indicators) ::part(controls)
>   is-carousel-item: ::part(base)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-carousel>`, `<is-carousel-item>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-selected`.

## Ejemplo avanzado

```html
<is-carousel loop>
<is-carousel-item>Slide 1</is-carousel-item>
<is-carousel-item>Slide 2</is-carousel-item>
…
</is-carousel>
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

- [JavaScript](./carousel.js)
- [CSS](./carousel.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/navigation/is-carousel.json)
