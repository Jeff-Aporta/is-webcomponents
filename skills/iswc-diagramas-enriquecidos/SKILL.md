---
name: iswc-diagramas-enriquecidos
description: >-
  Convenciones para dibujar diagramas enriquecidos con el kit iswc (rutas ilustradas de endpoints:
  flujo con carriles + clases + tablas del DER + componentes; y sus vistas restringidas de secuencia,
  DER y componentes). Usar al crear o modificar el editable JSON de un diagrama de un proyecto
  (ISS, ISW…), al agregar una ruta/EP a la documentación, al conectar un paso con una tabla, una
  clase o un sistema externo, o al revisar que un diagrama siga las convenciones homogéneas.
---

# Diagramas enriquecidos — convenciones homogéneas

Un diagrama enriquecido cuenta **qué pasa en una acción** (un endpoint, una tarea) con todas sus
piezas reales: quién llama, qué controller atiende, qué POJO usa, qué tablas toca y qué sistemas
externos consulta. Todos los diagramas de todos los proyectos siguen estas mismas convenciones;
si un caso no está aquí, se resuelve como el más parecido y se agrega la regla a este archivo.

Spec del kit: `specs/diagramas/spec.md` (WHAT). Ejemplo vivo: `labs/iss-ayudascpia-flujos/`
(`rutas-ricas.mjs` es el generador de referencia; sus payloads, los editables resultantes).

## 1. Fuentes de verdad, nunca copias

- Cada pieza **cita** su fuente con una referencia `{ path, query, actions }` (lib `Obj` del kit):
  clases y pares controller→POJO desde `fuentes/codigo.json` (generado del código), tablas desde
  `der.json`, componentes desde `componentes.json`.
- `query` siempre resuelve un valor; si da `null` el diagrama falla (error visible). Nunca se
  rellena a mano lo que dice el código.
- Lo que el código sabe se extrae del código (`codigo-a-fuentes.mjs`): `nTbl`, `klass`,
  `primaryKeys`, `sqlDetalle`. Si hace falta un dato nuevo, se agrega al extractor, no al JSON.

## 2. Carriles

Orden de izquierda a derecha: **quien llama** (portal, consola, ISW) → **el servicio** (un carril
con el controller principal: `ISS · TXxxController`) → **la base de datos** → **sistemas externos**
(un carril por proveedor: OpenAI, DataSnap, R2…).

## 3. Clases: controller con su POJO

- Todo controller aparece con su POJO (par de `codigo.json`), unidos por `«uses»`.
- Dentro de un flujo, una clase es un resumen: **5 miembros por sección** y un renglón `N más`.
  El diagrama lo cambia con `config.classMaxMembers`. Solo aplica a clases.
- Los miembros son lista: la visibilidad es la viñeta, el tipo va debajo como texto secundario.

## 4. Tablas: siempre por su controller dueño

- Una tabla se toca **solo a través del controller que la gobierna** (su `nTbl`) y su POJO. Si un
  paso del controller principal escribe o lee una tabla ajena, el paso le habla al dueño
  (`INSERT`, `SELECT`…) y el dueño a la tabla con la misma operación. Ningún controller aparenta
  conectarse a tablas que no son suyas.
- Si el dueño es el controller principal, el paso va directo a su tabla.
- Operaciones como etiqueta de la punteada: `SELECT`, `INSERT`, `UPDATE`, `DELETE` (con su ícono).
- Columnas: solo las que la acción usa (`b.tabla(id, nombre, carril, [columnas])`).

## 5. Detalles (maestro → detalle)

- Lo que un controller arma en su `sqlDetalle` (`sqlSubArreglo(<Controller>, "<ARREGLO>", …)`) es
  un **detalle**: el GET del maestro lo trae y sus cambios se propagan por esa relación.
- En la ruta, el acceso a la tabla detalle sale del **controller maestro** hacia el controller del
  detalle: `detalle <ARREGLO> (<clave>) · <op>`; el controller del detalle va a su tabla.
- En el DER, la relación maestro → detalle es 1 a N con `detalle: "<ARREGLO>"` y su etiqueta
  `1 a N · detalle <ARREGLO> (<clave>)`. La escribe el extractor desde el código.

## 6. Sistemas externos: componentes con interfaz `-(O-`

- Un proveedor externo no es una caja genérica: **un componente por API** que se usa (OpenAI:
  `Audio · Transcriptions`, `Chat Completions`, `Conversations`, `Responses`, `Models`), dentro
  del paquete del proveedor, cada uno con `provides: ["<api>"]`.
- Quien lo usa se conecta por el conector UML `-(O-`: el componente expone su lollipop y el riel
  termina en el socket. Varios usos a la misma API convergen en abanico a un solo `-(O-`.
- La etiqueta dice la operación (`transcribe`, `stream`, `create`, `operativo 9999.2`, `models.list`).
- Para saber qué APIs usa el servicio, se busca en el código (`openai.<api>.<op>`), no se supone.

## 7. Flujo

- Paralelismo: un nodo que no decide y reparte a varios procesos lo hace por una **barra**.
- A un rombo se entra por arriba; sus costados son salidas de rama.
- Aristas que comparten punta convergen **en abanico** con vías paralelas a delta (estándar; no se
  quita).
- Ningún riel atraviesa una caja ajena; ningún texto de arista se monta sobre otro.
- Notas (`b.nota`) para lo que se repite o no es obvio (p. ej. «se repite por cada fragmento»).

## 8. Animación y estilo

- Rieles animados con el sentido del flujo (estándar en todos los diagramas; `reverse` por arista).
- Estilo `insoft` en documentación; `edgeStyle: "bezier"` o `look="sketch"` para bocetos.

## 9. Antes de publicar

1. Regenerar editables (`rutas-ricas.mjs --iss`, `eps-iss.mjs --iss`) y renderizar.
2. Guardianes del kit verdes (`flowchart-lanes.test.ts`: U4 abanico, U5 una punta, D1 rombo,
   K1 `-(O-`, X1 sin cruces, E2/E3 etiquetas; `class-miembros.test.ts`).
3. Mirar el PNG: si algo se lee mal y no hay regla, se agrega aquí y un guardián en el kit.
