---
tag: iswc-duration-picker
tags:
  - iswc-duration-picker
category: forms
status: public
source: ./duration-picker.js
style: ./duration-picker.css
preview: ./duration-picker.json
---
# `<iswc-duration-picker>`

## Propósito

Selector de duración `HH:MM:SS` en tres casillas numéricas, cada una con
botones de incremento/decremento y soporte de flechas del teclado. El valor
público son segundos totales.

Este módulo registra `<iswc-duration-picker>`.

## Cuándo usarlo

Capturar una duración (tiempo trabajado, tiempo estimado, temporizador), no
un instante del día.

## Cuándo no usarlo

Para una hora del día usar `<iswc-time-input>`; para fecha + hora,
`<iswc-date-time-input>`. No duplicar formateo: `text` ya entrega el string.

## Importación

```js
import './duration-picker.js';
```

## Ejemplo mínimo

```html
<iswc-duration-picker value="90"></iswc-duration-picker>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | number | Segundos totales, default `0`. |
| `min` | number | Límite inferior en segundos; se aplica en `tick()`. |
| `max` | number | Límite superior en segundos; se aplica en `tick()`. |
| `step` | number | Incremento de botones y flechas, default `1`. |

#### Propiedades públicas

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
| `end` | Adorno después de las casillas. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-input` | sin detail | sí | sí | no |
| `iswc-change` | `{ value, text }` | sí | sí | no |

`tick()` emite solo `iswc-change`. La edición directa de casillas emite
`iswc-input` y luego `iswc-change`.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `setSeconds(n)` | Fija el valor en segundos y repinta. No emite eventos. |
| `set(h, m, s)` | Fija el valor por componentes. No emite eventos. |
| `tick(delta)` | Suma `delta` segundos respetando `min`/`max`; emite `iswc-change` si cambió. |

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
| `--iswc-text` | Color de los dígitos. |
| `--iswc-text-soft` | Separadores y adornos. |
| `--iswc-accent` | Realce de la casilla activa. |
| `--iswc-radius` | Radio de bordes. |

### Integración con formularios

No es form-associated: no participa en `FormData` por sí solo. Para enviarlo
en un formulario, reflejar `value` en un campo oculto desde `iswc-change`.

## Comportamiento

- Al enfocar una casilla se selecciona su contenido.
- Al escribir se filtran los no dígitos y se limita a 2 caracteres.
- Al salir de una casilla (`blur`) se normaliza: horas se acotan a 23,
  minutos y segundos a 59, y se recalcula `value`.
- `:` o `;` avanzan a la casilla siguiente; en segundos hacen `blur`.
- `ArrowUp` / `ArrowDown` suman o restan `step` en la unidad de la casilla
  enfocada, respetando `min`/`max`.
- Los botones `+` / `−` son `<iswc-button variant="plain" pill>` y operan sobre
  la unidad de su columna.

## Dependencias y componentes relacionados

- [`../actions/button.js`](../actions/button.js) — botones de incremento.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/element-base.js`](../_shared/element-base.js)

Tags del módulo: `<iswc-duration-picker>`.

## Accesibilidad

Cada casilla es un `<input inputmode="numeric">` con `aria-label` propio
(Horas / Minutos / Segundos) y cada botón lleva su `aria-label`. Los
separadores `:` son `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-duration-picker id="dur" value="3600" min="0" max="86400" step="15">
  <span slot="start">Duración</span>
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
- Asumir que `min`/`max` limitan la edición manual: solo acotan `tick()`.
- Leer `value` como string `HH:MM:SS`: `value` son segundos, el string es `text`.
- Enviarlo en un `<form>` sin campo espejo.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./duration-picker.js)
- [CSS](./duration-picker.css)
- [Índice de categoría](./LLM.md)
- [Preview](./duration-picker.json)
