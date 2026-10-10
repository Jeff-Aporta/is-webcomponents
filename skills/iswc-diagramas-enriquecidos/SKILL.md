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

## 2. Columnas (regiones verticales)

Cada tipo de pieza tiene su columna; ningún tipo se mezcla con otro. De izquierda a derecha:

1. **Clientes**: los controllers de cliente o iniciadores del proceso (`TXxxClient`, de `codigo.json`
   `clientes`), centrados verticalmente (`lanes[].align: "center"`). Si la acción une varios
   llamados en cadena, desde aquí se ven todas sus conexiones y caminos.
2. **Componentes**: todos los componentes, propios y de terceros, agrupados: «Propios (paquete)» y
   uno por proveedor externo (p. ej. OpenAI). Arriba el que inicia; abajo los **fines** (`end`): si
   hay respuesta el fin vuelve al componente; si termina con varias acciones, barra de paralelismo.
3. **Flujo**: los pasos del servicio, agrupados por tipo de proceso; procesos independientes, en
   grupos separados. Aquí los colores sí varían.
4. **Controllers** y 5. **Modelos**: una columna cada uno (región única). Entre ellos aristas con lo
   que se usa de verdad, nunca un `«uses»` vago: controller → su POJO `klass · SELECT, INSERT…`;
   controller → controller de detalle `detalle ARREGLO (clave) · ops`; modelo → modelo anidado
   `detalle ARREGLO · ops`.
6. **BD**: las tablas, agrupadas por base y dominio (grupos del DER: «PatyIA · Operativa»…), con las
   aristas de propagación maestro → detalle.

Un recuadro de grupo **nunca** abraza un nodo que no es suyo (guardián X2).

## 2b. Índices automáticos (jerárquicos)

Con `steps: "auto"` el diagrama numera solo, desde el grafo: sin ramas `1, 2, 3`; si el paso `p` se
bifurca (decisión, barra, varios procesos), las ramas son `p.1, p.2…` y lo que sigue en cada rama
`p.k.1, p.k.2…` (anidable: `x.y.z.a…`); donde se reúnen se vuelve al nivel de quien bifurcó (`p+1`).
Inicio, fin y barras no consumen número; lo que solo se usa (tablas, POJOs) lleva solo su ícono. El
consumidor nunca escribe índices (guardián `flowchart-indices.test.ts`).

## 3b. Código de color por tipo

Cada tipo de entidad tiene su color y ninguno se repite entre tipos: cliente, componente, controller,
POJO, tabla. Lo fija `config.entityColors` del diagrama; si no, rotación de tono OKLCH entre 0° y
330° (330°–360° se omite: se confunde con 0°). Solo los pasos del flujo varían de color. El
generador no pone `fill` a las clases (guardián `flowchart-colores.test.ts`).

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

## 6b. Declaración de variables

La configuración que se lee y se usa más adelante es un nodo `shape: "vars"`: fondo blanco, esquina
superior derecha en diagonal, insignia `mdi:variable-box`, y una **tabla** `vars: [{ name, alias?,
value, desc? }]` (nombre y valor obligatorios; alias corto para nombres o expresiones largas; desc
solo si el nombre no basta). Nombres calificados (`pojo.valor`, `instancia.valor`) si chocan; la
instancia se declara antes. **Solo** se declaran variables que el flujo usa después.

Donde se usa una variable, el texto la cita como `{{nombre}}` o `{{alias}}`: el diagrama la pinta como
una píldora punteada en línea (lectura de una variable declarada). Así un cambio se rastrea fácil.

## 6c. Herramientas: cuándo, no una cadena

Las llamadas a herramientas o APIs no se dibujan como una pila en cadena: el flujo muestra **en
qué caso** se usa cada una (decisiones con la condición real del código: «¿Trae notas de voz?»,
«¿La conversación ya tiene hilo?», «¿Modo libre o contexto forzado?»). Se lee el código antes.

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
