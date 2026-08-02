---
tag: is-dialog
tags:
  - is-dialog
category: layout
status: public
source: ./dialog.js
style: ./dialog.css
preview: ../../previews/layout/is-dialog.html
---
# `<is-dialog>`

## Propósito

Modal accesible que requiere la atención inmediata del usuario. Equivalente
a <dialog> nativo, con header, footer, animaciones,
light-dismiss y API declarativa data-dialog="close".

Este módulo registra `<is-dialog>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size variants; escalar mediante font-size contextual y em.

## Importación

```js
import './dialog.js';
```

## Ejemplo mínimo

```html
<is-button onclick="document.getElementById('dlg').open = true">Abrir</is-button>
<is-dialog id="dlg" label="Título">
Contenido.
<div slot="footer">
<is-button data-dialog="close">Cancelar</is-button>
</div>
</is-dialog>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `without-header` | boolean | Fuente define default/restricción. |
| `light-dismiss` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
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
| `dialog` | Personalizable con `::part(dialog)`. |
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
| `--width` | Token leído o definido por componente. |
| `--spacing` | Token leído o definido por componente. |
| `--is-space-l` | Token leído o definido por componente. |
| `--show-duration` | Token leído o definido por componente. |
| `--hide-duration` | Token leído o definido por componente. |
| `--backdrop-color` | Token leído o definido por componente. |
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

> <is-dialog> — Web Component (vanilla, zero dependencies).
> Modal sobre la página que requiere atención inmediata del usuario. Equivalente
> accesible a <dialog> nativo + wa-dialog (Web Awesome).
> Atributos
>   open              boolean — si está abierto (reflected).
>   label             string  — título en el header (a11y).
>   without-header    boolean — oculta el header y el botón de cerrar.
>   light-dismiss     boolean — cierra al hacer click fuera del diálogo.
> Slots
>   (default)        contenido principal (body).
>   label            header label propio (gana sobre el atributo label).
>   header-actions   acciones adicionales en el header.
>   footer           pie, normalmente con botones.
> Métodos
>   show() / hide() / toggle()
> Eventos
>   is-show        detail: {} — antes de abrir.
>   is-after-show  detail: {} — tras la animación de apertura.
>   is-hide        detail: { source } — antes de cerrar (cancelable).
>                  source = null (Escape) | elemento que disparó el cierre.
>   is-after-hide  detail: {} — tras la animación de cierre.
> CSS Parts
>   dialog, header, title, close-button, header-actions, body, footer
> CSS custom properties
>   --width          ancho preferido (default 500px)
>   --spacing        padding interno (default var(--is-space-l, 1rem))
>   --show-duration  duración de la animación de apertura
>   --hide-duration  duración de la animación de cierre
>   --backdrop-color color del backdrop

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-dialog>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-modal`, `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<is-dialog without-header>…</is-dialog>
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

- [JavaScript](./dialog.js)
- [CSS](./dialog.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/layout/is-dialog.html)
