---
tag: is-dropzone
tags:
  - is-dropzone
category: forms
status: public
source: ./dropzone.js
style: ./dropzone.css
preview: ../../previews/forms/is-dropzone.json
---
# `<is-dropzone>`

## Propósito

Zona de arrastrar-y-soltar archivos con cola visible: miniatura (o icono por
tipo MIME), nombre, tamaño formateado, barra de progreso y botón de quitar.
Valida cantidad, tamaño y tipo antes de encolar.

Este módulo registra `<is-dropzone>`.

## Cuándo usarlo

Para adjuntar varios archivos con retroalimentación visual: soportes de una
operación, comprobantes de pago, imágenes de productos. La cola es el estado
de verdad y se lee por `dz.files`.

## Cuándo no usarlo

- Para un solo archivo sin previsualización: `<is-file-input>` o
  `<input type="file">` bastan y sí llegan al `FormData`.
- Dentro de un `<form>` esperando envío automático: **no es form-associated**
  (ver [Integración con formularios](#integración-con-formularios)).
- Como cliente de subida real: `upload()` es una **simulación**, no hace
  ninguna petición de red.

## Importación

```js
import './dropzone.js';
```

## Ejemplo mínimo

```html
<is-dropzone multiple accept="image/*,.pdf"></is-dropzone>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `accept` | string | *(todo)* | Mismo formato que `<input type="file">`: extensiones (`.pdf`), comodines (`image/*`) o MIME exactos, separados por coma. Se refleja al input interno y además se valida en JS; un archivo que no encaje emite `is-error` con `reason: 'accept'`. |
| `multiple` | boolean | ausente | Permite elegir varios archivos en el diálogo nativo. **Ojo**: no limita el arrastre — sin `multiple` el usuario puede soltar varios y todos se encolan. |
| `max-files` | number | `Infinity` | Tope de archivos en la cola. Al alcanzarlo emite `is-error` con `reason: 'max-files'` y **corta el resto del lote** (`break`). |
| `max-size` | number (bytes) | `Infinity` | Tamaño máximo por archivo. El que lo supere se salta y emite `is-error` con `reason: 'max-size'`. |
| `chunked` | boolean | ausente | Declarado en `observedAttributes` pero **nunca leído**. `upload()` simula progreso por partes con o sin él; el atributo no cambia ningún comportamiento. |

Un valor no numérico (o `0`) en `max-files` / `max-size` cae a `Infinity` por
el `|| Infinity`, así que `max-files="0"` **no** bloquea la carga.

#### Propiedades públicas

| Propiedad | Acceso | Tipo | Descripción |
| --- | --- | --- | --- |
| `files` | solo lectura | `FileRecord[]` | Array vivo de la cola. El getter devuelve la referencia interna: mutarla desde fuera desincroniza el render. |

**FileRecord**

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | string | Identificador `f<n>_<base36>` generado al encolar. |
| `file` | `File` | El objeto `File` original. |
| `name` | string | `file.name`. |
| `size` | number | Bytes. |
| `type` | string | MIME reportado por el navegador. |
| `status` | string | `'queued'` \| `'uploading'` \| `'done'`. El valor `'error'` está previsto en el CSS pero **nunca se asigna**. |
| `progress` | number | 0–100. |
| `url` | string | Object URL de la miniatura; solo para `image/*`, cadena vacía en el resto. |

### Slots

No expone. El shadow root no declara ningún `<slot>`, así que los textos de la
zona (`Arrastrá archivos acá` / `o hacé click para elegir`) y el icono
`mdi:cloud-upload-outline` están fijos en el template y no se pueden
reemplazar desde el light DOM.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-files-change` | `{ files }` — referencia al array vivo de la cola | sí | sí | no |
| `is-upload-start` | `{ id, file }` | sí | sí | no |
| `is-upload-progress` | `{ id, file, progress }` — `progress` 0–100 | sí | sí | no |
| `is-upload-end` | `{ id, file, ok }` — `ok` siempre `true` | sí | sí | no |
| `is-error` | `{ reason, limit }` o `{ id, file, reason }` según el caso | sí | sí | no |

`is-files-change` se emite al terminar de procesar un lote (arrastre,
selección, `addFile`, `addFiles`) y al quitar un archivo con `removeFile`.

Formas del `detail` de `is-error`:

| `reason` | detail | Cuándo |
| --- | --- | --- |
| `'max-files'` | `{ reason, limit }` — **sin** `id` ni `file` | La cola llegó al tope; el resto del lote se descarta. |
| `'max-size'` | `{ id: null, file, reason, limit }` | El archivo supera `max-size`. |
| `'accept'` | `{ id: null, file, reason }` — **sin** `limit` | El archivo no encaja con `accept`. |

La cabecera del `.js` documenta `is-upload-end` con un campo `error?` y un
`is-error` uniforme con `{ id, file, reason }`. En el código no hay ninguna
ruta que produzca error de subida, así que `error` nunca aparece y `id`/`file`
faltan en el caso `max-files`.

### Métodos y propiedades públicas

| Método | Firma | Descripción |
| --- | --- | --- |
| `addFile(file)` | `(File) => void` | Azúcar sobre `addFiles([file])`. |
| `addFiles(files)` | `(File[]) => void` | Valida y encola un lote; re-renderiza y emite `is-files-change`. |
| `removeFile(id)` | `(string) => void` | Quita el registro, revoca su object URL si existe, re-renderiza y emite `is-files-change`. |
| `upload()` | `() => Promise<void>` | **Simulación.** Recorre los registros en `'queued'` y, para cada uno, emite 24 pasos de progreso con esperas de 30–90 ms antes de marcarlo `'done'`. No hace ninguna petición HTTP. |

`upload()` es asíncrona y secuencial: procesa un archivo tras otro. La subida
real la implementa el consumidor escuchando los eventos o leyendo `dz.files`.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor flex vertical con la zona y la cola. |
| `zone` | Área punteada de drop (`tabindex="0"`, foco visible). |
| `queue` | `<ol>` con las filas de archivos. |

Las filas de la cola, la miniatura, la barra de progreso y el botón de quitar
**no** exponen `part`: no se pueden estilar individualmente desde fuera.

### Custom states

No expone. No usa `ElementInternals`. El estado de arrastre y el de cada fila
viajan por clases internas del shadow DOM (`.is-over` sobre la zona,
`.status-queued` / `.status-uploading` / `.status-done` sobre la fila), no
accesibles con `:state()` desde el light DOM.

### CSS custom properties

Tokens que el `.css` lee realmente:

| Token | Uso |
| --- | --- |
| `--is-text` | Color de texto y base de los tramados y fondos con `color-mix`. |
| `--is-border` | Borde punteado de la zona y borde de cada fila de la cola. |
| `--is-radius` | Radio de la zona y de las filas; default `12px` en la zona, `8px` en las filas. |
| `--is-accent` | Icono, borde y fondo al enfocar o arrastrar, y color de la barra de progreso. |
| `--is-text-soft` | Subtítulo, tamaño de archivo, texto de estado y color del botón de quitar. |
| `--is-bg-elev` | Fondo de cada fila de la cola. |
| `--is-bg-soft` | Fondo de la miniatura. |
| `--is-success` | Color del texto de estado cuando el archivo terminó; fallback `#16a34a`. |
| `--is-danger` | Fondo del botón de quitar al pasar el mouse y color del estado de error; fallback `#dc2626`. |

### Integración con formularios

**No participa en formularios.** No declara `static formAssociated`, no llama
a `attachInternals()` ni a `setFormValue()`, y no acepta `name`, `required`
ni `disabled`. El `<input type="file">` interno vive dentro del shadow root,
así que **tampoco** aporta al `FormData` del `<form>` que lo contenga, y
`form.reset()` no vacía la cola.

Para enviarlo, construye el `FormData` a mano desde `dz.files`:

```js
const dz = document.querySelector('is-dropzone');
const form = new FormData();
for (const rec of dz.files) form.append('soportes[]', rec.file, rec.name);
await fetch('/api/soportes', { method: 'POST', body: form });
```

## Comportamiento

- La zona responde a click, Enter y Espacio abriendo el diálogo nativo, y a
  `dragover` / `dragleave` / `drop` con la clase `.is-over`.
- Tras cada selección el `<input>` interno se limpia (`value = ''`), así que
  volver a elegir el mismo archivo sí dispara `change`.
- El orden de validación por archivo es: cupo (`max-files`, corta el lote) →
  tamaño (`max-size`, salta el archivo) → tipo (`accept`, salta el archivo).
- **No hay deduplicación**: soltar dos veces el mismo archivo lo encola dos
  veces con `id` distintos.
- Solo los `image/*` reciben `URL.createObjectURL` para la miniatura; el resto
  muestra un icono elegido por MIME (imagen, video, audio, PDF, ZIP o genérico).
- `removeFile` revoca el object URL, pero desconectar el componente del DOM
  **no** revoca los pendientes: si lo montas y desmontas mucho con imágenes
  grandes, llama a `removeFile` antes de descartarlo.
- El nombre del archivo se escapa con `escapeHtml` antes de inyectarlo en la
  fila.
- La `<progress>` se actualiza en sitio durante `upload()` sin re-renderizar
  la lista completa.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/dom-utils.js`](../_shared/dom-utils.js)
- [`../media/icon.js`](../media/icon.js) — importado por el módulo, no hace
  falta importarlo aparte.

Tags del módulo: `<is-dropzone>`.

## Accesibilidad

- La zona es `tabindex="0"` y responde a Enter y Espacio, con `:focus-visible`
  marcado por borde y fondo de acento.
- El botón de quitar de cada fila lleva `aria-label="Quitar"` y su glifo `✕`
  está marcado `aria-hidden="true"`.
- La miniatura de imagen usa `alt=""` (decorativa), correcto porque el nombre
  del archivo ya se anuncia en la misma fila.
- Puntos a cubrir desde el consumidor: la zona no tiene `role="button"` ni
  etiqueta accesible propia (un lector anuncia solo su texto interno), la cola
  no es una *live region*, así que el progreso y los errores no se anuncian
  solos, y los `is-error` no producen mensaje visible — píntalo tú.

## Ejemplo avanzado

```html
<is-dropzone
  id="soportes"
  multiple
  accept="image/*,.pdf"
  max-files="5"
  max-size="5242880"
></is-dropzone>
<button type="button" id="enviar">Subir soportes</button>
<p id="aviso" role="status"></p>

<script type="module">
  import './dropzone.js';

  const dz = document.getElementById('soportes');
  const aviso = document.getElementById('aviso');

  dz.addEventListener('is-files-change', (e) => {
    aviso.textContent = `${e.detail.files.length} archivo(s) en cola`;
  });

  dz.addEventListener('is-error', (e) => {
    const { reason, limit, file } = e.detail;
    if (reason === 'max-files') aviso.textContent = `Máximo ${limit} archivos.`;
    if (reason === 'max-size')  aviso.textContent = `"${file.name}" supera los ${limit} bytes.`;
    if (reason === 'accept')    aviso.textContent = `"${file.name}" no es un tipo permitido.`;
  });

  // Subida real: la del componente es simulada.
  document.getElementById('enviar').addEventListener('click', async () => {
    for (const rec of dz.files) {
      if (rec.status !== 'queued') continue;
      const body = new FormData();
      body.append('archivo', rec.file, rec.name);
      const res = await fetch('/api/soportes', { method: 'POST', body });
      if (res.ok) dz.removeFile(rec.id);
      else aviso.textContent = `Falló "${rec.name}".`;
    }
  });
</script>
```

## Errores comunes

- Llamar a `upload()` creyendo que sube al servidor: solo emite eventos de
  progreso simulado.
- Poner `chunked` esperando subida por partes: el atributo no se lee.
- Poner el componente en un `<form>` y esperar los archivos en el `FormData`:
  no es form-associated y su `<input>` está en shadow DOM.
- Omitir `multiple` creyendo que limita a un archivo: solo afecta al diálogo
  nativo, no al arrastre. Usa `max-files="1"`.
- Usar `max-files="0"` o `max-size="0"` para bloquear: ambos caen a `Infinity`.
- Leer `e.detail.file` en un `is-error` de `max-files`: ahí no viene.
- Mutar `dz.files` directamente en vez de usar `addFile` / `removeFile`.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- La subida real siempre la implementa el consumidor; no documentar `upload()`
  como cliente HTTP.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.
- Crear tamaños con `font-size` contextual y `em`, nunca con variantes de size.

## Fuentes

- [JavaScript](./dropzone.js)
- [CSS](./dropzone.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-dropzone.json)
