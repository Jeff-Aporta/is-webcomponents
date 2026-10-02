---
tag: iswc-confirm-delete
tags:
  - iswc-confirm-delete
category: isp
status: public
source: ./confirm-delete.js
style: ./confirm-delete.css
preview: ./confirm-delete.json
---
# `<iswc-confirm-delete>`

## Propósito

Confirmación destructiva de tipo "escribe para confirmar": el botón de eliminar
sigue deshabilitado hasta que el usuario RE-ESCRIBE la clave del registro.
Versión genérica de `src/lib/base/modal/ModalEliminar.svelte` (ISP).

Este módulo registra `<iswc-confirm-delete>`.

## Cuándo usarlo

Borrados irreversibles donde un clic de más cuesta caro.

## Cuándo no usarlo

No usar para confirmaciones ordinarias: ahí van `<iswc-confirm-modal>` (modal) o
`<iswc-popconfirm>` (anclado al botón). La fricción de re-escribir solo se
justifica si el dato no se puede recuperar.

## Importación

```js
import './confirm-delete.js';
```

## Ejemplo mínimo

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
| `for` | string | Id del trigger que abre el diálogo. |
| `open` | boolean | Controlado. |
| `heading` | string | Título; por defecto se deriva de `entity`. |
| `entity` | string | Nombre de la entidad. |
| `confirm-value` | string | Valor que hay que re-escribir. |
| `confirm-label` | string | Etiqueta del campo de confirmación. |
| `pk-label` | string | Nombre legible de la clave. Default `código`. |
| `message` | string | Texto principal. |
| `delete-label` | string | Default `Eliminar`. |
| `cancel-label` | string | Default `Cancelar`. |
| `maxlength` | número | Límite del campo de confirmación. |
| `case-sensitive` | boolean | Por defecto compara sin distinguir mayúsculas. |
| `loading` | boolean | Bloquea ambos botones mientras corre el borrado. Además cancela el `iswc-hide`. |
| `light-dismiss` | boolean | **Opt-in**: cerrar al hacer click en el backdrop. Antes cerraba siempre. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-show` | `{}` | sí | sí | no |
| `iswc-after-show` | `{}` | sí | sí | no |
| `iswc-hide` | `{ source }` | sí | sí | **sí** |
| `iswc-after-hide` | `{}` | sí | sí | no |
| `iswc-confirm-delete` | `{ value }` | sí | sí | no |
| `iswc-cancel-delete` | `{}` | sí | sí | no |

El ciclo `iswc-show` / `iswc-hide` / … lo emite el `<iswc-dialog>` interno
(`_shared/modal-base.js`) y es el que hay que usar para controlar el cierre:
`iswc-hide` es cancelable con `preventDefault()`. `iswc-cancel-delete` se conserva
como evento semántico ADICIONAL y acompaña a `iswc-hide` cuando el cierre lo pide
el usuario (Escape, backdrop, botón Cancelar); un `hide()` programático no
emite ninguno de los dos.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Abre el diálogo. |
| `hide()` | Lo cierra. |
| `reset()` | Vacía el campo y vuelve a bloquear el botón. |

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
| `--iswc-confirm-delete-accent` | Color del título y del icono. |
| `--iswc-z-modal` | Capa de apilado. |


### Integración con formularios

No declara integración form-associated.
## Comportamiento

`iswc-confirm-delete` SOLO se emite si la clave coincide (se vuelve a comprobar en
el handler, por si alguien quita el `disabled` desde fuera). Al abrir, el campo
se vacía siempre: reabrir nunca hereda una confirmación anterior.

El componente NO implementa su propio ciclo de modal: compone un `<iswc-dialog>`
dentro de su shadow root y cuelga el contenido como light DOM suyo. De ahí
salen gratis el focus-trap (que antes no existía), el `Escape`, el restore de
foco y las animaciones.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../actions/button.js`](../actions/button.js)
- [`../forms/input.js`](../forms/input.js)
- [`../media/icon.js`](../media/icon.js)
- [`../layout/dialog.js`](../layout/dialog.js) — provee todo el ciclo del modal.

Tags del módulo: `<iswc-confirm-delete>`.

## Accesibilidad

`role="dialog"` + `aria-modal` (los pone el `<iswc-dialog>` interno); el foco
entra en el campo de confirmación (`autofocus`) y vuelve al trigger al cerrar.
Hay **focus-trap** con `Tab` / `Shift+Tab`, que antes faltaba.

Los `<iswc-button>` / `<iswc-input>` del diálogo llevan `tabindex="0"` a propósito:
usan `delegatesFocus`, así que sin él no matchean el selector de focuseables
del trap y `Tab` se quedaría muerto.

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

- Olvidar `confirm-value`: sin él el botón nunca se habilita (a propósito).
- Confiar solo en el `disabled` del botón en vez de escuchar el evento.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./confirm-delete.js)
- [CSS](./confirm-delete.css)
- [Preview](./confirm-delete.json)
