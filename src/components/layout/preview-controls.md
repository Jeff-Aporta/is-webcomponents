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
