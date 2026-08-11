CDN artifacts (folderizados por categoria)
  is-base.min.css                          — themes + brand palettes (link in the host app)
  palettes.min.css                         — paletas de marca
  <categoria>/<name>.min.js                — componente individual (carga su .min.css hermano en el shadow)
  <categoria>/<name>.min.css               — estilos del componente (junto al .min.js)
  <categoria>/category.<categoria>.min.js  — todos los componentes de esa categoria
  all.min.js                               — todos los componentes en un archivo
  loader.min.js                            — ISWebComponentsLoader (carga selectiva + pin/mirrors)
  loader.md                                — docs del loader (LLM)
  sizes.json                               — {ruta: bytes} de todo el .min.js/.min.css publicado
  assets/icons/                            — SVGs Iconify + <prefix>.json + index.json
  Los tags conservan el prefijo is-* (p.ej. actions/button.min.js → <is-button>).

Uso recomendado (loader):
  <script type="module">
    import { ISWebComponentsLoader } from ".../loader.min.js";
    // Pin opcional (SHA o branch). Sin pin → tip de main (API GitHub).
    // ISWebComponentsLoader.pin("abcdef0123…");
    ISWebComponentsLoader.configure({ mirrors: ["jsdelivr", "pages"] });
    await ISWebComponentsLoader.loadCSSBase();
    await ISWebComponentsLoader.loadCSSPalettesDefault();
    await ISWebComponentsLoader.load("is-button", "is-button-group");
    // o: load("actions", "data-viz") | load("all")
  </script>

Uso clásico:
  <link rel="stylesheet" href=".../is-base.min.css">
  <script type="module" src=".../actions/button.min.js"></script>
  <!-- el .min.css lo trae el propio componente -->
  <script type="module" src=".../actions/category.actions.min.js"></script>
  <script type="module" src=".../all.min.js"></script>

Docs / skills:
  src/components/**/LLM.md, **/*.md           — docs LLM de componentes (fuente)
  dist/cdn/skills/<name>/SKILL.md             — skills para agentes (copiado en build)
  npx skills add Jeff-Aporta/is-webcomponents -s is-cdn-install
  npx skills add Jeff-Aporta/is-webcomponents -s is-webcomponents
