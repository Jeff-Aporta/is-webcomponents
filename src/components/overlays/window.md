---
tag: is-window
tags:
  - is-window
category: overlays
status: public
source: ./window.js
style: ./window.css
preview: ./window.json
---
# `<is-window>`

## Propósito

Ventana flotante dockable (estilo escritorio): arrastre, resize, minimizar/maximizar.

Este módulo registra `<is-window>`.

## Cuándo usarlo

Paleta de comandos, visor de documentos y ventanas flotantes.

## Cuándo no usarlo

Para diálogos/cajones genéricos usar `<is-dialog>` / `<is-drawer>` en layout.
No reinventar overlays si este módulo cubre el caso.

## Importación

```js
import './window.js';
```

## Ejemplo mínimo

```html
<is-window title="Detalle" width="480" height="320" resizable closable>
  <p>Contenido de la ventana</p>
</is-window>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `title` | string | Encabezado. |
| `x` | string/según contrato | Posición X (px). |
| `y` | string/según contrato | Posición Y (px). |
| `width` | string/según contrato | Ancho. |
| `height` | string/según contrato | Alto. |
| `maximizable` | boolean | Permite maximizar. |
| `minimizable` | boolean | Permite minimizar. |
| `closable` | boolean | Permite cerrar. |
| `default` | string | `maximized` | `minimized` | `normal`. |
| `resizable` | boolean | Drag esquina inferior derecha. |
| `dock` | string | `bottom-right` | `bottom` | `top` | `none`. |
| `aria-modal` | string | Por defecto `"true"`. Pasar `"false"` para que conviva con la página como una ventana no modal. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| — | — | No expone propiedades adicionales documentadas. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `footer` | Bloque inferior (si el módulo lo declara). |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-show` | no | sí | sí | no |
| `is-after-show` | no | sí | sí | no |
| `is-hide` | no | sí | sí | no |
| `is-after-hide` | no | sí | sí | no |
| `is-minimize` | no | sí | sí | no |
| `is-restore` | `{ was }` | sí | sí | no |
| `is-maximize` | no | sí | sí | no |

Vocabulario unificado con `ModalBase` (`is-show` / `is-after-show` /
`is-hide` / `is-after-hide`). Los antiguos `is-open` / `is-close` ya no se
emiten.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `minimize()` | Método público declarado. |
| `restore()` | Método público declarado. |
| `maximize()` | Método público declarado. |
| `unmaximize()` | Método público declarado. |
| `close()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Personalizable con `::part(root)`. |
| `header` | Personalizable con `::part(header)`. |
| `body` | Personalizable con `::part(body)`. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--is-*`) según CSS del módulo.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-window> — dockable. API minimize/restore/maximize/unmaximize/close. Posición absolute/fixed en CSS.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-window>`.

## Accesibilidad

El host lleva `role="dialog"` (por defecto; configurable) y `aria-label`
sincronizado con `title`. El atributo `aria-modal="true"` se aplica por
defecto — indica al lector de pantalla que el contenido fuera del dialog
está inerte mientras está abierto.

| Atributo / Rol | Notas |
| --- | --- |
| `role="dialog"` | Aplicado en `onConnected`. |
| `aria-label="<title>"` | Sincronizado con el atributo `title`. |
| `aria-modal="true"` | Por defecto. Pasar `"false"` explícito para deshabilitar el focus trap. |
| Tabla `data-state="normal | maximized | minimized"` | Refleja el estado actual para estilos. |

**Comportamiento de foco** (cuando `aria-modal="true"`):

- `Escape` cierra la ventana si lleva el atributo `closable`.
- `Tab` / `Shift+Tab` quedan contenidos dentro de la ventana cuando el foco
  ya está dentro de ella. Si el foco está fuera y la ventana es la de
  mayor `zIndex`, también se captura el `Tab`.
- Al abrir, el foco se mueve al `body` interno (tabindex=0) en el
  siguiente tick, para que el lector identifique correctamente el modal.
- Al desconectar (porque se llamó a `close()`), el foco se restaura al
  elemento que lo tenía antes de abrir la ventana.

Si se quiere el comportamiento "no modal" de antes —convivir con otras
ventanas/elementos focuseables sin atrapar el Tab— basta con declarar
`aria-modal="false"` en el HTML.

Preservar semántica, foco, teclado, labels y ARIA. Listeners globales solo en
`connectedCallback` / `disconnectedCallback`.

## Ejemplo avanzado

```html
<is-window title="Detalle" width="480" height="320" resizable closable>
  <p>Contenido de la ventana</p>
</is-window>
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

- [JavaScript](./window.js)
- [CSS](./window.css)
- [Índice de categoría](./LLM.md)
- [Preview](./window.json)
