---
tag: iswc-confirm-delete
tags:
  - iswc-confirm-delete
category: isp
status: public
source: ./confirm-delete.ts
style: ./confirm-delete.css
preview: ./confirm-delete.json
---
# `<iswc-confirm-delete>`

## PropÃ³sito

ConfirmaciÃ³n destructiva de tipo "escribe para confirmar": el botÃ³n de eliminar
sigue deshabilitado hasta que el usuario RE-ESCRIBE la clave del registro.
VersiÃ³n genÃ©rica de `src/lib/base/modal/ModalEliminar.svelte` (ISP).

Este mÃ³dulo registra `<iswc-confirm-delete>`.

## CuÃ¡ndo usarlo

Borrados irreversibles donde un clic de mÃ¡s cuesta caro.

## CuÃ¡ndo no usarlo

No usar para confirmaciones ordinarias: ahÃ­ van `<iswc-confirm-modal>` (modal) o
`<iswc-popconfirm>` (anclado al botÃ³n). La fricciÃ³n de re-escribir solo se
justifica si el dato no se puede recuperar.

## ImportaciÃ³n

```js
import './confirm-delete.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-button id="del" color="danger">Eliminar</iswc-button>
<iswc-confirm-delete for="del" entity="tercero" pk-label="NIT" confirm-value="900123456">
</iswc-confirm-delete>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `for` | string | Id del trigger que abre el diÃ¡logo. |
| `open` | boolean | Controlado. |
| `heading` | string | TÃ­tulo; por defecto se deriva de `entity`. |
| `entity` | string | Nombre de la entidad. |
| `confirm-value` | string | Valor que hay que re-escribir. |
| `confirm-label` | string | Etiqueta del campo de confirmaciÃ³n. |
| `pk-label` | string | Nombre legible de la clave. Default `cÃ³digo`. |
| `message` | string | Texto principal. |
| `delete-label` | string | Default `Eliminar`. |
| `cancel-label` | string | Default `Cancelar`. |
| `maxlength` | nÃºmero | LÃ­mite del campo de confirmaciÃ³n. |
| `case-sensitive` | boolean | Por defecto compara sin distinguir mayÃºsculas. |
| `loading` | boolean | Bloquea ambos botones mientras corre el borrado. AdemÃ¡s cancela el `iswc-hide`. |
| `light-dismiss` | boolean | **Opt-in**: cerrar al hacer click en el backdrop. Antes cerraba siempre. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Refleja el atributo. |
| `confirmValue` | lectura/escritura | Refleja `confirm-value`. |
| `entity` | lectura/escritura | Refleja el atributo. |
| `pkLabel` | lectura/escritura | Refleja `pk-label`. |
| `caseSensitive` | lectura/escritura | Refleja `case-sensitive`. |
| `loading` | lectura/escritura | Refleja el atributo. |
| `confirmed` | solo lectura | `true` si lo escrito coincide. |

### Slots

| Slot | Uso |
| --- | --- |
| `message` | Contenido rico en lugar del atributo `message`. |
| `description` | Detalle adicional bajo los campos. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |
| `iswc-confirm-delete` | Evento personalizado del componente (confirm delete). |
| `iswc-cancel-delete` | Evento personalizado del componente (cancel delete). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-show` | `{}` | sÃ­ | sÃ­ | no |
| `iswc-after-show` | `{}` | sÃ­ | sÃ­ | no |
| `iswc-hide` | `{ source }` | sÃ­ | sÃ­ | **sÃ­** |
| `iswc-after-hide` | `{}` | sÃ­ | sÃ­ | no |
| `iswc-confirm-delete` | `{ value }` | sÃ­ | sÃ­ | no |
| `iswc-cancel-delete` | `{}` | sÃ­ | sÃ­ | no |

El ciclo `iswc-show` / `iswc-hide` / â€¦ lo emite el `<iswc-dialog>` interno
(`_shared/modal-base.js`) y es el que hay que usar para controlar el cierre:
`iswc-hide` es cancelable con `preventDefault()`. `iswc-cancel-delete` se conserva
como evento semÃ¡ntico ADICIONAL y acompaÃ±a a `iswc-hide` cuando el cierre lo pide
el usuario (Escape, backdrop, botÃ³n Cancelar); un `hide()` programÃ¡tico no
emite ninguno de los dos.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-confirm-delete');
el.addEventListener('iswc-show', (e) => {
  console.log('iswc-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | Abre el diÃ¡logo. |
| `hide()` | Lo cierra. |
| `reset()` | VacÃ­a el campo y vuelve a bloquear el botÃ³n. |

### CSS parts

| Part | Uso |
| --- | --- |
| `backdrop` | Personalizable con `::part(backdrop)`. |
| `base` | Personalizable con `::part(base)`. |
| `heading` | Personalizable con `::part(heading)`. |
| `message` | Personalizable con `::part(message)`. |
| `fields` | Personalizable con `::part(fields)`. |
| `actions` | Personalizable con `::part(actions)`. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-confirm-delete-accent` | Color del tÃ­tulo y del icono. |
| `--iswc-z-modal` | Capa de apilado. |


### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.
## Comportamiento

`iswc-confirm-delete` SOLO se emite si la clave coincide (se vuelve a comprobar en
el handler, por si alguien quita el `disabled` desde fuera). Al abrir, el campo
se vacÃ­a siempre: reabrir nunca hereda una confirmaciÃ³n anterior.

El componente NO implementa su propio ciclo de modal: compone un `<iswc-dialog>`
dentro de su shadow root y cuelga el contenido como light DOM suyo. De ahÃ­
salen gratis el focus-trap (que antes no existÃ­a), el `Escape`, el restore de
foco y las animaciones.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/button.js`](../actions/button.js)
- [`../forms/input.js`](../forms/input.js)
- [`../media/icon.js`](../media/icon.js)
- [`../layout/dialog.js`](../layout/dialog.js) â€” provee todo el ciclo del modal.

Tags del mÃ³dulo: `<iswc-confirm-delete>`.

## Accesibilidad

`role="dialog"` + `aria-modal` (los pone el `<iswc-dialog>` interno); el foco
entra en el campo de confirmaciÃ³n (`autofocus`) y vuelve al trigger al cerrar.
Hay **focus-trap** con `Tab` / `Shift+Tab`, que antes faltaba.

Los `<iswc-button>` / `<iswc-input>` del diÃ¡logo llevan `tabindex="0"` a propÃ³sito:
usan `delegatesFocus`, asÃ­ que sin Ã©l no matchean el selector de focuseables
del trap y `Tab` se quedarÃ­a muerto.

## Ejemplo avanzado

```html
<iswc-confirm-delete id="borrar" entity="comprobante"
                   confirm-value="CMP-0007" pk-label="consecutivo">
</iswc-confirm-delete>

<script type="module">
  const modal = document.getElementById('borrar');
  modal.show();
  modal.addEventListener('iswc-confirm-delete', async (e) => {
    modal.loading = true;                 // bloquea botones y cancela iswc-hide
    await fetch(`/api/comprobante/${e.detail.value}`, { method: 'DELETE' });
    modal.loading = false;
    modal.hide();
  });
  modal.addEventListener('iswc-cancel-delete', () => modal.reset());
</script>
```

## Errores comunes

- Olvidar `confirm-value`: sin Ã©l el botÃ³n nunca se habilita (a propÃ³sito).
- Confiar solo en el `disabled` del botÃ³n en vez de escuchar el evento.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./confirm-delete.ts)
- [CSS](./confirm-delete.css)
- [Preview](./confirm-delete.json)
