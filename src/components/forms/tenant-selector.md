---
tag: iswc-tenant-selector
tags:
  - iswc-tenant-selector
category: forms
status: public
source: ./tenant-selector.ts
style: ./tenant-selector.scss
preview: ./tenant-selector.json
---
# `<iswc-tenant-selector>`

## Propósito

Selector del cliente activo (empresa, organización, espacio) para apps con varios clientes. Solo elige: la app guarda la elección y recarga lo que dependa de ella.

## Cuándo usarlo

- En la barra de una app con sesión y varios clientes.

## Cuándo no usarlo

- Dentro de una vista: el cliente activo es uno para toda la app.
- Un valor cualquiera de formulario: `iswc-select`.

## Importación

```js
import './tenant-selector.js';
```

## Ejemplo mínimo

```html
<iswc-tenant-selector id="s"></iswc-tenant-selector>
<script type="module">
  const s = document.querySelector('#s');
  s.props = { opciones: [{ id: 1, nombre: 'Demo S.A.S.' }], activa: 1 };
  s.addEventListener('iswc-tenant-change', (e) => guardar(e.detail.id));
</script>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `opciones` | `{ id, nombre }[]` | `[]` | Clientes del usuario. |
| `activa` | string \| number \| null | `null` | Id activo; sin él, la primera opción. |
| `icono` | string | `mdi:domain` | Ícono del select. |
| `etiqueta` | string | `Cliente activo` | `aria-label`. |
| `sin-opciones` | string | `Sin opciones` | Texto cuando no hay opciones (`sinOpciones` en `props`). |

### Slots

No tiene slots.

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-tenant-change` | `{ id }` | Al elegir otro cliente. `id` conserva su tipo. |

### Métodos y propiedades públicas

`props`: las claves de la tabla anterior, en camelCase.

### CSS parts

| Part | Elemento |
| --- | --- |
| `selector` | El `iswc-select`. |
| `sin-opciones` | La etiqueta sin opciones. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<iswc-select part="selector"><iswc-icon slot="start"></iswc-icon><iswc-option>…</iswc-option></iswc-select>
```

## Comportamiento

- Sin opciones muestra una etiqueta en lugar del select.
- Elegir la opción activa no emite nada.

## Dependencias y componentes relacionados

Usa `iswc-select`, `iswc-option`, `iswc-tag` e `iswc-icon`.

## Accesibilidad

El select lleva `aria-label` con `etiqueta`.

## Ejemplo avanzado

```html
<iswc-tenant-selector id="s"></iswc-tenant-selector>
<script type="module">
  const s = document.querySelector('#s');
  s.props = { opciones: [{ id: 1, nombre: 'Demo S.A.S.' }], activa: 1 };
  s.addEventListener('iswc-tenant-change', (e) => guardar(e.detail.id));
</script>
```

## Errores comunes

- Esperar que guarde la elección: eso lo hace quien oye el evento.

## Reglas para LLM

- Traduce tus datos a `{ id, nombre }`; el tag no conoce tu modelo.

## Fuentes

- [tenant-selector.ts](./tenant-selector.ts) · [tenant-selector.scss](./tenant-selector.scss) · [tenant-selector.json](./tenant-selector.json)
