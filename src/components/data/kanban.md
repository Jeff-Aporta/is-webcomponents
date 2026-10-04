---
tag: iswc-kanban
tags:
  - iswc-kanban
  - iswc-kanban-column
  - iswc-kanban-card
category: data
status: public
source: ./kanban.js
style: ./kanban.css
preview: ./kanban.json
---
# `<iswc-kanban>` / `<iswc-kanban-column>` / `<iswc-kanban-card>`

## Propósito

Tablero kanban con columnas y tarjetas. Cada columna tiene un accent
color, badge automático con el conteo, slots de header-actions y
cards con cover, heading, meta, tag y footer.

Este módulo registra `<iswc-kanban>`, `<iswc-kanban-column>`, `<iswc-kanban-card>`.

## Cuándo usarlo

Presentación, comparación, movimiento u organización de datos estructurados.

## Cuándo no usarlo

No reemplazar HTML semántico cuando contenido es estático y simple.

## Importación

```js
import './kanban.js';
```

## Ejemplo mínimo

```html
<iswc-kanban>
<iswc-kanban-column title="Pending" accent="dodgerblue">
<iswc-kanban-card heading="Diseñar landing" tag="Design">…</iswc-kanban-card>
</iswc-kanban-column>
</iswc-kanban>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `columns` | string/según contrato | Fuente define default/restricción. |
| `title` | string/según contrato | Fuente define default/restricción. |
| `accent` | string/según contrato | Fuente define default/restricción. |
| `badge` | string/según contrato | Fuente define default/restricción. |
| `heading` | string/según contrato | Fuente define default/restricción. |
| `meta` | string/según contrato | Fuente define default/restricción. |
| `tag` | string/según contrato | Fuente define default/restricción. |
| `tag-color` | string/según contrato | Fuente define default/restricción. |
| `cover` | string/según contrato | Fuente define default/restricción. |
| `without-shadow` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

No expone.

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `header-actions` | Contenido proyectado. |
| `footer` | Contenido proyectado. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-kanban-card-click` | Evento personalizado del componente (kanban card click). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-kanban-card-click` | sí | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-kanban');
el.addEventListener('iswc-kanban-card-click', (e) => {
  console.log('iswc-kanban-card-click', e.detail);
});
```

</details>

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--accent` | Token leído o definido por componente. |
| `--bg` | Token leído o definido por componente. |
| `--iswc-bg-2` | Token leído o definido por componente. |
| `--fg` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--muted` | Token leído o definido por componente. |
| `--border` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--brand` | Token leído o definido por componente. |
| `--iswc-brand` | Token leído o definido por componente. |
| `--success` | Token leído o definido por componente. |
| `--iswc-success` | Token leído o definido por componente. |
| `--warning` | Token leído o definido por componente. |
| `--iswc-warning` | Token leído o definido por componente. |
| `--danger` | Token leído o definido por componente. |
| `--iswc-danger` | Token leído o definido por componente. |
| `--iswc-bg` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-kanban> + <iswc-kanban-column> + <iswc-kanban-card> — Tablero (vanilla, zero dependencies).
>   <iswc-kanban>
>     <iswc-kanban-column title="Pendiente">
>       <iswc-kanban-card heading="Tarea 1">Descripción</iswc-kanban-card>
>     </iswc-kanban-column>
>   </iswc-kanban>
> Atributos <iswc-kanban>
>   columns        number — nº columnas visibles al estilo "compact".
> Atributos <iswc-kanban-column>
>   title          string
>   accent         string (color, e.g. dodgerblue, #0bb783)
>   badge          string — opcional en el header.
> Atributos <iswc-kanban-card>
>   heading        string
>   meta           string — bajo el heading.
>   tag            string — texto de la badge lateral.
>   tag-color    brand | neutral | success | warning | danger
>   cover          string — URL de imagen de cabecera.
>   without-shadow boolean
> Slots
>   <iswc-kanban-column>
>     (default)       cards.
>     header-actions  elementos en la cabecera.
>   <iswc-kanban-card>
>     (default)        descripción.
>     footer           pie de la card.
> Eventos
>   iswc-kanban-card-click  detail: { card, column }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<iswc-kanban>`, `<iswc-kanban-column>`, `<iswc-kanban-card>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<iswc-kanban>
<iswc-kanban-column title="Pending" accent="dodgerblue">
<iswc-kanban-card heading="Diseñar landing" tag="Design">…</iswc-kanban-card>
</iswc-kanban-column>
</iswc-kanban>
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

- [JavaScript](./kanban.js)
- [CSS](./kanban.css)
- [Índice de categoría](./LLM.md)
- [Preview](./kanban.json)
