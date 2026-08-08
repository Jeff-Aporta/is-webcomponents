---
tag: is-mega-menu
tags:
  - is-mega-menu
category: navigation
status: public
source: ./mega-menu.js
style: ./mega-menu.css
preview: ../../previews/navigation/is-mega-menu.json
---
# `<is-mega-menu>`

## Propósito

Mega-menú para portal o e-commerce: abre un panel ancho de varias columnas,
cada una con encabezado y enlaces, más un bloque destacado opcional.

Este módulo registra `<is-mega-menu>`.

## Cuándo usarlo

Cabeceras con muchas secciones que no caben en un dropdown de una columna.

## Cuándo no usarlo

Para un menú corto de acciones usar `<is-dropdown>`; para navegación
jerárquica en panel lateral, `<is-tree>`.

## Importación

```js
import './mega-menu.js';
```

## Ejemplo mínimo

```html
<is-mega-menu label="Catálogo">
  <div slot="column" title="Muebles">
    <a href="/sillas">Sillas</a>
    <a href="/mesas">Mesas</a>
  </div>
</is-mega-menu>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string | Texto del trigger. |
| `icon` | string | Id Iconify del icono del trigger. |
| `placement` | string | `bottom-start` (default), `bottom`, `bottom-end`. Solo el sufijo `-end` cambia el anclaje. |
| `width` | string/number | Ancho del panel. Número = px; también acepta unidades CSS. Se topa en `min(960px, 100vw - 32px)`. |
| `hover` | boolean | Abre y cierra al pasar el ratón, no al hacer clic. |

También refleja `open` como atributo mientras el panel está abierto, para
enganchar CSS desde fuera.

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| — | — | No expone propiedades adicionales documentadas. |

### Slots

| Slot | Uso |
| --- | --- |
| `column` | Un elemento por columna. Su atributo `title` se pinta como encabezado de la columna. Dentro van los `<a href>`. |
| `feature` | Bloque destacado (imagen, CTA) que ocupa dos filas del grid. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-show` | no | sí | sí | no |
| `is-after-show` | no | sí | sí | no |
| `is-hide` | no | sí | sí | no |
| `is-after-hide` | no | sí | sí | no |
| `is-select` | `{ href, text }` | sí | sí | no |

Vocabulario unificado con `ModalBase`. Los antiguos `is-open` / `is-close`
ya no se emiten.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `open()` | Abre el panel. |
| `close()` | Cierra el panel. |
| `toggle()` | Alterna según el estado actual. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor relativo del trigger y el panel. |
| `trigger` | El `<is-button>` que abre el menú. |
| `panel` | El `<dialog>` con las columnas. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--is-*`) según CSS del módulo.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

El panel es un `<dialog>` nativo en modo `show()` (no modal): es un popover
anclado al trigger, no un diálogo. Migrarlo a `<is-dialog>` cambiaría la
semántica (focus-trap, backdrop, centrado) y el posicionamiento fijo que
calcula el propio componente, así que se mantiene el `<dialog>` nativo.

Un clic sobre cualquier `<a href>` proyectado emite `is-select` y cierra el
panel: la navegación la decide quien integra.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/button.js`](../actions/button.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-mega-menu>`.

## Accesibilidad

El trigger es un `<is-button>` con `aria-haspopup="true"` y `aria-expanded`
sincronizado. El panel lleva `aria-label`. Con `hover`, el menú sigue siendo
operable por teclado a través del trigger.

## Ejemplo avanzado

```html
<is-mega-menu label="Catálogo" icon="mdi:view-grid" placement="bottom-end" width="52rem">
  <div slot="column" title="Muebles">
    <a href="/sillas">Sillas</a>
    <a href="/mesas">Mesas</a>
  </div>
  <div slot="column" title="Iluminación">
    <a href="/lamparas">Lámparas</a>
  </div>
  <div slot="feature">
    <strong>Nuevo catálogo 2026</strong>
    <a href="/catalogo">Ver ahora</a>
  </div>
</is-mega-menu>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Esperar navegación automática: `is-select` no cambia la URL.
- Poner los enlaces fuera de un `slot="column"`: no se proyectan.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./mega-menu.js)
- [CSS](./mega-menu.css)
- [Índice de categoría](./LLM.md)
