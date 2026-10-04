---
tag: iswc-observer
tags:
  - iswc-observer
category: helpers
status: public
source: ./observer.js
style: ./observer.css
preview: ./observer.json
---
# `<iswc-observer>`

## Propósito

Web Component genérico que envuelve `IntersectionObserver`, `MutationObserver` y `ResizeObserver` vía `type`. Los nombres históricos (`iswc-intersection-observer`, `iswc-mutation-observer`, `iswc-resize-observer`) son alias con `type` prefijado.

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
<iswc-observer type="intersection" intersect-class="visible">
  <div>…</div>
</iswc-observer>

<iswc-observer type="mutation" attr="class open" child-list>
  <div>…</div>
</iswc-observer>

<iswc-observer type="resize">
  <div style="resize:both;overflow:auto">…</div>
</iswc-observer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `type` | `intersection` \| `mutation` \| `resize` | Obligatorio en `<iswc-observer>` |
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


| Evento | Descripción |
| --- | --- |
| `iswc-intersect` | Emitido al entrar/salir de la zona observada. |
| `iswc-mutate` | Emitido al detectarse una mutación en el árbol observado. |
| `iswc-resize` | Emitido al cambiar el tamaño del elemento observado. |

| Evento | `type` | detail |
| --- | --- | --- |
| `iswc-intersect` | intersection | `{ entry }` |
| `iswc-mutate` | mutation | `{ records }` |
| `iswc-resize` | resize | `{ entries }` |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-observer');
el.addEventListener('iswc-intersect', (e) => {
  console.log('iswc-intersect', e.detail);
});
```

</details>

### Métodos y propiedades públicas

No expone.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |

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
<iswc-observer type="intersection" once intersect-class="in-view" threshold="0.4">
  <iswc-card>Aparece al entrar en viewport</iswc-card>
</iswc-observer>
```

## Errores comunes

- Olvidar `type` en `<iswc-observer>`.
- No escuchar el evento correcto (`iswc-intersect` / `iswc-mutate` / `iswc-resize`).

## Reglas para LLM

- Contrato unificado: este MD + preview `helpers/iswc-observer.html`.
- No inventar tipos fuera de `intersection|mutation|resize`.

## Fuentes

- `./observer.js` · `./observer.css`
- Preview: `./observer.json`
