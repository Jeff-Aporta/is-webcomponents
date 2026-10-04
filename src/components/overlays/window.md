---
tag: iswc-window
tags:
  - iswc-window
category: overlays
status: public
source: ./window.ts
style: ./window.css
preview: ./window.json
---
# `<iswc-window>`

## PropÃ³sito

Ventana flotante (estilo escritorio): arrastre, resize, minimizar a pastilla, maximizar. `scope=local` vive en el wrapper; `scope=global` usa el viewport.

Este mÃ³dulo registra `<iswc-window>`.

## CuÃ¡ndo usarlo

Paleta de comandos, visor de documentos y ventanas flotantes.

## CuÃ¡ndo no usarlo

Para diÃ¡logos/cajones genÃ©ricos usar `<iswc-dialog>` / `<iswc-drawer>` en layout.
No reinventar overlays si este mÃ³dulo cubre el caso.

## ImportaciÃ³n

```js
import './window.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-window title="Detalle" width="480" height="320" resizable closable>
  <p>Contenido de la ventana</p>
</iswc-window>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `title` | string | Encabezado. |
| `x` | string/segÃºn contrato | PosiciÃ³n X (px). |
| `y` | string/segÃºn contrato | PosiciÃ³n Y (px). |
| `width` | string/segÃºn contrato | Ancho. |
| `height` | string/segÃºn contrato | Alto. |
| `maximizable` | boolean | Permite maximizar. |
| `minimizable` | boolean | Permite minimizar. |
| `closable` | boolean | Permite cerrar. |
| `default` | string | `maximized` | `minimized` | `normal`. |
| `resizable` | boolean | Drag esquina inferior derecha. |
| `scope` | string | `local` (default) queda en el wrapper. `global` usa el viewport. |
| `position` | string | `absolute` o `fixed`. Local arranca en absolute; global en fixed si no se declara. |
| `dock` | string | Ignorado. Minimizar deja una pastilla de max 100px abajo del contexto. |
| `aria-modal` | string | Por defecto `"true"`. Pasar `"false"` para que conviva con la pÃ¡gina como una ventana no modal. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| â€” | â€” | No expone propiedades adicionales documentadas. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `footer` | Bloque inferior (si el mÃ³dulo lo declara). |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |
| `iswc-minimize` | Evento personalizado del componente (minimize). |
| `iswc-restore` | Evento personalizado del componente (restore). |
| `iswc-maximize` | Evento personalizado del componente (maximize). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-show` | no | sÃ­ | sÃ­ | no |
| `iswc-after-show` | no | sÃ­ | sÃ­ | no |
| `iswc-hide` | no | sÃ­ | sÃ­ | no |
| `iswc-after-hide` | no | sÃ­ | sÃ­ | no |
| `iswc-minimize` | no | sÃ­ | sÃ­ | no |
| `iswc-restore` | `{ was }` | sÃ­ | sÃ­ | no |
| `iswc-maximize` | no | sÃ­ | sÃ­ | no |

Vocabulario unificado con `ModalBase` (`iswc-show` / `iswc-after-show` /
`iswc-hide` / `iswc-after-hide`). Los antiguos `iswc-open` / `iswc-close` ya no se
emiten.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-window');
el.addEventListener('iswc-show', (e) => {
  console.log('iswc-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `minimize()` | MÃ©todo pÃºblico declarado. |
| `restore()` | MÃ©todo pÃºblico declarado. |
| `maximize()` | MÃ©todo pÃºblico declarado. |
| `unmaximize()` | MÃ©todo pÃºblico declarado. |
| `close()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Personalizable con `::part(root)`. |
| `header` | Personalizable con `::part(header)`. |
| `body` | Personalizable con `::part(body)`. |
| `resizer` | Asidero de redimensionado de la ventana. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--iswc-*`) segÃºn CSS del mÃ³dulo.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-window> â€” API minimize/restore/maximize/unmaximize/close. scope local|global. position absolute|fixed.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-window>`.

## Accesibilidad

El host lleva `role="dialog"` (por defecto; configurable) y `aria-label`
sincronizado con `title`. El atributo `aria-modal="true"` se aplica por
defecto â€” indica al lector de pantalla que el contenido fuera del dialog
estÃ¡ inerte mientras estÃ¡ abierto.

| Atributo / Rol | Notas |
| --- | --- |
| `role="dialog"` | Aplicado en `onConnected`. |
| `aria-label="<title>"` | Sincronizado con el atributo `title`. |
| `aria-modal="true"` | Por defecto. Pasar `"false"` explÃ­cito para deshabilitar el focus trap. |
| Tabla `data-state="normal | maximized | minimized"` | Refleja el estado actual para estilos. |

**Comportamiento de foco** (cuando `aria-modal="true"`):

- `Escape` cierra la ventana si lleva el atributo `closable`.
- `Tab` / `Shift+Tab` quedan contenidos dentro de la ventana cuando el foco
  ya estÃ¡ dentro de ella. Si el foco estÃ¡ fuera y la ventana es la de
  mayor `zIndex`, tambiÃ©n se captura el `Tab`.
- Al abrir, el foco se mueve al `body` interno (tabindex=0) en el
  siguiente tick, para que el lector identifique correctamente el modal.
- Al desconectar (porque se llamÃ³ a `close()`), el foco se restaura al
  elemento que lo tenÃ­a antes de abrir la ventana.

Si se quiere el comportamiento "no modal" de antes â€”convivir con otras
ventanas/elementos focuseables sin atrapar el Tabâ€” basta con declarar
`aria-modal="false"` en el HTML.

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. Listeners globales solo en
`connectedCallback` / `disconnectedCallback`.

## Ejemplo avanzado

```html
<iswc-window title="Detalle" width="480" height="320" resizable closable>
  <p>Contenido de la ventana</p>
</iswc-window>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Agregar listeners de `document`/`window` en el constructor.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./window.ts)
- [CSS](./window.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./window.json)
