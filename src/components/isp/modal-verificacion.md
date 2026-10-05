---
tag: iswc-modal-verificacion
tags:
  - iswc-modal-verificacion
category: isp
status: public
source: ./modal-verificacion.ts
style: ./modal-verificacion.css
preview: ./modal-verificacion.json
---
# `<iswc-modal-verificacion>`

## PropÃ³sito

Port de `src/lib/base/modal/ModalVerificacion.svelte` (ISP-SvelteComponents).
Al abrirse ejecuta `controller.actVerificar(record)` y pinta los mensajes
devueltos coloreados por severidad. Al cerrarse vacÃ­a la lista de mensajes,
igual que el original reasignaba un `TMensajesVerificacion` nuevo.

Este mÃ³dulo registra `<iswc-modal-verificacion>`.

NO extiende `ModalBase`: el focus-trap de `ModalBase` recorre el LIGHT DOM
(`this.querySelectorAll`) y aquÃ­ todo el contenido vive en el shadow, asÃ­ que
el trap dejarÃ­a el diÃ¡logo sin tabulaciÃ³n. Sigue el mismo patrÃ³n que
`<iswc-confirm-delete>`, el otro modal ISP portado.

## CuÃ¡ndo usarlo

Verificaciones asÃ­ncronas de un registro antes de una acciÃ³n (guardar, cerrar,
aprobar), donde el backend devuelve una lista de mensajes por severidad.

## CuÃ¡ndo no usarlo

Para confirmar un borrado usar `<iswc-confirm-delete>`; para un aviso sin
verificaciÃ³n asÃ­ncrona usar `<iswc-dialog>` o `<iswc-toast>`.

## ImportaciÃ³n

```js
import './modal-verificacion.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-button id="verBtn">Verificar</iswc-button>
<iswc-modal-verificacion id="modal" entity="tercero"></iswc-modal-verificacion>
<script type="module">
  const modal = document.getElementById('modal');
  modal.controller = {
    entrie: 'tercero',
    async actVerificar(record) {
      return { mensajes: [{ itdmensaje: 'info', mensaje: 'NIT vÃ¡lido.' }] };
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
| `entity` | string | `Controller.entrie`; el tÃ­tulo usa su minÃºscula. |
| `icon` | string | Icono del tÃ­tulo. Default `mdi:check`. |
| `close-label` | string | Texto del botÃ³n de cierre. Default `Cerrar`. |
| `light-dismiss` | boolean | **Opt-in**: cerrar al hacer click en el backdrop. Antes cerraba siempre. |

#### Propiedades de solo lectura


| Propiedad | Notas |
| --- | --- |
| `mensajes` | Copia del array de mensajes actual. |
| `qerrores` / `qwarning` / `qinfos` | Contadores DERIVADOS de `mensajes` (no se leen del backend, como en ispgen). |

### Slots

No expone: todo el contenido del diÃ¡logo se construye en el shadow root.

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | Abre el diÃ¡logo. |
| `hide()` | Lo cierra y vacÃ­a los mensajes. |
| `verify()` | Re-ejecuta `controller.actVerificar` y repinta. Devuelve `mensajes`. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-verificacion` | Evento personalizado del componente (verificacion). |
| `iswc-verificacion-error` | Evento personalizado del componente (verificacion error). |
| `iswc-cancel` | Emitido al cancelar la operaciÃ³n. |
| `iswc-show / iswc-after-show / iswc-hide / iswc-after-hide` | Evento personalizado del componente (show / iswc after show / iswc hide / iswc after hide). |

| Evento | detail | bubbles | composed |
| --- | --- | --- | --- |
| `iswc-verificacion` | `{ mensajes, qinfos, qwarning, qerrores }` | sÃ­ | sÃ­ |
| `iswc-verificacion-error` | `{ message, error }` | sÃ­ | sÃ­ |
| `iswc-cancel` | `{}` â€” cierre pedido por el usuario | sÃ­ | sÃ­ |
| `iswc-show` / `iswc-after-show` / `iswc-hide` / `iswc-after-hide` | ciclo estÃ¡ndar del `<iswc-dialog>` interno | sÃ­ | sÃ­ |

`iswc-hide` es **cancelable**: es la vÃ­a para vetar un cierre. `iswc-cancel` se
conserva como evento semÃ¡ntico ADICIONAL y acompaÃ±a a `iswc-hide` cuando el
cierre lo pide el usuario (Escape, backdrop, botÃ³n Cerrar); un `hide()`
programÃ¡tico no emite ninguno de los dos.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-modal-verificacion');
el.addEventListener('iswc-verificacion', (e) => {
  console.log('iswc-verificacion', e.detail);
});
```

</details>

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
| `--iswc-modal-verificacion-accent` | Color del tÃ­tulo. |
| `--iswc-z-modal` | Capa de apilado. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated: es un diÃ¡logo de verificaciÃ³n, no un
campo.

## Exports adicionales del mÃ³dulo

- `getMsgColor(itd)` â€” mapea severidad (`1..4`, o `'info'|'warning'|'error'|'success'`,
  incluidas variantes en mayÃºscula, copia exacta de `getMsgColor` del original)
  a color semÃ¡ntico de `<iswc-text>`.
- `lowerCase(value)` â€” equivalente a `lowerCase` de ispgen: `null/undefined/''` â†’ `''`.

## Comportamiento

Al abrirse (`open` pasa a `true`), siembra un mensaje "Verificando..." antes de
esperar la promesa de `actVerificar`, exactamente como el original. Si
`actVerificar` lanza, se llama a `onError` y se emite `iswc-verificacion-error`
en vez de `iswc-verificacion`.

El componente NO implementa su propio ciclo de modal: compone un `<iswc-dialog>`
dentro de su shadow root y cuelga el contenido como light DOM suyo. De ahÃ­
salen gratis el focus-trap (que antes no existÃ­a), el `Escape`, el restore de
foco y las animaciones.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/button.js`](../actions/button.js)
- [`../media/icon.js`](../media/icon.js)
- [`./text.js`](./text.js)
- [`./heading.js`](./heading.js)
- [`../layout/dialog.js`](../layout/dialog.js) â€” provee todo el ciclo del modal.

Tags del mÃ³dulo: `<iswc-modal-verificacion>`.

## Accesibilidad

`role="dialog"` + `aria-modal` (los pone el `<iswc-dialog>` interno); el foco
entra en el primer elemento focuseable y vuelve al elemento previamente
enfocado al cerrar. `Escape` cierra el diÃ¡logo. Hay **focus-trap** con `Tab` /
`Shift+Tab`, que antes faltaba.

Los `<iswc-button>` llevan `tabindex="0"` a propÃ³sito: usan `delegatesFocus`, asÃ­
que sin Ã©l no matchean el selector de focuseables del trap.

## Ejemplo avanzado

```html
<iswc-modal-verificacion id="modal" entity="comprobante"></iswc-modal-verificacion>

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
  modal.addEventListener('iswc-after-hide', () => console.log('mensajes vaciados'));
  modal.show();
</script>
```

## Errores comunes

- Asignar `record`/`controller` despuÃ©s de `show()`: hacerlo antes, `verify()`
  los lee en el momento de ejecutarse.
- Esperar que `mensajes` sobreviva a un cierre: se vacÃ­a siempre al cerrar.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./modal-verificacion.ts)
- [CSS](./modal-verificacion.css)
- [Preview](./modal-verificacion.json)
