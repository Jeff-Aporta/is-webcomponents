---
tag: iswc-app-nav
tags:
  - iswc-app-nav
category: navigation
status: public
source: ./app-nav.ts
style: ./app-nav.css
preview: ./app-nav.json
---
# `<iswc-app-nav>`

## Propósito

Pestañas de la barra de una app: una fila primaria y filas secundarias que dependen de ella
(p. ej. herramienta → panel). Accesible (patrón APG de pestañas con activación manual), con
repintado parcial: cambiar la pestaña activa o la visibilidad no recrea pestañas ni iconos.
Contrato WHAT: [`specs/app-shell/spec.md`](../../../specs/app-shell/spec.md) (S-AP6…S-AP11).

## Cuándo usarlo

- En el slot `nav` de `<iswc-app-shell>`.
- Navegación de primer nivel de una app con sub-secciones por herramienta.

## Cuándo no usarlo

- Pestañas que alternan paneles de contenido dentro de una vista: usa `<iswc-tab-group>`.
- Menús jerárquicos profundos: `<iswc-tree>` o `<iswc-mega-menu>`.

## Importación

```js
await L.load('iswc-app-nav');
```

## Ejemplo mínimo

```html
<iswc-app-nav slot="nav"></iswc-app-nav>
<script type="module">
  const nav = document.querySelector('iswc-app-nav');
  nav.rows = [
    { id: 'tool', value: 'chat', tabs: [
      { id: 'chat', label: 'Chat', icon: 'mdi:chat' },
      { id: 'config', label: 'Config', icon: 'mdi:cog' },
    ] },
    { id: 'chat-pane', parent: 'chat', value: 'conv', tabs: [
      { id: 'conv', label: 'Conversaciones' }, { id: 'logs', label: 'Logs' },
    ] },
  ];
  nav.addEventListener('iswc-nav-select', (e) => console.log(e.detail)); // { row, id, href }
</script>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `rows` | JSON | Misma forma que la propiedad. Útil para HTML servido. |

#### Propiedades públicas

| Propiedad | Tipo | Notas |
| --- | --- | --- |
| `rows` | `AppNavRow[]` | `{ id, label?, value?, parent?, tabs: AppNavTab[] }`. La primera fila es la primaria. |

`AppNavTab = { id, label, icon?, href?, hidden?, disabled? }`.

- `value`: id de la pestaña activa de la fila.
- `parent`: en una fila secundaria, solo se ve cuando la primaria vale `parent`.
- `label` de la fila: nombre accesible del `tablist` (default su `id`).

### Slots

Ninguno.

### Eventos

| Evento | `detail` | Cuándo |
| --- | --- | --- |
| `iswc-nav-select` | `{ row, id, href }` | Clic, Enter o Espacio en una pestaña. Cancelable: sin `preventDefault()` la pestaña queda activa. |

### Métodos y propiedades públicas

| Método | Qué hace |
| --- | --- |
| `getValue(rowId?)` | Valor activo de la fila (sin argumento: la primaria). |

### CSS parts

| Part | Nodo |
| --- | --- |
| `nav` | Contenedor de filas. |
| `row`, `row-primary`, `row-secondary` | Cada fila (`tablist`). |
| `tab`, `tab-active` | Cada pestaña; la activa lleva además `tab-active`. |
| `icon`, `label` | Icono y texto de la pestaña. |

### Custom states

| State | Cuándo | Uso |
| --- | --- | --- |
| `secondary` | Hay una fila secundaria visible | `iswc-app-nav:state(secondary)` |

### CSS custom properties

| Variable | Default |
| --- | --- |
| `--iswc-app-nav-tab-color`, `--iswc-app-nav-tab-hover` | `--iswc-text-dim`, `--iswc-text` |
| `--iswc-app-nav-active` | `--iswc-accent` (texto y subrayado de la activa) |
| `--iswc-app-nav-focus` | `--iswc-focus` |
| `--iswc-app-nav-secondary-bg`, `--iswc-app-nav-secondary-border` | franja suave de las filas secundarias |
| `--iswc-app-nav-tab-height` | `2.1rem` |

## Comportamiento

- Teclado: flechas/Home/End mueven el foco entre las pestañas visibles de la fila (con vuelta),
  sin seleccionar; Enter/Espacio seleccionan. Una sola parada de Tab por fila.
- Una pestaña con `href` es un enlace real: Ctrl/Cmd/clic medio abren donde el usuario pida; el
  clic normal emite el evento (la app enruta).
- Reasignar `rows` con la misma estructura solo actualiza activo/visibilidad (mismos nodos). Si
  cambian ids, textos, iconos o href, se reconstruye.
- < 40rem: las pestañas con icono de la fila primaria quedan solo en icono (texto visualmente oculto,
  nombre accesible intacto).
- Las filas secundarias se apilan bajo la primaria dentro de la zona `nav`.

## Dependencias y componentes relacionados

`<iswc-icon>`. Compañeros: `<iswc-app-shell>`, `<iswc-tab-group>`.

## Accesibilidad

`role="tablist"` por fila (con `aria-label`), `role="tab"` con `aria-selected`, `aria-disabled`
en pestañas deshabilitadas, roving tabindex y foco visible con `--iswc-app-nav-focus`.

## Ejemplo avanzado

```js
// Controlado: la app valida y decide.
nav.addEventListener('iswc-nav-select', (e) => {
  if (!puedeEntrar(e.detail.id)) return e.preventDefault();
  router.go(e.detail.href ?? '/' + e.detail.id);
});
// Ocultar una pestaña por permisos sin recrear iconos:
nav.rows = nav.rows.map((r) => ({ ...r, tabs: r.tabs.map((t) => ({ ...t, hidden: !permiso(t.id) })) }));
```

## Errores comunes

- Recrear el elemento al cambiar de pestaña: cancela la descarga de iconos. Reasigna `rows`.
- Esperar que `href` navegue en clic normal: el clic emite `iswc-nav-select`; enruta tú.
- Sin `value` en la primaria todas las filas con `parent` quedan ocultas.

## Reglas para LLM

- No dupliques las filas en el DOM de la app: todo va en `rows`.
- Ocultar = `hidden: true` en la pestaña, no quitarla (evita reconstruir).
- `iswc-nav-select` es cancelable; la selección por defecto es local al nav.
- La forma de `rows` es contrato (HOW fuerte en la spec): no la renombres.

## Fuentes

- `src/components/navigation/app-nav.ts`, `app-nav.scss`.
- Spec: [`specs/app-shell/spec.md`](../../../specs/app-shell/spec.md).
