---
tag: iswc-pdf-viewer
tags:
  - iswc-pdf-viewer
category: overlays
status: public
source: ./pdf-viewer.ts
style: ./pdf-viewer.css
preview: ./pdf-viewer.json
---
# `<iswc-pdf-viewer>`

## PropÃ³sito

Visor de PDF. Por defecto usa el visor nativo del navegador; opcionalmente `engine="pdfjs"`.

Este mÃ³dulo registra `<iswc-pdf-viewer>`.

## CuÃ¡ndo usarlo

Paleta de comandos, visor de documentos y ventanas flotantes.

## CuÃ¡ndo no usarlo

Para diÃ¡logos/cajones genÃ©ricos usar `<iswc-dialog>` / `<iswc-drawer>` en layout.
No reinventar overlays si este mÃ³dulo cubre el caso.

## ImportaciÃ³n

```js
import './pdf-viewer.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-pdf-viewer src="/docs/manual.pdf" download print></iswc-pdf-viewer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src` | string | URL del PDF (requerido). |
| `page` | string/segÃºn contrato | PÃ¡gina inicial (pdfjs). |
| `zoom` | string/segÃºn contrato | Nivel de zoom (pdfjs). |
| `engine` | string | `native` (default) | `pdfjs`. |
| `height` | string | Alto del iframe (default 80vh). |
| `download` | boolean | Muestra botÃ³n Descargar. |
| `print` | boolean | Muestra botÃ³n Imprimir. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `src` | lectura/escritura | URL del documento. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `footer` | Bloque inferior (si el mÃ³dulo lo declara). |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-load` | Emitido cuando el recurso se ha cargado. |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-load` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-error` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-pdf-viewer');
el.addEventListener('iswc-load', (e) => {
  console.log('iswc-load', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| â€” | No expone. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Personalizable con `::part(root)`. |
| `toolbar` | Personalizable con `::part(toolbar)`. |
| `download` | Personalizable con `::part(download)`. |
| `print` | Personalizable con `::part(print)`. |
| `frame` | Personalizable con `::part(frame)`. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--iswc-*`) segÃºn CSS del mÃ³dulo.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-pdf-viewer> â€” src/page/zoom/engine/height/download/print. Eventos iswc-load / iswc-error. Slots title y toolbar.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-pdf-viewer>`.

## Accesibilidad

El host lleva `role="region"` con `aria-label="Visor de PDF"` para que
lectores de pantalla lo identifiquen como una zona de contenido. La barra
de herramientas interna lleva `role="toolbar"` con `aria-label="Controles
del visor"`, y los botones Descargar / Imprimir llevan `aria-label`
explÃ­cito (icon-only).

El `<iframe>` interno recibe `title="Visor PDF"`, `role="document"` y
`aria-labelledby="pdf-title"` (referencia al slot `title`), de modo que su
nombre accesible queda sincronizado con el encabezado del componente.

| Atributo / Rol | DÃ³nde | Notas |
| --- | --- | --- |
| `role="region"` + `aria-label` | `<div class="root">` | Marca el visor como una regiÃ³n navegable. |
| `role="toolbar"` + `aria-label` | `<div class="toolbar">` | Agrupa los botones Descargar / Imprimir / slot. |
| `aria-label` en botones internos | `#dl`, `#print` | Botones icon-only con label explÃ­cito. |
| `title` + `role="document"` + `aria-labelledby` | `<iframe>` | Nombre accesible del documento PDF, sincronizado con el slot `title`. |

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. Listeners globales solo en
`connectedCallback` / `disconnectedCallback`.

## Ejemplo avanzado

```html
<iswc-pdf-viewer src="/docs/manual.pdf" download print></iswc-pdf-viewer>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Agregar listeners de `document`/`window` en el constructor.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./pdf-viewer.ts)
- [CSS](./pdf-viewer.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./pdf-viewer.json)
