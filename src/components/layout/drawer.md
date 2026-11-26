---
tag: iswc-drawer
tags:
  - iswc-drawer
category: layout
status: public
source: ./drawer.ts
style: ./drawer.scss
preview: ./drawer.json
---
# `<iswc-drawer>`

## Propósito

Panel que se desliza desde un borde del viewport (derecha, izquierda, arriba o abajo).
Ideal para menús, filtros y contenido secundario.

Este módulo registra `<iswc-drawer>`.

## Cuándo usarlo

Menús, filtros o formularios secundarios que aparecen sin salir de la vista.

## Cuándo no usarlo

Una decisión que bloquea: `iswc-dialog`. Un panel anclado a un botón: `iswc-popover`.

## Importación

```js
import './drawer.js';
```

## Ejemplo mínimo

```html
<iswc-drawer label="Drawer estándar">
Contenido.
<div slot="footer">
<iswc-button data-drawer="close">Cancelar</iswc-button>
</div>
</iswc-drawer>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `open` | boolean | – | Si está abierto (reflected). |
| `label` | string | – | Título del header; el `aria-labelledby` de la caja apunta a ese título. |
| `placement` | `start` \| `end` \| `top` \| `bottom` | `end` | Borde del que sale el panel. |
| `without-header` | boolean | – | Oculta el header y el botón de cerrar (el nombre accesible pasa a `aria-label`). |
| `light-dismiss` | boolean | `true` | Cierra al hacer click en el velo (backdrop). `light-dismiss="false"` lo desactiva. |
| `closable` | boolean | `true` | `closable="false"` esconde la X; el header y su título siguen. |
| `size` | string | `23.75em` | Tamaño preferido (ancho o alto según placement). Con `vw`/`vh` en pantallas angostas (< 48rem) ocupa el 100% y no se redimensiona. |
| `resize` | boolean | – | Muestra el tirador del borde: arrastrar cambia el ancho (teclado: flechas, Inicio y Fin). |
| `storage-key` | string | – | Clave de `localStorage` donde se recuerda el ancho elegido. |
| `header-height` | string | `3rem` | Alto mínimo del header compacto. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `placement` | lectura/escritura | Declarada por clase. |
| `withoutHeader` | lectura/escritura | Declarada por clase. |
| `lightDismiss` | lectura/escritura | Declarada por clase. |
| `closable` | lectura/escritura | `false` esconde el botón de cerrar. |
| `size` | lectura/escritura | Tamaño preferido. |
| `resize` | lectura/escritura | Muestra u oculta el tirador del borde. |
| `storageKey` | lectura/escritura | Clave del ancho recordado. |
| `headerHeight` | lectura/escritura | Alto mínimo del header. |

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `header-actions` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `footer` | Contenido proyectado. |

### Eventos

<!-- eventos: generado por scripts/sondas/eventos.ts desde declare static events -->

| Evento | detail | cancelable |
| --- | --- | --- |
| `iswc-show` | `Record<string, never>` | no |
| `iswc-after-show` | `Record<string, never>` | no |
| `iswc-hide` | `{ source: Element \| null }` | sí |
| `iswc-after-hide` | `Record<string, never>` | no |

<!-- /eventos -->


| Evento | Descripción |
| --- | --- |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animación de apertura. |
| `iswc-after-hide` | Emitido tras finalizar la animación de cierre. |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-drawer');
el.addEventListener('iswc-hide', (e) => {
  console.log('iswc-hide', e.detail);
});
```

</details>

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
| `resize-handle` | Personalizable con `::part(resize-handle)`: el tirador del borde (solo con `resize`). |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-drawer-size` | Tamaño preferido: ancho (start/end) o alto (top/bottom); default 23.75em. El atributo `size` lo sobreescribe. |
| `--iswc-drawer-header-height` | Alto mínimo del header; default 3rem (el atributo `header-height` lo escribe). |
| `--width` | Token leído o definido por componente. |
| `--spacing` | Token leído o definido por componente. |
| `--show-duration` | Token leído o definido por componente. |
| `--hide-duration` | Token leído o definido por componente. |
| (movimiento reducido) | Con `prefers-reduced-motion: reduce` las duraciones bajan a 90 ms y 70 ms, nunca a cero: la entrada y la salida se siguen viendo. |
| `--backdrop-color` | Token leído o definido por componente. |
| `--iswc-space-l` | Token leído o definido por componente. |
| `--iswc-drawer-radius` | Radio de las esquinas expuestas. Default `0`: esquinas rectas, porque el cajón toca el borde. |
| `--_radius` | Token leído o definido por componente. |
| `--iswc-radius` | Token leído o definido por componente. |
| `--_shadow` | Token leído o definido por componente. |
| `--iswc-bg` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-font-family` | Token leído o definido por componente. |
| `--iswc-text-muted` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-focus` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-drawer> — Web Component (vanilla, zero dependencies).
> Panel que se desliza desde un borde del viewport. Ideal para menús, filtros
> y contenido secundario. Equivalente accesible a wa-drawer (Web Awesome).
> Modelo: hereda conceptualmente de iswc-dialog (mismo shadow DOM) con la
> diferencia de placement (start/end/top/bottom) y --iswc-drawer-size en lugar de --width.
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
> Eventos: iswc-show, iswc-after-show, iswc-hide (cancelable, detail.source), iswc-after-hide
> CSS Parts: drawer, header, title, close-button, header-actions, body, footer
> CSS custom properties
>   --iswc-drawer-size  tamaño preferido (ancho o alto según placement; default 23.75em)
>   --spacing         padding interno
>   --show-duration, --hide-duration
>   --backdrop-color

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/modal-base.js`](./utils/modal-base.js) — clase base con el ciclo
  completo del modal (focus-trap, `Escape`, backdrop light-dismiss, restore de foco,
  `data-*="close"`, eventos). Aquí sólo queda el chrome y las animaciones.

Tags del módulo: `<iswc-drawer>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `role="dialog"`, `aria-modal="true"` y `aria-labelledby` al título del header (`aria-label` cuando el header va oculto).

- Al abrir, el foco entra en el panel (primer control) y queda atrapado dentro mientras está abierto.
- Escape cierra solo la capa de arriba; al cerrar el foco vuelve al disparador.
- Click en el velo cierra con `light-dismiss`; el scroll del documento queda bloqueado mientras el panel está abierto.
- El tirador se maneja con el teclado (flechas, Inicio y Fin) y anuncia su valor (`aria-valuenow`).

## Ejemplo avanzado

```html
<iswc-drawer placement="start">…</iswc-drawer>
<iswc-drawer placement="top">…</iswc-drawer>
<iswc-drawer placement="bottom">…</iswc-drawer>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Cambiar el tamaño solo por `--iswc-drawer-size` cuando lo que se quiere es un valor por documento: para un tamaño por instancia está el atributo `size`.
- Esperar que el velo NO cierre con `light-dismiss`: en el drawer el click en el velo cierra por defecto; para un panel que solo se cierre con sus botones, `light-dismiss="false"` (en `iswc-dialog` sí es opt-in).

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./drawer.ts)
- [CSS](./drawer.scss)
- [Índice de categoría](../../../specs/componentes.md)
- [Preview](./drawer.json)
