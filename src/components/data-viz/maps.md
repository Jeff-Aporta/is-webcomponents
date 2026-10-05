---
tag: iswc-maps
tags:
  - iswc-maps
  - iswc-map-marker
category: data-viz
status: public
source: ./maps.ts
style: ./maps.css
preview: ./maps.json
---
# `<iswc-maps>`

## PropÃ³sito

Visualizador geogrÃ¡fico sin dependencias. En modo `svg` (por defecto)
dibuja una rejilla de meridianos y paralelos con proyecciÃ³n
equirectangular y coloca marcadores por latitud/longitud, con pan y zoom
opcionales. En modo `tile` incrusta un mapa de terceros (OpenStreetMap u
otro) dentro de un `<iframe>`.

Este mÃ³dulo registra `<iswc-maps>` y `<iswc-map-marker>`.

## CuÃ¡ndo usarlo

- Ubicar puntos propios sobre un lienzo ligero: sucursales, bodegas,
  clientes por ciudad, rutas de entrega.
- Mostrar un mapa embebido de proveedor sin cargar una librerÃ­a de mapas
  en el bundle (`engine="tile"`).

## CuÃ¡ndo no usarlo

- CartografÃ­a real: el modo `svg` no dibuja costas, fronteras ni calles,
  solo una rejilla de referencia.
- Miles de marcadores o clustering: cada marcador es un `<circle>` que se
  redibuja en cada pan/zoom.
- Rutas, geocodificaciÃ³n o capas GeoJSON: eso pide una librerÃ­a de mapas.

## ImportaciÃ³n

```js
import './maps.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-maps viewbox="-80,-5,-66,13">
  <iswc-map-marker lat="4.71" lon="-74.07" label="BogotÃ¡"></iswc-map-marker>
  <iswc-map-marker lat="6.25" lon="-75.56" label="MedellÃ­n"></iswc-map-marker>
</iswc-maps>
```

## API

### Atributos y propiedades

#### Atributos observados de `<iswc-maps>`

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `viewbox` | string `"minLon,minLat,maxLon,maxLat"` | `-180,-85,180,85` | Se normaliza con `min`/`max`, asÃ­ que el orden de las esquinas da igual. Si no hay 4 nÃºmeros finitos, se ignora y queda el valor anterior. |
| `zoom` | nÃºmero | sin efecto | Declarado en `observedAttributes`, pero el cÃ³digo nunca lo lee: cambiarlo solo provoca un re-render. El zoom real se controla con `viewbox` o con la rueda. |
| `engine` | `svg` \| `tile` | `svg` | Cualquier valor distinto de `tile` se trata como `svg`. |
| `interactive` | booleano (presencia) | ausente | **Debe estar presente para habilitar pan y zoom**; sin Ã©l, rueda y arrastre no hacen nada (la cabecera del mÃ³dulo dice lo contrario). |

#### Atributos observados de `<iswc-map-marker>`

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `lat` | nÃºmero (grados) | ninguno | Obligatorio; un valor no finito descarta el marcador. |
| `lon` | nÃºmero (grados) | ninguno | Obligatorio; un valor no finito descarta el marcador. |
| `label` | string | sin etiqueta | Texto dibujado a la derecha del punto. |

`<iswc-map-marker>` declara esos atributos como observados pero no
implementa `attributeChangedCallback`: cambiarlos en caliente no repinta
nada hasta que el mapa vuelve a renderizar (pan, zoom o cambio de atributo
en el padre).

#### Propiedades pÃºblicas

Ninguno de los dos elementos expone propiedades pÃºblicas; toda la
configuraciÃ³n va por atributos y, en modo `tile`, por el JSON hijo.

Forma del JSON de modo `tile`:

```html
<iswc-maps engine="tile">
  <script type="application/json">
  { "tileUrl": "https://www.openstreetmap.org/export/embed.html",
    "bbox": "-74.2,4.5,-73.9,4.8",
    "zoom": 12,
    "center": "4.65,-74.05",
    "attribution": "Â© OpenStreetMap" }
  </script>
</iswc-maps>
```

### Slots

No expone. Ni `<iswc-maps>` ni `<iswc-map-marker>` colocan un `<slot>` en su
shadow root (de hecho `<iswc-map-marker>` no crea shadow root). Los
`<iswc-map-marker>` hijos se leen como datos, no se proyectan, y el
`<span slot="popup">` que aparece en la cabecera del mÃ³dulo no estÃ¡
implementado.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-viewport` | Evento personalizado del componente (viewport). |
| `iswc-marker-click` | Evento personalizado del componente (marker click). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-viewport` | `{ minLon, minLat, maxLon, maxLat }` â€” copia del viewport actual | sÃ­ | sÃ­ | no |
| `iswc-marker-click` | `{ marker }` â€” el elemento `<iswc-map-marker>` del light DOM | sÃ­ | sÃ­ | no |

`iswc-viewport` se emite al final de cada render en modo `svg`, es decir en
cada paso de arrastre y en cada tick de rueda; en modo `tile` no se emite
nunca. `iswc-marker-click` viene del `click` en el cÃ­rculo del marcador.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-maps');
el.addEventListener('iswc-viewport', (e) => {
  console.log('iswc-viewport', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone. No hay mÃ©todos pÃºblicos de zoom, pan ni `fitBounds`: para mover
la vista por cÃ³digo se reasigna el atributo `viewbox`.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Caja exterior con borde, radio y fondo elevado. |
| `canvas` | Ãrea del mapa (28rem de alto) que contiene el `<svg>` o el `<iframe>`. |

El `<svg>`, los marcadores y la caja `.zoom-info` no estÃ¡n expuestos como
parts; solo se estilizan desde `maps.css`.

### Custom states

No expone. No se usa `ElementInternals` ni `CustomStateSet`.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-text` | Color de texto del host y de las etiquetas de marcador; base de `--grid-color` y `--meridian`. |
| `--iswc-text-soft` | Ticks de grados, texto del viewport, atribuciÃ³n y caja `.zoom-info`. |
| `--iswc-border` | Borde de la caja exterior. |
| `--iswc-radius` | Radio de la caja exterior. |
| `--iswc-bg-elev` | Fondo de la caja, del contorno de los marcadores y de las cajas flotantes. |
| `--iswc-accent` | Relleno de los marcadores y del halo radial de fondo del mapa. |
| `--iswc-danger` | Relleno del marcador en hover; usa `#dc2626` como fallback. |
| `--grid-color` | Definido en `:host`; trazo de la rejilla decorativa punteada. Sobrescribible desde fuera. |
| `--meridian` | Definido en `:host`; trazo de paralelos y meridianos. Sobrescribible desde fuera. |

### IntegraciÃ³n con formularios

Ninguno de los dos elementos es form-associated: no declaran
`formAssociated`, no exponen `value`/`name` y no participan en el envÃ­o de
un `<form>`. Para enviar una coordenada seleccionada hay que escucharla en
`iswc-marker-click` y escribirla en un input propio.

## Comportamiento

- **ProyecciÃ³n.** Equirectangular pura: `x` lineal en longitud, `y` lineal
  e invertido en latitud sobre el `viewbox` actual. No es Mercator, asÃ­ que
  las formas se estiran hacia los polos.
- **Rejilla.** Dos capas: una rejilla decorativa fija de 5Ã—5 y las lÃ­neas
  reales de paralelos/meridianos cada 12 grados, con su rÃ³tulo en grados.
- **Zoom.** La rueda escala el viewport con `exp(-deltaY * 0.001)` anclando
  el punto bajo el cursor. No hay topes: se puede alejar mÃ¡s allÃ¡ del mundo
  o acercar hasta perder precisiÃ³n.
- **Pan.** `pointerdown` sobre el lienzo inicia el arrastre; se suelta con
  `pointerup` en el lienzo o en `window` (listener registrado en
  `connectedCallback` y retirado en `disconnectedCallback`).
- **Sin `ResizeObserver`.** El SVG se dimensiona con `clientWidth`/
  `clientHeight` (mÃ­nimos 320Ã—240) solo al renderizar: al cambiar el tamaÃ±o
  del contenedor no se redibuja hasta el siguiente pan, zoom o cambio de
  atributo.
- **Modo tile.** Arma la URL con `bbox`, `zoom`, `center` y `layer=mapnik`,
  y monta un `<iframe loading="lazy" title="Mapa">`. La `attribution` se
  inserta con `innerHTML`, asÃ­ que solo debe venir de contenido propio.
- **Marcadores duplicados en el montaje.** `connectedCallback` llama a
  `#render()` (que ya invoca `#syncMarkers()`) y despuÃ©s a `#syncMarkers()`
  otra vez, de modo que en el primer pintado cada marcador queda dibujado
  dos veces, con dos listeners de clic superpuestos. Se corrige solo tras
  el primer pan/zoom o cambio de atributo.
- **Caja `.zoom-info`.** Existe en el shadow DOM y tiene estilos, pero nunca
  recibe texto: hoy es un contenedor vacÃ­o. La informaciÃ³n del viewport se
  dibuja dentro del SVG (`.vp-text`).
- Solo se leen los `<iswc-map-marker>` que son hijos directos
  (`:scope > iswc-map-marker`); anidarlos dentro de otro elemento los
  invisibiliza.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js) (solo `svgEl`)
- Relacionados: [`./heatmap.md`](./heatmap.md), [`../charts/bubble-chart.md`](../charts/bubble-chart.md)

Tags del mÃ³dulo: `<iswc-maps>`, `<iswc-map-marker>`.

## Accesibilidad

- El `<svg>` del modo nativo no lleva `role` ni `aria-label`: conviene poner
  `role="img"` y una descripciÃ³n en el propio `<iswc-maps>`, o marcarlo como
  decorativo si el dato ya estÃ¡ en una lista o tabla vecina.
- Los marcadores son `<circle>` con `click` pero sin `tabindex`, `role` ni
  manejo de teclado: no se alcanzan con Tab ni con Enter. Si el clic es una
  acciÃ³n importante, replica la lista de puntos como botones o enlaces
  fuera del mapa.
- El pan/zoom por rueda llama a `preventDefault()`: con `interactive`
  activo, el usuario no puede desplazar la pÃ¡gina con la rueda sobre el
  mapa. Deja siempre un camino alternativo para seguir bajando.
- En modo `tile` el `<iframe>` lleva `title="Mapa"`; cÃ¡mbialo por algo
  descriptivo si hay varios mapas en la misma pÃ¡gina.
- Los marcadores se distinguen solo por color en hover; usa `label` para
  que el punto tenga texto.

## Ejemplo avanzado

```html
<iswc-maps id="sucursales" viewbox="-80,-5,-66,13" interactive>
  <iswc-map-marker lat="4.71"  lon="-74.07" label="BogotÃ¡"></iswc-map-marker>
  <iswc-map-marker lat="6.25"  lon="-75.56" label="MedellÃ­n"></iswc-map-marker>
  <iswc-map-marker lat="3.42"  lon="-76.52" label="Cali"></iswc-map-marker>
  <iswc-map-marker lat="10.96" lon="-74.80" label="Barranquilla"></iswc-map-marker>
</iswc-maps>

<script type="module">
  import './maps.js';

  const mapa = document.getElementById('sucursales');

  mapa.addEventListener('iswc-marker-click', (e) => {
    const m = e.detail.marker;
    console.log('Sucursal', m.getAttribute('label'), m.getAttribute('lat'), m.getAttribute('lon'));
  });

  // iswc-viewport llega en cada paso de arrastre: conviene amortiguarlo.
  let t;
  mapa.addEventListener('iswc-viewport', (e) => {
    clearTimeout(t);
    const vp = e.detail;
    t = setTimeout(() => console.log('viewport', vp), 200);
  });

  // Volver a la vista inicial: no hay mÃ©todo, se reescribe el atributo.
  document.getElementById('reset')?.addEventListener('click', () => {
    mapa.setAttribute('viewbox', '-80,-5,-66,13');
  });
</script>
```

## Errores comunes

- Usar los tags sin importar el mÃ³dulo primero.
- Esperar pan/zoom sin poner `interactive`: sin el atributo, rueda y
  arrastre se ignoran aunque el cursor muestre la manito.
- Usar `interactive="false"` creyendo que desactiva: es booleano por
  presencia, y ese valor lo **activa**.
- Confiar en `zoom` como nivel de acercamiento del modo `svg`: no se lee;
  usa `viewbox` (o `zoom` dentro del JSON, que solo aplica al modo `tile`).
- Escribir `viewbox` como `"lat,lon,..."`: el orden es
  `minLon,minLat,maxLon,maxLat`.
- Envolver los `<iswc-map-marker>` en un `<div>`: solo cuentan los hijos
  directos.
- Cambiar `lat`/`lon` de un marcador y esperar que se mueva solo.
- Meter HTML de terceros en `attribution`: se inserta con `innerHTML`.
- Copiar el preview contra la fuente actual; JS/CSS prevalecen.
- Crear variantes de tamaÃ±o; usar `font-size` contextual y `em`.

## Reglas para LLM

- Reusar el componente antes de traer una librerÃ­a de mapas.
- Mantener nombres exactos de tags (`iswc-maps`, `iswc-map-marker`), atributos
  y eventos.
- `interactive` es booleano por presencia; no usar `interactive="false"`.
- No inventar mÃ©todos (`fitBounds`, `panTo`, `setZoom`): la vista se cambia
  reescribiendo `viewbox`.
- No documentar `zoom` ni el slot `popup` como funcionales.
- Leer callers y `_shared` antes de cambiar; corregir en la raÃ­z comÃºn.
- No modificar la API basÃ¡ndose solo en el preview.

## Fuentes

- [JavaScript](./maps.ts)
- [CSS](./maps.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./maps.json)
- [Preview `<iswc-map-marker>`](./map-marker.json)
