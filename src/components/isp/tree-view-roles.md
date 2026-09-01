---
tag: is-tree-view
tags:
  - is-tree-view
  - roles
category: isp
status: public
parent: ./tree-view.md
---
# Roles 3D en `<is-tree-view>`

Guía ilustrativa del modelo de roles del árbol editable. Los roles **no son
campos sueltos**: son **tres ejes ortogonales** que el adaptador traduce a
getters (`isAtom`, `isPrison`, …) y a reglas de drag, borrado, expansión y UI.

Fuente de verdad en código: `src/components/isp/_shared/tree-view/tree-data.js`
(decoración) y `07-roles.js` (reglas).

## Por qué existen

Un plan de estudio no es “solo carpetas y archivos”. A veces hace falta:

- una **hoja** que no admite hijos (`atom`);
- un **módulo** que agrupa lecciones pero no deja sacar hijos (`hermetic`);
- un **bloque** que retiene hijos hasta liberarlo (`prison`);
- un **capítulo** que al borrarse deja vivas las lecciones (`cell`);
- un **tramo congelado** que no se reordena (`freezer` o `freeze`).

En vez de siete booleanos independientes, el árbol usa **tres enumerados**
independientes. Cualquier combinación válida se expresa escribiendo los ejes;
los `isXxx` se **leen**, no se asignan.

## Los tres ejes (lo que escribes)

| Eje | Valores | Si omites el campo… |
| --- | --- | --- |
| `topology` | `atom` · `group` | **`group`** — agrupa y muestra caret si tiene hijos |
| `containment` | `prison` · `hermetic` · `cell` | **`cell`** — al borrar, los hijos se promueven |
| `mobility` | `unanchored` · `freezer` | **`unanchored`** — se puede mover con drag |

Además, por nodo:

| Campo | Efecto |
| --- | --- |
| `freeze` (boolean) | Congela **solo este** nodo (sin congelar descendientes). |

### Getters derivados (solo lectura)

| Getter | Verdadero cuando… |
| --- | --- |
| `isAtom` | `topology === "atom"` |
| `isGroupActor` | `topology !== "atom"` (defecto `group`) |
| `isPrison` | grupo + `containment === "prison"` |
| `isHermetic` | grupo + `containment === "hermetic"` |
| `isCell` | grupo + `containment` omitido o `"cell"` |
| `isFreezer` | `mobility === "freezer"` |
| `isUnanchored` | `mobility` omitido o `"unanchored"` |
| `isEmpty` | átomo **o** grupo sin `childrens` |

> En un **átomo**, `isPrison`, `isHermetic` e `isCell` son siempre `false`:
> no puede contener nada, así que no puede retener ni liberar hijos.

### Dónde asignarlos

En `customs.updateNode(node, isNew, tree)` — el hook de ciclo de vida. Es el
sitio habitual para fijar roles según `depth`, tipo de registro, driver, etc.

```js
updateNode(node, isNew, tree) {
  const depth = Number(node.depth ?? 0);
  if (depth >= 2) {
    node.topology = 'atom';           // hoja: lección / recurso
  } else {
    node.topology = 'group';
    node.containment = 'hermetic';    // módulo: hijos no salen ni entran
  }
  if (!isNew) return;
  if (node.isAtom && !node.titulo) node.titulo = 'Nueva lección';
}
```

Patrón real (plan de contenidos ClientesIS): profundidad máxima → `atom`; si
no, `group` + `hermetic` para que el subárbol quede acoplado al módulo.

## Catálogo ilustrativo por caso de uso

Cada fila es un **perfil típico**. Los ejes se combinan; no son excluyentes
entre sí salvo donde la tabla lo indica.

### 1. Módulo / carpeta normal (`group` + `cell` + `unanchored`)

```
Plan
├── Módulo 1          ← group · cell · unanchored
│   ├── Lección A     ← atom
│   └── Lección B     ← atom
└── Módulo 2
```

| Qué puedes hacer | Comportamiento |
| --- | --- |
| Expandir / colapsar | Sí (`isGroupActor`) |
| Arrastrar lecciones entre módulos | Sí (`canDrop` permite cambio de padre) |
| Soltar **dentro** del módulo (`into`) | Sí — zona media del drag en agrupador |
| Borrar módulo | `extinguish` → borrado normal; hijos **no** se promueven solos* |

\*Con `cell` (defecto), `extinguishNode` intenta `promoteChildrenAndDelete`;
la implementación base delega en borrado — extiende el adaptador si necesitas
promoción real.

**Cuándo usarlo:** árboles genéricos, demos, catálogos flexibles.

### 2. Lección / hoja (`atom`)

```
Módulo 1
├── Introducción      ← atom · (containment/mobility irrelevantes)
```

| Qué puedes hacer | Comportamiento |
| --- | --- |
| Caret (chevron) | No — `showCaret` exige no-átomo |
| Agregar hijo en fila | No — `rowActions` de “+” solo en carpetas |
| Drop `into` | No — solo agrupadores reciben anidación |
| `actorActions` | Vacío — sin botón “Liberar” |

**Cuándo usarlo:** último nivel del plan, ítem terminal, recurso enlazado.

### 3. Módulo hermético (`group` + `hermetic`)

```
Módulo cerrado        ← group · hermetic
├── Solo hijos internos
```

| Qué puedes hacer | Comportamiento |
| --- | --- |
| Sacar hijo a otro padre | **No** — padre `hermetic` bloquea `canDrop` al salir |
| Meter hijo desde fuera | **No** — padre destino `hermetic` bloquea entrada |
| Reordenar **entre hermanos** del mismo padre | Sí (`position` before/after) |
| Liberar | **No** — `isHermetic` impide `onrelease` |

**Cuándo usarlo:** plan de estudio InSoft (módulos que no sueltan lecciones al
árbol global), bloques de contenido acoplados.

### 4. Prisión liberable (`group` + `prison`)

```
Bloque temporal       ← group · prison
├── Paso 1
└── Paso 2
```

| Qué puedes hacer | Comportamiento |
| --- | --- |
| Botón **Liberar** en fila | Sí — `actorActions` añade `mdi:exit-run` |
| `tree.release(node)` / `extinguish` | Disuelve contenedor; hijos suben **sin** borrarlos |
| Drag fuera del bloque | Depende de `allowsChildEscape` del padre (prisión no es hermética → sí) |

**Cuándo usarlo:** agrupaciones provisionales que el usuario puede “soltar” al
resto del árbol conservando orden.

### 5. Celda desechable (`group` + `cell`)

```
Capítulo opcional     ← group · cell (defecto si no pones containment)
├── Tema 1
└── Tema 2
```

| Qué puedes hacer | Comportamiento |
| --- | --- |
| Borrar / `extinguish` | `promoteChildrenAndDelete` — hijos **suben** al abuelo |
| Liberar | No aplica (no es `prison`) |

**Cuándo usarlo:** nodos “envoltorio” que no deben llevarse los hijos al
papelero.

### 6. Congelador de rama (`group` + `freezer`)

```
Sección fija          ← group · freezer
├── Ítem A            ← isFrozen true (ancestro freezer)
└── Ítem B
```

| Qué puedes hacer | Comportamiento |
| --- | --- |
| Drag de cualquier descendiente | **No** — `isFrozen` recorre ancestros |
| Handle de fila | Icono “mano tachada” en vez de grip |
| Botones mover arriba/abajo | Filtrados en `filterRowActions` si `frozen` |

**Cuándo usarlo:** tramos publicados, contenido ya entregado, examen final.

### 7. Nodo anclado puntual (`freeze: true`)

```
Lección bloqueada     ← atom o group + freeze: true
```

| Qué puedes hacer | Comportamiento |
| --- | --- |
| Mover solo este nodo | **No** — `isFrozen(node)` mira `freeze` al final |
| Hijos | **No** se congelan por este flag |

**Cuándo usarlo:** una fila concreta inamovible sin congelar toda la rama.

## Matriz: dónde usa el adaptador cada rol

| Subsistema | Qué consulta | Efecto visible |
| --- | --- | --- |
| **Caret / expandir** | `isGroupActor`, `hasChildren` | Chevron solo en grupos con hijos |
| **`onexpand` / `oncollapse`** | `isGroupActor && canMutate` | Hooks de negocio solo en agrupadores editables |
| **Agregar hijo (lead vacío)** | `isEmpty` folder + `canMutate` | Icono “+” en carpeta sin hijos |
| **`filterRowActions`** | `isFrozen` | Oculta mover arriba/abajo |
| **Handle drag** | `isDraggable`, `isFrozen`, protección | Grip · candado · mano tachada |
| **`canDrop`** | `isHermetic`, `isFreezer` en padre origen/destino | Línea roja / drop prohibido |
| **Zona `into` en drag** | `isGrouper` | Solo agrupadores aceptan soltar “dentro” |
| **`actorActions`** | `isPrison && !isHermetic` | Botón Liberar en float |
| **`extinguishNode`** | `prison` → release; `cell` → promover; resto → delete | Distinto resultado al “borrar” |
| **`allowsChildEscape`** | `!isHermetic && !isFreezer` | Regla local de salida de hijos |
| **`buildTree`** | hijos presentes | Fuerza `topology = "group"` si tiene `childrens` |

## Drag & drop (resumen visual)

Sobre un **agrupador** (`isGrouper`), el rectángulo de la fila se divide:

```
┌─────────────────────────────┐
│ 25% before  │  soltar antes │
├─────────────┼───────────────┤
│ 50% into    │  anidar dentro│
├─────────────┼───────────────┤
│ 25% after   │  soltar después│
└─────────────────────────────┘
```

Sobre un **átomo**, solo `before` / `after` (punto medio).

`canDrop` rechaza cuando:

- el destino es descendiente del origen (ciclo);
- sales de un padre `hermetic` o `freezer`;
- entras en un padre `hermetic` (`into` o cambio de padre).

## Borrado vs liberar vs extinguir

```
extinguishNode(record)
        │
        ├─ isPrison && !isHermetic ──► onrelease()     (no borra hijos)
        ├─ isCell ───────────────────► promoteChildrenAndDelete()
        └─ resto ────────────────────► onrowdelete()  (confirm-delete)
```

Desde `customs` / runtime:

| API runtime | Uso |
| --- | --- |
| `tree.remove(node)` | Flujo UI con confirmación |
| `tree.release(node)` | Liberar prisión |
| `tree.extinguish(node)` | Despachador de arriba |
| `tree.actorActions(node)` | Botones extra por rol (p. ej. Liberar) |
| `tree.isPrisonOnly(node)` | `isPrison && !isHermetic` |

## Combinaciones válidas (ejemplos)

| Perfil | topology | containment | mobility | freeze | Lectura rápida |
| --- | --- | --- | --- | --- | --- |
| Lección | `atom` | — | — | — | Hoja terminal |
| Módulo abierto | `group` | `cell` | `unanchored` | — | Carpeta estándar |
| Módulo InSoft | `group` | `hermetic` | `unanchored` | — | Subárbol cerrado |
| Bloque editable | `group` | `prison` | `unanchored` | — | Liberable |
| Tramo publicado | `group` | `cell` | `freezer` | — | Rama congelada |
| Ítem fijo suelto | `atom` | — | — | `true` | Una fila anclada |

Combinación válida pero rara: `atom` + `hermetic` + `freezer` — átomo
“herméticamente contenido y congelado”; los getters de containment quedan en
`false` por ser átomo, pero `isFreezer` y `freeze` sí aplican a movilidad.

## Defectos que sorprenden

1. **Sin declarar nada** → `group` + `cell` + `unanchored`: todo se mueve y
   parece “demasiado libre” si esperabas inmutabilidad.
2. **`isXxx` no van al JSON** — son getters; al guardar persistes los tres
   ejes (o los derivas en `updateNode` al cargar).
3. **`flatPath` muta al mover**; dominio (`iplan`, etc.) solo en
   `runCustomsPreSubmit()` vía `setFlatPath`.
4. **No asignes `node.isAtom = true`** — escribe `node.topology = "atom"`.

## Extender por `type` (opcional)

`TARoles` expone `groupTypes` y `actionTypes` (vacíos en la base). Si la
subclase los declara, `isGrouper` / `isActionGrouper` también clasifican por
`node.type`. Si las listas están vacías, gana `isGroupActor` / no-átomo.

## Reglas para LLM

- Asignar roles en `updateNode`, no con getters.
- Para “último nivel” → `topology: "atom"`.
- Para módulos que no intercambian hijos con el resto → `containment: "hermetic"`.
- Para bloques que el usuario puede disolver → `containment: "prison"` + botón Liberar.
- Para ramas que no deben reordenarse → `mobility: "freezer"` o `freeze` puntual.
- Drag prohibido ≠ readonly: un árbol readonly apaga mutaciones; un freezer
  solo bloquea movimiento.
- Consultar esta guía antes de inventar flags paralelos (`isFolder`, `locked`, …).

## Fuentes

- [tree-view.md](./tree-view.md) — API del componente
- [tree-data.js](./_shared/tree-view/tree-data.js) — decoración y getters
- [07-roles.js](./_shared/tree-view/07-roles.js) — reglas de rol
- [04-tree-flow.js](./_shared/tree-view/04-tree-flow.js) — `canDrop`, `buildTree`
- [row-adapter-drag.js](./_shared/tree-view/row-adapter-drag.js) — zonas de drop
