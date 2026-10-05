---
tag: iswc-kanban
tags:
  - iswc-kanban
  - iswc-kanban-column
  - iswc-kanban-card
category: data
status: public
source: ./kanban.ts
style: ./kanban.css
preview: ./kanban.json
---
# `<iswc-kanban>` / `<iswc-kanban-column>` / `<iswc-kanban-card>`

## PropÃ³sito

Tablero kanban con columnas y tarjetas. Cada columna tiene un accent
color, badge automÃ¡tico con el conteo, slots de header-actions y
cards con cover, heading, meta, tag y footer.

Este mÃ³dulo registra `<iswc-kanban>`, `<iswc-kanban-column>`, `<iswc-kanban-card>`.

## CuÃ¡ndo usarlo

PresentaciÃ³n, comparaciÃ³n, movimiento u organizaciÃ³n de datos estructurados.

## CuÃ¡ndo no usarlo

No reemplazar HTML semÃ¡ntico cuando contenido es estÃ¡tico y simple.

## ImportaciÃ³n

```js
import './kanban.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-kanban>
<iswc-kanban-column title="Pending" accent="dodgerblue">
<iswc-kanban-card heading="DiseÃ±ar landing" tag="Design">â€¦</iswc-kanban-card>
</iswc-kanban-column>
</iswc-kanban>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `columns` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `title` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `accent` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `badge` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `heading` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `meta` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `tag` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `tag-color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `cover` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-shadow` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

No expone.

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `header-actions` | Contenido proyectado. |
| `footer` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-kanban-card-click` | Evento personalizado del componente (kanban card click). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-kanban-card-click` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-kanban');
el.addEventListener('iswc-kanban-card-click', (e) => {
  console.log('iswc-kanban-card-click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `column` | Personalizable con `::part(column)`. |
| `col-head` | Personalizable con `::part(col-head)`. |
| `title` | Personalizable con `::part(title)`. |
| `badge` | Personalizable con `::part(badge)`. |
| `actions` | Personalizable con `::part(actions)`. |
| `lane` | Personalizable con `::part(lane)`. |
| `col-foot` | Personalizable con `::part(col-foot)`. |
| `card` | Personalizable con `::part(card)`. |
| `cover` | Personalizable con `::part(cover)`. |
| `head` | Personalizable con `::part(head)`. |
| `heading` | Personalizable con `::part(heading)`. |
| `tag` | Personalizable con `::part(tag)`. |
| `meta` | Personalizable con `::part(meta)`. |
| `footer` | Personalizable con `::part(footer)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--accent` | Token leÃ­do o definido por componente. |
| `--bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-2` | Token leÃ­do o definido por componente. |
| `--fg` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--muted` | Token leÃ­do o definido por componente. |
| `--border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--brand` | Token leÃ­do o definido por componente. |
| `--iswc-brand` | Token leÃ­do o definido por componente. |
| `--success` | Token leÃ­do o definido por componente. |
| `--iswc-success` | Token leÃ­do o definido por componente. |
| `--warning` | Token leÃ­do o definido por componente. |
| `--iswc-warning` | Token leÃ­do o definido por componente. |
| `--danger` | Token leÃ­do o definido por componente. |
| `--iswc-danger` | Token leÃ­do o definido por componente. |
| `--iswc-bg` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-kanban> + <iswc-kanban-column> + <iswc-kanban-card> â€” Tablero (vanilla, zero dependencies).
>   <iswc-kanban>
>     <iswc-kanban-column title="Pendiente">
>       <iswc-kanban-card heading="Tarea 1">DescripciÃ³n</iswc-kanban-card>
>     </iswc-kanban-column>
>   </iswc-kanban>
> Atributos <iswc-kanban>
>   columns        number â€” nÂº columnas visibles al estilo "compact".
> Atributos <iswc-kanban-column>
>   title          string
>   accent         string (color, e.g. dodgerblue, #0bb783)
>   badge          string â€” opcional en el header.
> Atributos <iswc-kanban-card>
>   heading        string
>   meta           string â€” bajo el heading.
>   tag            string â€” texto de la badge lateral.
>   tag-color    brand | neutral | success | warning | danger
>   cover          string â€” URL de imagen de cabecera.
>   without-shadow boolean
> Slots
>   <iswc-kanban-column>
>     (default)       cards.
>     header-actions  elementos en la cabecera.
>   <iswc-kanban-card>
>     (default)        descripciÃ³n.
>     footer           pie de la card.
> Eventos
>   iswc-kanban-card-click  detail: { card, column }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-kanban>`, `<iswc-kanban-column>`, `<iswc-kanban-card>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-kanban>
<iswc-kanban-column title="Pending" accent="dodgerblue">
<iswc-kanban-card heading="DiseÃ±ar landing" tag="Design">â€¦</iswc-kanban-card>
</iswc-kanban-column>
</iswc-kanban>
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

- [JavaScript](./kanban.ts)
- [CSS](./kanban.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./kanban.json)
