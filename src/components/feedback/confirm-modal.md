---
tag: is-confirm-modal
tags:
  - is-confirm-modal
category: feedback
status: public
source: ./confirm-modal.js
style: ./confirm-modal.css
preview: ../../previews/feedback/is-confirm-modal.json
---
# `<is-confirm-modal>`

## Propósito

Confirmación en modal centrado con backdrop. Es el complemento de
`<is-popconfirm>`: donde el popconfirm ancla un popover al disparador y no
bloquea el fondo, este abre un diálogo centrado, oscurece la página y exige
una respuesta antes de seguir.

Este módulo registra `<is-confirm-modal>`.

## Cuándo usarlo

Cuando la acción es destructiva o irreversible y conviene detener al usuario:
borrar un registro, descartar cambios sin guardar, cerrar sesión.

## Cuándo no usarlo

Para confirmaciones triviales o de bajo riesgo. Ahí basta `<is-popconfirm>`,
que no interrumpe el flujo de la página.

## Importación

```js
import './confirm-modal.js';
```

## Ejemplo mínimo

```html
<is-button id="del">Borrar</is-button>
<is-confirm-modal for="del" heading="Eliminar registro" message="¿Seguro?"></is-confirm-modal>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `for` | string | Id del elemento disparador; al hacer click abre el modal. |
| `heading` | string | Título del modal. Si falta, la cabecera se oculta. |
| `message` | string | Texto principal. Lo pisa el slot `message` si tiene contenido. |
| `open` | boolean | Controlado: presencia = visible. |

#### Propiedades públicas

No declara propiedades reflejadas propias; se opera por atributos y métodos.

### Slots

| Slot | Uso |
| --- | --- |
| `message` | Contenido rico en vez del atributo `message`. |
| `confirm` | Botón de confirmación. Default: `<is-button color="brand">Aceptar</is-button>`. |
| `cancel` | Botón de cancelar. Default: `<is-button variant="text" color="neutral">Cancelar</is-button>`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-confirm-show` | sí | sí | sí | no |
| `is-confirm-hide` | sí | sí | sí | no |
| `is-confirm-confirm` | sí | sí | sí | no |
| `is-confirm-cancel` | sí | sí | sí | no |

`detail` en los cuatro: `{ trigger }` — el elemento referenciado por `for`,
o `null` si no hay.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Abre el modal y emite `is-confirm-show`. |
| `hide()` | Cierra el modal y emite `is-confirm-hide`. |

### CSS parts

| Part | Uso |
| --- | --- |
| `backdrop` | El fondo oscurecido a pantalla completa. |
| `base` | La caja del modal. |
| `heading` | El título. |
| `message` | El bloque de texto. |
| `actions` | La fila de botones. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-bg-elev` | Fondo del modal (vía `--bg`). |
| `--is-text` | Color de texto (vía `--fg`). |
| `--is-text-soft` | Color del mensaje. |
| `--is-border` | Borde del modal (vía `--border`). |
| `--is-brand` | Color de marca (vía `--brand`). |
| `--is-brand-fg` | Texto sobre el color de marca (vía `--brand-fg`). |

Los botones por defecto de los slots `confirm` / `cancel` son `<is-button>`:
su color y apariencia se controlan desde el propio botón, no desde aquí.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

- El cierre por Escape y el bloqueo de scroll del fondo salen de
  `_shared/popup-dismiss.js` (`createPopupDismiss` con `scrollLock`), el mismo
  ciclo que usan `is-dropdown`, `is-context-menu` y `is-popconfirm`.
- El click fuera lo resuelve el propio backdrop: sólo cancela si el click cae
  en el backdrop, no en la caja del modal.
- Escape y el click fuera equivalen a **cancelar**: emiten
  `is-confirm-cancel` y luego `is-confirm-hide`.
- Al abrir se guarda el elemento enfocado y se enfoca el botón de confirmar;
  al cerrar se devuelve el foco al elemento original.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js)
- [`../actions/button.js`](../actions/button.js)
- [`./popconfirm.md`](./popconfirm.md) — la variante anclada, sin backdrop.

Tags del módulo: `<is-confirm-modal>`.

## Accesibilidad

`role="alertdialog"` + `aria-modal="true"` en la caja. El disparador recibe
`aria-haspopup="dialog"`. El foco entra al confirmar y vuelve al disparador al
cerrar. Escape siempre cancela.

## Ejemplo avanzado

```html
<is-button id="btnDelete" color="danger">Borrar</is-button>
<is-confirm-modal for="btnDelete" heading="Eliminar factura">
  <div slot="message">
    Se borrará la factura y sus movimientos asociados. Esta acción no se puede deshacer.
  </div>
  <is-button slot="confirm" color="danger">Sí, eliminar</is-button>
  <is-button slot="cancel">Volver</is-button>
</is-confirm-modal>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Esperar que Escape confirme: siempre cancela.
- Poner `message` y a la vez contenido en el slot `message`: gana el slot.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./confirm-modal.js)
- [CSS](./confirm-modal.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-confirm-modal.json)
