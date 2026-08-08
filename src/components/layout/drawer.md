---
tag: is-drawer
tags:
  - is-drawer
category: layout
status: public
source: ./drawer.js
style: ./drawer.css
preview: ../../previews/layout/is-drawer.json
---
# `<is-drawer>`

## Propósito

Panel que se desliza desde un borde del viewport (derecha, izquierda, arriba o abajo).
Ideal para menús, filtros y contenido secundario.

Este módulo registra `<is-drawer>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## Importación

```js
import './drawer.js';
```

## Ejemplo mínimo

```html
<is-drawer label="Drawer estándar">
Contenido.
<div slot="footer">
<is-button data-drawer="close">Cancelar</is-button>
</div>
</is-drawer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `placement` | string/según contrato | Fuente define default/restricción. |
| `without-header` | boolean | Fuente define default/restricción. |
| `light-dismiss` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `placement` | lectura/escritura | Declarada por clase. |
| `withoutHeader` | lectura/escritura | Declarada por clase. |
| `lightDismiss` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `header-actions` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `footer` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-hide` | sí | sí | sí | sí |
| `is-show` | sí | sí | sí | no |
| `is-after-show` | sí | sí | sí | no |
| `is-after-hide` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |
| `hide()` | Método público declarado. |
| `toggle()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `backdrop` | Personalizable con `::part(backdrop)`. |
| `drawer` | Personalizable con `::part(drawer)`. |
| `header` | Personalizable con `::part(header)`. |
| `title` | Personalizable con `::part(title)`. |
| `header-actions` | Personalizable con `::part(header-actions)`. |
| `close-button` | Personalizable con `::part(close-button)`. |
| `body` | Personalizable con `::part(body)`. |
| `footer` | Personalizable con `::part(footer)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--size` | Token leído o definido por componente. |
| `--width` | Token leído o definido por componente. |
| `--spacing` | Token leído o definido por componente. |
| `--show-duration` | Token leído o definido por componente. |
| `--hide-duration` | Token leído o definido por componente. |
| `--backdrop-color` | Token leído o definido por componente. |
| `--is-space-l` | Token leído o definido por componente. |
| `--_radius` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--_shadow` | Token leído o definido por componente. |
| `--is-bg` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-text-muted` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-drawer> — Web Component (vanilla, zero dependencies).
> Panel que se desliza desde un borde del viewport. Ideal para menús, filtros
> y contenido secundario. Equivalente accesible a wa-drawer (Web Awesome).
> Modelo: hereda conceptualmente de is-dialog (mismo shadow DOM) con la
> diferencia de placement (start/end/top/bottom) y --size en lugar de --width.
> Atributos
>   open              boolean — si está abierto (reflected).
>   label             string  — título en el header (a11y).
>   placement         start | end | top | bottom  (default 'end').
>   without-header    boolean — oculta el header y el botón de cerrar.
>   light-dismiss     boolean — cierra al hacer click fuera.
> Slots
>   (default)        contenido principal (body).
>   label            header label propio.
>   header-actions   acciones adicionales en el header.
>   footer           pie del drawer.
> Métodos: show() / hide() / toggle()
> Eventos: is-show, is-after-show, is-hide (cancelable, detail.source), is-after-hide
> CSS Parts: drawer, header, title, close-button, header-actions, body, footer
> CSS custom properties
>   --size            tamaño preferido (ancho o alto según placement)
>   --spacing         padding interno
>   --show-duration, --hide-duration
>   --backdrop-color

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/modal-base.js`](../_shared/modal-base.js) — clase base con el ciclo
  completo del modal (focus-trap, `Escape`, backdrop light-dismiss, restore de foco,
  `data-*="close"`, eventos). Aquí sólo queda el chrome y las animaciones.

Tags del módulo: `<is-drawer>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-modal`, `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<is-drawer placement="start">…</is-drawer>
<is-drawer placement="top">…</is-drawer>
<is-drawer placement="bottom">…</is-drawer>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./drawer.js)
- [CSS](./drawer.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/layout/is-drawer.json)
