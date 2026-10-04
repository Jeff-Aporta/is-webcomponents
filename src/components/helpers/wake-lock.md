---
tag: iswc-wake-lock
tags:
  - iswc-wake-lock
category: helpers
status: public
source: ./wake-lock.ts
style: ./wake-lock.css
preview: ./wake-lock.json
---
# `<iswc-wake-lock>`

## PropÃ³sito

Mantiene la pantalla encendida con Screen Wake Lock mientras `active` estÃ¡ puesto.

Este mÃ³dulo registra `<iswc-wake-lock>`.

## CuÃ¡ndo usarlo

Lectura, dashboard, receta paso a paso, vÃ­deo.

## CuÃ¡ndo no usarlo

No lo dejes `active` en pÃ¡ginas que el usuario no estÃ¡ mirando.

## ImportaciÃ³n

```js
import './wake-lock.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-wake-lock active>El documento no apaga la pantalla.</iswc-wake-lock>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | boolean | Pide o suelta el lock |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `active` | lectura/escritura |  |
| `held` | solo lectura | Hay lock vigente |

### Slots

| Slot | Uso |
| --- | --- |
| default | Contenido (`display:contents`).

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sÃ­ `{ held }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-wake-lock');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

### CSS parts

Ninguno. Host `display:contents`.

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No es form-associated.

## Comportamiento

Re-adquiere al volver a visible. Suelta en `disconnectedCallback`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

No altera el Ã¡rbol.

## Ejemplo avanzado

```html
<iswc-wake-lock id="wl"></iswc-wake-lock>
```

## Errores comunes

- Olvidar quitar `active`.
- HTTP inseguro.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./wake-lock.js` Â· `./wake-lock.css`
- Preview: `./wake-lock.json`
