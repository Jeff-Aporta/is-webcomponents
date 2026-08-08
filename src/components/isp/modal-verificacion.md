---
tag: is-modal-verificacion
tags:
  - is-modal-verificacion
category: isp
status: public
source: ./modal-verificacion.js
style: ./modal-verificacion.css
preview: ../../previews/isp/is-modal-verificacion.json
---
# `<is-modal-verificacion>`

## Propósito

Port de `src/lib/base/modal/ModalVerificacion.svelte` (ISP-SvelteComponents).
Al abrirse ejecuta `controller.actVerificar(record)` y pinta los mensajes
devueltos coloreados por severidad. Al cerrarse vacía la lista de mensajes,
igual que el original reasignaba un `TMensajesVerificacion` nuevo.

Este módulo registra `<is-modal-verificacion>`.

NO extiende `ModalBase`: el focus-trap de `ModalBase` recorre el LIGHT DOM
(`this.querySelectorAll`) y aquí todo el contenido vive en el shadow, así que
el trap dejaría el diálogo sin tabulación. Sigue el mismo patrón que
`<is-confirm-delete>`, el otro modal ISP portado.

## Cuándo usarlo

Verificaciones asíncronas de un registro antes de una acción (guardar, cerrar,
aprobar), donde el backend devuelve una lista de mensajes por severidad.

## Cuándo no usarlo

Para confirmar un borrado usar `<is-confirm-delete>`; para un aviso sin
verificación asíncrona usar `<is-dialog>` o `<is-toast>`.

## Importación

```js
import './modal-verificacion.js';
```

## Ejemplo mínimo

```html
<is-button id="verBtn">Verificar</is-button>
<is-modal-verificacion id="modal" entity="tercero"></is-modal-verificacion>
<script type="module">
  const modal = document.getElementById('modal');
  modal.controller = {
    entrie: 'tercero',
    async actVerificar(record) {
      return { mensajes: [{ itdmensaje: 'info', mensaje: 'NIT válido.' }] };
    },
  };
  modal.record = { nit: '900123456' };
  document.getElementById('verBtn').addEventListener('click', () => modal.show());
</script>
```

## API

### Atributos y propiedades

#### Propiedades JS (no atributos: llevan funciones/objetos)

| Propiedad | Notas |
| --- | --- |
| `controller` | `{ entrie: string, actVerificar?(record): Promise<{ mensajes }> }`. |
| `record` | Registro a verificar (objeto plano). |
| `onError` | `(msg: string) => void`, se llama si `actVerificar` lanza. Default `console.error`. |

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Visible (reflected). |
| `loading` | boolean | Se pone solo mientras corre `actVerificar`. |
| `entity` | string | `Controller.entrie`; el título usa su minúscula. |
| `icon` | string | Icono del título. Default `mdi:check`. |
| `close-label` | string | Texto del botón de cierre. Default `Cerrar`. |
| `light-dismiss` | boolean | **Opt-in**: cerrar al hacer click en el backdrop. Antes cerraba siempre. |

#### Propiedades de solo lectura


| Propiedad | Notas |
| --- | --- |
| `mensajes` | Copia del array de mensajes actual. |
| `qerrores` / `qwarning` / `qinfos` | Contadores DERIVADOS de `mensajes` (no se leen del backend, como en ispgen). |

### Slots

No expone: todo el contenido del diálogo se construye en el shadow root.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Abre el diálogo. |
| `hide()` | Lo cierra y vacía los mensajes. |
| `verify()` | Re-ejecuta `controller.actVerificar` y repinta. Devuelve `mensajes`. |

### Eventos

| Evento | detail | bubbles | composed |
| --- | --- | --- | --- |
| `is-verificacion` | `{ mensajes, qinfos, qwarning, qerrores }` | sí | sí |
| `is-verificacion-error` | `{ message, error }` | sí | sí |
| `is-cancel` | `{}` — cierre pedido por el usuario | sí | sí |
| `is-show` / `is-after-show` / `is-hide` / `is-after-hide` | ciclo estándar del `<is-dialog>` interno | sí | sí |

`is-hide` es **cancelable**: es la vía para vetar un cierre. `is-cancel` se
conserva como evento semántico ADICIONAL y acompaña a `is-hide` cuando el
cierre lo pide el usuario (Escape, backdrop, botón Cerrar); un `hide()`
programático no emite ninguno de los dos.

### Custom states

No expone custom states.

### CSS parts

| Part | Uso |
| --- | --- |
| `backdrop` | Personalizable con `::part(backdrop)`. |
| `base` | Personalizable con `::part(base)`. |
| `heading` | Personalizable con `::part(heading)`. |
| `results` | Personalizable con `::part(results)`. |
| `stats` | Personalizable con `::part(stats)`. |
| `actions` | Personalizable con `::part(actions)`. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-modal-verificacion-accent` | Color del título. |
| `--is-z-modal` | Capa de apilado. |

### Integración con formularios

No declara integración form-associated: es un diálogo de verificación, no un
campo.

## Exports adicionales del módulo

- `getMsgColor(itd)` — mapea severidad (`1..4`, o `'info'|'warning'|'error'|'success'`,
  incluidas variantes en mayúscula, copia exacta de `getMsgColor` del original)
  a color semántico de `<is-text>`.
- `lowerCase(value)` — equivalente a `lowerCase` de ispgen: `null/undefined/''` → `''`.

## Comportamiento

Al abrirse (`open` pasa a `true`), siembra un mensaje "Verificando..." antes de
esperar la promesa de `actVerificar`, exactamente como el original. Si
`actVerificar` lanza, se llama a `onError` y se emite `is-verificacion-error`
en vez de `is-verificacion`.

El componente NO implementa su propio ciclo de modal: compone un `<is-dialog>`
dentro de su shadow root y cuelga el contenido como light DOM suyo. De ahí
salen gratis el focus-trap (que antes no existía), el `Escape`, el restore de
foco y las animaciones.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/button.js`](../actions/button.js)
- [`../media/icon.js`](../media/icon.js)
- [`./text.js`](./text.js)
- [`./heading.js`](./heading.js)
- [`../layout/dialog.js`](../layout/dialog.js) — provee todo el ciclo del modal.

Tags del módulo: `<is-modal-verificacion>`.

## Accesibilidad

`role="dialog"` + `aria-modal` (los pone el `<is-dialog>` interno); el foco
entra en el primer elemento focuseable y vuelve al elemento previamente
enfocado al cerrar. `Escape` cierra el diálogo. Hay **focus-trap** con `Tab` /
`Shift+Tab`, que antes faltaba.

Los `<is-button>` llevan `tabindex="0"` a propósito: usan `delegatesFocus`, así
que sin él no matchean el selector de focuseables del trap.

## Ejemplo avanzado

```html
<is-modal-verificacion id="modal" entity="comprobante"></is-modal-verificacion>

<script type="module">
  const modal = document.getElementById('modal');
  modal.controller = {
    entrie: 'comprobante',
    async actVerificar(record) {
      const r = await fetch(`/api/comprobante/${record.id}/verificar`);
      return r.json();          // { mensajes: [{ itdmensaje, mensaje }] }
    },
  };
  modal.record = { id: 7 };
  modal.addEventListener('is-after-hide', () => console.log('mensajes vaciados'));
  modal.show();
</script>
```

## Errores comunes

- Asignar `record`/`controller` después de `show()`: hacerlo antes, `verify()`
  los lee en el momento de ejecutarse.
- Esperar que `mensajes` sobreviva a un cierre: se vacía siempre al cerrar.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./modal-verificacion.js)
- [CSS](./modal-verificacion.css)
- [Preview](../../previews/isp/is-modal-verificacion.json)
