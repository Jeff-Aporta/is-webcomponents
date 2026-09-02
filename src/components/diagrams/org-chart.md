---
tag: is-org-chart
tags:
  - is-org-chart
category: diagrams
status: public
source: ./org-chart.js
style: ./org-chart.css
preview: ../../previews/diagrams/is-org-chart.json
---
# `<is-org-chart>`

## Propósito

Organigrama jerárquico dibujado en SVG a partir de una lista plana de nodos
con `parent`. Soporta colapsar ramas, tarjetas con foto y detalle, y apertura
en `<is-diagram-lightbox>`.

Este módulo registra `<is-org-chart>` y lo inscribe en el registro de
diagramas (`diagram-kinds.js`).

## Cuándo usarlo

Estructuras de mando o pertenencia: áreas de la empresa, jerarquía de cuentas,
árbol de responsables.

## Cuándo no usarlo

Para relaciones no jerárquicas usar `<is-block-diagram>` o `<is-flowchart>`;
para ideas radiales usar `<is-mindmap>`; para dependencia temporal usar
`<is-gantt>`.

## Importación

```js
import './org-chart.js';
```

## Ejemplo mínimo

```html
<is-org-chart>
  <script type="application/json">
    [
      { "id": "ceo", "title": "CEO", "name": "Carolina Méndez", "parent": null },
      { "id": "cto", "title": "CTO", "name": "Pedro Castaño", "parent": "ceo" }
    ]
  </script>
</is-org-chart>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `direction` | `down` (solo) | Sentido de crecimiento. El layout es **top-down**; `up`/`right` se aceptan pero aún no cambian el render. |
| `node-width` | number | Ancho de tarjeta en px, default `200`. |
| `node-height` | number | Alto de tarjeta en px, default `78`. |
| `gap` | number | Separación entre nodos en px, default `28`. |
| `color` | `inline` \| `viewer` | Modo de render; lo fija el visor, no se escribe a mano. |
| `open-on-click` | boolean | Clic en el fondo abre el visor. No es atributo observado: se lee en cada clic. |

Campos de un nodo: `id`, `title`, `name`, `parent`, y opcionalmente `photo`,
`detail` (alias `tooltip`).

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `payload` | lectura/escritura | Arreglo de nodos u objeto `{ nodes: [...] }`. Al escribirlo sustituye al `<script>` hijo. |

### Slots

| Slot | Uso |
| --- | --- |
| (default) | Un `<script type="application/json">` con el arreglo de nodos. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-select` | `{ id, node }` | sí | sí | no |
| `is-toggle` | `{ id, collapsed }` | sí | sí | no |
| `is-open-viewer` | `{ payload }` | sí | sí | sí |

`is-open-viewer` solo se emite con `open-on-click` y fuera del visor.
Cancelarlo (`preventDefault()`) evita que se abra el lightbox propio y permite
abrir un visor propio.

### Métodos y propiedades públicas

| Método | Uso |
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
| `--is-bg-elev` | Fondo de las tarjetas. |
| `--is-border` | Borde de tarjetas y aristas. |
| `--is-radius` | Radio de las tarjetas. |
| `--is-text` | Nombre del nodo. |
| `--is-text-soft` | Cargo del nodo. |
| `--is-accent` | Realce del nodo seleccionado. |
| `--is-on-accent` | Contenido sobre el acento. |

### Integración con formularios

No declara integración form-associated.

## Comportamiento

- Los nodos se indexan por `id` y se agrupan por `parent`; el nodo con
  `parent: null` es la raíz.
- El layout coloca los niveles según `direction`, usando `node-width`,
  `node-height` y `gap`.
- Colapsar una rama oculta sus descendientes y reacomoda el resto; las
  posiciones anteriores se conservan para animar el movimiento (`MOVE_MS`).
- Al pasar el cursor por una tarjeta con `detail` (o `tooltip`) se muestra el
  panel de detalle.
- Con `open-on-click`, un clic fuera de las tarjetas emite `is-open-viewer` y,
  si nadie lo cancela, abre `<is-diagram-lightbox>` con el mismo `payload`.
- En modo visor (`color="viewer"`) el clic de apertura queda inhibido.

## Dependencias y componentes relacionados

- [`./diagram-kinds.js`](./diagram-kinds.js) — registro de tipos de diagrama.
- [`./diagram-lightbox.js`](./diagram-lightbox.js) — visor a pantalla completa.
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js) — creación de nodos SVG.
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/dom-utils.js`](../_shared/dom-utils.js)

Tags del módulo: `<is-org-chart>`.

## Accesibilidad

El SVG declara `role="tree"`. El detalle se expone además como `title` nativo
del nodo, de modo que la información sigue disponible sin el panel visual. Al
usar `photo`, acompañarla siempre de `name` para que la tarjeta tenga texto.

## Ejemplo avanzado

```html
<is-org-chart id="org" direction="right" node-width="220" node-height="72"
              gap="32" open-on-click></is-org-chart>

<script type="module">
  const org = document.getElementById('org');
  org.payload = [
    { id: 'ceo', title: 'CEO', name: 'Carolina Méndez', detail: 'Dirección general' },
    { id: 'cfo', title: 'CFO', name: 'Luis Peña', parent: 'ceo' },
    { id: 'cto', title: 'CTO', name: 'Pedro Castaño', parent: 'ceo' },
  ];
  org.collapse('cto');
  org.addEventListener('is-select', (e) => console.log(e.detail.node.name));
  org.addEventListener('is-open-viewer', (e) => {
    e.preventDefault();          // abrir un visor propio en vez del lightbox
  });
</script>
```

## Errores comunes

- Declarar más de un nodo sin `parent`: la raíz debe ser única.
- Referenciar en `parent` un `id` inexistente: esa rama no se dibuja.
- Escribir `color="viewer"` a mano: ese modo lo fija el visor.
- Cambiar el `<script>` hijo tras conectar en vez de asignar `payload`.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./org-chart.js)
- [CSS](./org-chart.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-org-chart.json)
