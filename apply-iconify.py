"""
Migra la librería de iconos del demo de SVG-inline a Iconify via CDN.
- Borra el bloque <svg id="icon-templates">...</svg>
- Reemplaza <svg ...><use href="#i-X"/></svg> por <iconify-icon icon="mdi:X"></iconify-icon>
- Actualiza el theme toggle
- Actualiza el ICONS map del playground
- Inyecta el script CDN de Iconify en <head>
- Inyecta CSS para dimensionar iconify-icon dentro de wa-button
"""
import re
import io
import sys

PATH = r"C:\ContaPyme\Personal\apps\AppWebcomponents\index.html"

# Mapeo de id simbólico -> set Iconify
ICON_MAP = {
    "i-gear":     "mdi:cog-outline",
    "i-plus":     "mdi:plus",
    "i-check":    "mdi:check",
    "i-xmark":    "mdi:close",
    "i-arrow-r":  "mdi:arrow-right",
    "i-download": "mdi:download",
    "i-search":   "mdi:magnify",
    "i-trash":    "mdi:trash-can-outline",
    "i-edit":     "mdi:pencil-outline",
    "i-heart":    "mdi:heart-outline",
    "i-bell":     "mdi:bell-outline",
    "i-floppy":   "mdi:content-save-outline",
    "i-user":     "mdi:account",
    "i-link":     "mdi:link-variant",
    "i-sun":      "mdi:white-balance-sunny",
    "i-moon":     "mdi:weather-night",
}

with io.open(PATH, "r", encoding="utf-8") as f:
    html = f.read()

# 1) Borrar el bloque <svg width="0" height="0" ...><defs>...</defs></svg> completo
def drop_icon_templates(html):
    # El bloque abre con <svg width="0" height="0" y cierra en </svg>
    # Lo identifico por el comentario que lo precede
    pattern = re.compile(
        r"  <!-- ========== ICON LIBRARY.*?</svg>\n",
        re.DOTALL,
    )
    new_html, n = pattern.subn("", html, count=1)
    print(f"  [drop] bloque icon-templates: {n} reemplazo(s)")
    return new_html

# 2) Reemplazar <svg ...><use href="#i-X"/></svg> por <iconify-icon>
def replace_use_refs(html):
    total = 0
    # Patrón: cualquier <svg ... atributos ...><use href="#i-X"/></svg>
    pattern = re.compile(
        r'<svg[^>]*>\s*<use\s+href="#(i-[a-z\-]+)"\s*/>\s*</svg>',
        re.IGNORECASE,
    )
    def repl(m):
        nonlocal total
        sym = m.group(1)
        icon = ICON_MAP.get(sym)
        if not icon:
            print(f"  [WARN] símbolo sin mapeo: {sym}")
            return m.group(0)
        total += 1
        return f'<iconify-icon icon="{icon}"></iconify-icon>'
    new_html = pattern.sub(repl, html)
    print(f"  [use] reemplazos use-href: {total}")
    return new_html

# 3) Reemplazar el theme toggle SVG path por iconify-icon
def replace_theme_toggle(html):
    # El theme toggle es el único <svg id="themeIcon" ...> con un path de luna
    pattern = re.compile(
        r'<svg id="themeIcon"[^>]*>.*?</svg>',
        re.DOTALL,
    )
    def repl(m):
        return '<iconify-icon id="themeIcon" icon="mdi:weather-night"></iconify-icon>'
    new_html, n = pattern.subn(repl, html, count=1)
    print(f"  [theme] reemplazos themeIcon: {n}")
    return new_html

# 4) Inyectar el script CDN en <head> (antes de </head>)
def inject_iconify_cdn(html):
    script_tag = '\n  <!-- Iconify via CDN (unica libreria de iconos permitida) -->\n  <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>\n'
    if "iconify-icon.min.js" in html:
        print("  [cdn] script ya presente, skip")
        return html
    new_html = html.replace("</head>", script_tag + "</head>", 1)
    print("  [cdn] script Iconify inyectado en <head>")
    return new_html

# 5) Inyectar CSS base para iconify-icon en presentation.css
def inject_iconify_css():
    css_path = r"C:\ContaPyme\Personal\apps\AppWebcomponents\styles\presentation.css"
    with io.open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    if "iconify-icon" in css:
        print("  [css] reglas iconify ya presentes, skip")
        return
    rules = """
/* --- Iconify defaults (la unica libreria de iconos permitida) --- */
iconify-icon {
  display: inline-block;
  width: 1.1em;
  height: 1.1em;
  vertical-align: -0.15em;
  flex-shrink: 0;
}
/* icono dentro de un wa-button: heredar currentColor y escalar segun size */
wa-button iconify-icon {
  color: currentColor;
}
"""
    css = css + rules
    with io.open(css_path, "w", encoding="utf-8") as f:
        f.write(css)
    print("  [css] reglas iconify inyectadas en presentation.css")

# 6) Actualizar el ICONS map del playground
def update_playground_icons(html):
    # Buscar el bloque `const ICONS = { ... };` y regenerarlo
    pattern = re.compile(
        r"const ICONS = \{[\s\S]*?\n\s*\};",
        re.MULTILINE,
    )
    keys_order = [
        "i-floppy", "i-edit", "i-trash", "i-bell", "i-check",
        "i-gear", "i-search", "i-arrow-r", "i-download", "i-link"
    ]
    lines = ["const ICONS = {"]
    for k in keys_order:
        icon = ICON_MAP[k]
        lines.append(f"      '{k}':     '<iconify-icon icon=\"{icon}\"></iconify-icon>',")
    lines.append("    };")
    new_block = "\n    ".join(lines)
    new_html, n = pattern.subn(new_block, html, count=1)
    print(f"  [playground] ICONS map regenerado: {n} reemplazo(s)")
    return new_html

# 7) Actualizar la generación del snippet de código (que mostraba <svg><use>)
def update_playground_snippet(html):
    # El snippet usa <svg viewBox="..." fill="currentColor" width="1em" height="1em"><use href="#${st}"/></svg>
    # Lo reemplazo por <iconify-icon icon="mdi:..."></iconify-icon>
    pattern = re.compile(
        r"<svg viewBox=\"0 0 16 16\" fill=\"currentColor\" width=\"1em\" height=\"1em\"><use href=\"#\$\{(\w+)\}\"/></svg>",
    )
    icon_keys = ICON_MAP
    def repl(m):
        var = m.group(1)
        # Renderizar literal con el nombre del icono resuelto
        return f'<iconify-icon icon="mdi:{{{var}}}"></iconify-icon>'  # placeholder, see below
    # Mejor: regenerar el bloque completo
    # Buscar el bloque:
    block_pattern = re.compile(
        r"(const startLine = st \? `.*?`: '';[\s\S]*?const endLine   = en \? `.*?`: '';[\s\S]*?pgCode\.innerHTML =\s*)[\s\S]*?(;)",
        re.MULTILINE,
    )
    def build_block(m):
        head = m.group(1)
        tail = m.group(2)
        return (
            head + "\n"
            "      if (startLine || endLine) {\n"
            "        pgCode.innerHTML =\n"
            '          `<span class="tag">&lt;wa-button${attrStr}&gt;</span>${startLine}\\n  ${labelStr}${endLine}\\n<span class="tag">&lt;/wa-button&gt;</span>`;\n'
            "      } else {\n"
            "        pgCode.innerHTML =\n"
            '          `<span class="tag">&lt;wa-button${attrStr}&gt;</span>${labelStr}<span class="tag">&lt;/wa-button&gt;</span>`;\n'
            "      }" + tail
        )
    new_html = html
    # Reemplazar startLine y endLine literales
    new_html = new_html.replace(
        '`<svg viewBox="0 0 16 16" fill="currentColor" width="1em" height="1em"><use href="#${st}"/></svg>`',
        '`<iconify-icon icon="${ICON_NAME[st]}"></iconify-icon>`',
    )
    new_html = new_html.replace(
        '`<svg viewBox="0 0 16 16" fill="currentColor" width="1em" height="1em"><use href="#${en}"/></svg>`',
        '`<iconify-icon icon="${ICON_NAME[en]}"></iconify-icon>`',
    )
    # Inyectar ICON_NAME lookup map antes del ICONS map
    if "const ICON_NAME" not in new_html:
        insertion = (
            "    // Mapeo de keys de icono a nombre Iconify (usado para el snippet)\n"
            "    const ICON_NAME = {\n"
        )
        for k, v in ICON_MAP.items():
            insertion += f"      '{k}': '{v}',\n"
        insertion += "    };\n\n"
        new_html = new_html.replace("    const ICONS = {", insertion + "    const ICONS = {", 1)
        print("  [playground] ICON_NAME map inyectado")
    print("  [playground] startLine/endLine actualizados a <iconify-icon>")
    return new_html

# 8) Actualizar la sección "Con iconos" (los ejemplos usan href="#i-X")
#    Esto lo cubre ya el paso 2 (replace_use_refs) porque los ejemplos
#    tienen la forma <svg slot="start" ...><use href="#i-X"/></svg>.

# 9) Quitar la nota en HTML sobre la libreria de templates (ya no aplica)
def cleanup_notes(html):
    html = html.replace(
        "  <!-- ========== ICON LIBRARY (templates, hidden) ==========\n"
        "       Uso: <svg viewBox=\"0 0 16 16\"><use href=\"#i-gear\"/></svg>\n"
        "       Los <symbol> permiten reusar el mismo path muchas veces\n"
        "       sin duplicar el DOM, y aplican el viewBox del symbol. -->\n",
        ""
    )
    return html

# === ejecutar transformaciones ===
print("Transformando", PATH)
html = drop_icon_templates(html)
html = replace_use_refs(html)
html = replace_theme_toggle(html)
html = inject_iconify_cdn(html)
html = update_playground_icons(html)
html = update_playground_snippet(html)
html = cleanup_notes(html)
inject_iconify_css()

# Guardar
with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

# Stats
n_remaining = len(re.findall(r'<use href="#i-', html))
n_iconify = len(re.findall(r'<iconify-icon', html))
print(f"\nResultado:")
print(f"  <use href='#i-...'> restantes: {n_remaining}  (esperado 0)")
print(f"  <iconify-icon> total:        {n_iconify}")
print(f"  bytes: {len(html)}")
