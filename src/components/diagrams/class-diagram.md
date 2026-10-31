---
tag: iswc-class-diagram
tags:
  - iswc-class-diagram
category: diagrams
status: public
source: ./class-diagram.ts
style: ./class-diagram.scss
preview: ./class-diagram.json
---
# `<iswc-class-diagram>`

## Propósito

Diagrama de clases UML en SVG, sin Mermaid. Tú declaras clases y
relaciones; el componente decide las capas, dibuja los tres
compartimentos clásicos (nombre, atributos, métodos) y rutea las
relaciones rodeando las cajas.

Este módulo registra `<iswc-class-diagram>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './class-diagram.js';
```

## Ejemplo mínimo

```html
<iswc-class-diagram></iswc-class-diagram>
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
const el = document.querySelector('iswc-class-diagram');
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

> <iswc-class-diagram> — diagrama de clases UML en SVG, sin Mermaid.
> Configuración por JSON, igual que <iswc-flowchart>:
>   <iswc-class-diagram>
>     <script type="application/json">
>       { "classDiagram": { "direction": "TB", "classes": [...], "relations": [...] } }
>     </script>
>   </iswc-class-diagram>
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: iswc-render, iswc-turtle-state, iswc-open-viewer, iswc-toggle-group

## Estilos (`diagram-style`)

El consumidor no define colores ni temas: elige un estilo por atributo.

```html
<iswc-class-diagram diagram-style="insoft"></iswc-class-diagram>
```

| Qué | Contrato |
| --- | --- |
| `diagram-style="<nombre>"` | Antes del primer pintado se descarga el estilo (una sola vez para toda la página) y el diagrama usa su tema de tipo ``class``. El render espera la carga: no hay un primer pintado sin estilo |
| Estilo `insoft` | Viene registrado. Trae tres temas en una sola carga: `er` (DER, entidades naranja), `component` y `class` (paleta Visual Paradigm sin naranja: el naranja es exclusivo del DER) |
| Estilo desconocido o carga fallida | El diagrama se pinta con su tema por defecto; no queda vacío |
| `registerStyleDiagram({ nombre: [archivos] })` | Para librerías de estilos: registra JSON de tema (uno por tipo, con `kind`) bajo un nombre. El registro es global a todos los diagramas de la página |
| Colores en el payload | Por **clave semántica** del tema, no por hex: paquetes `primary`, `secondary`, `accent`, `neutral`, `panel`, `lite`; cajas `service`, `app`, `store`, `leaf`, `external`. Sin clave, los paquetes se colorean por profundidad (raíz `primary`, anidado `secondary`) |
| Atributo `theme` | Heredado: `theme="insoft"` / `"insoft-cd"` equivale a `diagram-style="insoft"` |

## Modo paquetes

Con `classDiagram.packages` las clases se agrupan como en el diagrama de componentes por capas y las relaciones usan el mismo router.

| Qué | Contrato |
| --- | --- |
| `packages: [{ id, name, stereotype?, parent?, cols?, palette?, classFill? }]` y `class.package` | Toda clase queda dentro de su paquete. `palette` y `classFill` son claves semánticas del tema (o hex) |
| Orden de franjas | El del payload. Declarar primero los ancestros hace que la herencia apunte hacia arriba |
| Herencia en bus | Un padre con 3 o más hijos en otra franja tiene **un solo triángulo**: los hijos suben a una barra común y ninguna arista corre sobre ella; cada hijo llega perpendicular a su propio punto |
| Colores de arista | El color de la clase que la emite. Los remates (triángulo, flecha, rombo) van rellenos de ese color y son 10 % más grandes |
| `layout.boxStyle` | `card` o `vp` (Visual Paradigm). Con `diagram-style="insoft"` y sin `boxStyle`, pinta en `vp` |
| Rieles | `lanePitch`, `laneNearFactor`, `pkgBorderClearance`, `pkgBorderNearFactor`, `pkgCrossFactor`, con los mismos nombres y efecto que en el diagrama de componentes |

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./class-spec.js`](./utils/class-spec.js)
- [`./sequence-spec.js`](./utils/sequence-spec.js)
- [`../_shared/tk-hue.js`](../../core/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../../core/tk-inline-md.js)
- [`./diagram-kinds.js`](./utils/diagram-kinds.js)

Tags del módulo: `<iswc-class-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-class-diagram></iswc-class-diagram>
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

- [JavaScript](./class-diagram.ts)
- [CSS](./class-diagram.scss)
- [Índice de categoría](../../../specs/componentes.md)
- [Preview](./class-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=class&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=class&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parámetro: Compartir arma un enlace nuevo con el JSON resultante.
