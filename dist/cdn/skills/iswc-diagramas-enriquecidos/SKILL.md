---
name: iswc-diagramas-enriquecidos
description: >-
  Convenciones para dibujar diagramas enriquecidos con el kit iswc (rutas ilustradas de endpoints:
  flujo con carriles + clases + tablas del DER + componentes; y sus vistas restringidas de secuencia,
  DER y componentes). Usar al crear o modificar el editable JSON de un diagrama de un proyecto
  (ISS, ISW…), al agregar una ruta/EP a la documentación, al conectar un paso con una tabla, una
  clase o un sistema externo, o al revisar que un diagrama siga las convenciones homogéneas.
---
<!-- @vendor 2026-10-13T14:22:09.366Z Jeff-Aporta/is-webcomponents@main dist/cdn/skills/iswc-diagramas-enriquecidos/SKILL.md -->

# Diagramas enriquecidos — convenciones homogéneas

> El formato es el **diagrama de flujo en vector** (`{ vectorFlow: { columns, edges } }`, doc
> `src/components/diagrams/vector-flow.md`): cada columna es un contexto estricto y las aristas son
> los puentes. Las reglas de abajo dicen qué columnas usar y cómo conectarlas.

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

Con `steps: "auto"` el diagrama numera solo, desde el grafo, y **solo los pasos** (acciones,
decisiones, declaraciones, subprocesos): cliente, componentes, controllers, tablas, inicio, fin y
barras llevan solo su ícono. Sin ramas `1, 2, 3`; los hermanos **incrementan** (nunca se concatenan
1s). Lo que cuelga de una bifurcación del paso `p` se numera `p.1, p.2, p.3…` en orden de lectura,
rama tras rama; una bifurcación anidada abre su nivel (`p.2.1…`); donde las ramas se reúnen se vuelve
al nivel de quien bifurcó (`p+1`). Sin huecos en ningún nivel. Ejemplo (parches): `1, 2, 2.1, 2.2,
2.2.1, 2.2.2, 3`. El consumidor nunca escribe índices (guardián `flowchart-indices.test.ts`). En la
Seq derivada cada decisión es un mensaje con su índice y la llamada de entrada va sin índice.

## 3b. Código de color por tipo

Cada tipo de entidad tiene su color y ninguno se repite entre tipos: cliente, componente, controller,
POJO, tabla. Lo fija `config.entityColors` del diagrama; si no, rotación de tono OKLCH entre 0° y
330° (330°–360° se omite: se confunde con 0°). Solo los pasos del flujo varían de color. El
generador no pone `fill` a las clases (guardián `flowchart-colores.test.ts`).

## 3c. Puentes `-(O=` y sockets `-(O-`

- Un controller es el **puente** entre el flujo y la BD: expone un puente `-(O=` por acción
  (`shape: "bridge"`, `of: <controller>`, `op: C|R|U|D`) colgando debajo de él: socket del lado del
  controller y la bola con el ícono de su operación (sin letras), del color del método HTTP llevado a
  SQL (SELECT↔GET azul `#61AFFE`, INSERT↔POST verde `#49CC90`, UPDATE↔PUT naranja `#FCA130`, DELETE
  rojo `#F93E3E`). El `label` del puente es la **función del controller** que hace la operación
  (`get()`, `list()`, `crear()`…), nunca un verbo genérico como `leer()`.
- Un único puerto de **entrada** (todas las que consumen convergen ahí, triángulo sólido tocando el
  O) y un puerto por **salida** (triángulo sólido a ~34 px del O). Las entradas llevan la acción de BD
  (`SELECT`, `INSERT`…, con su ícono); la salida a su tabla no lleva texto.
- Los POJOs no se dibujan: el paso nunca toca una tabla directo; siempre paso → puente → tabla.
- Tablas del DER y componentes que se consumen exponen `-(O-` (convención InSoft): el expositor pone
  el socket `(` y quien consume llega a la bola O con su punta de flecha.
- **Nada en el aire**: toda arista parte y llega a una entidad. El palo del puente siempre toca su
  controller, por cualquiera de sus 4 lados: abajo mientras la fila quepa en su ancho, luego derecha,
  izquierda y arriba (si aun sobran, el controller se ensancha). Los otros rieles del controller usan
  un lado libre de puentes, y al abrir espacio el controller y sus puentes se mueven como un bloque.
- Animación: los puntos de las líneas continuas van por defecto **del color de la arista** (la
  arista acepta `color`) y **detrás** del riel; el consumidor los personaliza con
  `dots: { color, size }` en la arista.
- **Paralelismo**: la arista que inicia una bifurcación llega **centrada** a su barra (en el costado
  que le toque); la reunión de ramas (2+ entradas, una salida) es un **⦿ con pulso de radar**, no
  una barra.
- **Auto-cruce prohibido**: ninguna arista se corta ni se pisa a sí misma (se descarta el bucle).
- **Proximidad**: pasar cerca de entidades, conectores y textos se desincentiva hasta 3U, más cuanto
  más cerca (los `-(O` más que los demás conectores); fuera del radio no cuesta.
- Las columnas de entidades se **apilan** (una debajo de otra, cada controller con sus puentes) y no
  empujan a las otras columnas: cada columna solo se empuja a sí misma.
- En los md, las pestañas de un EP son **Seq** (secuencia) y **Seq in Vec** (secuencia en vector).
- **Fuente única**: la Seq se DERIVA de la Seq in Vec (en el consumidor, p. ej. `seq-de-vec.mjs` del
  ISS): cada paso → mensaje (a la BD o externo que usa, propio si no usa nada; lo que termina en el
  fin → respuesta), cada decisión → `alt`, cada barra → `par`, cada columna de flujo → un actor. Los
  textos son referencias `{ path, query }` a los nodos del vector y los índices (`stepLabel`) son los
  mismos `x.y.z`; si un paso produce varias flechas, cada una lleva su subíndice en orden (`1.3.1`, `1.3.2`…). Nunca se escribe una Seq a mano.

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

## Scripts online (Deno, siempre `@main` con `--reload`)

Regla (Jeff, 2026-10-13): los scripts de `tools/` de una skill y los CLI de `vendor-distributions/` (`vendor.ts`,
`pin-update.mjs`, `download-iconify.ts`, `render-lote.ts`) NO se descargan nunca al consumidor: se ejecutan online con
Deno desde `@main` del kit. `--reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/` es obligatorio
(Deno cachea los módulos remotos para siempre) y `--import-map=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/deno.json`
resuelve las dependencias del kit (`zod`…) cuando el consumidor no las tiene en su propio `deno.json`. Nunca una ruta
local del checkout ni un SHA en estos comandos: el pin del proyecto gobierna lo vendorizado, no los scripts.

### `render-lote` (online, desde `@main`)

```bash
deno run -A --reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/ --import-map=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/deno.json https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/vendor-distributions/client/tools/render-lote.ts --carpeta=<dir editables> --svg=<dir> [--png=<dir>] --kit=<checkout del kit> [--cache=<archivo>] [--forzar] [--solo=a,b]
```

- **Qué hace y cuándo**: renderiza el LOTE de diagramas de la documentación (editables `<slug>.json` → SVG/PNG) con caché por hash: solo repinta lo que cambió. Es el `docs:diagramas` de ISS/ISW (envoltorio fino o el comando tal cual). Añadir `--no-check --sloppy-imports` al `deno run`.
- **Entradas**: la carpeta de editables (`--carpeta`), `--kit` o env `ISWC_KIT` (obligatorio online: de ahí salen `dist/cdn/…` y Playwright del `node_modules` del kit), `--pinKit` opcional (sello que entra en la huella; default `<kit>/PIN`), el caché `diagramas-iswc.cache.json` junto a los editables.
- **Escribe**: `<slug>.svg` en `--svg`, `<slug>.png` en `--png` (default igual a `--svg`), y el caché atómico por diagrama OK.
- **Salida y errores típicos**: 0 ok · 1 si algún diagrama falló (`lote · N renderizados · M sin cambios · K fallidos`) · lanza «corriendo online hace falta --kit=… o ISWC_KIT» · un editable inválido o una referencia `{ path, query }` sin resolver sale como `error` con su motivo; Chromium que no arranca se reintenta 5 veces.
