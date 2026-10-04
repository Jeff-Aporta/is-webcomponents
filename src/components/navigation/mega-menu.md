---
tag: iswc-mega-menu
tags:
  - iswc-mega-menu
category: navigation
status: public
source: ./mega-menu.ts
style: ./mega-menu.css
preview: ./mega-menu.json
---
# `<iswc-mega-menu>`

## PropÃ³sito

Mega-menÃº para portal o e-commerce: abre un panel ancho de varias columnas,
cada una con encabezado y enlaces, mÃ¡s un bloque destacado opcional.

Este mÃ³dulo registra `<iswc-mega-menu>`.

## CuÃ¡ndo usarlo

Cabeceras con muchas secciones que no caben en un dropdown de una columna.

## CuÃ¡ndo no usarlo

Para un menÃº corto de acciones usar `<iswc-dropdown>`; para navegaciÃ³n
jerÃ¡rquica en panel lateral, `<iswc-tree>`.

## ImportaciÃ³n

```js
import './mega-menu.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-mega-menu label="CatÃ¡logo">
  <div slot="column" title="Muebles">
    <a href="/sillas">Sillas</a>
    <a href="/mesas">Mesas</a>
  </div>
</iswc-mega-menu>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string | Texto del trigger. |
| `icon` | string | Id Iconify del icono del trigger. |
| `placement` | string | `bottom-start` (default), `bottom`, `bottom-end`. Solo el sufijo `-end` cambia el anclaje. |
| `width` | string/number | Ancho del panel. NÃºmero = px; tambiÃ©n acepta unidades CSS. Se topa en `min(960px, 100vw - 32px)`. |
| `hover` | boolean | Abre y cierra al pasar el ratÃ³n, no al hacer clic. |

TambiÃ©n refleja `open` como atributo mientras el panel estÃ¡ abierto, para
enganchar CSS desde fuera.

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| â€” | â€” | No expone propiedades adicionales documentadas. |

### Slots

| Slot | Uso |
| --- | --- |
| `column` | Un elemento por columna. Su atributo `title` se pinta como encabezado de la columna. Dentro van los `<a href>`. |
| `feature` | Bloque destacado (imagen, CTA) que ocupa dos filas del grid. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |
| `iswc-select` | Emitido al seleccionar un elemento. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-show` | no | sÃ­ | sÃ­ | no |
| `iswc-after-show` | no | sÃ­ | sÃ­ | no |
| `iswc-hide` | no | sÃ­ | sÃ­ | no |
| `iswc-after-hide` | no | sÃ­ | sÃ­ | no |
| `iswc-select` | `{ href, text }` | sÃ­ | sÃ­ | no |

Vocabulario unificado con `ModalBase`. Los antiguos `iswc-open` / `iswc-close`
ya no se emiten.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-mega-menu');
el.addEventListener('iswc-show', (e) => {
  console.log('iswc-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `open()` | Abre el panel. |
| `close()` | Cierra el panel. |
| `toggle()` | Alterna segÃºn el estado actual. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor relativo del trigger y el panel. |
| `trigger` | El `<iswc-button>` que abre el menÃº. |
| `panel` | El `<dialog>` con las columnas. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--iswc-*`) segÃºn CSS del mÃ³dulo.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

El panel es un `<dialog>` nativo en modo `show()` (no modal): es un popover
anclado al trigger, no un diÃ¡logo. Migrarlo a `<iswc-dialog>` cambiarÃ­a la
semÃ¡ntica (focus-trap, backdrop, centrado) y el posicionamiento fijo que
calcula el propio componente, asÃ­ que se mantiene el `<dialog>` nativo.

Un clic sobre cualquier `<a href>` proyectado emite `iswc-select` y cierra el
panel: la navegaciÃ³n la decide quien integra.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/button.js`](../actions/button.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-mega-menu>`.

## Accesibilidad

El trigger es un `<iswc-button>` con `aria-haspopup="true"` y `aria-expanded`
sincronizado. El panel lleva `aria-label`. Con `hover`, el menÃº sigue siendo
operable por teclado a travÃ©s del trigger.

## Ejemplo avanzado

```html
<iswc-mega-menu label="CatÃ¡logo" icon="mdi:view-grid" placement="bottom-end" width="52rem">
  <div slot="column" title="Muebles">
    <a href="/sillas">Sillas</a>
    <a href="/mesas">Mesas</a>
  </div>
  <div slot="column" title="IluminaciÃ³n">
    <a href="/lamparas">LÃ¡mparas</a>
  </div>
  <div slot="feature">
    <strong>Nuevo catÃ¡logo 2026</strong>
    <a href="/catalogo">Ver ahora</a>
  </div>
</iswc-mega-menu>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Esperar navegaciÃ³n automÃ¡tica: `iswc-select` no cambia la URL.
- Poner los enlaces fuera de un `slot="column"`: no se proyectan.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./mega-menu.ts)
- [CSS](./mega-menu.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
