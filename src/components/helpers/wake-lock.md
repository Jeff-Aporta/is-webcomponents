---
tag: iswc-wake-lock
tags:
  - iswc-wake-lock
category: helpers
status: public
source: ./wake-lock.js
style: ./wake-lock.css
preview: ./wake-lock.json
---
# `<iswc-wake-lock>`

## Propósito

Mantiene la pantalla encendida con Screen Wake Lock mientras `active` está puesto.

Este módulo registra `<iswc-wake-lock>`.

## Cuándo usarlo

Lectura, dashboard, receta paso a paso, vídeo.

## Cuándo no usarlo

No lo dejes `active` en páginas que el usuario no está mirando.

## Importación

```js
import './wake-lock.js';
```

## Ejemplo mínimo

```html
<iswc-wake-lock active>El documento no apaga la pantalla.</iswc-wake-lock>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `active` | boolean | Pide o suelta el lock |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `active` | lectura/escritura |  |
| `held` | solo lectura | Hay lock vigente |

### Slots

| Slot | Uso |
| --- | --- |
| default | Contenido (`display:contents`).

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-change` | Emitido al confirmar el cambio de valor (escribe como `change` nativo). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-change` | sí `{ held }` | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-wake-lock');
el.addEventListener('iswc-change', (e) => {
  console.log('iswc-change', e.detail);
});
```

</details>

### Métodos y propiedades públicas

No expone.

### CSS parts

Ninguno. Host `display:contents`.

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No es form-associated.

## Comportamiento

Re-adquiere al volver a visible. Suelta en `disconnectedCallback`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

No altera el árbol.

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

- `./wake-lock.js` · `./wake-lock.css`
- Preview: `./wake-lock.json`
