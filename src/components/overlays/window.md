---
tag: is-window
tags:
  - is-window
category: overlays
status: public
source: ./window.js
style: ./window.css
preview: ../../previews/overlays/is-window.html
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
| `is-open` | sí | sí | sí | no |
| `is-close` | sí | sí | sí | no |
| `is-minimize` | sí | sí | sí | no |
| `is-restore` | sí | sí | sí | no |
| `is-maximize` | sí | sí | sí | no |
| `is-unmaximize` | sí | sí | sí | no |
| `is-move` | sí | sí | sí | no |
| `is-resize` | sí | sí | sí | no |

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
- [Preview](../../previews/overlays/is-window.html)
