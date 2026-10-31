---
tag: iswc-page-header
tags:
  - iswc-page-header
category: layout
status: public
source: ./page-header.ts
style: ./page-header.scss
preview: ./page-header.json
---
# `<iswc-page-header>`

## Propósito

Fila de arriba de una vista: ícono, título, subtítulo y un slot para los botones. Con ella todas las vistas de una app empiezan igual.

## Cuándo usarlo

- Arriba de cualquier vista de una app.
- Cuando la vista tiene acciones globales (crear, exportar).

## Cuándo no usarlo

- Título de una tarjeta: usa el slot `header` de `iswc-card`.
- Títulos dentro del contenido: `iswc-heading`.

## Importación

```js
import './page-header.js';
```

## Ejemplo mínimo

```html
<iswc-page-header titulo="Proyectos" subtitulo="Tableros de la empresa" icono="mdi:view-column-outline">
  <iswc-button slot="acciones" color="brand">Nuevo</iswc-button>
</iswc-page-header>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `titulo` | string | "" | Título (`<h1>`). |
| `subtitulo` | string | "" | Línea bajo el título. |
| `icono` | string | "" | Ícono Iconify. |

### Slots

| Slot | Contenido |
| --- | --- |
| `acciones` | Botones o selectores a la derecha. |

### Eventos

No emite eventos propios.

### Métodos y propiedades públicas

`props`: las claves de la tabla anterior, en camelCase.

### CSS parts

| Part | Elemento |
| --- | --- |
| `cabecera` | Contenedor. |
| `titulo` | El `<h1>`. |
| `subtitulo` | La línea bajo el título. |
| `acciones` | Caja de las acciones. |

### Custom states

No expone custom states.

### CSS custom properties

| Propiedad | Default | Uso |
| --- | --- | --- |
| `--iswc-page-header-title-font` | `inherit` | Fuente del título. |

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<header part="cabecera">
  <h1 part="titulo"><iswc-icon></iswc-icon>…</h1><p part="subtitulo">…</p>
  <div part="acciones"><slot name="acciones"></slot></div>
</header>
```

## Comportamiento

- Sin `subtitulo` ni `icono`, esos nodos no ocupan espacio.
- Las acciones bajan de línea cuando no caben.

## Dependencias y componentes relacionados

Usa `iswc-icon`. Relacionados: `iswc-heading`, `iswc-card`.

## Accesibilidad

El título es un `<h1>`: úsalo una sola vez por vista.

## Ejemplo avanzado

```html
<iswc-page-header titulo="Proyectos" subtitulo="Tableros de la empresa" icono="mdi:view-column-outline">
  <iswc-button slot="acciones" color="brand">Nuevo</iswc-button>
</iswc-page-header>
```

## Errores comunes

- Poner las acciones sin `slot="acciones"`: no se proyectan.

## Reglas para LLM

- Una vista, un `iswc-page-header`.
- Las acciones van en el slot, no al lado.

## Fuentes

- [page-header.ts](./page-header.ts) · [page-header.scss](./page-header.scss) · [page-header.json](./page-header.json)
