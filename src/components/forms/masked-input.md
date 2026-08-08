---
tag: is-masked-input
tags:
  - is-masked-input
category: forms
status: public
source: ./masked-input.js
style: ./masked-input.css
preview: ../../previews/forms/is-masked-input.json
---
# `<is-masked-input>`

## Propósito

Campo de texto con máscara: tokeniza un `pattern` y reformatea el valor en
cada pulsación (tarjeta, NIT, teléfono, fecha, placa). El formateo lo resuelve
`masks-tokens.js`.

Este módulo registra `<is-masked-input>`.

## Cuándo usarlo

Entrada de texto con formato fijo y verificable carácter a carácter.

## Cuándo no usarlo

Para texto libre usar `<is-input>`; para OTP/PIN usar `<is-pin-input>`; para
fecha con calendario usar `<is-date-input>`; para moneda con separadores de
miles usar el formateo de `<is-input>` y `format.js`.

## Importación

```js
import './masked-input.js';
```

## Ejemplo mínimo

```html
<is-masked-input pattern="0000 0000 0000 0000"></is-masked-input>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `pattern` | string | Tokens y literales. También se usa como `placeholder` del input interno. |
| `value` | string | Valor formateado; se reformatea al cambiar `pattern`. |
| `name` | string | Nombre form-associated. |
| `placeholder` | string | Texto de ayuda. |
| `autocomplete` | string | Se traslada al input interno. |
| `maxlength` | number | Si se omite, se deriva de la longitud de `pattern`. |
| `disabled` | boolean | Deshabilita y quita el foco. |
| `readonly` | boolean | Solo lectura. |
| `required` | boolean | Marca `invalid` al salir vacío. |
| `variant` | `outlined` \| `filled` \| `underlined` | Default `outlined`. |
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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-input` | sin detail | sí | sí | no |
| `is-change` | `{ value }` | sí | sí | no |
| `is-complete` | sin detail | sí | sí | no |

`is-input` en cada pulsación; `is-change` al confirmar (`change` del input
interno, reemitido porque no cruza el shadow root); `is-complete` cada vez que
el valor pasa a estar completo.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `focus()` | Enfoca el input interno. |
| `blur()` | Quita el foco del input interno. |

### CSS parts

| Part | Uso |
| --- | --- |
| `field` | Contenedor del campo. |
| `input` | Input interno. |

### Custom states

| Estado | Cuándo |
| --- | --- |
| `:state(complete)` | Todos los tokens requeridos están llenos. |
| `:state(invalid)` | El atributo `invalid` está presente. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-field-width` | Ancho del campo, default `16rem`. |
| `--is-control-bg` | Fondo del campo. |
| `--is-control-border` | Borde del campo. |
| `--is-control-radius` | Radio de bordes. |
| `--is-bg-soft` | Fondo de reserva. |
| `--is-border` | Borde de reserva. |
| `--is-text` | Color del texto. |
| `--is-text-soft` | Color del placeholder. |
| `--is-accent` | Reserva del color de foco. |
| `--is-focus` | Color del anillo de foco. |
| `--is-danger` | Borde en estado inválido. |

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

- [`./masks-tokens.js`](./masks-tokens.js) — tokenizado y `apply()` / `isComplete()`.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/form-associated.js`](../_shared/form-associated.js)
- [`../_shared/reflect.js`](../_shared/reflect.js)

Tags del módulo: `<is-masked-input>`.

## Accesibilidad

El control es un `<input type="text">` nativo con `disabled` / `readOnly`
sincronizados. El `pattern` como placeholder anticipa el formato esperado;
para lectores de pantalla conviene añadir además una etiqueta explícita
asociada al componente.

## Ejemplo avanzado

```html
<is-masked-input id="tarjeta" pattern="0000 0000 0000 0000"
                 name="tarjeta" required variant="filled">
  <is-icon slot="start" name="mdi:credit-card"></is-icon>
</is-masked-input>

<script type="module">
  const campo = document.getElementById('tarjeta');
  campo.addEventListener('is-complete', () => console.log('crudo:', campo.raw));
  campo.addEventListener('is-change', (e) => console.log('confirmado:', e.detail.value));
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

- [JavaScript](./masked-input.js)
- [CSS](./masked-input.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-masked-input.json)
