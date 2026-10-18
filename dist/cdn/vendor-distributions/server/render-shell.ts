// @vendor 2026-10-17T00:00:00.000Z Jeff-Aporta/is-webcomponents@main src/vendor-distributions/server/render-shell.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/14-herramientas-de-test.md
/**
 * renderShell(meta, { s, resolverMeta }) — genera el HTML del SPA de una API (servido en `/`).
 *
 * La API no sirve archivos: monta el shell al vuelo con el loader del kit por CDN pineado, el
 * registrador y el arranque de la app, tema antes del primer pintado y metadatos SEO/OG.
 * Con `?s=<id>` y un `resolverMeta(s)` la API ajusta título/descripción/miniatura por ítem
 * (SEO y redes sociales). Escapa todo lo que provenga de datos.
 *
 * Perfil: server. Vendor: `dist/cdn/vendor-distributions/server/render-shell.ts` → carpeta `ISU/` del
 * consumidor (perfil `server`). Sin imports relativos (autocontenido; solo `node:*` y texto).
 * Skill: skills/iswc-foundation/references/14-herramientas-de-test.md
 */

export interface RenderShellMeta {
  /** Título de la pestaña y og:title. */
  titulo: string;
  /** Descripción (meta description + og:description). */
  descripcion?: string;
  /** Idioma (default "es"). */
  lang?: string;
  /** Tema inicial (default "dark"). */
  theme?: "dark" | "light";
  /** Paleta del kit (default "contapyme"). */
  palette?: string;
  /** Pin del kit: repo + SHA40 (sin @main). Si falta sha, se sirve el loader del propio origen. */
  kit?: { repo?: string; sha?: string };
  /** Prefijo de la app (ej. "erp"); da nombre al loader y al tag raíz. */
  prefijo: string;
  /** Ruta del script de tema pre-pintado (default "./dist/cdn/boot.js"). */
  boot?: string;
  /** Hoja de estilos de la app (default "./dist/cdn/styles/app.css"). */
  appCss?: string;
  /** Registrador de la app (default `./dist/cdn/<prefijo>Loader.min.js`). */
  loaderApp?: string;
  /** Módulo con KIT_TAGS y tagsArranque (default "./dist/cdn/js/kit-tags.js"). */
  kitTags?: string;
  /** URL canónica. */
  canonical?: string;
  /** Metadatos Open Graph / Twitter. */
  og?: { imagen?: string; tipo?: string; sitio?: string };
  /** Tag raíz del <body> (default `<prefijo>-app`). */
  tagRaiz?: string;
  /** Texto de <noscript> (default "JavaScript requerido."). */
  noscript?: string;
  /** HTML extra inyectado en <head> (peligroso: solo del propio servidor, ya escapado por el llamador). */
  headExtra?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function attr(s: string): string { return esc(s); }

/**
 * Genera el HTML. Si hay `s` y `resolverMeta`, fusiona sus overrides sobre `meta` antes de renderizar.
 */
export async function renderShell(
  meta: RenderShellMeta,
  opts?: { s?: string; resolverMeta?: (s: string) => Promise<Partial<RenderShellMeta> | undefined> },
): Promise<string> {
  let m = meta;
  if (opts?.s && opts.resolverMeta) {
    const extra = await opts.resolverMeta(opts.s);
    if (extra) m = { ...meta, ...extra, og: { ...meta.og, ...extra.og } };
  }

  const lang = m.lang ?? "es";
  const theme = m.theme ?? "dark";
  const palette = m.palette ?? "contapyme";
  const prefijo = m.prefijo;
  const titulo = m.titulo;
  const descripcion = m.descripcion ?? titulo;
  const tagRaiz = m.tagRaiz ?? `${prefijo}-app`;
  const boot = m.boot ?? "./dist/cdn/boot.js";
  const appCss = m.appCss ?? "./dist/cdn/styles/app.css";
  const loaderApp = m.loaderApp ?? `./dist/cdn/${prefijo}Loader.min.js`;
  const kitTags = m.kitTags ?? "./dist/cdn/js/kit-tags.js";
  const noscript = m.noscript ?? "JavaScript requerido.";

  // Loader del kit: por CDN pineado si hay sha; si no, del propio origen.
  const loaderTag = m.kit?.sha
    ? `https://cdn.jsdelivr.net/gh/${m.kit.repo ?? "Jeff-Aporta/is-webcomponents"}@${m.kit.sha}/dist/cdn/core/loader.min.js`
    : "./dist/cdn/core/loader.min.js";

  const ogLines: string[] = [];
  ogLines.push(`<meta property="og:title" content="${attr(titulo)}">`);
  ogLines.push(`<meta property="og:description" content="${attr(descripcion)}">`);
  ogLines.push(`<meta property="og:type" content="${attr(m.og?.tipo ?? "website")}">`);
  if (m.og?.sitio) ogLines.push(`<meta property="og:site_name" content="${attr(m.og.sitio)}">`);
  if (m.og?.imagen) ogLines.push(`<meta property="og:image" content="${attr(m.og.imagen)}">`);
  ogLines.push(`<meta name="twitter:card" content="${m.og?.imagen ? "summary_large_image" : "summary"}">`);
  if (m.og?.imagen) ogLines.push(`<meta name="twitter:image" content="${attr(m.og.imagen)}">`);
  ogLines.push(`<meta name="twitter:title" content="${attr(titulo)}">`);
  ogLines.push(`<meta name="twitter:description" content="${attr(descripcion)}">`);

  return `<!doctype html>
<html lang="${lang}" data-theme="${attr(theme)}" data-palette="${attr(palette)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="${theme === "dark" ? "dark light" : "light dark"}">
<title>${esc(titulo)}</title>
<meta name="description" content="${attr(descripcion)}">
${m.canonical ? `<link rel="canonical" href="${attr(m.canonical)}">` : ""}
${ogLines.join("\n")}
${m.headExtra ?? ""}

<!-- Tema antes del primer pintado (boot inyecta theme/palette). -->
<script src="${attr(boot)}"></script>
<link rel="stylesheet" href="${attr(appCss)}">

<!-- 1) Loader del kit (CDN pineado o propio origen). -->
<script type="module" src="${attr(loaderTag)}"></script>
<!-- 2) Registrador de la app. -->
<script type="module" src="${attr(loaderApp)}"></script>
<!-- 3) Arranque: estilos, tags y marca con watchdog. -->
<script type="module">
  const L = globalThis.iswcLoader;
  const listo = () => document.documentElement.setAttribute("data-app-ready", "");
  const watchdog = setTimeout(() => { console.warn("[${esc(prefijo)}] el arranque excedió 6 s; se revela la página"); listo(); }, 6000);
  try {
    if (!L) throw new Error("falta iswcLoader");
    await L.loadPageStyles(["iswc-palettes-default"]);
    const { KIT_TAGS, tagsArranque } = await import("${attr(kitTags)}");
    await L.load(...KIT_TAGS, ...tagsArranque());
  } catch (e) {
    console.warn("[${esc(prefijo)}] arranque", e);
  } finally {
    clearTimeout(watchdog);
    listo();
  }
</script>
</head>
<body>
  <noscript>${esc(noscript)}</noscript>
  <iswc-toast placement="bottom-end"></iswc-toast>
  <${tagRaiz}></${tagRaiz}>
</body>
</html>
`;
}
