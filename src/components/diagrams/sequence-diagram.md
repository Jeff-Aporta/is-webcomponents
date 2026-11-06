---
tag: iswc-sequence-diagram
tags:
  - iswc-sequence-diagram
category: diagrams
status: public
source: ./sequence-diagram.ts
style: ./sequence-diagram.scss
preview: ./sequence-diagram.json
---
# `<iswc-sequence-diagram>`

## Propósito

Diagrama de secuencia en SVG, sin Mermaid. La configuración es un JSON
con actores, mensajes y grupos; el layout (posiciones, ruteo ortogonal
de las flechas y colocación de etiquetas) se calcula solo.

Este módulo registra `<iswc-sequence-diagram>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './sequence-diagram.js';
```

## Ejemplo mínimo

```html
<iswc-sequence-diagram></iswc-sequence-diagram>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | `viewer` \| color | `viewer` lo pinta como visor dentro del lightbox. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `isViewer` | solo lectura | Declarada por clase. |
| `payload` | lectura/escritura | Declarada por clase. |
| `spec` | solo lectura | Declarada por clase. |
| `layout` | solo lectura | Declarada por clase. |
| `turtle` | solo lectura | Declarada por clase. |
| `hiddenGroups` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | Descripción |
| --- | --- |
| `iswc-turtle-state` | Emitido al actualizarse el estado del módulo turtle (resize, datos, etc.). |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-toggle-group` | Evento personalizado del componente (toggle group). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-turtle-state` | sí | sí | sí | no |
| `iswc-render` | sí | sí | sí | no |
| `iswc-toggle-group` | sí | sí | sí | sí |
| `iswc-open-viewer` | sí | sí | sí | sí |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-sequence-diagram');
el.addEventListener('iswc-turtle-state', (e) => {
  console.log('iswc-turtle-state', e.detail);
});
```

</details>

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `updateComplete()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `canvas` | Personalizable con `::part(canvas)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-sequence-diagram> — diagrama de secuencia en SVG, sin Mermaid.
> Configuración por JSON (idéntica a la del proyecto original): un
> <script type="application/json"> hijo, o la propiedad `payload`.
>   <iswc-sequence-diagram>
>     <script type="application/json">
>       { "sequence": { "actors": [...], "messages": [...] } }
>     </script>
>   </iswc-sequence-diagram>
> También acepta `{ "preset": "tk1437191" }`.
> Atributos
>   color  inline (default) | viewer — viewer activa hover, leyenda clickeable
>            y auto-animación de la tortuga.
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: iswc-turtle-state (detail: {playing, idx, total, replay}),
>          iswc-open-viewer (click en colore inline),
>          iswc-toggle-group (detail: {id})

## Estilo InSoft (`diagram-style`)

`<iswc-sequence-diagram diagram-style="insoft">` carga el tema `sequence` del
estilo (`themes/insoft-seq.json`) junto con los de DER, componentes y clases:
Poppins, participantes con relleno `#C1BFFF` y borde negro sin radio, regiones
y cajas cuadradas, y el CSS del tema incrustado en el SVG para que el export
estático salga igual que en pantalla. En las docs del ISS / ISW todo diagrama
lleva este atributo: los cuatro tipos comparten paletas, tipografía y trazo.

## Grupos (subprocesos) con color por nombre

Cada mensaje puede pertenecer a un `group`; el grupo colorea sus aristas y
aparece en la leyenda. El color se pide **por nombre** y el tema decide el hex:

```json
"groups": [
  { "id": "g-jwt", "name": "Autenticación (JWT)", "color": "auth" },
  { "id": "g-db",  "name": "Lectura en PostgreSQL", "color": "data" }
]
```

Nombres de línea del estilo InSoft: `auth`, `seg`, `data`, `llm`, `stream`,
`ticket`, `error`, `neutral` (saturados, para trazos). También vale un nombre
de paleta de área (`primary`, `service`, `store`…) o un hex literal. Sin
`color`, manda `hue` como antes. Sin estilo cargado, el nombre cae al `hue` y
luego al acento del tema.

## Regiones horizontales (`fragments`)

Una región agrupa filas de mensajes en una franja horizontal con pestaña UML
(`par`, `async`, `loop`, `opt`, `region`). Sirve para decir que lo de adentro
ocurre a la vez, no bloquea o se repite:

```json
"fragments": [
  { "id": "f-stream", "kind": "async", "name": "respuesta en stream (× N)",
    "messages": ["m11", "m12", "m13", "m14"], "color": "service" }
]
```

- `messages`: ids de los mensajes que cubre (de `messages`, `preamble`, ramas
  de `alt` o `epilogue`). Una región cuyos ids no existen se omite con aviso.
- Se acota a las lifelines que participan; `"span": "all"` la extiende a todas.
- `color`: nombre de paleta de área o hex; sin él, el relleno de región del tema.
- Las regiones anidadas se detectan por contención y se dibujan con sangría;
  cada región abre su propio aire antes de la primera fila y tras la última,
  así nunca monta sobre un `alt` ni sobre otra región.

## Iconos con fondo e índices

Cada grupo puede llevar `icon`; con estilo cargado (leyenda apagada) el icono
va junto al índice de **todas** las aristas del grupo, al lado contrario de
la flecha, con fondo circular translúcido, y el título del grupo solo en la
primera arista de cada tramo, pequeño y atenuado. Los iconos con fondo salen
de `svgIconBadge` (`_shared/tk-icon-inline.ts`): `bg` circle / rect / round /
none, `bgColor`, `bgAlpha` (sólido con 1) y `size`, el mismo contrato para
cualquier diagrama.

Las pestañas de `alt` y de cada región llevan icono del tipo (bifurcación,
rayo = async, repetir = loop, interrogación = opt) y el **título** (`alt.name`,
`fragments[].name`); `fragments[].condition` se muestra entre corchetes al lado
cuando el proceso es opcional. Todas las regiones y cajas de participantes van
con borde punteado y relleno con alpha.

Las condiciones de las ramas de `alt` van dentro de pestañas negras como
texto secundario (mismo color de fuente, 80 % de opacidad): la primera junto
al título del `alt`, las demás en una pestaña propia sobre su divisor.

## Capas y cajas de participantes

Orden de pintado: cajas de participantes → agrupadores del más grande al más
chico (el anidado queda encima del que lo envuelve, nada tiñe a nada) →
actores y lifelines → mensajes (aristas, notas, iconos) siempre encima de
todo agrupador. Una región anidada en el `alt` guarda margen lateral con él.

Las cajas de participantes (`boxes`) de un solo actor son válidas para el
consumidor, pero por estética InSoft no las usa: los editables del ISS solo
declaran cajas con dos o más actores.

## Modo de los agrupadores (`sync` / `async`)

Cada agrupador (región horizontal o `alt`) lleva en su esquina superior
derecha una pestaña negra, espejo de la del título, con su modo: `async` si la
región es `async` o `par` (no bloquea, sigue en paralelo) y `sync` en el resto
(el flujo espera a que termine). Las aristas no llevan rótulo de modo.

Los procesos asíncronos SIEMPRE van en un agrupador: todo mensaje
`kind: "async"` que no esté en una región `async`/`par` se agrupa
automáticamente (por tramos consecutivos) en una región «proceso asíncrono».

| `kind` del mensaje | Trazo |
| --- | --- |
| `sync` (por defecto) | continuo |
| `async` | punteado (y dentro de un agrupador `async`) |
| `reply` | punteado (retorno de una llamada, UML) |
| `self` (from = to) | lazo |

La punta del lazo de un mensaje a sí mismo va donde termina el trazo (vuelve a
la lifeline por arriba). Las notas y pestañas se dimensionan midiendo el texto
con la webfont del tema (el diagrama la registra en el documento y repite el
layout cuando carga), así ningún texto se sale de su caja.

## Estilo de arista (`edgeStyle`)

`"policy": { "edgeStyle": "curved" }` (o `edgeStyle` en la raíz del payload)
redondea los giros de cada mensaje con Bézier sobre el **mismo** recorrido
ortogonal: el router no cambia, solo la pintura. Ver el vocabulario común en
[`diagram-vocab.ts`](./utils/diagram-model.ts).

## Subproceso en la llegada de un mensaje (`nested`)

Un mensaje puede mostrar, junto a la punta de su flecha, el proceso que esa
acción inicia: el mismo nodo `kind: "nested"` de los flujos
(`_shared/diagram-embed.schemas.ts`), más un `title` opcional.

```json
{ "id": "m3", "from": "P", "to": "S", "label": "POST /mensajes",
  "nested": { "title": "Turno de conversación", "src": "diagramas/conversacion-turno.json",
              "diagram": { "tag": "iswc-flowchart", "payload": { } },
              "maxW": 200, "maxH": 200, "bg": "#FFFFFF" } }
```

- `src` (JSON editable, relativo a la página) gana sobre `diagram` (inline, respaldo).
- El diagrama se monta fuera de pantalla con su web component y su SVG se copia
  vectorial en el recuadro, escalado tipo `object-fit: contain` (por defecto
  200 px por lado). El export estático lo conserva.
- Recuadro: borde del tema, `bg` (insoft claro: blanco; oscuro: el lienzo), al
  costado libre de la lifeline destino (el mismo del self-loop). La fila
  siguiente baja y el hueco entre lifelines crece para que no se monte nada.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./sequence-spec.js`](./utils/sequence-spec.js)
- [`../_shared/diagram-grid.js`](../../core/diagram-grid.js)
- [`../_shared/tk-icon-inline.js`](../../core/tk-text.js)
- [`../_shared/tk-hue.js`](../../core/color.js)
- [`../_shared/tk-color.js`](../../core/color.js)
- [`../_shared/tk-inline-md.js`](../../core/tk-inline-md.js)
- [`../_shared/icon-loader.js`](../../core/icon-loader.js)
- [`./diagram-kinds.js`](./utils/diagram-model.js)

Tags del módulo: `<iswc-sequence-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-sequence-diagram></iswc-sequence-diagram>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./sequence-diagram.ts)
- [CSS](./sequence-diagram.scss)
- [Índice de categoría](../../../specs/componentes.md)
- [Preview](./sequence-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=sequence&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=sequence&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parámetro: Compartir arma un enlace nuevo con el JSON resultante.
