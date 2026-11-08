---
tag: iswc-masked-input
tags:
  - iswc-masked-input
category: forms
status: public
source: ./masked-input.ts
style: ./masked-input.scss
preview: ./masked-input.json
---
# `<iswc-masked-input>`

## Propósito

Campo de texto con máscara: tokeniza un `pattern` y reformatea el valor en
cada pulsación (tarjeta, NIT, teléfono, fecha, placa). El formateo lo resuelve
`masks-tokens.js`. Está construido sobre `<iswc-input>`: etiqueta, ayuda, error,
variantes, foco y densidad vienen de ahí.

Este módulo registra `<iswc-masked-input>`.

## Cuándo usarlo

Entrada de texto con formato fijo y verificable carácter a carácter.

## Cuándo no usarlo

Para texto libre usar `<iswc-input>`; para OTP/PIN usar `<iswc-pin-input>`; para
fecha con calendario usar `<iswc-date-input>`; para moneda con separadores de
miles usar el formateo de `<iswc-input>` y `format.js`.

## Importación

```js
import './masked-input.js';
```

## Ejemplo mínimo

```html
<iswc-masked-input pattern="0000 0000 0000 0000"></iswc-masked-input>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `pattern` | string | Tokens y literales. Es el `placeholder` si no se da otro. |
| `value` | string | Valor formateado; se reformatea al cambiar `pattern`. |
| `name` | string | Nombre form-associated. |
| `label` | string | Etiqueta del campo. |
| `hint` | string | Texto de ayuda bajo el campo. |
| `error` | boolean | Estado de error fijado desde fuera; `invalid` lo marca el campo. |
| `error-text` | string | Mensaje de error; se muestra con `error` o `invalid`. |
| `placeholder` | string | Texto de ayuda; por defecto, el `pattern`. |
| `autocomplete` | string | Se traslada al input interno. |
| `maxlength` | number | Si se omite, se deriva de la longitud de `pattern`. |
| `disabled` | boolean | Deshabilita y quita el foco. |
| `readonly` | boolean | Solo lectura. |
| `required` | boolean | Marca `invalid` al salir vacío; lo quita al llenarse. |
| `variant` | `outlined` \| `filled` \| `underlined` | Default `outlined`. |
| `label-placement` | `top` \| `start` \| `float` | Default `top`. |
| `clearable` | boolean | Botón para vaciar el campo. |
| `full-width` | boolean | Ocupa todo el ancho del contenedor. |
| `invalid` | boolean | Refleja y activa `:state(invalid)`. |

Tokens de `pattern`:

| Token | Acepta |
| --- | --- |
| `0` | Dígito requerido. |
| `9` | Dígito opcional. |
| `A` | Letra, forzada a mayúscula. |
| `a` | Letra, forzada a minúscula. |
| `*` | Alfanumérico. |
| otro | Literal, se imprime tal cual. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Valor visible ya formateado. |
| `pattern` | lectura/escritura | Refleja el atributo. |
| `raw` | lectura | Valor sin literales de la máscara. |
| `formatted` | lectura | Igual que `value`. |
| `complete` | lectura | `true` si todos los tokens requeridos están llenos. |

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Adorno inicial (icono, prefijo). |
| `end` | Adorno final (icono, acción). |

### Eventos

<!-- eventos: generado por scripts/sondas/eventos.ts desde declare static events -->

| Evento | detail | cancelable |
| --- | --- | --- |
| `iswc-invalid` | `{ message: string }` | no |
| `iswc-change` | `{ value: string }` | no |
| `iswc-input` | `undefined` | no |
| `iswc-complete` | `undefined` | no |

<!-- /eventos -->


| Evento | Descripción |
| --- | --- |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |
| `iswc-complete` | Emitido al completar la operación. |

`iswc-input` en cada pulsación; `iswc-change` al confirmar (`change` del input
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

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `focus()` | Enfoca el input interno. |
| `blur()` | Quita el foco del input interno. |

### CSS parts

| Part | Uso |
| --- | --- |
| `field` | El `<iswc-input>` interno. |
| `form-control`, `label`, `base`, `hint`, `error-text` | Reexportados de `<iswc-input>`. |
| `input` | Input nativo interno. |

### Custom states

| Estado | Cuándo |
| --- | --- |
| `:state(complete)` | Todos los tokens requeridos están llenos. |
| `:state(invalid)` | El atributo `invalid` está presente. |

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
| `--iswc-danger` | Borde en estado inválido. |

### Integración con formularios

Form-associated vía `ElementInternals`: con `name` presente aporta el valor
formateado a `FormData`. Para enviar el valor sin literales usar `raw` y un
campo espejo.

## Comportamiento

- En cada `input` se aplica `apply(value, pattern)` y se reubica el caret al
  final del tramo reformateado.
- `pattern` fija el `placeholder` del input interno y, si no hay `maxlength`
  propio, su longitud máxima.
- Cambiar `pattern` reformatea el valor vigente.
- Al perder el foco: con `required` y valor vacío se agrega `invalid`; si ya
  no es `required`, se retira.
- `disabled` fuerza `blur`.

## Dependencias y componentes relacionados

- [`./masks-tokens.js`](./utils/input-tokens.js) — tokenizado y `apply()` / `isComplete()`.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/form-associated.js`](../../core/form-associated.js)
- [`../_shared/reflect.js`](../../core/attrs.js)

Tags del módulo: `<iswc-masked-input>`.

## Accesibilidad

El control es un `<input type="text">` nativo con `disabled` / `readOnly`
sincronizados. El `pattern` como placeholder anticipa el formato esperado;
para lectores de pantalla conviene añadir además una etiqueta explícita
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

- Enviar `value` cuando el backend espera dígitos: usar `raw`.
- Usar `9` esperando dígito obligatorio: `9` es opcional, el requerido es `0`.
- Poner literales que coinciden con tokens (`0`, `9`, `A`, `a`, `*`) sin
  advertir que se interpretan como máscara.
- Fijar `maxlength` menor que la longitud del patrón: el valor nunca completa.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./masked-input.ts)
- [CSS](./masked-input.scss)
- [Índice de categoría](../../../specs/componentes.md)
- [Preview](./masked-input.json)
