---
tag: iswc-semantic-search
tags:
  - iswc-semantic-search
category: overlays
status: public
source: ./semantic-search.ts
style: ./semantic-search.css
preview: ./semantic-search.json
---
# `<iswc-semantic-search>`

## Propósito

Búsqueda global: un botón que abre `iswc-command-palette` (Ctrl+K) con los comandos de la app. El orden por significado y los resultados extra se inyectan por `props`: el componente no sabe de embeddings ni de ningún API.

## Cuándo usarlo

- En la barra de una app: ir a un módulo o lanzar una acción escribiendo lo que se quiere.

## Cuándo no usarlo

- Filtrar una lista: cada vista tiene su filtro.
- Paleta sin botón ni orden propio: `iswc-command-palette`.

## Importación

```js
import './semantic-search.js';
```

## Ejemplo mínimo

```html
<iswc-semantic-search id="b"></iswc-semantic-search>
<script type="module">
  const b = document.querySelector('#b');
  b.props = { comandos: [{ id: 'nuevo', title: 'Nuevo documento' }], ranker: miOrden };
  b.addEventListener('iswc-select', (e) => ejecutar(e.detail.id));
</script>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `comandos` | `SemanticComando[]` | `[]` | Forma de `iswc-command-palette`; los campos extra se conservan. |
| `ranker` | `(q, comandos) => comandos` | `null` | Reordena por significado. Solo por `props`. |
| `buscar` | `(q) => Promise<comandos>` | `null` | Resultados extra (registros por embeddings). Solo por `props`. |
| `boton` | string | `Buscar…` | Texto del botón. |
| `etiqueta` | string | `Buscar` | `aria-label` del botón. |
| `atajo` | string | `Ctrl K` | Atajo que muestra el botón. |
| `hotkey` | string | `mod+k` | Combinación que abre la paleta. |
| `placeholder` | string | `Busca lo que necesitas…` | Del campo. |
| `vacio` | string | `Nada coincide…` | Sin resultados. |
| `max-resultados` | number | `10` | Tope de resultados (`maxResultados` en `props`). |

### Slots

No tiene slots.

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-select` | `{ id, command }` | Al elegir un resultado. |

### Métodos y propiedades públicas

`open()` y `close()` abren y cierran la paleta.

### CSS parts

| Part | Elemento |
| --- | --- |
| `abrir` | El botón. |
| `texto` | Texto del botón. |
| `atajo` | El `<kbd>`. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<iswc-button part="abrir"><span part="texto">…</span><kbd part="atajo">…</kbd></iswc-button>
<iswc-command-palette></iswc-command-palette>
```

## Comportamiento

- La paleta muestra el orden léxico al instante; `ranker` y `buscar` lo reemplazan tras una pausa.
- Si `ranker` o `buscar` fallan, queda lo que haya: la búsqueda no se rompe.
- En pantallas estrechas el botón queda solo con el ícono.

## Dependencias y componentes relacionados

Usa `iswc-command-palette`, `iswc-button` e `iswc-icon`.

## Accesibilidad

Heredada de `iswc-command-palette`; el botón lleva `aria-label`.

## Ejemplo avanzado

```html
<iswc-semantic-search id="b"></iswc-semantic-search>
<script type="module">
  const b = document.querySelector('#b');
  b.props = { comandos: [{ id: 'nuevo', title: 'Nuevo documento' }], ranker: miOrden };
  b.addEventListener('iswc-select', (e) => ejecutar(e.detail.id));
</script>
```

## Errores comunes

- Pasar `ranker` por atributo: es una función, va en `props`.

## Reglas para LLM

- Nada de embeddings ni API dentro del tag: se inyectan.
- `ranker` recibe los comandos; `buscar` trae lo que no son comandos.

## Fuentes

- [semantic-search.ts](./semantic-search.ts) · [semantic-search.scss](./semantic-search.scss) · [semantic-search.json](./semantic-search.json)
