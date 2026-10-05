---
tag: iswc-confirm-modal
tags:
  - iswc-confirm-modal
category: feedback
status: public
source: ./confirm-modal.ts
style: ./confirm-modal.css
preview: ./confirm-modal.json
---
# `<iswc-confirm-modal>`

## PropÃ³sito

ConfirmaciÃ³n en modal centrado con backdrop. Es el complemento de
`<iswc-popconfirm>`: donde el popconfirm ancla un popover al disparador y no
bloquea el fondo, este abre un diÃ¡logo centrado, oscurece la pÃ¡gina y exige
una respuesta antes de seguir.

Este mÃ³dulo registra `<iswc-confirm-modal>`.

## CuÃ¡ndo usarlo

Cuando la acciÃ³n es destructiva o irreversible y conviene detener al usuario:
borrar un registro, descartar cambios sin guardar, cerrar sesiÃ³n.

## CuÃ¡ndo no usarlo

Para confirmaciones triviales o de bajo riesgo. AhÃ­ basta `<iswc-popconfirm>`,
que no interrumpe el flujo de la pÃ¡gina.

## ImportaciÃ³n

```js
import './confirm-modal.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-button id="del">Borrar</iswc-button>
<iswc-confirm-modal for="del" heading="Eliminar registro" message="Â¿Seguro?"></iswc-confirm-modal>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `for` | string | Id del elemento disparador; al hacer click abre el modal. |
| `heading` | string | TÃ­tulo del modal. Si falta, la cabecera se oculta. |
| `message` | string | Texto principal. Lo pisa el slot `message` si tiene contenido. |
| `open` | boolean | Controlado: presencia = visible. |

#### Propiedades pÃºblicas

No declara propiedades reflejadas propias; se opera por atributos y mÃ©todos.

### Slots

| Slot | Uso |
| --- | --- |
| `message` | Contenido rico en vez del atributo `message`. |
| `confirm` | BotÃ³n de confirmaciÃ³n. Default: `<iswc-button color="brand">Aceptar</iswc-button>`. |
| `cancel` | BotÃ³n de cancelar. Default: `<iswc-button variant="text" color="neutral">Cancelar</iswc-button>`. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-confirm-show` | Evento personalizado del componente (confirm show). |
| `iswc-confirm-hide` | Evento personalizado del componente (confirm hide). |
| `iswc-confirm-confirm` | Evento personalizado del componente (confirm confirm). |
| `iswc-confirm-cancel` | Evento personalizado del componente (confirm cancel). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-confirm-show` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-confirm-hide` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-confirm-confirm` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-confirm-cancel` | sÃ­ | sÃ­ | sÃ­ | no |

`detail` en los cuatro: `{ trigger }` â€” el elemento referenciado por `for`,
o `null` si no hay.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-confirm-modal');
el.addEventListener('iswc-confirm-show', (e) => {
  console.log('iswc-confirm-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | Abre el modal y emite `iswc-confirm-show`. |
| `hide()` | Cierra el modal y emite `iswc-confirm-hide`. |

### CSS parts

| Part | Uso |
| --- | --- |
| `backdrop` | El fondo oscurecido a pantalla completa. |
| `base` | La caja del modal. |
| `heading` | El tÃ­tulo. |
| `message` | El bloque de texto. |
| `actions` | La fila de botones. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-bg-elev` | Fondo del modal (vÃ­a `--bg`). |
| `--iswc-text` | Color de texto (vÃ­a `--fg`). |
| `--iswc-text-soft` | Color del mensaje. |
| `--iswc-border` | Borde del modal (vÃ­a `--border`). |
| `--iswc-brand` | Color de marca (vÃ­a `--brand`). |
| `--iswc-brand-fg` | Texto sobre el color de marca (vÃ­a `--brand-fg`). |

Los botones por defecto de los slots `confirm` / `cancel` son `<iswc-button>`:
su color y apariencia se controlan desde el propio botÃ³n, no desde aquÃ­.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

- El cierre por Escape y el bloqueo de scroll del fondo salen de
  `_shared/popup-dismiss.js` (`createPopupDismiss` con `scrollLock`), el mismo
  ciclo que usan `iswc-dropdown`, `iswc-context-menu` y `iswc-popconfirm`.
- El click fuera lo resuelve el propio backdrop: sÃ³lo cancela si el click cae
  en el backdrop, no en la caja del modal.
- Escape y el click fuera equivalen a **cancelar**: emiten
  `iswc-confirm-cancel` y luego `iswc-confirm-hide`.
- Al abrir se guarda el elemento enfocado y se enfoca el botÃ³n de confirmar;
  al cerrar se devuelve el foco al elemento original.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js)
- [`../actions/button.js`](../actions/button.js)
- [`./popconfirm.md`](./popconfirm.md) â€” la variante anclada, sin backdrop.

Tags del mÃ³dulo: `<iswc-confirm-modal>`.

## Accesibilidad

`role="alertdialog"` + `aria-modal="true"` en la caja. El disparador recibe
`aria-haspopup="dialog"`. El foco entra al confirmar y vuelve al disparador al
cerrar. Escape siempre cancela.

## Ejemplo avanzado

```html
<iswc-button id="btnDelete" color="danger">Borrar</iswc-button>
<iswc-confirm-modal for="btnDelete" heading="Eliminar factura">
  <div slot="message">
    Se borrarÃ¡ la factura y sus movimientos asociados. Esta acciÃ³n no se puede deshacer.
  </div>
  <iswc-button slot="confirm" color="danger">SÃ­, eliminar</iswc-button>
  <iswc-button slot="cancel">Volver</iswc-button>
</iswc-confirm-modal>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Esperar que Escape confirme: siempre cancela.
- Poner `message` y a la vez contenido en el slot `message`: gana el slot.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./confirm-modal.ts)
- [CSS](./confirm-modal.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./confirm-modal.json)
