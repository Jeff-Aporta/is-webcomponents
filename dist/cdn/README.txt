CDN artifacts (folderizados por categoria)
  is-base.min.css                          — themes + brand palettes (link in the host app)
  palettes.min.css                         — paletas de marca
  <categoria>/<name>.min.js                — componente individual (carga su .min.css hermano en el shadow)
  <categoria>/<name>.min.css               — estilos del componente (junto al .min.js)
  <categoria>/category.<categoria>.min.js  — todos los componentes de esa categoria
  all.min.js                               — todos los componentes en un archivo
  sizes.json                               — {ruta: bytes} de todo el .min.js/.min.css publicado
  skills/is-webcomponents/                 — skill para agentes IDE (npx skills add …)
  assets/icons/                            — SVGs Iconify + <prefix>.json + index.json
  Los tags conservan el prefijo is-* (p.ej. actions/button.min.js → <is-button>).

Uso:
  <link rel="stylesheet" href=".../is-base.min.css">
  <script type="module" src=".../actions/button.min.js"></script>
  <!-- el .min.css lo trae el propio componente -->
  <script type="module" src=".../actions/category.actions.min.js"></script>
  <script type="module" src=".../all.min.js"></script>

Skill agentes IDE:
  npx skills add Jeff-Aporta/is-webcomponents -s is-webcomponents
  npx skills add https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/dist/cdn/skills/is-webcomponents
