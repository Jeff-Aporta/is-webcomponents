---
tag: iswc-sequence-diagram
tags:
  - iswc-sequence-diagram
category: diagrams
status: public
source: ./sequence-diagram.ts
style: ./sequence-diagram.css
preview: ./sequence-diagram.json
---
# `<iswc-sequence-diagram>`

## PropÃ³sito

Diagrama de secuencia en SVG, sin Mermaid. La configuraciÃ³n es un JSON
con actores, mensajes y grupos; el layout (posiciones, ruteo ortogonal
de las flechas y colocaciÃ³n de etiquetas) se calcula solo.

Este mÃ³dulo registra `<iswc-sequence-diagram>`.

## CuÃ¡ndo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## CuÃ¡ndo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## ImportaciÃ³n

```js
import './sequence-diagram.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-sequence-diagram></iswc-sequence-diagram>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-turtle-state` | Emitido al actualizarse el estado del mÃ³dulo turtle (resize, datos, etc.). |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-toggle-group` | Evento personalizado del componente (toggle group). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-turtle-state` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-toggle-group` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |
| `iswc-open-viewer` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-sequence-diagram');
el.addEventListener('iswc-turtle-state', (e) => {
  console.log('iswc-turtle-state', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `updateComplete()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-sequence-diagram> â€” diagrama de secuencia en SVG, sin Mermaid.
> ConfiguraciÃ³n por JSON (idÃ©ntica a la del proyecto original): un
> <script type="application/json"> hijo, o la propiedad `payload`.
>   <iswc-sequence-diagram>
>     <script type="application/json">
>       { "sequence": { "actors": [...], "messages": [...] } }
>     </script>
>   </iswc-sequence-diagram>
> TambiÃ©n acepta `{ "preset": "tk1437191" }`.
> Atributos
>   color  inline (default) | viewer â€” viewer activa hover, leyenda clickeable
>            y auto-animaciÃ³n de la tortuga.
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

## Estilo de arista (`edgeStyle`)

`"policy": { "edgeStyle": "curved" }` (o `edgeStyle` en la raíz del payload)
redondea los giros de cada mensaje con Bézier sobre el **mismo** recorrido
ortogonal: el router no cambia, solo la pintura. Ver el vocabulario común en
[`diagram-vocab.ts`](./diagram-vocab.ts).

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`./sequence-turtle.js`](./sequence-turtle.js)
- [`../_shared/diagram-grid.js`](../_shared/diagram-grid.js)
- [`../_shared/tk-icon-inline.js`](../_shared/tk-icon-inline.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-color.js`](../_shared/tk-color.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`../_shared/icon-loader.js`](../_shared/icon-loader.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

Tags del mÃ³dulo: `<iswc-sequence-diagram>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-sequence-diagram></iswc-sequence-diagram>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./sequence-diagram.ts)
- [CSS](./sequence-diagram.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./sequence-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=sequence&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=sequence&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.
