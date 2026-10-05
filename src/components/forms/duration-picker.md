---
tag: iswc-duration-picker
tags:
  - iswc-duration-picker
category: forms
status: public
source: ./duration-picker.ts
style: ./duration-picker.css
preview: ./duration-picker.json
---
# `<iswc-duration-picker>`

## PropÃ³sito

Selector de duraciÃ³n `HH:MM:SS` en tres casillas numÃ©ricas, cada una con
botones de incremento/decremento y soporte de flechas del teclado. El valor
pÃºblico son segundos totales.

Este mÃ³dulo registra `<iswc-duration-picker>`.

## CuÃ¡ndo usarlo

Capturar una duraciÃ³n (tiempo trabajado, tiempo estimado, temporizador), no
un instante del dÃ­a.

## CuÃ¡ndo no usarlo

Para una hora del dÃ­a usar `<iswc-time-input>`; para fecha + hora,
`<iswc-date-time-input>`. No duplicar formateo: `text` ya entrega el string.

## ImportaciÃ³n

```js
import './duration-picker.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-duration-picker value="90"></iswc-duration-picker>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | number | Segundos totales, default `0`. |
| `min` | number | LÃ­mite inferior en segundos; se aplica en `tick()`. |
| `max` | number | LÃ­mite superior en segundos; se aplica en `tick()`. |
| `step` | number | Incremento de botones y flechas, default `1`. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Segundos totales; al escribir se redondea y se acota a >= 0. |
| `text` | lectura | `HH:MM:SS`, o `MM:SS` cuando `hours` es 0. |
| `hours` | lectura | Derivada de `value`. |
| `minutes` | lectura | Derivada de `value`. |
| `seconds` | lectura | Derivada de `value`. |

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Adorno antes de las casillas. |
| `end` | Adorno despuÃ©s de las casillas. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-input` | Emitido en cada cambio del valor (escribe como `input` nativo). |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-input` | sin detail | sÃ­ | sÃ­ | no |
| `iswc-change` | `{ value, text }` | sÃ­ | sÃ­ | no |

`tick()` emite solo `iswc-change`. La ediciÃ³n directa de casillas emite
`iswc-input` y luego `iswc-change`.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-duration-picker');
el.addEventListener('iswc-input', (e) => {
  console.log('iswc-input', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `setSeconds(n)` | Fija el valor en segundos y repinta. No emite eventos. |
| `set(h, m, s)` | Fija el valor por componentes. No emite eventos. |
| `tick(delta)` | Suma `delta` segundos respetando `min`/`max`; emite `iswc-change` si cambiÃ³. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor del control. |
| `hours` | Casilla de horas. |
| `minutes` | Casilla de minutos. |
| `seconds` | Casilla de segundos. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-control-bg` | Fondo de las casillas. |
| `--iswc-control-border` | Borde de las casillas. |
| `--iswc-bg-soft` | Fondo del contenedor. |
| `--iswc-border` | Borde del contenedor. |
| `--iswc-text` | Color de los dÃ­gitos. |
| `--iswc-text-soft` | Separadores y adornos. |
| `--iswc-accent` | Realce de la casilla activa. |
| `--iswc-radius` | Radio de bordes. |

### IntegraciÃ³n con formularios

No es form-associated: no participa en `FormData` por sÃ­ solo. Para enviarlo
en un formulario, reflejar `value` en un campo oculto desde `iswc-change`.

## Comportamiento

- Al enfocar una casilla se selecciona su contenido.
- Al escribir se filtran los no dÃ­gitos y se limita a 2 caracteres.
- Al salir de una casilla (`blur`) se normaliza: horas se acotan a 23,
  minutos y segundos a 59, y se recalcula `value`.
- `:` o `;` avanzan a la casilla siguiente; en segundos hacen `blur`.
- `ArrowUp` / `ArrowDown` suman o restan `step` en la unidad de la casilla
  enfocada, respetando `min`/`max`.
- Los botones `+` / `âˆ’` son `<iswc-button variant="plain" pill>` y operan sobre
  la unidad de su columna.

## Dependencias y componentes relacionados

- [`../actions/button.js`](../actions/button.js) â€” botones de incremento.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/element-base.js`](../_shared/element-base.js)

Tags del mÃ³dulo: `<iswc-duration-picker>`.

## Accesibilidad

Cada casilla es un `<input inputmode="numeric">` con `aria-label` propio
(Horas / Minutos / Segundos) y cada botÃ³n lleva su `aria-label`. Los
separadores `:` son `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-duration-picker id="dur" value="3600" min="0" max="86400" step="15">
  <span slot="start">DuraciÃ³n</span>
</iswc-duration-picker>

<script type="module">
  const dur = document.getElementById('dur');
  dur.addEventListener('iswc-change', (e) => console.log(e.detail.text));
  dur.set(2, 30, 0);   // no emite; sincroniza la vista
  dur.tick(-15);       // emite iswc-change
</script>
```

## Errores comunes

- Esperar que `set()` o `setSeconds()` emitan eventos: no lo hacen.
- Asumir que `min`/`max` limitan la ediciÃ³n manual: solo acotan `tick()`.
- Leer `value` como string `HH:MM:SS`: `value` son segundos, el string es `text`.
- Enviarlo en un `<form>` sin campo espejo.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./duration-picker.ts)
- [CSS](./duration-picker.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./duration-picker.json)
