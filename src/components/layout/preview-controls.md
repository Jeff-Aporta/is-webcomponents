---
tag: iswc-preview-controls
tags:
  - iswc-preview-controls
category: preview
status: public
---
# `<iswc-preview-controls>`

## Propósito

Panel de knobs del playground de la galería. Misma disposición que PatyISW:
**una card** con **grid responsive** (`auto-fit`, mínimo ~300px), etiqueta
arriba y widgets `iswc-switch` / `iswc-select` / `iswc-input`.

## Cuándo usarlo

Demos JSON con `controls[]` en la definición de preview. Lo monta
`montarControles` tras cada `iswc-demo`.

## Cuándo no usarlo

No es un control de producto en apps finales. Para formularios de negocio usa
los tags `iswc-*` directamente.

## Ejemplo mínimo

```html
<iswc-preview-controls label="Controles"></iswc-preview-controls>
<script type="module">
  const p = document.querySelector('iswc-preview-controls');
  p.spec = [
    { control: 'boolean', prop: 'disabled', label: 'Disabled', value: false },
    { control: 'select', prop: 'variant', label: 'Variant', options: [
      { value: 'solid', label: 'solid' },
      { value: 'ghost', label: 'ghost' },
    ], value: 'solid' },
  ];
  p.addEventListener('iswc-controls-change', (e) => console.log(e.detail));
</script>
```

## Layout

- Card: borde `--iswc-border`, fondo `--iswc-bg-elev`, radio `--iswc-radius`.
- Grid: `repeat(auto-fit, minmax(min(100%, 300px), 1fr))`, gap `0.85rem 1.1rem`.
- Cada fila: columna (etiqueta + control).

## Pestañas (Phase W20)

El panel tiene 2 pestañas:

1. **Attrs** (default): la grilla de inputs/selects/switches del `spec`.
2. **Code**: la **anatomía** del componente target (Shadow DOM template),
   read-only, renderizada en un `<pre class="code">` que `scripts/highlight-pre.js`
   pinta con CodeMirror.

### Detección automática de la anatomía

Cuando el panel recibe `tag="<iswc-x>"` (lo hace el `<iswc-playground>` o
`montarPanel` automáticamente), intenta:

1. Leer el `__TEMPLATE` estático del CE (lo exponen `<iswc-dialog>`,
   `<iswc-drawer>` y los modales en general).
2. Si no, instancia un `<iswc-x>` hidden (`position: absolute; left: -99999px`)
   y serializa su `shadowRoot.innerHTML`.

El resultado es la **estructura interna del Shadow DOM** del componente target
(markup con `::part` incluidos), útil para entender cómo está construido sin
abrir DevTools.

### Atributo `tag`

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `tag` | string | Tag del componente target (`iswc-button`, `iswc-card`, …). Activa la pestaña Code. Lo inyecta el playground o `montarPanel` automáticamente; rara vez lo escribirás a mano. |


## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-preview-controls');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>
