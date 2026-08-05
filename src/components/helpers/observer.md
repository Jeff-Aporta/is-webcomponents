---
tag: is-observer
tags:
  - is-observer
category: helpers
status: public
source: ./observer.js
style: ./observer.css
preview: ../../previews/helpers/is-observer.html
---
# `<is-observer>`

## Propósito

Web Component genérico que envuelve `IntersectionObserver`, `MutationObserver` y `ResizeObserver` vía `type`. Los nombres históricos (`is-intersection-observer`, `is-mutation-observer`, `is-resize-observer`) son alias con `type` prefijado.

## Cuándo usarlo

Observar visibilidad, mutaciones del subárbol o tamaño de hijos sin cablear observers a mano.

## Cuándo no usarlo

No crear otro wrapper Observer si este módulo (o sus alias) cubre el caso.

## Importación

```js
import './observer.js';
```

## Ejemplo mínimo

```html
<is-observer type="intersection" intersect-class="visible">
  <div>…</div>
</is-observer>

<is-observer type="mutation" attr="class open" child-list>
  <div>…</div>
</is-observer>

<is-observer type="resize">
  <div style="resize:both;overflow:auto">…</div>
</is-observer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `type` | `intersection` \| `mutation` \| `resize` | Obligatorio en `<is-observer>` |
| `disabled` | boolean | Desconecta el observer |
| `intersect-class` | string | Clase a togglear (intersection) |
| `once` | boolean | Deja de observar tras la primera |
| `root` | string | Selector root (default viewport) |
| `root-margin` | string | p. ej. `10px 20px` |
| `threshold` | number | 0–1 |
| `attr` | string | Filtro de atributos (mutation) |
| `child-list` | boolean | Default true |
| `character-data` | boolean | Mutation |

#### Propiedades públicas

No expone propiedades de negocio adicionales.

### Slots

| Slot | Uso |
| --- | --- |
| default | Elementos a observar / subárbol a vigilar |

### Eventos

| Evento | `type` | detail |
| --- | --- | --- |
| `is-intersect` | intersection | `{ entry }` |
| `is-mutate` | mutation | `{ records }` |
| `is-resize` | resize | `{ entries }` |

### Métodos y propiedades públicas

No expone.

### CSS parts

No expone. Host con `display: contents`.

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No es form-associated.

## Comportamiento

Una instancia de observer por elemento; `disconnect()` en `disconnectedCallback`. Alias históricos reutilizan esta clase.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- Alias: `intersection-observer.js`, `mutation-observer.js`, `resize-observer.js`

## Accesibilidad

No altera el árbol accesible (`display: contents`); el contenido observado sigue siendo el del light DOM.

## Ejemplo avanzado

```html
<is-observer type="intersection" once intersect-class="in-view" threshold="0.4">
  <is-card>Aparece al entrar en viewport</is-card>
</is-observer>
```

## Errores comunes

- Olvidar `type` en `<is-observer>`.
- No escuchar el evento correcto (`is-intersect` / `is-mutate` / `is-resize`).

## Reglas para LLM

- Contrato unificado: este MD + preview `helpers/is-observer.html`.
- No inventar tipos fuera de `intersection|mutation|resize`.

## Fuentes

- `./observer.js` · `./observer.css`
- Preview: `../../previews/helpers/is-observer.html`
