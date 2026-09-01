---
tag: is-tree-view
tags:
  - is-tree-view
category: isp
status: public
source: ./tree-view.js
style: ./tree-view.css
preview: ../../previews/isp/is-tree-view.json
---
# `<is-tree-view>`

## Propósito

Árbol jerárquico editable portado de `TreeRowView.svelte` (ClientesIS / cursos):
expansión, drag & drop, historial undo/redo, modo protegido, drawer de ficha
y confirmación de borrado. Distinto de `<is-tree>` (navegación, sin mutaciones).

Este módulo registra `<is-tree-view>`.

## Cuándo usarlo

Planes de estudio, catálogos anidados y cualquier lista plana con `flatPath`
tipo `"1.2.3"` que el consumidor mapea vía `customs`.

## Cuándo no usarlo

Navegación de archivos o menú jerárquico de solo lectura → `<is-tree>`.
CRUD tabular sin jerarquía → `<is-catalogo-gen>`.

## Importación

```js
import './tree-view.js';
```

## Ejemplo mínimo

```html
<is-tree-view id="tv" label-field="titulo" style="height: 24rem;"></is-tree-view>
<script type="module">
  const tv = document.getElementById('tv');
  tv.list = [
    { iplan: '1', titulo: 'Módulo 1' },
    { iplan: '1.1', titulo: 'Introducción' },
  ];
  tv.customs = {
    entrie: 'contenido',
    entries: 'Plan',
    getFlatPath: (r) => String(r.iplan ?? '').trim(),
    setFlatPath: (r, fp) => { r.iplan = fp; },
    topMenuActions: (tree) => [{
      icon: 'mdi:plus-circle-outline', title: 'Agregar',
      onClick: () => tree.addRoot?.(),
    }],
  };
</script>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `readonly` | boolean | Apaga mutaciones. |
| `draggable` | boolean | Default true. `draggable="false"` lo apaga. |
| `disabled` | boolean | Host inerte. |
| `label-field` | string | Campo del nodo para el label. Default `titulo`. |
| `helper-field` | string | Texto secundario a la derecha. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `list` / `List2Rows` | lectura/escritura | Array plano. Alternativa: `customs.list()`. |
| `customs` | lectura/escritura | Contrato `ITreeCustoms` (hooks del consumidor). |
| `treeController` | lectura/escritura | `TreeRowViewAdapter`. Se crea si falta. |
| `bAllowed` | lectura/escritura | `{ Crear, Modificar, Eliminar, Visualizar }`. |
| `onError` | lectura/escritura | `(msg) => void`. |
| `renderRow` | lectura/escritura | `(node, el) => void` pinta el label. |
| `renderHelper` | lectura/escritura | `(node, el) => void`. |

### Slots

| Slot | Uso |
| --- | --- |
| `header` | Extra debajo del toolbar. |
| `frm` | Formulario de la ficha (drawer). |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-select` | `{ node, flatPath }` | sí | sí | no |
| `is-frm-open` | `{ record, itdForm, ancestors, isNew }` | sí | sí | no |
| `is-frm-close` | `{}` | sí | sí | no |
| `is-error` | `{ message }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `refresh()` | Reinyecta list + pinta. |
| `showDelete(obj)` | Abre confirm-delete del nodo. |
| `runCustomsPreSubmit()` | Sanea + `commitFlatPaths` antes de persistir. |

También se reexportan `TreeAdapter`, `TreeRowViewAdapter`, `TreeCustomsBase`,
`TreeRowAdapter`, `objRootsToNodes`, `TreeNode`, `groupedWithSeparators`.

### CSS parts

| Part | Uso |
| --- | --- |
| `root` | Host interno `.isp-tree`. |
| `toolbar` | Barra superior. |
| `body` | Lista scrollable. |
| `drawer` | Ficha lateral. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--trvwr-hvr-dflt` | Hover de fila. |
| `--trvwr-hghlght-bg` | Fila seleccionada/enfocada. |
| `--trvwr-fcs-rng` | Anillo de foco. |
| `--is-text` | Color de texto. |
| `--is-accent` | Acento (drop + caret). |

### Integración con formularios

No es form-associated. El formulario de ficha vive en el slot `frm`.

## Comportamiento

- `customs.getFlatPath` / `setFlatPath` mapean el id de dominio (`iplan`, etc.).
  `flatPath` muta durante moves; el dominio se escribe en `runCustomsPreSubmit`.
- **Roles 3D** por nodo: tres ejes (`topology`, `containment`, `mobility`) más
  `freeze` puntual. Los getters (`isAtom`, `isPrison`, …) son solo lectura.
  Guía ilustrativa completa con casos de uso y matriz de efectos:
  **[tree-view-roles.md](./tree-view-roles.md)**.
- Toolbar default: extender `TreeCustomsBase` (agregar, expandir, undo/protección/redo).
- Drag: reorder entre hermanos y nest `into` en agrupadores. `canDrop` combina roles
  (`hermetic`, `freezer`, anti-ciclos). Ver guía de roles.
- Doble clic abre drawer en edit (o view si readonly). Delete pide reescribir el código.
  `extinguish` / `release` dependen de `containment` (prisión vs celda).

## Dependencias y componentes relacionados

- [`../layout/drawer.js`](../layout/drawer.js), [`../layout/dialog.js`](../layout/dialog.js)
- [`./confirm-delete.js`](./confirm-delete.js)
- [`../actions/button.js`](../actions/button.js), [`../actions/dropdown.js`](../actions/dropdown.js)
- No confundir con [`../navigation/tree.md`](../navigation/tree.md) (`<is-tree>`).

Tags del módulo: `<is-tree-view>`.

## Accesibilidad

El body es `role="tree"`; cada summary es `role="treeitem"` con teclado
(↑/↓/←/→/Home/End). El drawer y los modales atrapan foco.

## Ejemplo avanzado

Ver también **[Roles 3D](./tree-view-roles.md)** para cuándo usar `atom`,
`hermetic`, `prison`, `freezer`, etc.

```html
<is-tree-view id="plan" label-field="titulo" style="height: 28rem;">
  <form slot="frm">
    <is-input name="titulo" label="Título"></is-input>
  </form>
</is-tree-view>
<script type="module">
  import { TreeCustomsBase } from './isp/tree-view.min.js';
  class PlanCustoms extends TreeCustomsBase {
    entrie = 'contenido';
    entries = 'Plan de contenidos';
    getFlatPath = (r) => String(r.iplan ?? '').trim();
    setFlatPath = (r, fp) => { r.iplan = fp; };
    levelName = ({ depth }) => depth === 0 ? 'Módulo' : 'Lección';
    updateNode = (node, isNew) => {
      const depth = Number(node.depth ?? 0);
      node.topology = depth >= 1 ? 'atom' : 'group';
      if (depth < 1) node.containment = 'hermetic';
      if (!isNew) return;
      if (!node.titulo) node.titulo = node.isAtom ? 'Nueva lección' : 'Nuevo módulo';
    };
    rowActions = (node, tree) => [
      { icon: 'mdi:arrow-up', title: 'Subir', onClick: () => tree.move?.(node, 'up') },
      { icon: 'mdi:arrow-down', title: 'Bajar', onClick: () => tree.move?.(node, 'down') },
    ];
  }
  const el = document.getElementById('plan');
  el.customs = new PlanCustoms();
  el.list = [ { iplan: '1', titulo: 'Módulo 1' }, { iplan: '1.1', titulo: 'Tema A' } ];
</script>
```

## Errores comunes

- Usar `<is-tree>` pensando que trae drag/historial: ese tag es solo navegación.
- Olvidar `getFlatPath` / `setFlatPath`: los moves no llegan al dominio al guardar.
- Llamar `commitFlatPaths()` a mano: el punto de entrada es `runCustomsPreSubmit()`.
- Inventar `variant="ghost"` en botones del consumidor sin mirar `VALID_*` de `is-button`.
- Usar tag sin importar módulo primero.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo `draggable="false"`.
- **Roles:** leer [tree-view-roles.md](./tree-view-roles.md) antes de modelar nodos;
  asignar `topology` / `containment` / `mobility` en `updateNode`, nunca getters.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.
- No portar ObjJConfig: drawer + slot `frm` + `is-confirm-delete`.

## Fuentes

- [JavaScript](./tree-view.js)
- [CSS](./tree-view.css)
- [Roles 3D — guía ilustrativa](./tree-view-roles.md)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/isp/is-tree-view.json)

## Relación con ISP

Fuente: `ISW-ClientesIS/.../cursos/TreeView/TreeRowView.svelte` + cascada
`_treeAdapter/` + `_asRow/`. UI Svelte traducida a tags `is-*`:
`FlexOptions` → `<is-flex-options>`, `FloatingComponent` → `<is-float-card>`.
ObjJConfig no se porta: drawer + slot `frm` + `is-confirm-delete`.
