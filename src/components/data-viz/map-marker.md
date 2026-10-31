---
tag: iswc-map-marker
tags:
  - iswc-map-marker
category: data-viz
status: public
source: ./maps.ts
style: ./maps.scss
preview: ./map-marker.json
---
# `<iswc-map-marker>`

## Propósito

Marcador de `<iswc-maps>`. Señala un punto; el mapa lo posiciona.

## Importación

```js
import './maps.js';
```

Ese módulo registra este tag junto con `<iswc-maps>`.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-map-marker></iswc-map-marker>
```


## API

| Atributo | Notas |
| --- | --- |
| `lat` | Latitud. |
| `lon` | Longitud. |
| `label` | Rótulo del punto. |

## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-map-marker');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>

## Comportamiento

No se pinta por sí mismo: `<iswc-maps>` lo lee y dibuja el punto. El clic emite `iswc-marker-click` con `{ marker }` en el mapa.

## Accesibilidad

El punto es parte del SVG del mapa: da en `label` el nombre del lugar y ofrece los mismos datos en texto si son esenciales.

## Reglas para LLM

- Va dentro de `<iswc-maps>`.
- El clic se escucha en el mapa, no en el marcador.
