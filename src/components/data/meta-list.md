---
tag: iswc-meta-list
tags:
  - iswc-meta-list
category: data
status: public
source: ./meta-list.ts
style: ./meta-list.css
preview: ./meta-list.json
---
# `<iswc-meta-list>`

## Propósito

Lista de metadatos clave → valor, agrupada por secciones con título (ubicación, autor, estado,
etiquetas, ruta…). Es la estructura de los modales de información, fichas y detalles de fila, en
lugar de armar `<dl><dt><dd>` a mano.

## Cuándo usarlo

- Modal o panel «Información» de un documento, registro o archivo.
- Detalle de una fila de tabla (clave: valor).
- Fichas con varias secciones de datos cortos.

## Cuándo no usarlo

- Un solo indicador numérico destacado: `<iswc-stat>`.
- Datos tabulares con muchas filas homogéneas: `<iswc-data-grid>`.
- Formularios editables: los campos `iswc-input`, `iswc-select`…

## Importación

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@<sha40>/dist/cdn/core/loader.min.js"></script>
<!-- o: await ISWebComponentsLoader.ensure('iswc-meta-list') -->
```

## Ejemplo mínimo

```html
<iswc-meta-list heading="Seguridad">
  <script type="application/json">
  [{ "title": "Nota", "rows": [{ "label": "Estado", "value": "En revisión" }, { "label": "Autor", "empty": "Sin registrar" }] }]
  </script>
</iswc-meta-list>
```

## API

### Atributos y propiedades

| Atributo | Propiedad | Tipo | Default | Notas |
| --- | --- | --- | --- | --- |
| `heading` | `heading` | string | — | Título (h3) de la lista. |
| `layout` | `layout` | `grid` \| `stacked` | `grid` | `grid`: clave y valor en columnas; `stacked`: clave sobre valor. Se apila solo en contenedores < 320px. |
| — | `groups` | `MetaGroup[]` | `[]` | `{ title?, rows: { label, value?, mono?, tags?, empty? }[] }[]`. También desde un `<script type="application/json">` hijo. |

Reglas de las filas: `tags` se pintan como `<iswc-tag pill>`; `mono` pinta el valor en `<code>`;
una fila sin valor ni `tags` solo se pinta si trae `empty` (texto atenuado); un grupo sin filas
visibles no se pinta.

### Slots

Ninguno (el `<script type="application/json">` hijo es solo fuente de datos).

### Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Componente de presentación. |

### Métodos y propiedades públicas

Propiedad `groups` (lectura/escritura).

### CSS parts

| Part | Elemento |
| --- | --- |
| `heading` | Título h3. |
| `group` | Cada `<section>` de grupo. |
| `group-title` | Título h4 del grupo. |
| `list` | El `<dl>` del grupo. |
| `label` | Cada `<dt>`. |
| `value` | Cada `<dd>`. |

### Custom states

Ninguno.

### CSS custom properties

| Propiedad | Default | Uso |
| --- | --- | --- |
| `--iswc-meta-list-label-width` | `minmax(84px, max-content)` | Ancho de la columna de claves. |

### Integración con formularios

No aplica.

## Anatomía

```text
<iswc-meta-list>
  #shadow-root
    <h3 part="heading">
    <div class="groups">
      <section part="group">
        <h4 part="group-title">
        <dl part="list"><dt part="label"/><dd part="value"/>…</dl>
```

## Comportamiento

- Asignar `groups` vuelve a pintar todo; los datos se normalizan (lo que no tiene forma se descarta).
- Todo el texto entra como texto (no HTML): seguro para datos de usuario o frontmatter.

## Dependencias y componentes relacionados

- `<iswc-tag>` para los valores `tags`.
- `<iswc-dialog>`: contenedor típico del modal de información.

## Accesibilidad

- Semántica `<dl>/<dt>/<dd>`; los títulos son `h3`/`h4` en orden.
- Contraste de claves con `--iswc-text-dim` sobre el fondo del tema.

## Ejemplo avanzado

```js
const lista = document.querySelector('iswc-meta-list');
lista.groups = [
  { title: 'Ubicación', rows: [{ label: 'Módulo', value: 'Chat' }, { label: 'Posición', value: 'Hoja 3 de 12' }] },
  { title: 'Clasificación', rows: [{ label: 'Tags', tags: ['#seguridad', '#jwt'] }] },
  { title: 'Archivo', rows: [{ label: 'Ruta', value: '020-Chat/040-Procesos/010-Seguridad.md', mono: true }] },
];
```

## Errores comunes

- Pasar HTML en `value`: se muestra literal. Para enlaces o código usar `mono` o una estructura propia.
- Esperar filas vacías: sin `empty` no se pintan.

## Reglas para LLM

- Todo bloque clave → valor se pinta con `<iswc-meta-list>`, nunca con `<dl>` suelto.
- Datos por `groups` o JSON hijo; no inventar atributos.
- `tags` para etiquetas, `mono` para rutas/ids.

## Fuentes

- [meta-list.ts](./meta-list.ts) · [meta-list.scss](./meta-list.scss) · [meta-list.json](./meta-list.json)
