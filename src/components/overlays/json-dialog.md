---
tag: iswc-json-dialog
tags:
  - iswc-json-dialog
category: overlays
status: public
source: ./json-dialog.ts
style: ./json-dialog.css
preview: ./json-dialog.json
---
# `<iswc-json-dialog>`

## Propósito

Ver o editar un documento como JSON en un diálogo. Valida mientras se escribe, para que los errores se vean junto al editor y «Aplicar» solo se encienda con un JSON válido.

## Cuándo usarlo

- Editar una configuración avanzada.
- Inspeccionar un payload en solo lectura.

## Cuándo no usarlo

- Editar código en una vista: `iswc-code`.
- Formularios guiados: `iswc-form`.

## Importación

```js
import './json-dialog.js';
```

## Ejemplo mínimo

```html
<iswc-json-dialog id="d"></iswc-json-dialog>
<script type="module">
  const d = document.querySelector('#d');
  d.props = { open: true, titulo: 'Config', valor: '{}', readonly: false };
  d.addEventListener('iswc-json-apply', (e) => guardar(e.detail.valor));
</script>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `open` | boolean | `false` | Abre el diálogo. |
| `titulo` | string | `JSON` | Título. |
| `valor` | string | `{}` | JSON inicial: se toma al abrir. |
| `readonly` | boolean | `true` | Sin «Aplicar». |
| `validar` | `(texto) => { ok, errors, normalized }` | `null` | Solo por `props`. Sin él, basta JSON válido. |
| `texto-cerrar` | string | `Cerrar` | Botón en solo lectura. |
| `texto-cancelar` | string | `Cancelar` | Botón en edición. |
| `texto-aplicar` | string | `Aplicar JSON` | Botón de aplicar. |

### Slots

No tiene slots.

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-json-close` | — | Al cerrar o cancelar. |
| `iswc-json-apply` | `{ valor }` | Al aplicar: el `normalized` del validador. |

### Métodos y propiedades públicas

`props`: las claves de la tabla anterior, en camelCase.

### CSS parts

| Part | Elemento |
| --- | --- |
| `dialogo` | El `iswc-dialog`. |
| `errores` | El `iswc-callout` de errores. |
| `editor` | El `iswc-code`. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<iswc-dialog part="dialogo">
  <iswc-callout part="errores"></iswc-callout><iswc-code part="editor"></iswc-code>
  <iswc-button slot="footer"></iswc-button>
</iswc-dialog>
```

## Comportamiento

- Una edición a medias no se pierde si `props` cambia: el texto se toma solo al abrir.
- Cerrar emite `iswc-json-close`; quien lo usa pone `open: false`.

## Dependencias y componentes relacionados

Usa `iswc-dialog`, `iswc-callout`, `iswc-code` e `iswc-button`.

## Accesibilidad

Heredada de `iswc-dialog`; los errores usan `role="alert"`.

## Ejemplo avanzado

```html
<iswc-json-dialog id="d"></iswc-json-dialog>
<script type="module">
  const d = document.querySelector('#d');
  d.props = { open: true, titulo: 'Config', valor: '{}', readonly: false };
  d.addEventListener('iswc-json-apply', (e) => guardar(e.detail.valor));
</script>
```

## Errores comunes

- No poner `open: false` al oír `iswc-json-close`: el diálogo se reabre al repintar.

## Reglas para LLM

- `validar` es del consumidor: las reglas de negocio no van en el tag.

## Fuentes

- [json-dialog.ts](./json-dialog.ts) · [json-dialog.scss](./json-dialog.scss) · [json-dialog.json](./json-dialog.json)
