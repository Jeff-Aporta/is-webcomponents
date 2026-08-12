---
tag: is-er-diagram
tags:
  - is-er-diagram
category: diagrams
status: public
source: ./er-diagram.js
style: ./er-diagram.css
preview: ../../previews/diagrams/is-er-diagram.json
---
# `<is-er-diagram>`

## Propósito

Diagrama entidad-relación en SVG, sin Mermaid. Declaras entidades con sus
atributos y las relaciones entre ellas; el componente ubica las cajas,
rutea las líneas con A* y dibuja la notación de pata de gallo en cada extremo.

Este módulo registra `<is-er-diagram>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './er-diagram.js';
```

## Ejemplo mínimo

```html
<is-er-diagram></is-er-diagram>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-turtle-state` | sí | sí | sí | no |
| `is-render` | sí | sí | sí | no |
| `is-toggle-group` | sí | sí | sí | sí |
| `is-open-viewer` | sí | sí | sí | sí |

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
| `--er-circle-fill` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Agrupadores y ratio

`groups[]` ya no es solo leyenda: cada grupo se dibuja como un **cajón con título**
y las entidades de ese grupo se resuelven como un sub-diagrama propio dentro de él.
Las entidades sin `group` se colocan sueltas, sin cajón.

```json
{
  "erDiagram": {
    "ratio": 1.2,
    "groups": [
      { "id": "patyia", "name": "PatyIA — MSSQL", "hue": 210 },
      { "id": "clientesis", "name": "ClientesIS — PostgreSQL", "hue": 38 }
    ],
    "entities": [{ "id": "CONVERSACIONES", "group": "patyia", "attributes": [] }]
  }
}
```

| Campo | Default | Qué hace |
| --- | --- | --- |
| `ratio` (alias `aspectRatio`) | `1.4` | Ratio **guía** ancho/alto. El empaquetado prueba cada número de columnas y elige el reparto de cajones más cercano a ese ratio. Es una preferencia, no una restricción: nunca recorta ni deforma una caja. |
| `groups[].name` | — | Título del cajón (y de la leyenda). |
| `groups[].hue` | rotativo | Tinte del cajón, de su cabecera y del borde de sus entidades. |

El layout coloca los cajones probando permutaciones (hasta 5 cajones) y se queda con
la que deja más cerca los extremos de las relaciones que cruzan de un cajón a otro.
El ruteo va de la relación más corta a la más larga y cobra peaje sobre los corredores
ya usados, de modo que dos aristas prefieren separarse antes que solaparse.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-er-diagram> — diagrama entidad-relación en SVG, sin Mermaid.
> Configuración por JSON, igual que <is-flowchart>:
>   <is-er-diagram>
>     <script type="application/json">
>       { "erDiagram": { "entities": [...], "relations": [...] } }
>     </script>
>   </is-er-diagram>
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./er-spec.js`](./er-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`./sequence-turtle.js`](./sequence-turtle.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

Tags del módulo: `<is-er-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<is-er-diagram></is-er-diagram>
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

- [JavaScript](./er-diagram.js)
- [CSS](./er-diagram.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-er-diagram.json)
