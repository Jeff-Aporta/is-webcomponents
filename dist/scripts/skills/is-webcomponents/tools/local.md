# `/is-webcomponents:local`

Preferir copias **locales** del kit (JS + CSS) sobre CDN para una app
consumidora, con CDN solo como fallback.

## Cuándo usarlo

- El usuario pide "instala is-webcomponents localmente" / "sin depender de internet" / "vendorizar el kit".
- El usuario pide actualizar el SHA fijado y refrescar los archivos descargados.
- Hay que preparar una app para funcionar sin acceso a jsDelivr/Pages (offline, air-gapped, CI sin red).

## Regla absoluta

**Local primero, CDN después.** El boot de la app intenta la copia en
`vendor/` antes de intentar cualquier espejo remoto.

## Qué descargar

Desde `dist/cdn/` del repo del kit (SHA fijado o `main`), descargar:

- Los bundles JS realmente usados por la app: `all.min.js`, o
  `<cat>/category.<cat>.min.js`, o `<cat>/<tag>.min.js` — lo que ya use la app.
- El CSS hermano de cada uno de esos JS (mismo nombre, `.min.css`), si existe.
- Siempre `is-base.min.css` + `palettes.min.css`.
- **Para componentes individuales:** el CSS vive como hermano del `.min.js`
  bajo la misma estructura de carpetas que `dist/cdn/` (p. ej.
  `actions/button.min.js` + `actions/button.min.css`). El JS del componente
  carga ese CSS vía `adoptCss`/`siblingCssHref` resolviendo la ruta con
  `import.meta.url` — por eso hay que **preservar las rutas relativas**
  entre el `.js` y su `.css` al copiarlos a `vendor/`. No aplanar ni renombrar
  sin ajustar también la ruta que el JS espera resolver.

## Dónde guardarlos y cómo nombrarlos

Recomendado: mirrorear la estructura de `dist/cdn/` bajo
`vendor/is-webcomponents/<sha>/`, manteniendo subcarpetas por categoría:

```
vendor/is-webcomponents/<sha>/
  is-base.min.css
  palettes.min.css
  all.min.js
  all.min.css              (si existe)
  actions/
    button.min.js
    button.min.css
    category.actions.min.js
    category.actions.min.css
```

Esto conserva las rutas relativas que el JS espera para resolver su CSS
hermano, y hace trivial cambiar de SHA (una carpeta nueva, sin tocar nombres).

Alternativa flat (solo si la app no puede tener subcarpetas en su vendor,
p. ej. un solo directorio de assets estático): incluir el SHA en el nombre
para evitar colisiones de caché:

- `all.min.<sha>.js` / `all.min.<sha>.css`
- `category.<cat>.min.<sha>.js` (+ sus `.css`, incluyendo los que ese JS
  cargue vía `import.meta.url` — deben quedar en una ruta que el JS pueda
  seguir resolviendo; si se aplana, ajustar el bundling o servir con un
  mapeo de rutas equivalente al original)
- `component.min.<sha>.js` (+ `.css` hermano) para un tag suelto

Prefiere la opción de espejo de carpetas (`vendor/.../<sha>/...`) salvo que
el proyecto imponga un directorio de assets plano.

## Boot local-first con fallback

```html
<script type="module">
const LOCAL_BASE = "/vendor/is-webcomponents/{{SHA}}";
const MIRRORS = [
  LOCAL_BASE,
  "https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@{{SHA}}/dist/cdn",
  "https://jeff-aporta.github.io/is-webcomponents/dist/cdn",
];
async function boot(files) {
  for (const base of MIRRORS) {
    try {
      for (const href of files.css) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${base}/${href}`;
        document.head.append(link);
      }
      await Promise.all(files.js.map((f) => import(`${base}/${f}`)));
      return base;
    } catch (e) {
      console.warn("[is-wc] fuente falló", base, e);
    }
  }
  throw new Error("[is-wc] ninguna fuente respondió (local ni CDN)");
}
await boot({
  css: ["is-base.min.css", "palettes.min.css"],
  js: ["all.min.js"],
});
</script>
```

Orden de intento: **local (`vendor/`) → jsDelivr con pin → GitHub Pages.**

## Actualizar el SHA fijado

Cuando el usuario pida "actualiza a la última versión" / "trae el último SHA":

1. Resolver el SHA actual del tip de `main` (API de GitHub: `GET
   https://api.github.com/repos/Jeff-Aporta/is-webcomponents/commits/main`,
   header `Accept: application/vnd.github.sha`; o `git ls-remote`).
2. Descargar de nuevo los mismos JS + CSS que ya tenía la app, desde `dist/cdn/`
   pinneado a ese SHA nuevo.
3. Colocarlos en `vendor/is-webcomponents/<sha-nuevo>/` (o renombrar los
   archivos flat con el nuevo SHA si se usa esa convención).
4. Actualizar todas las rutas en el HTML/JS de arranque (`{{SHA}}` → SHA nuevo,
   o la carpeta `vendor/.../<sha>/` referenciada).
5. Borrar la carpeta/archivos del SHA anterior solo si nada más los referencia.
6. Confirmar visualmente que la app sigue renderizando igual (mismo tema/paleta).

## Checklist

- [ ] `vendor/` (o equivalente) contiene JS + CSS realmente usados por la app, nada de más.
- [ ] Rutas relativas JS↔CSS preservadas (el componente resuelve su CSS hermano vía `import.meta.url`).
- [ ] Boot intenta local primero, CDN pinneado después, Pages al final.
- [ ] SHA visible en la ruta/nombre de archivo (trazabilidad de versión).
- [ ] Documentado en el README de la app cómo se actualiza el SHA.

## Ver también

- [`../../is-cdn-install/SKILL.md`](../../is-cdn-install/SKILL.md) — mecánica de espejos y resolución de `<ref>` cuando se usa CDN puro (sin local).
- [`build.md`](build.md) — bootstrap general de una app nueva.
