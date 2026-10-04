---
tag: iswc-masked-input
tags:
  - iswc-masked-input
category: forms
status: public
source: ./masked-input.ts
style: ./masked-input.css
preview: ./masked-input.json
---
# `<iswc-masked-input>`

## PropÃ³sito

Campo de texto con mÃ¡scara: tokeniza un `pattern` y reformatea el valor en
cada pulsaciÃ³n (tarjeta, NIT, telÃ©fono, fecha, placa). El formateo lo resuelve
`masks-tokens.js`.

Este mÃ³dulo registra `<iswc-masked-input>`.

## CuÃ¡ndo usarlo

Entrada de texto con formato fijo y verificable carÃ¡cter a carÃ¡cter.

## CuÃ¡ndo no usarlo

Para texto libre usar `<iswc-input>`; para OTP/PIN usar `<iswc-pin-input>`; para
fecha con calendario usar `<iswc-date-input>`; para moneda con separadores de
miles usar el formateo de `<iswc-input>` y `format.js`.

## ImportaciÃ³n

```js
import './masked-input.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-masked-input pattern="0000 0000 0000 0000"></iswc-masked-input>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `pattern` | string | Tokens y literales. TambiÃ©n se usa como `placeholder` del input interno. |
| `value` | string | Valor formateado; se reformatea al cambiar `pattern`. |
| `name` | string | Nombre form-associated. |
| `placeholder` | string | Texto de ayuda. |
| `autocomplete` | string | Se traslada al input interno. |
| `maxlength` | number | Si se omite, se deriva de la longitud de `pattern`. |
| `disabled` | boolean | Deshabilita y quita el foco. |
| `readonly` | boolean | Solo lectura. |
| `required` | boolean | Marca `invalid` al salir vacÃ­o. |
| `variant` | `outlined` \| `filled` \| `underlined` | Default `outlined`. |
| `invalid` | boolean | Refleja y activa `:state(invalid)`. |

Tokens de `pattern`:

| Token | Acepta |
| --- | --- |
| `0` | DÃ­gito requerido. |
| `9` | DÃ­gito opcional. |
| `A` | Letra, forzada a mayÃºscula. |
| `a` | Letra, forzada a minÃºscula. |
| `*` | AlfanumÃ©rico. |
| otro | Literal, se imprime tal cual. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Valor visible ya formateado. |
| `pattern` | lectura/escritura | Refleja el atributo. |
| `raw` | lectura | Valor sin literales de la mÃ¡scara. |
| `formatted` | lectura | Igual que `value`. |
| `complete` | lectura | `true` si todos los tokens requeridos estÃ¡n llenos. |

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Adorno inicial (icono, prefijo). |
| `end` | Adorno final (icono, acciÃ³n). |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-complete` | Emitido al completar la operaciÃ³n. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-input` | sin detail | sÃ­ | sÃ­ | no |
| `iswc-change` | `{ value }` | sÃ­ | sÃ­ | no |
| `iswc-complete` | sin detail | sÃ­ | sÃ­ | no |

`iswc-input` en cada pulsaciÃ³n; `iswc-change` al confirmar (`change` del input
interno, reemitido porque no cruza el shadow root); `iswc-complete` cada vez que
el valor pasa a estar completo.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-masked-input');
el.addEventListener('iswc-input', (e) => {
  console.log('iswc-input', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `focus()` | Enfoca el input interno. |
| `blur()` | Quita el foco del input interno. |

### CSS parts

| Part | Uso |
| --- | --- |
| `field` | Contenedor del campo. |
| `input` | Input interno. |

### Custom states

| Estado | CuÃ¡ndo |
| --- | --- |
| `:state(complete)` | Todos los tokens requeridos estÃ¡n llenos. |
| `:state(invalid)` | El atributo `invalid` estÃ¡ presente. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-field-width` | Ancho del campo, default `16rem`. |
| `--iswc-control-bg` | Fondo del campo. |
| `--iswc-control-border` | Borde del campo. |
| `--iswc-control-radius` | Radio de bordes. |
| `--iswc-bg-soft` | Fondo de reserva. |
| `--iswc-border` | Borde de reserva. |
| `--iswc-text` | Color del texto. |
| `--iswc-text-soft` | Color del placeholder. |
| `--iswc-accent` | Reserva del color de foco. |
| `--iswc-focus` | Color del anillo de foco. |
| `--iswc-danger` | Borde en estado invÃ¡lido. |

### IntegraciÃ³n con formularios

Form-associated vÃ­a `ElementInternals`: con `name` presente aporta el valor
formateado a `FormData`. Para enviar el valor sin literales usar `raw` y un
campo espejo.

## Comportamiento

- En cada `input` se aplica `apply(value, pattern)` y se reubica el caret al
  final del tramo reformateado.
- `pattern` fija el `placeholder` del input interno y, si no hay `maxlength`
  propio, su longitud mÃ¡xima.
- Cambiar `pattern` reformatea el valor vigente.
- Al perder el foco: con `required` y valor vacÃ­o se agrega `invalid`; si ya
  no es `required`, se retira.
- `disabled` fuerza `blur`.

## Dependencias y componentes relacionados

- [`./masks-tokens.js`](./masks-tokens.js) â€” tokenizado y `apply()` / `isComplete()`.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)
- [`../_shared/reflect.js`](../_shared/reflect.js)

Tags del mÃ³dulo: `<iswc-masked-input>`.

## Accesibilidad

El control es un `<input type="text">` nativo con `disabled` / `readOnly`
sincronizados. El `pattern` como placeholder anticipa el formato esperado;
para lectores de pantalla conviene aÃ±adir ademÃ¡s una etiqueta explÃ­cita
asociada al componente.

## Ejemplo avanzado

```html
<iswc-masked-input id="tarjeta" pattern="0000 0000 0000 0000"
                 name="tarjeta" required variant="filled">
  <iswc-icon slot="start" name="mdi:credit-card"></iswc-icon>
</iswc-masked-input>

<script type="module">
  const campo = document.getElementById('tarjeta');
  campo.addEventListener('iswc-complete', () => console.log('crudo:', campo.raw));
  campo.addEventListener('iswc-change', (e) => console.log('confirmado:', e.detail.value));
</script>
```

## Errores comunes

- Enviar `value` cuando el backend espera dÃ­gitos: usar `raw`.
- Usar `9` esperando dÃ­gito obligatorio: `9` es opcional, el requerido es `0`.
- Poner literales que coinciden con tokens (`0`, `9`, `A`, `a`, `*`) sin
  advertir que se interpretan como mÃ¡scara.
- Fijar `maxlength` menor que la longitud del patrÃ³n: el valor nunca completa.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./masked-input.ts)
- [CSS](./masked-input.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./masked-input.json)
