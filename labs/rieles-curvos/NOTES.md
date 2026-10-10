# Lab · rieles curvos

Matriz de estilos de riel sobre diagramas reales del ISS (flujo con carriles, secuencia, clases,
DER y componentes). El router no cambia entre estilos: las curvas siguen exactamente su recorrido y
los extremos quedan rectos, así las puntas y los conectores no se mueven.

| Estilo | Qué hace |
|---|---|
| `orthogonal` | el recorrido tal cual |
| `curved` | cada giro redondeado con radio 12 px |
| `bezier` | cada giro con la curva más amplia que cabe (mitad de sus tramos, tope `BEZIER_MAX` = 40 px) |
| `sketch` | `look="sketch"` (servilleta): bezier por defecto + trazo a mano |

Se elige con `edgeStyle` en el payload (`layout.edgeStyle` también vale). Sin `edgeStyle`, un host con
`look="sketch"` usa `bezier`.

- Render: `deno run -A --no-check labs/rieles-curvos/render.mjs [base…]` → `out/<base>--<estilo>.svg|png`.
- Galería: `index.html`.
- Guardián: `src/utils/health/diagrams/rieles-curvos.test.ts`.
