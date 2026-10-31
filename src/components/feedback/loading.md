---
tag: iswc-loading
tags:
  - iswc-loading
category: feedback
status: public
source: ./loading.ts
style: ./loading.scss
preview: ./loading.json
---
# `<iswc-loading>`

## Propósito

Indicador de carga en línea: spinner y texto opcional. El mismo en chats, registros y diálogos.

## Cuándo usarlo

- Dentro de un panel o de una lista mientras llega algo.

## Cuándo no usarlo

- Bloquear una zona: `iswc-loading-overlay`.
- Caja con título y acción: `iswc-empty-state`.

## Importación

```js
import './loading.js';
```

## Ejemplo mínimo

```html
<iswc-loading texto="Cargando mensajes…"></iswc-loading>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `texto` | string | "" | Rótulo junto al spinner. |

### Slots

No tiene slots.

### Eventos

No emite eventos propios.

### Métodos y propiedades públicas

`props`: las claves de la tabla anterior, en camelCase.

### CSS parts

| Part | Elemento |
| --- | --- |
| `spinner` | El `iswc-spinner`. |
| `texto` | El rótulo. |

### Custom states

No expone custom states.

### CSS custom properties

| Propiedad | Default | Uso |
| --- | --- | --- |
| `--iswc-loading-padding` | `2em` | Padding vertical. |

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<iswc-spinner part="spinner"></iswc-spinner><span part="texto">…</span>
```

## Comportamiento

- El host es `role="status"` con `aria-live="polite"`.

## Dependencias y componentes relacionados

Usa `iswc-spinner`.

## Accesibilidad

Se anuncia al aparecer y al cambiar `texto`.

## Ejemplo avanzado

```html
<iswc-loading texto="Cargando mensajes…"></iswc-loading>
```

## Errores comunes

- Dejar varios a la vez en la misma lista: con uno basta.

## Reglas para LLM

- Para carga en línea usa este tag; no `iswc-spinner` más un `span`.

## Fuentes

- [loading.ts](./loading.ts) · [loading.scss](./loading.scss) · [loading.json](./loading.json)
