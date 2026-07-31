CDN flat artifacts
  is-base.min.css          — themes + brand palettes (link in the host app)
  <name>.min.js            — single component (bundles adopt-css; loads sibling .min.css into shadow)
  <name>.min.css           — component styles (must sit next to the .min.js)
  <category>.min.js        — every component of a category in one file (actions, media, forms, ...)
  all.min.js               — every component in a single file
  Custom element tags keep the is-* prefix (e.g. button.min.js → <is-button>).

Usage:
  <link rel="stylesheet" href=".../is-base.min.css">
  <script type="module" src=".../button.min.js"></script>
  <!-- button.min.css is fetched automatically by the component -->
  <!-- or grab several at once: -->
  <script type="module" src=".../actions.min.js"></script>
  <script type="module" src=".../all.min.js"></script>
