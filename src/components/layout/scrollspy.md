---
tag: is-scrollspy
tags:
  - is-scrollspy
category: layout
status: public
source: ./scrollspy.js
style: ./scrollspy.css
---
# `<is-scrollspy>`

## Propósito

<is-scrollspy> — Web Component (vanilla, zero dependencies).

Este módulo registra `<is-scrollspy>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## Importación

```js
import './scrollspy.js';
```

## Ejemplo mínimo

```html
<is-scrollspy></is-scrollspy>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `target` | string/según contrato | Fuente define default/restricción. |
| `trigger` | string/según contrato | Fuente define default/restricción. |
| `root-margin` | string/según contrato | Fuente define default/restricción. |
| `threshold` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `triggers` | solo lectura | Declarada por clase. |
| `active` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-deactivated` | sí | sí | sí | no |
| `is-activated` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `refresh()` | Método público declarado. |
| `activate()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-accent-bg` | Token leído o definido por componente. |
| `--is-brand-text` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-scrollspy> — Web Component (vanilla, zero dependencies).
> Observa la intersección de un conjunto de "triggers" dentro de un contenedor
> scrollable y va marcando el enlace correspondiente del nav con
>   aria-current="location"   y la clase CSS  is-scrollspy-active
> a medida que el usuario hace scroll.
> Pensado para la navegación lateral de los previews de docs:
>   <is-main slot="start">
>     <section id="intro">…</section>
>     <section id="examples">…</section>
>     <section id="reference">…</section>
>   </is-main>
>   <aside class="sidebar" slot="end">
>     <is-scrollspy target="is-main">
>       <a href="#intro">Introducción</a>
>       <a href="#examples">Ejemplos</a>
>       <a href="#reference">Referencia</a>
>     </is-scrollspy>
>   </aside>
> Atributos
>   target        CSS selector — contenedor scrollable que se observa.
>                 Si no se da, se resuelve al ancestro: <is-main>, <main>,
>                 [role="main"] o el propio <is-split-panel>.
>   trigger       CSS selector — qué hijos del target actuan como secciones.
>                 Por defecto: section[id], article[id].
>   root-margin   string pasado a IntersectionObserver. Default "-30% 0px -55% 0px"
>                 (en el centro del viewport, igual que el IO inline de los previews).
>   threshold     number 0..1. Default 0.
> Slots
>   default   enlaces <a href="#id"> que el componente va marcando.
>             Cada <a> cuyo hash coincida con el id de un trigger activo
>             recibe aria-current="location" e `is-scrollspy-active`.
> API
>   spy.activate(id)   fuerza la marca del enlace con ese id (sin scroll)
>   spy.refresh()       re-registra los triggers (si el target cambió)
>   spy.triggers        array con los triggers observados
>   spy.active          id del trigger activo (o null)
> Eventos
>   is-activated  detail: { id, link }  — cada vez que un enlace se marca
>   is-deactivated detail: { id, link } — al perder la marca
> CSS hooks
>   El nav marcado: `is-scrollspy-nav.is-scrollspy-active` y el enlace
>   `a.is-scrollspy-active` (mismo estilo que `.sidebar nav a.active`).

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-scrollspy>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-current`.

## Ejemplo avanzado

```html
<is-scrollspy></is-scrollspy>
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

- [JavaScript](./scrollspy.js)
- [CSS](./scrollspy.css)
- [Índice de categoría](./LLM.md)
