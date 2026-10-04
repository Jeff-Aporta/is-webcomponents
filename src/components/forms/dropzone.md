---
tag: iswc-dropzone
tags:
  - iswc-dropzone
category: forms
status: public
source: ./dropzone.ts
style: ./dropzone.css
preview: ./dropzone.json
---
# `<iswc-dropzone>`

## PropÃ³sito

Zona de arrastrar-y-soltar archivos con cola visible: miniatura (o icono por
tipo MIME), nombre, tamaÃ±o formateado, barra de progreso y botÃ³n de quitar.
Valida cantidad, tamaÃ±o y tipo antes de encolar.

Este mÃ³dulo registra `<iswc-dropzone>`.

## CuÃ¡ndo usarlo

Para adjuntar varios archivos con retroalimentaciÃ³n visual: soportes de una
operaciÃ³n, comprobantes de pago, imÃ¡genes de productos. La cola es el estado
de verdad y se lee por `dz.files`.

## CuÃ¡ndo no usarlo

- Para un solo archivo sin previsualizaciÃ³n: `<iswc-file-input>` o
  `<input type="file">` bastan y sÃ­ llegan al `FormData`.
- Dentro de un `<form>` esperando envÃ­o automÃ¡tico: **no es form-associated**
  (ver [IntegraciÃ³n con formularios](#integraciÃ³n-con-formularios)).
- Como cliente de subida real: `upload()` es una **simulaciÃ³n**, no hace
  ninguna peticiÃ³n de red.

## ImportaciÃ³n

```js
import './dropzone.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-dropzone multiple accept="image/*,.pdf"></iswc-dropzone>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | DescripciÃ³n |
| --- | --- | --- | --- |
| `accept` | string | *(todo)* | Mismo formato que `<input type="file">`: extensiones (`.pdf`), comodines (`image/*`) o MIME exactos, separados por coma. Se refleja al input interno y ademÃ¡s se valida en JS; un archivo que no encaje emite `iswc-error` con `reason: 'accept'`. |
| `multiple` | boolean | ausente | Permite elegir varios archivos en el diÃ¡logo nativo. **Ojo**: no limita el arrastre â€” sin `multiple` el usuario puede soltar varios y todos se encolan. |
| `max-files` | number | `Infinity` | Tope de archivos en la cola. Al alcanzarlo emite `iswc-error` con `reason: 'max-files'` y **corta el resto del lote** (`break`). |
| `max-size` | number (bytes) | `Infinity` | TamaÃ±o mÃ¡ximo por archivo. El que lo supere se salta y emite `iswc-error` con `reason: 'max-size'`. |
| `chunked` | boolean | ausente | Declarado en `observedAttributes` pero **nunca leÃ­do**. `upload()` simula progreso por partes con o sin Ã©l; el atributo no cambia ningÃºn comportamiento. |

Un valor no numÃ©rico (o `0`) en `max-files` / `max-size` cae a `Infinity` por
el `|| Infinity`, asÃ­ que `max-files="0"` **no** bloquea la carga.

#### Propiedades pÃºblicas

| Propiedad | Acceso | Tipo | DescripciÃ³n |
| --- | --- | --- | --- |
| `files` | solo lectura | `FileRecord[]` | Array vivo de la cola. El getter devuelve la referencia interna: mutarla desde fuera desincroniza el render. |

**FileRecord**

| Campo | Tipo | DescripciÃ³n |
| --- | --- | --- |
| `id` | string | Identificador `f<n>_<base36>` generado al encolar. |
| `file` | `File` | El objeto `File` original. |
| `name` | string | `file.name`. |
| `size` | number | Bytes. |
| `type` | string | MIME reportado por el navegador. |
| `status` | string | `'queued'` \| `'uploading'` \| `'done'`. El valor `'error'` estÃ¡ previsto en el CSS pero **nunca se asigna**. |
| `progress` | number | 0â€“100. |
| `url` | string | Object URL de la miniatura; solo para `image/*`, cadena vacÃ­a en el resto. |

### Slots

No expone. El shadow root no declara ningÃºn `<slot>`, asÃ­ que los textos de la
zona (`ArrastrÃ¡ archivos acÃ¡` / `o hacÃ© click para elegir`) y el icono
`mdi:cloud-upload-outline` estÃ¡n fijos en el template y no se pueden
reemplazar desde el light DOM.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-files-change` | Evento personalizado del componente (files change). |
| `iswc-upload-start` | Evento personalizado del componente (upload start). |
| `iswc-upload-progress` | Evento personalizado del componente (upload progress). |
| `iswc-upload-end` | Evento personalizado del componente (upload end). |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-files-change` | `{ files }` â€” referencia al array vivo de la cola | sÃ­ | sÃ­ | no |
| `iswc-upload-start` | `{ id, file }` | sÃ­ | sÃ­ | no |
| `iswc-upload-progress` | `{ id, file, progress }` â€” `progress` 0â€“100 | sÃ­ | sÃ­ | no |
| `iswc-upload-end` | `{ id, file, ok }` â€” `ok` siempre `true` | sÃ­ | sÃ­ | no |
| `iswc-error` | `{ reason, limit }` o `{ id, file, reason }` segÃºn el caso | sÃ­ | sÃ­ | no |

`iswc-files-change` se emite al terminar de procesar un lote (arrastre,
selecciÃ³n, `addFile`, `addFiles`) y al quitar un archivo con `removeFile`.

Formas del `detail` de `iswc-error`:

| `reason` | detail | CuÃ¡ndo |
| --- | --- | --- |
| `'max-files'` | `{ reason, limit }` â€” **sin** `id` ni `file` | La cola llegÃ³ al tope; el resto del lote se descarta. |
| `'max-size'` | `{ id: null, file, reason, limit }` | El archivo supera `max-size`. |
| `'accept'` | `{ id: null, file, reason }` â€” **sin** `limit` | El archivo no encaja con `accept`. |

La cabecera del `.js` documenta `iswc-upload-end` con un campo `error?` y un
`iswc-error` uniforme con `{ id, file, reason }`. En el cÃ³digo no hay ninguna
ruta que produzca error de subida, asÃ­ que `error` nunca aparece y `id`/`file`
faltan en el caso `max-files`.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-dropzone');
el.addEventListener('iswc-files-change', (e) => {
  console.log('iswc-files-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Firma | DescripciÃ³n |
| --- | --- | --- |
| `addFile(file)` | `(File) => void` | AzÃºcar sobre `addFiles([file])`. |
| `addFiles(files)` | `(File[]) => void` | Valida y encola un lote; re-renderiza y emite `iswc-files-change`. |
| `removeFile(id)` | `(string) => void` | Quita el registro, revoca su object URL si existe, re-renderiza y emite `iswc-files-change`. |
| `upload()` | `() => Promise<void>` | **SimulaciÃ³n.** Recorre los registros en `'queued'` y, para cada uno, emite 24 pasos de progreso con esperas de 30â€“90 ms antes de marcarlo `'done'`. No hace ninguna peticiÃ³n HTTP. |

`upload()` es asÃ­ncrona y secuencial: procesa un archivo tras otro. La subida
real la implementa el consumidor escuchando los eventos o leyendo `dz.files`.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor flex vertical con la zona y la cola. |
| `zone` | Ãrea punteada de drop (`tabindex="0"`, foco visible). |
| `queue` | `<ol>` con las filas de archivos. |

Las filas de la cola, la miniatura, la barra de progreso y el botÃ³n de quitar
**no** exponen `part`: no se pueden estilar individualmente desde fuera.

### Custom states

No expone. No usa `ElementInternals`. El estado de arrastre y el de cada fila
viajan por clases internas del shadow DOM (`.iswc-over` sobre la zona,
`.status-queued` / `.status-uploading` / `.status-done` sobre la fila), no
accesibles con `:state()` desde el light DOM.

### CSS custom properties

Tokens que el `.css` lee realmente:

| Token | Uso |
| --- | --- |
| `--iswc-text` | Color de texto y base de los tramados y fondos con `color-mix`. |
| `--iswc-border` | Borde punteado de la zona y borde de cada fila de la cola. |
| `--iswc-radius` | Radio de la zona y de las filas; default `12px` en la zona, `8px` en las filas. |
| `--iswc-accent` | Icono, borde y fondo al enfocar o arrastrar, y color de la barra de progreso. |
| `--iswc-text-soft` | SubtÃ­tulo, tamaÃ±o de archivo, texto de estado y color del botÃ³n de quitar. |
| `--iswc-bg-elev` | Fondo de cada fila de la cola. |
| `--iswc-bg-soft` | Fondo de la miniatura. |
| `--iswc-success` | Color del texto de estado cuando el archivo terminÃ³; fallback `#16a34a`. |
| `--iswc-danger` | Fondo del botÃ³n de quitar al pasar el mouse y color del estado de error; fallback `#dc2626`. |

### IntegraciÃ³n con formularios

**No participa en formularios.** No declara `static formAssociated`, no llama
a `attachInternals()` ni a `setFormValue()`, y no acepta `name`, `required`
ni `disabled`. El `<input type="file">` interno vive dentro del shadow root,
asÃ­ que **tampoco** aporta al `FormData` del `<form>` que lo contenga, y
`form.reset()` no vacÃ­a la cola.

Para enviarlo, construye el `FormData` a mano desde `dz.files`:

```js
const dz = document.querySelector('iswc-dropzone');
const form = new FormData();
for (const rec of dz.files) form.append('soportes[]', rec.file, rec.name);
await fetch('/api/soportes', { method: 'POST', body: form });
```

## Comportamiento

- La zona responde a click, Enter y Espacio abriendo el diÃ¡logo nativo, y a
  `dragover` / `dragleave` / `drop` con la clase `.iswc-over`.
- Tras cada selecciÃ³n el `<input>` interno se limpia (`value = ''`), asÃ­ que
  volver a elegir el mismo archivo sÃ­ dispara `change`.
- El orden de validaciÃ³n por archivo es: cupo (`max-files`, corta el lote) â†’
  tamaÃ±o (`max-size`, salta el archivo) â†’ tipo (`accept`, salta el archivo).
- **No hay deduplicaciÃ³n**: soltar dos veces el mismo archivo lo encola dos
  veces con `id` distintos.
- Solo los `image/*` reciben `URL.createObjectURL` para la miniatura; el resto
  muestra un icono elegido por MIME (imagen, video, audio, PDF, ZIP o genÃ©rico).
- `removeFile` revoca el object URL, pero desconectar el componente del DOM
  **no** revoca los pendientes: si lo montas y desmontas mucho con imÃ¡genes
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
- [`../media/icon.js`](../media/icon.js) â€” importado por el mÃ³dulo, no hace
  falta importarlo aparte.

Tags del mÃ³dulo: `<iswc-dropzone>`.

## Accesibilidad

- La zona es `tabindex="0"` y responde a Enter y Espacio, con `:focus-visible`
  marcado por borde y fondo de acento.
- El botÃ³n de quitar de cada fila lleva `aria-label="Quitar"` y su glifo `âœ•`
  estÃ¡ marcado `aria-hidden="true"`.
- La miniatura de imagen usa `alt=""` (decorativa), correcto porque el nombre
  del archivo ya se anuncia en la misma fila.
- Puntos a cubrir desde el consumidor: la zona no tiene `role="button"` ni
  etiqueta accesible propia (un lector anuncia solo su texto interno), la cola
  no es una *live region*, asÃ­ que el progreso y los errores no se anuncian
  solos, y los `iswc-error` no producen mensaje visible â€” pÃ­ntalo tÃº.

## Ejemplo avanzado

```html
<iswc-dropzone
  id="soportes"
  multiple
  accept="image/*,.pdf"
  max-files="5"
  max-size="5242880"
></iswc-dropzone>
<button type="button" id="enviar">Subir soportes</button>
<p id="aviso" role="status"></p>

<script type="module">
  import './dropzone.js';

  const dz = document.getElementById('soportes');
  const aviso = document.getElementById('aviso');

  dz.addEventListener('iswc-files-change', (e) => {
    aviso.textContent = `${e.detail.files.length} archivo(s) en cola`;
  });

  dz.addEventListener('iswc-error', (e) => {
    const { reason, limit, file } = e.detail;
    if (reason === 'max-files') aviso.textContent = `MÃ¡ximo ${limit} archivos.`;
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
      else aviso.textContent = `FallÃ³ "${rec.name}".`;
    }
  });
</script>
```

## Errores comunes

- Llamar a `upload()` creyendo que sube al servidor: solo emite eventos de
  progreso simulado.
- Poner `chunked` esperando subida por partes: el atributo no se lee.
- Poner el componente en un `<form>` y esperar los archivos en el `FormData`:
  no es form-associated y su `<input>` estÃ¡ en shadow DOM.
- Omitir `multiple` creyendo que limita a un archivo: solo afecta al diÃ¡logo
  nativo, no al arrastre. Usa `max-files="1"`.
- Usar `max-files="0"` o `max-size="0"` para bloquear: ambos caen a `Infinity`.
- Leer `e.detail.file` en un `iswc-error` de `max-files`: ahÃ­ no viene.
- Mutar `dz.files` directamente en vez de usar `addFile` / `removeFile`.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- La subida real siempre la implementa el consumidor; no documentar `upload()`
  como cliente HTTP.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.
- Crear tamaÃ±os con `font-size` contextual y `em`, nunca con variantes de size.

## Fuentes

- [JavaScript](./dropzone.ts)
- [CSS](./dropzone.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./dropzone.json)
