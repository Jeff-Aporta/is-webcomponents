# Spec — diagramas

Comportamiento exigido a los diagramas del kit (`src/components/diagrams/`). Diario: [`lessons.md`](../lessons.md).

## Contexto

Los diagramas documentan sistemas reales (ISS, ISW): rutas de endpoints, clases, DER, componentes,
secuencias. Quien los lee necesita ver qué fluye, hacia dónde y entre qué piezas, con la misma
gramática visual en todos. Quien los escribe necesita JSON validado que apunte a la fuente de verdad
(código, DER) en vez de copiarla.

## WHAT

### S-D1 Rieles con flujo

Todo riel de todo diagrama muestra hacia dónde va lo que transporta: el punteado avanza y el
continuo lleva una línea de puntos que avanza. Viaja en el SVG exportado; se apaga con movimiento
reducido o `flow-anim="off"`.

Sentido estándar, invertible por arista con `reverse`:

| Diagrama | Sentido |
|---|---|
| flujo, componentes | del origen a la punta |
| secuencia | del emisor al receptor |
| clases | herencia y realización del padre al hijo; el resto, con el trazo |
| DER | del lado N al lado 1; en 1:1 del lado opcional al obligatorio |

### S-D2 Estilos de riel sobre el mismo recorrido

Un riel puede ser `orthogonal`, `curved`, `bezier` o `sketch` (servilleta). El recorrido es siempre el
del router: el estilo solo cambia cómo se dibujan los giros. Los extremos quedan rectos, así las
puntas y los conectores no se mueven. Sin estilo declarado, la servilleta es `bezier`.

### S-D3 Ningún texto se corta ni se sale

Los miembros de una clase son una lista: la visibilidad (`+ - # ~`) es la viñeta, con sangría
colgante; la firma va en su renglón y el tipo debajo como texto secundario. Lo largo salta de línea.

### S-D4 Fuentes de verdad por referencia

Un diagrama puede tomar una pieza (clase, tabla, componente) de otro JSON con
`{ path, query, actions }`: `query` siempre resuelve un valor; si da `null`, el diagrama falla con
error visible (nunca dibuja un hueco).

### S-D5b Diagrama de flujo en vector

Un vector de columnas: cada columna es un sub-diagrama restringido a los tipos de entidad que acepta
(clientes, componentes, flujo, controllers, modelos, tablas, o los que defina el consumidor) y las
aristas son los puentes entre columnas. Una entidad en una columna que no la acepta es un error
visible. Doc: `src/components/diagrams/vector-flow.md`.

### S-D5 Un diagrama general; los demás son vistas restringidas *(plan)*

Existe un diagrama **general enriquecido** abierto a cualquier entidad (acción, decisión, clase,
tabla, componente, línea de vida, punto de paso, diagrama anidado…) y cualquier conexión entre ellas.
Flujo, secuencia y DER son **diagramas restringidos**: un JSON con su propio esquema, más estricto,
que se traduce al general. Todos comparten los mismos algoritmos de rieles: ruteo, animación,
etiquetas y curvas.

- Secuencia: las líneas de vida son carriles; cada paso numerado es una entidad (punto) sobre su
  línea de vida; los mensajes son rieles entre puntos.
- Servilleta: el mismo diagrama con rieles `bezier` y trazo a mano.

### S-D6 Convenciones homogéneas de los diagramas enriquecidos

Todo diagrama enriquecido de cualquier proyecto sigue las mismas convenciones: carriles en orden
(quien llama → servicio → BD → externos), controller con su POJO, tablas solo a través de su
controller dueño, detalles (`sqlDetalle`) desde el controller maestro y en el DER como 1 a N con su
arreglo, sistemas externos como un componente por API conectado por `-(O-`, abanico en las puntas
compartidas, ningún riel sobre una caja ajena y clases resumidas (5 miembros + «N más»). La guía
para agentes es el skill `skills/iswc-diagramas-enriquecidos/SKILL.md`.

## HOW

**HOW débil** (cómo se piensa hacer hoy; puede cambiar sin tocar el WHAT):

1. Extraer del flowchart (`flowchart-spec.ts`) el núcleo general: nodos con `kind` libre, carriles,
   grupos, router con `fixedRails` y etiquetas. Los `kind` especiales (clase, tabla, componente,
   anidado) ya se incrustan con `_shared/diagram-embed.ts`.
2. Cada restringido valida su JSON con zod y compila a la entrada del general (`toGeneral()`); el
   restringido conserva su propio pintor solo mientras el general no lo iguale en las pruebas visuales.
3. Secuencia primero (la más distinta): carriles verticales = líneas de vida, puntos = nodos `step`.
4. DER y clases después: la caja ya existe como `kind`; falta su ruteo de cardinalidades en el general.

**HOW fuerte** (contratos que no cambian sin ADR):

| Pieza | Contrato |
|---|---|
| `_shared/diagram-flow.ts` | `animarRiel(path, { punteado, reverse })` y `flujoActivo(host)`; un único helper para todos los diagramas |
| `_shared/diagram-curve.ts` | `styledEdgePath(d, estilo)`; no mueve tramos ni extremos; `BEZIER_MAX` = 40 |
| `diagram-vocab.ts` | `edgeStyleFor(host, payload)`: el payload gana; la servilleta usa `bezier` |
| `class-spec.ts` | `partirMiembro(row)` → `{ vis, firma, tipo }`; secciones con `members` |
| Refs | `{ path, query, actions }` resueltas con `Obj.getValue`; `null` → error |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Sentido del flujo por diagrama | S-D1 | `src/utils/health/diagrams/flow-anim-sentido.test.ts` |
| Flujo activo por defecto | S-D1 | `src/utils/health/diagrams/flowchart-lanes.test.ts` (A1) |
| Estilos sobre el mismo recorrido | S-D2 | `src/utils/health/diagrams/rieles-curvos.test.ts` |
| Miembros como lista, nada fuera | S-D3 | `src/utils/health/diagrams/class-miembros.test.ts` |
| Refs con null fallan | S-D4 | `src/utils/health/meta/obj.test.ts` |
| Lab visual de estilos | S-D2 | `labs/rieles-curvos/` (`render.mjs` + `index.html`) |
| `-(O-` a componentes con interfaz | S-D6 | `src/utils/health/diagrams/flowchart-lanes.test.ts` (K1) |
| Ningún riel sobre una caja ajena | S-D6 | `src/utils/health/diagrams/flowchart-lanes.test.ts` (X1) |
| Vector estricto por columnas | S-D5b | `src/utils/health/diagrams/vector-flow.test.ts` |
| Índices jerárquicos automáticos | S-D6 | `src/utils/health/diagrams/flowchart-indices.test.ts` |
| Clases resumidas (N más) | S-D6 | `src/utils/health/diagrams/class-miembros.test.ts` (M5) |
