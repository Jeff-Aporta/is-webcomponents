---
tag: iswc-scroller
tags:
  - iswc-scroller
category: navigation
status: public
source: ./scroller.js
style: ./scroller.css
preview: ./scroller.json
---
# `<iswc-scroller>`

## Propósito

Wrapper que añade scroll horizontal (o vertical) con botones prev/next
automáticos cuando el contenido del slot desborda. Ideal para
listas de pills, carruseles de chips, drawers inline, etc.

Este módulo registra `<iswc-scroller>`.

## Cuándo usarlo

Orientación, movimiento entre vistas y navegación jerárquica o secuencial.

## Cuándo no usarlo

No separar children multi-tag ni romper teclado/ARIA.

## Importación

```js
import './scroller.js';
```

## Ejemplo mínimo

```html
<iswc-scroller>
<iswc-button>Pills 1</iswc-button>
<iswc-button>Pills 2</iswc-button>
…
</iswc-scroller>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `orientation` | string/según contrato | Fuente define default/restricción. |
| `without-scroll-buttons` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

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


| Evento | Descripción |
| --- | --- |
| `iswc-scroll-overflow` | Evento personalizado del componente (scroll overflow). |
| `iswc-scroll-position` | Evento personalizado del componente (scroll position). |
| `iswc-scroll-start` | Evento personalizado del componente (scroll start). |
| `iswc-scroll-end` | Evento personalizado del componente (scroll end). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-scroll-overflow` | sí | sí | sí | no |
| `iswc-scroll-position` | sí | sí | sí | no |
| `iswc-scroll-start` | según cabecera | según cabecera | según cabecera | según cabecera |
| `iswc-scroll-end` | según cabecera | según cabecera | según cabecera | según cabecera |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-scroller');
el.addEventListener('iswc-scroll-overflow', (e) => {
  console.log('iswc-scroll-overflow', e.detail);
});
```

</details>

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `scrollTo()` | Método público declarado. |
| `scrollBy()` | Método público declarado. |
| `getViewport()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--btn-size` | Token leído o definido por componente. |
| `--btn-bg` | Token leído o definido por componente. |
| `--iswc-bg-2` | Token leído o definido por componente. |
| `--btn-fg` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--btn-border` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-scroller> — Web Component (vanilla, zero dependencies).
> Añade scroll horizontal con botones cuando el contenido del slot desborda.
> Atributos:
>   orientation            horizontal | vertical | both  (default 'horizontal')
>   without-scroll-buttons boolean                       (default false)
> Slots:
>   (default)               contenido a scrollear.
>   scroll-button-start     override del botón prev.
>   scroll-button-end       override del botón next.
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

Tags del módulo: `<iswc-scroller>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-scroller>
<iswc-button>Pills 1</iswc-button>
<iswc-button>Pills 2</iswc-button>
…
</iswc-scroller>
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

- [JavaScript](./scroller.js)
- [CSS](./scroller.css)
- [Índice de categoría](./LLM.md)
- [Preview](./scroller.json)
