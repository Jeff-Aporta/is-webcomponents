---
tag: iswc-lightbox
tags:
  - iswc-lightbox
category: diagrams
status: public
source: ./lightbox.ts
style: ./lightbox.css
preview: ./lightbox.json
---
# `<iswc-lightbox>`

## PropÃ³sito

Visor a pantalla completa, genÃ©rico: lo que metas en el slot default se
monta dentro de un <dialog> top-layer
con zoom anclado al cursor y pan. La barra por defecto trae cerrar,
reset de zoom y compartir enlace; usa el slot toolbar
para aÃ±adir tus propios controles sin tocar el componente.

Este mÃ³dulo registra `<iswc-lightbox>`.

## CuÃ¡ndo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## CuÃ¡ndo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## ImportaciÃ³n

```js
import './lightbox.js';
```

## Ejemplo mÃ­nimo

```html
<button onclick="lb.show()">Abrir</button>
<iswc-lightbox id="lb">
<svg viewBox="0 0 320 200">â€¦</svg>
</iswc-lightbox>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `zoomable` | boolean | Fuente define default/restricciÃ³n. |
| `close-on-backdrop` | boolean | Fuente define default/restricciÃ³n. |
| `toolbar` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `no-default-actions` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |
| `iswc-share` | Evento personalizado del componente (share). |
| `iswc-reposition` | Evento personalizado del componente (reposition). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-after-show` | no | sÃ­ | sÃ­ | no |
| `iswc-after-hide` | no | sÃ­ | sÃ­ | no |
| `iswc-share` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-reposition` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-lightbox');
el.addEventListener('iswc-after-show', (e) => {
  console.log('iswc-after-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | MÃ©todo pÃºblico declarado. |
| `hide()` | MÃ©todo pÃºblico declarado. |
| `resetView()` | MÃ©todo pÃºblico declarado. |
| `recenter()` | MÃ©todo pÃºblico declarado. |
| `zoomIn()` | MÃ©todo pÃºblico declarado. |
| `zoomOut()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--lb-radius` | Token leÃ­do o definido por componente. |
| `--lb-bg` | Token leÃ­do o definido por componente. |
| `--lb-fg` | Token leÃ­do o definido por componente. |
| `--lb-border` | Token leÃ­do o definido por componente. |
| `--lb-shadow` | Token leÃ­do o definido por componente. |
| `--lb-toolbar-bg` | Token leÃ­do o definido por componente. |
| `--lb-backdrop` | Token leÃ­do o definido por componente. |
| `--has-user-toolbar` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-icon-size` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-lightbox> â€” visor a pantalla completa para cualquier contenido.
> Es el building block que ya usaba el visor de diagramas, pero ahora
> pensado como componente genÃ©rico: lo que metas en el slot default se
> muestra dentro de un <dialog> top-layer, con zoom + pan anclado al
> cursor y una barra de herramientas personalizable.
> Slots:
>   default    Contenido a mostrar (cualquier elemento). El host aplica
>              transform translate/scale sobre un envoltorio interno
>              (.lb-host) que recibe el contenido vÃ­a slot.
>   toolbar    Si estÃ¡ presente, sustituye la barra por defecto.
>   code-panel Si estÃ¡ presente, sustituye el panel de cÃ³digo built-in.
> Atributos:
>   open               bool   Muestra/oculta el visor
>   zoomable           bool   Habilita zoom + pan (default true)
>   close-on-backdrop  bool   Click fuera cierra (default true)
>   toolbar            "auto" | "none" | "default"   "auto" = usa la barra
>                          por defecto si el slot estÃ¡ vacÃ­o, "none" = oculta
>                          la barra por completo aunque haya slot
>   no-default-actions bool   Oculta los botones por defecto (close, share,
>                          fit) sin tocar los slots
> Propiedades:
>   view  { scale, x, y }   Zoom/pan actual (lectura/escritura)
> MÃ©todos:
>   show()               Abre el dialog
>   hide()               Cierra el dialog
>   recenter()           Ajusta el contenido al Ã¡rea visible
>   zoomIn(factor=1.2)   Zoom +
>   zoomOut(factor=1.2)  Zoom âˆ’
>   resetView()          scale=1, x=0, y=0
> Eventos:
>   iswc-after-show   dialog abierto
>   iswc-after-hide   dialog cerrado
>   iswc-reposition detail: { scale, x, y }
> CSS parts: dialog, toolbar, toolbar__lead, toolbar__trail, stage,
>            host, code-panel, code-panel__area, code-panel__actions,
>            toast
> CSS vars:  --lb-radius, --lb-bg, --lb-fg, --lb-border, --lb-shadow,
>            --lb-toolbar-bg, --lb-backdrop

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-lightbox>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-lightbox>
<div slot="toolbar">
<button>Rotar</button>
<button>Descargar</button>
</div>
<svg>â€¦</svg>
</iswc-lightbox>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./lightbox.ts)
- [CSS](./lightbox.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./lightbox.json)
