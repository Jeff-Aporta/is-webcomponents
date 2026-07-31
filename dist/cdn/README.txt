CDN flat artifacts
  is-base.min.css          — themes + brand palettes (link in the host app)
  <name>.min.js            — component (bundles adopt-css; loads sibling .min.css into shadow)
  <name>.min.css           — component styles (must sit next to the .min.js)
  Custom element tags keep the is-* prefix (e.g. button.min.js → <is-button>).

Usage:
  <link rel="stylesheet" href=".../is-base.min.css">
  <script type="module" src=".../button.min.js"></script>
  <!-- button.min.css is fetched automatically by the component -->
