# Preview por CDN — contrato de consumo externo (apps iswc)

Cómo una app externa (p. ej. PatyIA/app, iswc-tkts/app, isc-swagger) monta un
preview `iswc-preview/v1` usando el kit ISWC por CDN. Verificado con
Stagehand/Playwright (iswc-root@60be5643d6).

## 1. Cargar el loader y los componentes de preview
```html
<script type="module">
  import { ISWebComponentsLoader as L }
    from 'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@<sha>/dist/cdn/core/loader.min.js';
  L.configure({ mirrors: ['jsdelivr', 'pages'], preferSelf: false });
  await L.load('iswc-preview-component', 'iswc-preview-controls', /* …tags del demo… */);
  await customElements.whenDefined('iswc-preview-component');
</script>
```
`<sha>` = un commit publicado (p. ej. `60be5643d6`) o `main`.

## 2. Montar un preview (clave: objeto con `.definition`)
`iswc-preview-component` espera que `host.preview` sea un objeto tipo
`JsonPreview`, es decir con `.definition` y ciclo mount/unmount — NO la
definición cruda.
```js
const def = { $schema: 'iswc-preview/v1', tag: 'iswc-progress-ring', category: 'feedback',
  title: 'Progress Ring', storageKey: 'docs-p',
  sections: [{ id: 'intro', title: 'Ring',
    blocks: [{ kind: 'demo', html: '<iswc-progress-ring id="p" value="40" label="40%"></iswc-progress-ring>' }] }] };
const host = document.createElement('iswc-preview-component');
host.preview = {
  definition: def,
  async mount() { /* cablear behaviors/eventos del demo si aplica */ },
  unmount() {},
};
document.body.appendChild(host);
```

## 3. Errores conocidos
- `Cannot read properties of undefined (reading 'storageKey')` = se pasó la
  definición cruda a `preview` en vez de `{ definition }`.
- `L.load('iswc-tab') desconocido` = el demo cita tags de soporte fuera del
  catálogo; filtrar o registrarlos antes.

## 4. Pendiente para "controles automáticos"
Los paneles JSON-driven automáticos los monta la pieza `JsonPreview + controles`
(`src/previews/_kit` + `src/utils/system`), que aún NO se publica como runtime
CDN. Hasta exponerlo, una app externa puede cargar `iswc-preview-controls` del
CDN y cablear la reacción manualmente, o esperar al bundle `preview-kit`.
