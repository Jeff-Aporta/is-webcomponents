---
tag: iswc-scrollspy
tags:
  - iswc-scrollspy
category: layout
status: public
source: ./scrollspy.ts
style: ./scrollspy.css
preview: ./scrollspy.json
---
# `<iswc-scrollspy>`

## PropÃ³sito

<iswc-scrollspy> â€” Web Component (vanilla, zero dependencies).

Este mÃ³dulo registra `<iswc-scrollspy>`.

## CuÃ¡ndo usarlo

Estructura, superficies, overlays y navegaciÃ³n por regiones de contenido.

## CuÃ¡ndo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## ImportaciÃ³n

```js
import './scrollspy.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-scrollspy></iswc-scrollspy>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `target` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `trigger` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `root-margin` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `threshold` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `triggers` | solo lectura | Declarada por clase. |
| `active` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-deactivated` | Evento personalizado del componente (deactivated). |
| `iswc-activated` | Evento personalizado del componente (activated). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-deactivated` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-activated` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-scrollspy');
el.addEventListener('iswc-deactivated', (e) => {
  console.log('iswc-deactivated', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `refresh()` | MÃ©todo pÃºblico declarado. |
| `activate()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-accent-bg` | Token leÃ­do o definido por componente. |
| `--iswc-brand-text` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-scrollspy> â€” Web Component (vanilla, zero dependencies).
> Observa la intersecciÃ³n de un conjunto de "triggers" dentro de un contenedor
> scrollable y va marcando el enlace correspondiente del nav con
>   aria-current="location"   y la clase CSS  iswc-scrollspy-active
> a medida que el usuario hace scroll.
> Pensado para la navegaciÃ³n lateral de los previews de docs:
>   <iswc-main slot="start">
>     <section id="intro">â€¦</section>
>     <section id="examples">â€¦</section>
>     <section id="reference">â€¦</section>
>   </iswc-main>
>   <aside class="sidebar" slot="end">
>     <iswc-scrollspy target="iswc-main">
>       <a href="#intro">IntroducciÃ³n</a>
>       <a href="#examples">Ejemplos</a>
>       <a href="#reference">Referencia</a>
>     </iswc-scrollspy>
>   </aside>
> Atributos
>   target        CSS selector â€” contenedor scrollable que se observa.
>                 Si no se da, se resuelve al ancestro: <iswc-main>, <main>,
>                 [role="main"] o el propio <iswc-split-panel>.
>   trigger       CSS selector â€” quÃ© hijos del target actuan como secciones.
>                 Por defecto: section[id], article[id].
>   root-margin   string pasado a IntersectionObserver. Default "-30% 0px -55% 0px"
>                 (en el centro del viewport, igual que el IO inline de los previews).
>   threshold     number 0..1. Default 0.
> Slots
>   default   enlaces <a href="#id"> que el componente va marcando.
>             Cada <a> cuyo hash coincida con el id de un trigger activo
>             recibe aria-current="location" e `iswc-scrollspy-active`.
> API
>   spy.activate(id)   fuerza la marca del enlace con ese id (sin scroll)
>   spy.refresh()       re-registra los triggers (si el target cambiÃ³)
>   spy.triggers        array con los triggers observados
>   spy.active          id del trigger activo (o null)
> Eventos
>   iswc-activated  detail: { id, link }  â€” cada vez que un enlace se marca
>   iswc-deactivated detail: { id, link } â€” al perder la marca
> CSS hooks
>   El nav marcado: `iswc-scrollspy-nav.iswc-scrollspy-active` y el enlace
>   `a.iswc-scrollspy-active` (mismo estilo que `.sidebar nav a.active`).

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-scrollspy>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-current`.

## Ejemplo avanzado

```html
<iswc-scrollspy></iswc-scrollspy>
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

- [JavaScript](./scrollspy.ts)
- [CSS](./scrollspy.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
