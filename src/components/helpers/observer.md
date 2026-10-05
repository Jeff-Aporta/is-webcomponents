---
tag: iswc-observer
tags:
  - iswc-observer
category: helpers
status: public
source: ./observer.ts
style: ./observer.css
preview: ./observer.json
---
# `<iswc-observer>`

## PropÃ³sito

Web Component genÃ©rico que envuelve `IntersectionObserver`, `MutationObserver` y `ResizeObserver` vÃ­a `type`. Los nombres histÃ³ricos (`iswc-intersection-observer`, `iswc-mutation-observer`, `iswc-resize-observer`) son alias con `type` prefijado.

## CuÃ¡ndo usarlo

Observar visibilidad, mutaciones del subÃ¡rbol o tamaÃ±o de hijos sin cablear observers a mano.

## CuÃ¡ndo no usarlo

No crear otro wrapper Observer si este mÃ³dulo (o sus alias) cubre el caso.

## ImportaciÃ³n

```js
import './observer.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-observer type="intersection" intersect-class="visible">
  <div>â€¦</div>
</iswc-observer>

<iswc-observer type="mutation" attr="class open" child-list>
  <div>â€¦</div>
</iswc-observer>

<iswc-observer type="resize">
  <div style="resize:both;overflow:auto">â€¦</div>
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
| `threshold` | number | 0â€“1 |
| `attr` | string | Filtro de atributos (mutation) |
| `child-list` | boolean | Default true |
| `character-data` | boolean | Mutation |

#### Propiedades pÃºblicas

No expone propiedades de negocio adicionales.

### Slots

| Slot | Uso |
| --- | --- |
| default | Elementos a observar / subÃ¡rbol a vigilar |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-intersect` | Emitido al entrar/salir de la zona observada. |
| `iswc-mutate` | Emitido al detectarse una mutaciÃ³n en el Ã¡rbol observado. |
| `iswc-resize` | Emitido al cambiar el tamaÃ±o del elemento observado. |

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

### MÃ©todos y propiedades pÃºblicas

No expone.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No es form-associated.

## Comportamiento

Una instancia de observer por elemento; `disconnect()` en `disconnectedCallback`. Alias histÃ³ricos reutilizan esta clase.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- Alias: `intersection-observer.js`, `mutation-observer.js`, `resize-observer.js`

## Accesibilidad

No altera el Ã¡rbol accesible (`display: contents`); el contenido observado sigue siendo el del light DOM.

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

- `./observer.js` Â· `./observer.css`
- Preview: `./observer.json`
