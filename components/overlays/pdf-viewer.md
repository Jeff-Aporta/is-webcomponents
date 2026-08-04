---
tag: is-pdf-viewer
tags:
  - is-pdf-viewer
category: overlays
status: public
source: ./pdf-viewer.js
style: ./pdf-viewer.css
preview: ../../previews/overlays/is-pdf-viewer.html
---
# `<is-pdf-viewer>`

## Propósito

Visor de PDF. Por defecto usa el visor nativo del navegador; opcionalmente `engine="pdfjs"`.

Este módulo registra `<is-pdf-viewer>`.

## Cuándo usarlo

Paleta de comandos, visor de documentos y ventanas flotantes.

## Cuándo no usarlo

Para diálogos/cajones genéricos usar `<is-dialog>` / `<is-drawer>` en layout.
No reinventar overlays si este módulo cubre el caso.

## Importación

```js
import './pdf-viewer.js';
```

## Ejemplo mínimo

```html
<is-pdf-viewer src="/docs/manual.pdf" download print></is-pdf-viewer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `src` | string | URL del PDF (requerido). |
| `page` | string/según contrato | Página inicial (pdfjs). |
| `zoom` | string/según contrato | Nivel de zoom (pdfjs). |
| `engine` | string | `native` (default) | `pdfjs`. |
| `height` | string | Alto del iframe (default 80vh). |
| `download` | boolean | Muestra botón Descargar. |
| `print` | boolean | Muestra botón Imprimir. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `src` | lectura/escritura | URL del documento. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `footer` | Bloque inferior (si el módulo lo declara). |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-load` | sí | sí | sí | no |
| `is-error` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| — | No expone. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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

Tokens del tema (`--is-*`) según CSS del módulo.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-pdf-viewer> — src/page/zoom/engine/height/download/print. Eventos is-load / is-error. Slots title y toolbar.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-pdf-viewer>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. Listeners globales solo en
`connectedCallback` / `disconnectedCallback`.

## Ejemplo avanzado

```html
<is-pdf-viewer src="/docs/manual.pdf" download print></is-pdf-viewer>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Agregar listeners de `document`/`window` en el constructor.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./pdf-viewer.js)
- [CSS](./pdf-viewer.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/overlays/is-pdf-viewer.html)
