---
tag: iswc-confirm-modal
tags:
  - iswc-confirm-modal
category: feedback
status: public
source: ./confirm-modal.js
style: ./confirm-modal.css
preview: ./confirm-modal.json
---
# `<iswc-confirm-modal>`

## Propósito

Confirmación en modal centrado con backdrop. Es el complemento de
`<iswc-popconfirm>`: donde el popconfirm ancla un popover al disparador y no
bloquea el fondo, este abre un diálogo centrado, oscurece la página y exige
una respuesta antes de seguir.

Este módulo registra `<iswc-confirm-modal>`.

## Cuándo usarlo

Cuando la acción es destructiva o irreversible y conviene detener al usuario:
borrar un registro, descartar cambios sin guardar, cerrar sesión.

## Cuándo no usarlo

Para confirmaciones triviales o de bajo riesgo. Ahí basta `<iswc-popconfirm>`,
que no interrumpe el flujo de la página.

## Importación

```js
import './confirm-modal.js';
```

## Ejemplo mínimo

```html
<iswc-button id="del">Borrar</iswc-button>
<iswc-confirm-modal for="del" heading="Eliminar registro" message="¿Seguro?"></iswc-confirm-modal>
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
| `confirm` | Botón de confirmación. Default: `<iswc-button color="brand">Aceptar</iswc-button>`. |
| `cancel` | Botón de cancelar. Default: `<iswc-button variant="text" color="neutral">Cancelar</iswc-button>`. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-confirm-show` | Evento personalizado del componente (confirm show). |
| `iswc-confirm-hide` | Evento personalizado del componente (confirm hide). |
| `iswc-confirm-confirm` | Evento personalizado del componente (confirm confirm). |
| `iswc-confirm-cancel` | Evento personalizado del componente (confirm cancel). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-confirm-show` | sí | sí | sí | no |
| `iswc-confirm-hide` | sí | sí | sí | no |
| `iswc-confirm-confirm` | sí | sí | sí | no |
| `iswc-confirm-cancel` | sí | sí | sí | no |

`detail` en los cuatro: `{ trigger }` — el elemento referenciado por `for`,
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

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Abre el modal y emite `iswc-confirm-show`. |
| `hide()` | Cierra el modal y emite `iswc-confirm-hide`. |

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
| `--iswc-bg-elev` | Fondo del modal (vía `--bg`). |
| `--iswc-text` | Color de texto (vía `--fg`). |
| `--iswc-text-soft` | Color del mensaje. |
| `--iswc-border` | Borde del modal (vía `--border`). |
| `--iswc-brand` | Color de marca (vía `--brand`). |
| `--iswc-brand-fg` | Texto sobre el color de marca (vía `--brand-fg`). |

Los botones por defecto de los slots `confirm` / `cancel` son `<iswc-button>`:
su color y apariencia se controlan desde el propio botón, no desde aquí.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

- El cierre por Escape y el bloqueo de scroll del fondo salen de
  `_shared/popup-dismiss.js` (`createPopupDismiss` con `scrollLock`), el mismo
  ciclo que usan `iswc-dropdown`, `iswc-context-menu` y `iswc-popconfirm`.
- El click fuera lo resuelve el propio backdrop: sólo cancela si el click cae
  en el backdrop, no en la caja del modal.
- Escape y el click fuera equivalen a **cancelar**: emiten
  `iswc-confirm-cancel` y luego `iswc-confirm-hide`.
- Al abrir se guarda el elemento enfocado y se enfoca el botón de confirmar;
  al cerrar se devuelve el foco al elemento original.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js)
- [`../actions/button.js`](../actions/button.js)
- [`./popconfirm.md`](./popconfirm.md) — la variante anclada, sin backdrop.

Tags del módulo: `<iswc-confirm-modal>`.

## Accesibilidad

`role="alertdialog"` + `aria-modal="true"` en la caja. El disparador recibe
`aria-haspopup="dialog"`. El foco entra al confirmar y vuelve al disparador al
cerrar. Escape siempre cancela.

## Ejemplo avanzado

```html
<iswc-button id="btnDelete" color="danger">Borrar</iswc-button>
<iswc-confirm-modal for="btnDelete" heading="Eliminar factura">
  <div slot="message">
    Se borrará la factura y sus movimientos asociados. Esta acción no se puede deshacer.
  </div>
  <iswc-button slot="confirm" color="danger">Sí, eliminar</iswc-button>
  <iswc-button slot="cancel">Volver</iswc-button>
</iswc-confirm-modal>
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
- [Preview](./confirm-modal.json)
