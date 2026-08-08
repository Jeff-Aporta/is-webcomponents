---
tag: is-maps
tags:
  - is-maps
  - is-map-marker
category: data-viz
status: public
source: ./maps.js
style: ./maps.css
preview: ../../previews/data-viz/is-maps.json
---
# `<is-maps>`

## Propósito

Visualizador geográfico sin dependencias. En modo `svg` (por defecto)
dibuja una rejilla de meridianos y paralelos con proyección
equirectangular y coloca marcadores por latitud/longitud, con pan y zoom
opcionales. En modo `tile` incrusta un mapa de terceros (OpenStreetMap u
otro) dentro de un `<iframe>`.

Este módulo registra `<is-maps>` y `<is-map-marker>`.

## Cuándo usarlo

- Ubicar puntos propios sobre un lienzo ligero: sucursales, bodegas,
  clientes por ciudad, rutas de entrega.
- Mostrar un mapa embebido de proveedor sin cargar una librería de mapas
  en el bundle (`engine="tile"`).

## Cuándo no usarlo

- Cartografía real: el modo `svg` no dibuja costas, fronteras ni calles,
  solo una rejilla de referencia.
- Miles de marcadores o clustering: cada marcador es un `<circle>` que se
  redibuja en cada pan/zoom.
- Rutas, geocodificación o capas GeoJSON: eso pide una librería de mapas.

## Importación

```js
import './maps.js';
```

## Ejemplo mínimo

```html
<is-maps viewbox="-80,-5,-66,13">
  <is-map-marker lat="4.71" lon="-74.07" label="Bogotá"></is-map-marker>
  <is-map-marker lat="6.25" lon="-75.56" label="Medellín"></is-map-marker>
</is-maps>
```

## API

### Atributos y propiedades

#### Atributos observados de `<is-maps>`

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `viewbox` | string `"minLon,minLat,maxLon,maxLat"` | `-180,-85,180,85` | Se normaliza con `min`/`max`, así que el orden de las esquinas da igual. Si no hay 4 números finitos, se ignora y queda el valor anterior. |
| `zoom` | número | sin efecto | Declarado en `observedAttributes`, pero el código nunca lo lee: cambiarlo solo provoca un re-render. El zoom real se controla con `viewbox` o con la rueda. |
| `engine` | `svg` \| `tile` | `svg` | Cualquier valor distinto de `tile` se trata como `svg`. |
| `interactive` | booleano (presencia) | ausente | **Debe estar presente para habilitar pan y zoom**; sin él, rueda y arrastre no hacen nada (la cabecera del módulo dice lo contrario). |

#### Atributos observados de `<is-map-marker>`

| Atributo | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `lat` | número (grados) | ninguno | Obligatorio; un valor no finito descarta el marcador. |
| `lon` | número (grados) | ninguno | Obligatorio; un valor no finito descarta el marcador. |
| `label` | string | sin etiqueta | Texto dibujado a la derecha del punto. |

`<is-map-marker>` declara esos atributos como observados pero no
implementa `attributeChangedCallback`: cambiarlos en caliente no repinta
nada hasta que el mapa vuelve a renderizar (pan, zoom o cambio de atributo
en el padre).

#### Propiedades públicas

Ninguno de los dos elementos expone propiedades públicas; toda la
configuración va por atributos y, en modo `tile`, por el JSON hijo.

Forma del JSON de modo `tile`:

```html
<is-maps engine="tile">
  <script type="application/json">
  { "tileUrl": "https://www.openstreetmap.org/export/embed.html",
    "bbox": "-74.2,4.5,-73.9,4.8",
    "zoom": 12,
    "center": "4.65,-74.05",
    "attribution": "© OpenStreetMap" }
  </script>
</is-maps>
```

### Slots

No expone. Ni `<is-maps>` ni `<is-map-marker>` colocan un `<slot>` en su
shadow root (de hecho `<is-map-marker>` no crea shadow root). Los
`<is-map-marker>` hijos se leen como datos, no se proyectan, y el
`<span slot="popup">` que aparece en la cabecera del módulo no está
implementado.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-viewport` | `{ minLon, minLat, maxLon, maxLat }` — copia del viewport actual | sí | sí | no |
| `is-marker-click` | `{ marker }` — el elemento `<is-map-marker>` del light DOM | sí | sí | no |

`is-viewport` se emite al final de cada render en modo `svg`, es decir en
cada paso de arrastre y en cada tick de rueda; en modo `tile` no se emite
nunca. `is-marker-click` viene del `click` en el círculo del marcador.

### Métodos y propiedades públicas

No expone. No hay métodos públicos de zoom, pan ni `fitBounds`: para mover
la vista por código se reasigna el atributo `viewbox`.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Caja exterior con borde, radio y fondo elevado. |
| `canvas` | Área del mapa (28rem de alto) que contiene el `<svg>` o el `<iframe>`. |

El `<svg>`, los marcadores y la caja `.zoom-info` no están expuestos como
parts; solo se estilizan desde `maps.css`.

### Custom states

No expone. No se usa `ElementInternals` ni `CustomStateSet`.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-text` | Color de texto del host y de las etiquetas de marcador; base de `--grid-color` y `--meridian`. |
| `--is-text-soft` | Ticks de grados, texto del viewport, atribución y caja `.zoom-info`. |
| `--is-border` | Borde de la caja exterior. |
| `--is-radius` | Radio de la caja exterior. |
| `--is-bg-elev` | Fondo de la caja, del contorno de los marcadores y de las cajas flotantes. |
| `--is-accent` | Relleno de los marcadores y del halo radial de fondo del mapa. |
| `--is-danger` | Relleno del marcador en hover; usa `#dc2626` como fallback. |
| `--grid-color` | Definido en `:host`; trazo de la rejilla decorativa punteada. Sobrescribible desde fuera. |
| `--meridian` | Definido en `:host`; trazo de paralelos y meridianos. Sobrescribible desde fuera. |

### Integración con formularios

Ninguno de los dos elementos es form-associated: no declaran
`formAssociated`, no exponen `value`/`name` y no participan en el envío de
un `<form>`. Para enviar una coordenada seleccionada hay que escucharla en
`is-marker-click` y escribirla en un input propio.

## Comportamiento

- **Proyección.** Equirectangular pura: `x` lineal en longitud, `y` lineal
  e invertido en latitud sobre el `viewbox` actual. No es Mercator, así que
  las formas se estiran hacia los polos.
- **Rejilla.** Dos capas: una rejilla decorativa fija de 5×5 y las líneas
  reales de paralelos/meridianos cada 12 grados, con su rótulo en grados.
- **Zoom.** La rueda escala el viewport con `exp(-deltaY * 0.001)` anclando
  el punto bajo el cursor. No hay topes: se puede alejar más allá del mundo
  o acercar hasta perder precisión.
- **Pan.** `pointerdown` sobre el lienzo inicia el arrastre; se suelta con
  `pointerup` en el lienzo o en `window` (listener registrado en
  `connectedCallback` y retirado en `disconnectedCallback`).
- **Sin `ResizeObserver`.** El SVG se dimensiona con `clientWidth`/
  `clientHeight` (mínimos 320×240) solo al renderizar: al cambiar el tamaño
  del contenedor no se redibuja hasta el siguiente pan, zoom o cambio de
  atributo.
- **Modo tile.** Arma la URL con `bbox`, `zoom`, `center` y `layer=mapnik`,
  y monta un `<iframe loading="lazy" title="Mapa">`. La `attribution` se
  inserta con `innerHTML`, así que solo debe venir de contenido propio.
- **Marcadores duplicados en el montaje.** `connectedCallback` llama a
  `#render()` (que ya invoca `#syncMarkers()`) y después a `#syncMarkers()`
  otra vez, de modo que en el primer pintado cada marcador queda dibujado
  dos veces, con dos listeners de clic superpuestos. Se corrige solo tras
  el primer pan/zoom o cambio de atributo.
- **Caja `.zoom-info`.** Existe en el shadow DOM y tiene estilos, pero nunca
  recibe texto: hoy es un contenedor vacío. La información del viewport se
  dibuja dentro del SVG (`.vp-text`).
- Solo se leen los `<is-map-marker>` que son hijos directos
  (`:scope > is-map-marker`); anidarlos dentro de otro elemento los
  invisibiliza.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js) (solo `svgEl`)
- Relacionados: [`./heatmap.md`](./heatmap.md), [`../charts/bubble-chart.md`](../charts/bubble-chart.md)

Tags del módulo: `<is-maps>`, `<is-map-marker>`.

## Accesibilidad

- El `<svg>` del modo nativo no lleva `role` ni `aria-label`: conviene poner
  `role="img"` y una descripción en el propio `<is-maps>`, o marcarlo como
  decorativo si el dato ya está en una lista o tabla vecina.
- Los marcadores son `<circle>` con `click` pero sin `tabindex`, `role` ni
  manejo de teclado: no se alcanzan con Tab ni con Enter. Si el clic es una
  acción importante, replica la lista de puntos como botones o enlaces
  fuera del mapa.
- El pan/zoom por rueda llama a `preventDefault()`: con `interactive`
  activo, el usuario no puede desplazar la página con la rueda sobre el
  mapa. Deja siempre un camino alternativo para seguir bajando.
- En modo `tile` el `<iframe>` lleva `title="Mapa"`; cámbialo por algo
  descriptivo si hay varios mapas en la misma página.
- Los marcadores se distinguen solo por color en hover; usa `label` para
  que el punto tenga texto.

## Ejemplo avanzado

```html
<is-maps id="sucursales" viewbox="-80,-5,-66,13" interactive>
  <is-map-marker lat="4.71"  lon="-74.07" label="Bogotá"></is-map-marker>
  <is-map-marker lat="6.25"  lon="-75.56" label="Medellín"></is-map-marker>
  <is-map-marker lat="3.42"  lon="-76.52" label="Cali"></is-map-marker>
  <is-map-marker lat="10.96" lon="-74.80" label="Barranquilla"></is-map-marker>
</is-maps>

<script type="module">
  import './maps.js';

  const mapa = document.getElementById('sucursales');

  mapa.addEventListener('is-marker-click', (e) => {
    const m = e.detail.marker;
    console.log('Sucursal', m.getAttribute('label'), m.getAttribute('lat'), m.getAttribute('lon'));
  });

  // is-viewport llega en cada paso de arrastre: conviene amortiguarlo.
  let t;
  mapa.addEventListener('is-viewport', (e) => {
    clearTimeout(t);
    const vp = e.detail;
    t = setTimeout(() => console.log('viewport', vp), 200);
  });

  // Volver a la vista inicial: no hay método, se reescribe el atributo.
  document.getElementById('reset')?.addEventListener('click', () => {
    mapa.setAttribute('viewbox', '-80,-5,-66,13');
  });
</script>
```

## Errores comunes

- Usar los tags sin importar el módulo primero.
- Esperar pan/zoom sin poner `interactive`: sin el atributo, rueda y
  arrastre se ignoran aunque el cursor muestre la manito.
- Usar `interactive="false"` creyendo que desactiva: es booleano por
  presencia, y ese valor lo **activa**.
- Confiar en `zoom` como nivel de acercamiento del modo `svg`: no se lee;
  usa `viewbox` (o `zoom` dentro del JSON, que solo aplica al modo `tile`).
- Escribir `viewbox` como `"lat,lon,..."`: el orden es
  `minLon,minLat,maxLon,maxLat`.
- Envolver los `<is-map-marker>` en un `<div>`: solo cuentan los hijos
  directos.
- Cambiar `lat`/`lon` de un marcador y esperar que se mueva solo.
- Meter HTML de terceros en `attribution`: se inserta con `innerHTML`.
- Copiar el preview contra la fuente actual; JS/CSS prevalecen.
- Crear variantes de tamaño; usar `font-size` contextual y `em`.

## Reglas para LLM

- Reusar el componente antes de traer una librería de mapas.
- Mantener nombres exactos de tags (`is-maps`, `is-map-marker`), atributos
  y eventos.
- `interactive` es booleano por presencia; no usar `interactive="false"`.
- No inventar métodos (`fitBounds`, `panTo`, `setZoom`): la vista se cambia
  reescribiendo `viewbox`.
- No documentar `zoom` ni el slot `popup` como funcionales.
- Leer callers y `_shared` antes de cambiar; corregir en la raíz común.
- No modificar la API basándose solo en el preview.

## Fuentes

- [JavaScript](./maps.js)
- [CSS](./maps.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data-viz/is-maps.json)
- [Preview `<is-map-marker>`](../../previews/data-viz/is-map-marker.json)
