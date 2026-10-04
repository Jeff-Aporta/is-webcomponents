---
tag: iswc-org-chart
tags:
  - iswc-org-chart
category: diagrams
status: public
source: ./org-chart.ts
style: ./org-chart.css
preview: ./org-chart.json
---
# `<iswc-org-chart>`

## PropÃ³sito

Organigrama jerÃ¡rquico dibujado en SVG a partir de una lista plana de nodos
con `parent`. Soporta colapsar ramas, tarjetas con foto y detalle, y apertura
en `<iswc-diagram-lightbox>`.

Este mÃ³dulo registra `<iswc-org-chart>` y lo inscribe en el registro de
diagramas (`diagram-kinds.js`).

## CuÃ¡ndo usarlo

Estructuras de mando o pertenencia: Ã¡reas de la empresa, jerarquÃ­a de cuentas,
Ã¡rbol de responsables.

## CuÃ¡ndo no usarlo

Para relaciones no jerÃ¡rquicas usar `<iswc-block-diagram>` o `<iswc-flowchart>`;
para ideas radiales usar `<iswc-mindmap>`; para dependencia temporal usar
`<iswc-gantt>`.

## ImportaciÃ³n

```js
import './org-chart.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-org-chart>
  <script type="application/json">
    [
      { "id": "ceo", "title": "CEO", "name": "Carolina MÃ©ndez", "parent": null },
      { "id": "cto", "title": "CTO", "name": "Pedro CastaÃ±o", "parent": "ceo" }
    ]
  </script>
</iswc-org-chart>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `direction` | `down` (solo) | Sentido de crecimiento. El layout es **top-down**; `up`/`right` se aceptan pero aÃºn no cambian el render. |
| `node-width` | number | Ancho de tarjeta en px, default `200`. |
| `node-height` | number | Alto de tarjeta en px, default `78`. |
| `gap` | number | SeparaciÃ³n entre nodos en px, default `28`. |
| `color` | `inline` \| `viewer` | Modo de render; lo fija el visor, no se escribe a mano. |
| `open-on-click` | boolean | Clic en el fondo abre el visor. No es atributo observado: se lee en cada clic. |

Campos de un nodo: `id`, `title`, `name`, `parent`, y opcionalmente `photo`,
`detail` (alias `tooltip`).

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `payload` | lectura/escritura | Arreglo de nodos u objeto `{ nodes: [...] }`. Al escribirlo sustituye al `<script>` hijo. |

### Slots

| Slot | Uso |
| --- | --- |
| (default) | Un `<script type="application/json">` con el arreglo de nodos. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-select` | Emitido al seleccionar un elemento. |
| `iswc-toggle` | Emitido al alternar el estado abierto/cerrado. |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-select` | `{ id, node }` | sÃ­ | sÃ­ | no |
| `iswc-toggle` | `{ id, collapsed }` | sÃ­ | sÃ­ | no |
| `iswc-open-viewer` | `{ payload }` | sÃ­ | sÃ­ | sÃ­ |

`iswc-open-viewer` solo se emite con `open-on-click` y fuera del visor.
Cancelarlo (`preventDefault()`) evita que se abra el lightbox propio y permite
abrir un visor propio.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-org-chart');
el.addEventListener('iswc-select', (e) => {
  console.log('iswc-select', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `expand(id)` | Despliega la rama del nodo. |
| `collapse(id)` | Colapsa la rama del nodo. |
| `toggle(id)` | Alterna el estado de la rama. |

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Contenedor. |
| `canvas` | SVG del diagrama. |
| `tooltip` | Panel de detalle del nodo. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-bg-elev` | Fondo de las tarjetas. |
| `--iswc-border` | Borde de tarjetas y aristas. |
| `--iswc-radius` | Radio de las tarjetas. |
| `--iswc-text` | Nombre del nodo. |
| `--iswc-text-soft` | Cargo del nodo. |
| `--iswc-accent` | Realce del nodo seleccionado. |
| `--iswc-on-accent` | Contenido sobre el acento. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.

## Comportamiento

- Los nodos se indexan por `id` y se agrupan por `parent`; el nodo con
  `parent: null` es la raÃ­z.
- El layout coloca los niveles segÃºn `direction`, usando `node-width`,
  `node-height` y `gap`.
- Colapsar una rama oculta sus descendientes y reacomoda el resto; las
  posiciones anteriores se conservan para animar el movimiento (`MOVE_MS`).
- Al pasar el cursor por una tarjeta con `detail` (o `tooltip`) se muestra el
  panel de detalle.
- Con `open-on-click`, un clic fuera de las tarjetas emite `iswc-open-viewer` y,
  si nadie lo cancela, abre `<iswc-diagram-lightbox>` con el mismo `payload`.
- En modo visor (`color="viewer"`) el clic de apertura queda inhibido.

## Dependencias y componentes relacionados

- [`./diagram-kinds.js`](./diagram-kinds.js) â€” registro de tipos de diagrama.
- [`./diagram-lightbox.js`](./diagram-lightbox.js) â€” visor a pantalla completa.
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js) â€” creaciÃ³n de nodos SVG.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/dom-utils.js`](../_shared/dom-utils.js)

Tags del mÃ³dulo: `<iswc-org-chart>`.

## Accesibilidad

El SVG declara `role="tree"`. El detalle se expone ademÃ¡s como `title` nativo
del nodo, de modo que la informaciÃ³n sigue disponible sin el panel visual. Al
usar `photo`, acompaÃ±arla siempre de `name` para que la tarjeta tenga texto.

## Ejemplo avanzado

```html
<iswc-org-chart id="org" direction="right" node-width="220" node-height="72"
              gap="32" open-on-click></iswc-org-chart>

<script type="module">
  const org = document.getElementById('org');
  org.payload = [
    { id: 'ceo', title: 'CEO', name: 'Carolina MÃ©ndez', detail: 'DirecciÃ³n general' },
    { id: 'cfo', title: 'CFO', name: 'Luis PeÃ±a', parent: 'ceo' },
    { id: 'cto', title: 'CTO', name: 'Pedro CastaÃ±o', parent: 'ceo' },
  ];
  org.collapse('cto');
  org.addEventListener('iswc-select', (e) => console.log(e.detail.node.name));
  org.addEventListener('iswc-open-viewer', (e) => {
    e.preventDefault();          // abrir un visor propio en vez del lightbox
  });
</script>
```

## Errores comunes

- Declarar mÃ¡s de un nodo sin `parent`: la raÃ­z debe ser Ãºnica.
- Referenciar en `parent` un `id` inexistente: esa rama no se dibuja.
- Escribir `color="viewer"` a mano: ese modo lo fija el visor.
- Cambiar el `<script>` hijo tras conectar en vez de asignar `payload`.
- Usar tag sin importar mÃ³dulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./org-chart.ts)
- [CSS](./org-chart.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./org-chart.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=org-chart&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=org-chart&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.
