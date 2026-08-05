# `data` para LLM

## Propósito

Presentación, comparación, movimiento u organización de datos estructurados.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-data-grid>` | [data-grid.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/data/data-grid.md) | Data Grid |
| `<is-stat>` | [stat.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/data/stat.md) | Stat KPI |
| `<is-transfer>`, `<is-transfer-item>` | [transfer.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/data/transfer.md) | Transfer |
| `<is-gauge>` | [gauge.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/data/gauge.md) | Gauge |
| `<is-kanban>`, `<is-kanban-column>`, `<is-kanban-card>` | [kanban.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/data/kanban.md) | Kanban |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../_shared/grid-data.js`
- `../_shared/grid-types.js`
- `../_shared/grid-ui.js`
- `../_shared/adopt-css.js`

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y módulos existentes.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.

## `is-data-grid` — toolbar

| Atributo | Efecto |
|---|---|
| `show-toolbar` | Fuerza la barra (tools + opcional search). |
| `quick-filter` | Muestra el input de búsqueda. |
| `toolbar-tools="false"` | **Oculta** Columnas / Filtros / Densidad / Exportar. La búsqueda sigue gobernada solo por `quick-filter`. |
| Sin search y sin tools | La toolbar completa no se pinta. |

Propiedad JS: `el.toolbarTools = false` ↔ atributo `toolbar-tools="false"`.

### Cuándo apagar tools

Documentos embebidos, matrices de lectura (p. ej. «Matriz de pruebas»
en jagudeloe-tks), previews estáticas. El consumidor (`tk-table`) **debe**
pasar `toolbar-tools="false"` y **no** activar `quick-filter` /
`show-toolbar`.

### Qué no hacer

- No ocultar Columnas/Filtros/Densidad/Exportar con CSS del host: el shadow
  del grid no es contrato estable. Usar el boolean del componente.
- No asumir que `disable-column-menu` apaga la toolbar: solo el menú de
  columna.
- No inventar un segundo flag (`hide-tools`, `chrome=false`): el nombre
  canónico es `toolbar-tools`.

## Qué hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Leer callers antes de tocar helper compartido.
- Preservar accesibilidad, validación y fallbacks.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs`.
- Tras añadir API a data-grid: actualizar `data-grid.md` + test de
  invariante (`tests/data-grid-toolbar.test.mjs`) + build CDN + push.

## Qué no hacer

- No inventar API ni copiar contrato de componente parecido.
- No crear abstracción si shared/native resuelve caso.
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.
- No “arreglar” el chrome del grid solo en un consumidor: el kit es la
  fuente de verdad.

## Errores conocidos y prevención

Confundir módulo multi-tag con archivos independientes; children viven en transfer/kanban.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

| Síntoma | Causa | Fix |
|---|---|---|
| Tools visibles en tabla de solo lectura | Falta `toolbar-tools="false"` | Setear attr/prop en el consumidor |
| Toolbar sigue ahí sin tools ni search | Bug viejo / build CDN desactualizado | Rebuild `data-grid` + push; pin CDN |
| Intenté `display:none` en part toolbar | No cubre menús / rompe al update | Usar `toolbarTools = false` |

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
