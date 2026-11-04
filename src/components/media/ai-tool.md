---
tag: iswc-ai-tool
tags:
  - iswc-ai-tool
category: media
status: public
source: ./ai-tool.ts
style: ./ai-tool.scss
preview: ./ai-tool.json
---
# `<iswc-ai-tool>`

## Propósito

Una herramienta de IA que corre en el navegador con `runonweb`, elegida por props. La herramienta decide la entrada (imagen, audio o texto), las opciones y el resultado. Nada sale del equipo: el modelo se baja una vez y queda en la caché del navegador.

La UI es opcional: toda la lógica vive en `lib/ai/` y cualquier componente la usa sin este tag. Guía: [`src/ai/ai.md`](../../ai/ai.md).

## Cuándo usarlo

- Una pantalla donde la persona corre OCR, transcripción, traducción, quitar fondo o similares por su cuenta.
- La galería de capacidades de IA de una app.

## Cuándo no usarlo

- Un componente que necesita el resultado sin mostrar esta UI: `ejecutar('ocr', imagen)` de `lib/ai/motores.min.mjs`.
- Buscar por significado: `vectorLocal` y `ordenarPorSentido` de `lib/ai/vector-local.min.mjs`.
- Una búsqueda global con paleta: `iswc-semantic-search`, con el orden inyectado.

## Importación

```js
await iswcLoader.load('iswc-ai-tool');
```

## Ejemplo mínimo

```html
<iswc-ai-tool herramienta="translate" texto="Hola"></iswc-ai-tool>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió).

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `herramienta` | string | `ocr` | `ocr`, `remove-bg`, `stt`, `caption`, `depth`, `detect`, `embed`, `classify`, `translate`, `clean`, `emoji`, `tts` o `image`. Una desconocida cae en `ocr`. |
| `texto` | string | `''` | Texto inicial; sin él se muestra el ejemplo de la herramienta. |
| `variant` | `plain` \| `card` | `plain` | `plain` queda dentro de lo que ya la enmarca; `card` trae borde, radio y papel. |

Cambiar `herramienta` o `texto` rehace el formulario y descarta el resultado; cambiar `variant`, no.

### Slots

No tiene slots.

### Eventos

| Evento | Detalle | Cuándo |
| --- | --- | --- |
| `iswc-ai-result` | `{ herramienta, salida, entrada }` | Terminó bien. `salida` trae `texto`, `imagen`, `audio`, `cajas` o `barras`. |
| `iswc-ai-error` | `{ herramienta, mensaje }` | Falló. Posponer la descarga no es un error y no lo emite. |

### Métodos y propiedades públicas

`ejecutar()` corre la herramienta con lo que hay en sus campos y resuelve con la `salida`, o `null` si faltó la entrada, se pospuso o falló. Si ya está corriendo, no hace nada.

### CSS parts

| Part | Elemento |
| --- | --- |
| `herramienta` | La columna completa. |
| `resultado` | La zona del resultado. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<section part="herramienta">
  <header><iswc-icon></iswc-icon> nombre, descripción <iswc-tag>peso</iswc-tag></header>
  <iswc-textarea></iswc-textarea> o <iswc-dropzone></iswc-dropzone>
  <iswc-media-recorder></iswc-media-recorder>
  opciones: <iswc-select></iswc-select> / <iswc-input></iswc-input>
  <iswc-callout></iswc-callout>
  <iswc-button>Ejecutar</iswc-button> estado
  <div part="resultado"></div>
</section>
```

## Comportamiento

- La etiqueta de peso sigue a las opciones: en OCR, Rápida baja 6 MB y Alta 139 MB.
- Hasta 20 MB la descarga arranca sola con un toast; más, un modal la anuncia y empieza a los 5 s. «Ahora no» deja el formulario como estaba.
- El texto generado aparece mientras llega. El resultado largo hace scroll propio.
- La descripción se limita a dos líneas; las etiquetas largas se cortan con puntos suspensivos.
- Si cambian de herramienta a mitad de una ejecución, el resultado no se pinta pero el evento se emite.

## Dependencias y componentes relacionados

Usa `iswc-button`, `iswc-copy-button`, `iswc-progress-bar`, `iswc-tag`, `iswc-dropzone`, `iswc-input`, `iswc-select`, `iswc-textarea`, `iswc-callout`, `iswc-icon` e `iswc-media-recorder`. Los modelos van en `lib/ai/motores/`, fuera del bundle del tag: pesa lo mismo con una herramienta que con trece.

## Accesibilidad

El estado va en `role="status"` y el resultado en `aria-live="polite"`. El texto de entrada lleva `aria-label` con el nombre de la herramienta. El resultado de imagen trae `alt`.

## Ejemplo avanzado

```html
<iswc-ai-tool id="ocr" herramienta="ocr" variant="card"></iswc-ai-tool>
<script type="module">
  document.querySelector('#ocr').addEventListener('iswc-ai-result', (e) => guardar(e.detail.salida.texto));
</script>
```

## Errores comunes

- Meter un motor en un bundle propio: se importa `lib/ai/motores.min.mjs`, nunca `runonweb`.
- Usar el modelo por defecto de `runonweb/embed`: en español devuelve ruido. El estándar es `MODELO_LOCAL`.

## Reglas para LLM

- Una herramienta nueva es una entrada en `src/ai/herramientas.ts` y su motor en `src/ai/motores/<id>.ts`; no toca este componente.
- Nada de descargas propias: toda carga pasa por `conDescarga`.

## Fuentes

- [ai-tool.ts](./ai-tool.ts) · [ai-tool.scss](./ai-tool.scss) · [ai-tool.json](./ai-tool.json) · [ai.md](../../ai/ai.md)
