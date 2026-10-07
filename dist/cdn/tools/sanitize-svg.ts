/**
 * Limpia size 100% del <svg> raíz (rompe PNG) y conserva fondo blanco.
 * El kit pone width/height 100% + canvas.background en style inline;
 * al exportar docs el fondo DEBE quedar en el markup (no solo CSS var).
 */
export function sanitizeSvgRoot(svgOuter: string): {
  svg: string;
  width: number | null;
  height: number | null;
} {
  const m = svgOuter.match(/<svg[^>]*>/);
  const rootTag = m ? m[0] : '';
  const vb = rootTag.match(/viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
  let width: number | null = null;
  let height: number | null = null;
  if (vb) {
    width = Math.round(Number(vb[3]));
    height = Math.round(Number(vb[4]));
  }
  let svg = svgOuter;
  if (rootTag) {
    const styleM = rootTag.match(/\sstyle="([^"]*)"/);
    const prev = styleM ? styleM[1] : '';
    // Conservar background del theme; default docs = blanco.
    const bgM = prev.match(/background\s*:\s*([^;]+)/i);
    let bg = (bgM ? bgM[1].trim() : '') || '#FFFFFF';
    // Normalizar blanco del theme (rgb/rgba) → #FFFFFF canónico docs.
    if (/^rgba?\(\s*255\s*,\s*255\s*,\s*255/i.test(bg) || /^#fff(fff)?$/i.test(bg) || /^white$/i.test(bg)) {
      bg = '#FFFFFF';
    }
    // Quitar width/height 100% (y el style viejo) — dejar solo fondo.
    const sinStyle = rootTag.replace(/\sstyle="[^"]*"/, '');
    const conBg = sinStyle.replace(
      /^<svg\b/,
      `<svg style="background:${bg}"`,
    );
    svg = svgOuter.replace(rootTag, conBg);
  }
  return { svg, width, height };
}

/** Documento mínimo para screenshot PNG de un SVG ya extraído. */
export function staticSvgWrapper(
  svgOuter: string,
  opts: { width?: number | null; height?: number | null; cssHrefs?: string[] } = {},
): string {
  const links = (opts.cssHrefs ?? [])
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join('\n    ');
  const w = opts.width;
  const h = opts.height;
  const size = w && h ? `width: ${w}px; height: ${h}px;` : 'width: auto; height: auto;';
  return `<!doctype html>
<html lang="es" class="theme-light" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light">
  ${links}
  <style>
    html, body { margin: 0; padding: 0; background: #FFFFFF; color-scheme: light; }
    body { display: inline-block; }
    svg { display: block; ${size} }
    *, *::before, *::after { animation: none !important; transition: none !important; }
  </style>
</head>
<body>
${svgOuter}
</body>
</html>`;
}
