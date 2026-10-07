---
tag: iswc-er-diagram
tags:
  - iswc-er-diagram
category: diagrams
status: public
source: ./er-diagram.ts
style: ./er-diagram.css
preview: ./er-diagram.json
---
# `<iswc-er-diagram>`

## PropÃ³sito

Diagrama entidad-relaciÃ³n en SVG, sin Mermaid. Declaras entidades con sus
atributos y las relaciones entre ellas; el componente ubica las cajas,
rutea las lÃ­neas con A* y dibuja la notaciÃ³n de pata de gallo en cada extremo.

Este mÃ³dulo registra `<iswc-er-diagram>`.

## CuÃ¡ndo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## CuÃ¡ndo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## ImportaciÃ³n

```js
import './er-diagram.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-er-diagram></iswc-er-diagram>
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
const el = document.querySelector('iswc-er-diagram');
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
| `--er-circle-fill` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Agrupadores y ratio

`groups[]` ya no es solo leyenda: cada grupo se dibuja como un **cajÃ³n con tÃ­tulo**
y las entidades de ese grupo se resuelven como un sub-diagrama propio dentro de Ã©l.
Las entidades sin `group` se colocan sueltas, sin cajÃ³n.

```json
{
  "erDiagram": {
    "ratio": 1.2,
    "groups": [
      { "id": "patyia", "name": "PatyIA â€” MSSQL", "hue": 210 },
      { "id": "clientesis", "name": "ClientesIS â€” PostgreSQL", "hue": 38 }
    ],
    "entities": [{ "id": "CONVERSACIONES", "group": "patyia", "attributes": [] }]
  }
}
```

| Campo | Default | QuÃ© hace |
| --- | --- | --- |
| `ratio` (alias `aspectRatio`) | `1.4` | Ratio **guÃ­a** ancho/alto. El empaquetado prueba cada nÃºmero de columnas y elige el reparto de cajones mÃ¡s cercano a ese ratio. Es una preferencia, no una restricciÃ³n: nunca recorta ni deforma una caja. |
| `groups[].name` | â€” | TÃ­tulo del cajÃ³n (y de la leyenda). |
| `groups[].hue` | rotativo | Tinte del cajÃ³n, de su cabecera y del borde de sus entidades. |

El layout coloca los cajones probando permutaciones (hasta 5 cajones) y se queda con
la que deja mÃ¡s cerca los extremos de las relaciones que cruzan de un cajÃ³n a otro.
El ruteo va de la relaciÃ³n mÃ¡s corta a la mÃ¡s larga y cobra peaje sobre los corredores
ya usados, de modo que dos aristas prefieren separarse antes que solaparse.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-er-diagram> â€” diagrama entidad-relaciÃ³n en SVG, sin Mermaid.
> ConfiguraciÃ³n por JSON, igual que <iswc-flowchart>:
>   <iswc-er-diagram>
>     <script type="application/json">
>       { "erDiagram": { "entities": [...], "relations": [...] } }
>     </script>
>   </iswc-er-diagram>
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: iswc-render, iswc-turtle-state, iswc-open-viewer, iswc-toggle-group

Las aristas paralelas se separan unos pÃ­xeles; el trazo es un HSL oscuro del
grupo (no negro). Las etiquetas se colocan al 50% del path y no pisan cajas.

## Estilos (`diagram-style`)

El consumidor no define colores ni temas: elige un estilo por atributo.

```html
<iswc-er-diagram diagram-style="insoft"></iswc-er-diagram>
```

| Qué | Contrato |
| --- | --- |
| `diagram-style="<nombre>"` | Antes del primer pintado se descarga el estilo (una sola vez para toda la página) y el diagrama usa su tema de tipo ``er``. El render espera la carga: no hay un primer pintado sin estilo |
| Estilo `insoft` | Viene registrado. Trae tres temas en una sola carga: `er` (DER, entidades naranja), `component` y `class` (paleta Visual Paradigm sin naranja: el naranja es exclusivo del DER) |
| Estilo desconocido o carga fallida | El diagrama se pinta con su tema por defecto; no queda vacío |
| `registerStyleDiagram({ nombre: [archivos] })` | Para librerías de estilos: registra JSON de tema (uno por tipo, con `kind`) bajo un nombre. El registro es global a todos los diagramas de la página |
| Colores en el payload | Por **clave semántica** del tema, no por hex: paquetes `primary`, `secondary`, `accent`, `neutral`, `panel`, `lite`; cajas `service`, `app`, `store`, `leaf`, `external`. Sin clave, los paquetes se colorean por profundidad (raíz `primary`, anidado `secondary`) |
| Atributo `theme` | Heredado: `theme="insoft"` / `"insoft-cd"` equivale a `diagram-style="insoft"` |

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./er-spec.js`](./er-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`./sequence-turtle.js`](./sequence-turtle.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

Tags del mÃ³dulo: `<iswc-er-diagram>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-er-diagram></iswc-er-diagram>
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

- [JavaScript](./er-diagram.ts)
- [CSS](./er-diagram.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./er-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=er&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=er&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.
