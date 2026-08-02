---
tag: is-lightbox
tags:
  - is-lightbox
category: diagrams
status: public
source: ./lightbox.js
style: ./lightbox.css
preview: ../../previews/helpers/is-lightbox.html
---
# `<is-lightbox>`

## Propósito

Visor a pantalla completa, genérico: lo que metas en el slot default se
monta dentro de un <dialog> top-layer
con zoom anclado al cursor y pan. La barra por defecto trae cerrar,
reset de zoom y compartir enlace; usa el slot toolbar
para añadir tus propios controles sin tocar el componente.

Este módulo registra `<is-lightbox>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './lightbox.js';
```

## Ejemplo mínimo

```html
<button onclick="lb.show()">Abrir</button>
<is-lightbox id="lb">
<svg viewBox="0 0 320 200">…</svg>
</is-lightbox>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | string/según contrato | Fuente define default/restricción. |
| `zoomable` | boolean | Fuente define default/restricción. |
| `close-on-backdrop` | boolean | Fuente define default/restricción. |
| `toolbar` | string/según contrato | Fuente define default/restricción. |
| `no-default-actions` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `zoomable` | lectura/escritura | Declarada por clase. |
| `closeOnBackdrop` | lectura/escritura | Declarada por clase. |
| `toolbar` | lectura/escritura | Declarada por clase. |
| `noDefaultActions` | lectura/escritura | Declarada por clase. |
| `view` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `toolbar-lead` | Contenido proyectado. |
| `toolbar` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `code-panel` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-open` | no | sí | sí | no |
| `is-close` | no | sí | sí | no |
| `is-share` | sí | sí | sí | no |
| `is-reposition` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |
| `hide()` | Método público declarado. |
| `resetView()` | Método público declarado. |
| `recenter()` | Método público declarado. |
| `zoomIn()` | Método público declarado. |
| `zoomOut()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `dialog` | Personalizable con `::part(dialog)`. |
| `toolbar` | Personalizable con `::part(toolbar)`. |
| `toolbar__lead` | Personalizable con `::part(toolbar__lead)`. |
| `toolbar__trail` | Personalizable con `::part(toolbar__trail)`. |
| `stage` | Personalizable con `::part(stage)`. |
| `host` | Personalizable con `::part(host)`. |
| `code-panel` | Personalizable con `::part(code-panel)`. |
| `toast` | Personalizable con `::part(toast)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--lb-radius` | Token leído o definido por componente. |
| `--lb-bg` | Token leído o definido por componente. |
| `--lb-fg` | Token leído o definido por componente. |
| `--lb-border` | Token leído o definido por componente. |
| `--lb-shadow` | Token leído o definido por componente. |
| `--lb-toolbar-bg` | Token leído o definido por componente. |
| `--lb-backdrop` | Token leído o definido por componente. |
| `--has-user-toolbar` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-icon-size` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-lightbox> — visor a pantalla completa para cualquier contenido.
> Es el building block que ya usaba el visor de diagramas, pero ahora
> pensado como componente genérico: lo que metas en el slot default se
> muestra dentro de un <dialog> top-layer, con zoom + pan anclado al
> cursor y una barra de herramientas personalizable.
> Slots:
>   default    Contenido a mostrar (cualquier elemento). El host aplica
>              transform translate/scale sobre un envoltorio interno
>              (.lb-host) que recibe el contenido vía slot.
>   toolbar    Si está presente, sustituye la barra por defecto.
>   code-panel Si está presente, sustituye el panel de código built-in.
> Atributos:
>   open               bool   Muestra/oculta el visor
>   zoomable           bool   Habilita zoom + pan (default true)
>   close-on-backdrop  bool   Click fuera cierra (default true)
>   toolbar            "auto" | "none" | "default"   "auto" = usa la barra
>                          por defecto si el slot está vacío, "none" = oculta
>                          la barra por completo aunque haya slot
>   no-default-actions bool   Oculta los botones por defecto (close, share,
>                          fit) sin tocar los slots
> Propiedades:
>   view  { scale, x, y }   Zoom/pan actual (lectura/escritura)
> Métodos:
>   show()               Abre el dialog
>   hide()               Cierra el dialog
>   recenter()           Ajusta el contenido al área visible
>   zoomIn(factor=1.2)   Zoom +
>   zoomOut(factor=1.2)  Zoom −
>   resetView()          scale=1, x=0, y=0
> Eventos:
>   is-open       dialog abierto
>   is-close      dialog cerrado
>   is-reposition detail: { scale, x, y }
> CSS parts: dialog, toolbar, toolbar__lead, toolbar__trail, stage,
>            host, code-panel, code-panel__area, code-panel__actions,
>            toast
> CSS vars:  --lb-radius, --lb-bg, --lb-fg, --lb-border, --lb-shadow,
>            --lb-toolbar-bg, --lb-backdrop

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-lightbox>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<is-lightbox>
<div slot="toolbar">
<button>Rotar</button>
<button>Descargar</button>
</div>
<svg>…</svg>
</is-lightbox>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./lightbox.js)
- [CSS](./lightbox.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/helpers/is-lightbox.html)
