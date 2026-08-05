# Component LLM Documentation Bootstrap Recipe

One-shot, source-derived bootstrap used by implementation plan. Code refuses overwriting existing Markdown. It is kept as reviewable process evidence, not installed as generator. `scripts/docs-consistency.selfcheck.mjs` remains authoritative guardrail.

```python
from pathlib import Path
from collections import OrderedDict, defaultdict
import html
import re

ROOT = Path(r'C:/ContaPyme/Personal/apps/AppWebcomponents')
COMP = ROOT / 'components'
MANIFEST = (ROOT / 'manifest.js').read_text(encoding='utf-8')


def field(block, name):
    match = re.search(rf"\b{name}:\s*'([^']*)'", block)
    return match.group(1) if match else ''


def component_rel(reference):
    normalized = reference.replace('\\', '/')
    if 'src/components/' not in normalized:
        raise RuntimeError(f'Ruta sin src/components/: {reference}')
    return normalized.split('src/components/', 1)[1]


def unique(values):
    seen = set()
    return [v for v in values if v and not (v in seen or seen.add(v))]


modules = OrderedDict()
for block in re.findall(r'\{([^{}]+)\}', MANIFEST):
    script_ref, tag = field(block, 'script'), field(block, 'tag')
    if not script_ref or not tag:
        continue
    script = component_rel(script_ref)
    item = modules.setdefault(script, {
        'script': script,
        'style': component_rel(field(block, 'style')),
        'page': field(block, 'page'),
        'tags': [],
        'titles': [],
        'internal': False,
    })
    item['tags'].append(tag)
    item['titles'].append(field(block, 'title') or tag)
    if field(block, 'page'):
        item['page'] = field(block, 'page')

modules['helpers/popup.js'] = {
    'script': 'helpers/popup.js', 'style': 'helpers/popup.css', 'page': '',
    'tags': ['is-popup'], 'titles': ['Popup'], 'internal': True,
}

categories = defaultdict(list)
for item in modules.values():
    item['category'] = item['script'].split('/', 1)[0]
    item['doc'] = item['script'][:-3] + '.md'
    categories[item['category']].append(item)

assert (len(modules), sum(len(i['tags']) for i in modules.values()), len(categories)) == (104, 112, 10)
for item in modules.values():
    target = COMP / item['doc']
    if target.exists() and ('## Reglas para LLM' not in target.read_text(encoding='utf-8') or f"source: ./{Path(item['script']).name}" not in target.read_text(encoding='utf-8')):
        raise RuntimeError(f"No se sobrescribe MD ajeno: {item['doc']}")
for category in categories:
    target = COMP / category / 'LLM.md'
    if target.exists() and '## Errores conocidos y prevención' not in target.read_text(encoding='utf-8'):
        raise RuntimeError(f'No se sobrescribe índice ajeno: {category}/LLM.md')
global_target = COMP / 'LLM.md'
if global_target.exists() and '## Errores aprendidos y prevención' not in global_target.read_text(encoding='utf-8'):
    raise RuntimeError('No se sobrescribe src/components/LLM.md ajeno')


def clean_html(value):
    value = re.sub(r'<br\s*/?>', '\n', value, flags=re.I)
    value = re.sub(r'</(?:p|div|li|tr|h\d)>', '\n', value, flags=re.I)
    value = re.sub(r'<[^>]+>', '', value)
    value = html.unescape(value)
    return '\n'.join(re.sub(r'\s+', ' ', x).strip() for x in value.splitlines() if x.strip())


def jsdoc(source):
    match = re.search(r'/\*\*([\s\S]*?)\*/', source)
    if not match:
        return ''
    lines = [re.sub(r'^\s*\*\s?', '', x).rstrip() for x in match.group(1).splitlines()]
    return '\n'.join(x for x in lines if x).strip()


def observed(source):
    attrs = []
    patterns = [
        r'(?:const|let)\s+[A-Z0-9_]*OBSERVED\s*=\s*\[([\s\S]*?)\]\s*;',
        r'observedAttributes\s*\(\)\s*\{[\s\S]*?return\s*\[([\s\S]*?)\]',
    ]
    for pattern in patterns:
        for block in re.findall(pattern, source):
            attrs.extend(re.findall(r"['\"]([a-zA-Z][a-zA-Z0-9-]*)['\"]", block))
    return unique(x for x in attrs if not x.startswith(('aria-', 'data-')))


def properties(source):
    gets = unique(re.findall(r'^\s{2,8}get\s+([A-Za-z_$][\w$]*)\s*\(', source, flags=re.M))
    sets = set(re.findall(r'^\s{2,8}set\s+([A-Za-z_$][\w$]*)\s*\(', source, flags=re.M))
    return [(x, 'lectura/escritura' if x in sets else 'solo lectura') for x in gets if x != 'observedAttributes']


def methods(source):
    excluded = {
        'constructor', 'connectedCallback', 'disconnectedCallback', 'attributeChangedCallback',
        'formResetCallback', 'formDisabledCallback', 'formStateRestoreCallback',
        'if', 'for', 'while', 'switch', 'catch', 'with',
    }
    names = re.findall(r'^\s{2,8}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^\n{]*\)\s*\{', source, flags=re.M)
    return unique(x for x in names if x not in excluded and not x.startswith('_'))


def slots_parts(source):
    slots = []
    for attrs in re.findall(r'<slot\b([^>]*)>', source, flags=re.I):
        match = re.search(r'\bname=["\']([^"\']+)', attrs)
        slots.append(match.group(1) if match else 'default')
    parts = []
    for value in re.findall(r'\bpart=["\']([^"\']+)', source):
        parts.extend(value.split())
    return unique(slots), unique(parts)


def events(source):
    result = OrderedDict()
    patterns = [
        ('custom', r'new\s+CustomEvent\(\s*["\']([^"\']+)'),
        ('native', r'new\s+Event\(\s*["\']([^"\']+)'),
        ('emit', r'(?:#emit|this\.emit|emit)\(\s*["\']([^"\']+)'),
    ]
    emit_bubbles = bool(re.search(r'(?:#emit|emit)\s*\([^)]*\)[\s\S]{0,500}?bubbles\s*:\s*true', source))
    emit_composed = bool(re.search(r'(?:#emit|emit)\s*\([^)]*\)[\s\S]{0,500}?composed\s*:\s*true', source))
    for kind, pattern in patterns:
        for match in re.finditer(pattern, source):
            name, near = match.group(1), source[match.start():match.start() + 500]
            result.setdefault(name, (
                'sí' if 'detail' in near or kind == 'emit' else 'no',
                'sí' if 'bubbles: true' in near or (kind == 'emit' and emit_bubbles) else 'no/según fuente',
                'sí' if 'composed: true' in near or (kind == 'emit' and emit_composed) else 'no/según fuente',
                'sí' if 'cancelable: true' in near else 'no',
            ))
    for name in re.findall(r'^\s*\*?\s+(is-[a-z0-9-]+)\s+(?:—|detail:)', source, flags=re.M | re.I):
        result.setdefault(name, ('según cabecera', 'según cabecera', 'según cabecera', 'según cabecera'))
    return result


def metadata(source, css):
    variables = unique(re.findall(r'--[A-Za-z_][A-Za-z0-9_-]*', source + '\n' + css))
    variables = [name for name in variables if not name.endswith('-')]
    states = re.findall(r':state\(([^)]+)\)', css)
    states += re.findall(r"setCustomState\([^,]+,\s*['\"]([^'\"]+)", source)
    states += re.findall(r"#setState\(\s*['\"]([^'\"]+)", source)
    states = unique(name for name in states if re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]*', name))
    imports = unique(re.findall(r'import\s+(?:[^;]*?\s+from\s+)?["\']([^"\']+)["\']\s*;?', source))
    aria = unique(re.findall(r'aria-[a-zA-Z0-9-]+', source))
    return variables, states, imports, aria


def preview(item):
    if not item['page']:
        return '', []
    source = (ROOT / 'previews' / item['page']).read_text(encoding='utf-8')
    match = re.search(r'<p\b[^>]*class=["\'][^"\']*\blede\b[^"\']*["\'][^>]*>([\s\S]*?)</p>', source, flags=re.I)
    lede = clean_html(match.group(1)) if match else ''
    examples = []
    for block in re.findall(r'<pre\b[^>]*>([\s\S]*?)</pre>', source, flags=re.I):
        text = clean_html(block)
        if 5 < len(text) <= 2400 and any(f'<{tag}' in text for tag in item['tags']):
            examples.append(text)
    return lede, unique(examples)


def table(headers, rows):
    if not rows:
        return 'No expone.'
    output = ['| ' + ' | '.join(headers) + ' |', '| ' + ' | '.join('---' for _ in headers) + ' |']
    output += ['| ' + ' | '.join(str(v).replace('|', '\\|') for v in row) + ' |' for row in rows]
    return '\n'.join(output)


def code(value, language='html'):
    return f'```{language}\n{value.replace("```", "`` `")}\n```'


USE = {
    'actions': 'Acciones, selección de comandos y menús interactivos.',
    'charts': 'Series, distribuciones, relaciones o jerarquías de datos.',
    'data': 'Presentación, comparación, movimiento u organización de datos estructurados.',
    'diagrams': 'Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.',
    'feedback': 'Estado, progreso, confirmación, carga o resultado de operaciones.',
    'forms': 'Captura, selección y validación de valores compatibles con formularios.',
    'helpers': 'Formato, observación y posicionamiento reutilizable sobre APIs nativas.',
    'layout': 'Estructura, superficies, overlays y navegación por regiones de contenido.',
    'media': 'Iconos, identidad visual y reproducción de video.',
    'navigation': 'Orientación, movimiento entre vistas y navegación jerárquica o secuencial.',
}
AVOID = {
    'actions': 'No usar como decoración ni reemplazar enlaces semánticos para navegación simple.',
    'charts': 'No crear otro engine si marks/engine existentes cubren caso.',
    'data': 'No reemplazar HTML semántico cuando contenido es estático y simple.',
    'diagrams': 'No inventar schemas ni usar specs/layout como custom elements.',
    'feedback': 'No saturar interfaz con señales redundantes o alertas sin acción.',
    'forms': 'No duplicar validación, form association ni pickers shared.',
    'helpers': 'No crear wrapper nuevo si Intl/Observer/position existente cubre caso.',
    'layout': 'No crear size variants; escalar mediante font-size contextual y em.',
    'media': 'No crear loader/reproductor paralelo antes de revisar existentes.',
    'navigation': 'No separar children multi-tag ni romper teclado/ARIA.',
}
REUSE = {
    'actions': ['../media/icon.js', '../helpers/popup.js'],
    'charts': ['../_shared/svg-chart-engine.js', '../_shared/chart-palette.js', './marks-cartesian.js', './marks-radial.js'],
    'data': ['../_shared/grid-data.js', '../_shared/grid-types.js', '../_shared/grid-ui.js'],
    'diagrams': ['../_shared/diagram-edit.js', '../_shared/node-link-layout.js', '../_shared/tree-layout.js', './diagram-kinds.js'],
    'feedback': ['../helpers/popup.js', '../_shared/prefs.js'],
    'forms': ['../_shared/form-associated.js', '../_shared/date-field-core.js', '../_shared/date-utils.js', '../_shared/picker-element.js'],
    'helpers': ['../_shared/position.js', '../_shared/prefs.js'],
    'layout': ['../_shared/prefs.js'],
    'media': ['../_shared/iconify-loader.js'],
    'navigation': ['../_shared/prefs.js'],
}
ERRORS = {
    'actions': 'Confundir acción, navegación y selección; revisar semántica button/link/menu.',
    'charts': 'Duplicar engine o asumir config idéntica; revisar wrapper y marks.',
    'data': 'Confundir módulo multi-tag con archivos independientes; children viven en transfer/kanban.',
    'diagrams': 'Inventar payloads o registrar specs como elementos; usar schema/kind registry.',
    'feedback': 'Duplicar overlays/position o emitir señales redundantes; reutilizar popup/toast.',
    'forms': 'Romper form association manejando value solo visualmente; usar helpers/callbacks.',
    'helpers': 'Crear wrappers nuevos sobre Intl/Observer/position; elegir helper existente.',
    'layout': 'Añadir tamaños rígidos u overlays custom; usar em/context y dialog/drawer.',
    'media': 'Crear loader paralelo o perder fallback/accesibilidad; reutilizar icon/video.',
    'navigation': 'Separar tags children o romper teclado/ARIA; mantener parent-child.',
}

for item in modules.values():
    js = (COMP / item['script']).read_text(encoding='utf-8')
    css = (COMP / item['style']).read_text(encoding='utf-8')
    comment = jsdoc(js)
    lede, examples = preview(item)
    attrs, props, funcs = observed(js), properties(js), methods(js)
    slots, parts = slots_parts(js)
    emitted = events(js)
    variables, states, deps, aria = metadata(js, css)
    primary, category = item['tags'][0], item['category']
    tags_inline = ', '.join(f'`<{tag}>`' for tag in item['tags'])
    title = ' / '.join(f'`<{tag}>`' for tag in item['tags'])
    minimal = examples[0] if examples else f'<{primary}></{primary}>'
    advanced = examples[1] if len(examples) > 1 else minimal
    form = bool(re.search(r'formAssociated\s*=\s*true|attachInternals|formResetCallback|formDisabledCallback', js))

    front = ['---', f'tag: {primary}', 'tags:', *[f'  - {tag}' for tag in item['tags']], f'category: {category}', f"status: {'internal' if item['internal'] else 'public'}", f"source: ./{Path(item['script']).name}", f"style: ./{Path(item['style']).name}"]
    if item['page']:
        front.append(f"preview: ../../previews/{item['page']}")
    front += ['---', '']

    attr_rows = []
    for name in attrs:
        boolean = bool(
            re.search(rf"toggleAttribute\(\s*['\"]{re.escape(name)}['\"]", js)
            or re.search(rf'^\s*{re.escape(name)}\s+boolean\b', comment, flags=re.M | re.I)
        )
        attr_rows.append((f'`{name}`', 'boolean' if boolean else 'string/según contrato', 'Fuente define default/restricción.'))
    event_rows = [(f'`{name}`', *contract) for name, contract in emitted.items()]
    dep_lines = [f'- [`{dep}`]({dep})' if dep.startswith('.') else f'- `{dep}`' for dep in deps] or ['No importa dependencias JavaScript externas.']
    source_lines = [f'- [JavaScript](./{Path(item["script"]).name})', f'- [CSS](./{Path(item["style"]).name})', '- [Índice de categoría](./LLM.md)']
    if item['page']:
        source_lines.append(f'- [Preview](../../previews/{item["page"]})')
    behavior = '\n'.join(f'> {line}' for line in comment.splitlines()) or '> Contrato derivado de fuente y preview actuales.'

    doc = '\n'.join(front) + f'''# {title}

## Propósito

{lede or (comment.splitlines()[0] if comment else f'Componente {primary}.')}

Este módulo registra {tags_inline}.

## Cuándo usarlo

{USE[category]}

## Cuándo no usarlo

{AVOID[category]}

## Importación

{code(f"import './{Path(item['script']).name}';", 'js')}

## Ejemplo mínimo

{code(minimal)}

## API

### Atributos y propiedades

#### Atributos observados

{table(['Atributo', 'Tipo', 'Notas'], attr_rows)}

#### Propiedades públicas

{table(['Propiedad', 'Acceso', 'Notas'], [(f'`{name}`', access, 'Declarada por clase.') for name, access in props])}

### Slots

{table(['Slot', 'Uso'], [(f'`{name}`', 'Contenido proyectado.') for name in slots])}

### Eventos

{table(['Evento', 'detail', 'bubbles', 'composed', 'cancelable'], event_rows)}

### Métodos y propiedades públicas

{table(['Método', 'Uso'], [(f'`{name}()`', 'Método público declarado.') for name in funcs])}

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

{table(['Part', 'Uso'], [(f'`{name}`', f'Personalizable con `::part({name})`.') for name in parts])}

### Custom states

{table(['Estado', 'Uso'], [(f'`:state({name})`', 'Estado usado por implementación/CSS.') for name in states])}

### CSS custom properties

{table(['Token', 'Uso'], [(f'`{name}`', 'Token leído o definido por componente.') for name in variables])}

### Integración con formularios

{'Participa mediante ElementInternals/helpers form-associated; respetar name, value, disabled, reset, restore y validación.' if form else 'No declara integración form-associated propia en este módulo.'}

## Comportamiento

Documentación de cabecera preservada desde fuente:

{behavior}

## Dependencias y componentes relacionados

{chr(10).join(dep_lines)}

Tags del módulo: {tags_inline}.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: {', '.join(f'`{name}`' for name in aria) if aria else 'ninguno explícito en fuente'}.

## Ejemplo avanzado

{code(advanced)}

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

{chr(10).join(source_lines)}
'''
    (COMP / item['doc']).write_text(doc, encoding='utf-8', newline='\n')

for category, items in categories.items():
    rows = [f"| {', '.join(f'`<{tag}>`' for tag in item['tags'])} | [{Path(item['doc']).name}]({Path(item['doc']).name}) | {item['titles'][0]} |" for item in items]
    imports_all = []
    for item in items:
        source = (COMP / item['script']).read_text(encoding='utf-8')
        imports_all += re.findall(r'import(?:[\s\S]*?from\s*)?["\']([^"\']+)["\'];?', source)
    shared = unique(REUSE.get(category, []) + [x for x in imports_all if '_shared' in x or x.startswith('../')])
    internals = [item for item in items if item['internal']]
    index = f'''# `{category}` para LLM

## Propósito

{USE[category]}

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
{chr(10).join(rows)}

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

{chr(10).join(f'- `{dep}`' for dep in shared) if shared else 'Revisar imports de componente elegido.'}

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y módulos existentes.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.

## Qué hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Leer callers antes de tocar helper compartido.
- Preservar accesibilidad, validación y fallbacks.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs`.

## Qué no hacer

- No inventar API ni copiar contrato de componente parecido.
- No crear abstracción si shared/native resuelve caso.
- No crear size variants; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.

## Errores conocidos y prevención

{ERRORS[category]}

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

{chr(10).join(f'- `{item["tags"][0]}` — [{Path(item["doc"]).name}]({Path(item["doc"]).name})' for item in internals) if internals else 'No expone módulos internos documentales en esta categoría.'}

## Navegación

- [Índice global](../LLM.md)
'''
    (COMP / category / 'LLM.md').write_text(index, encoding='utf-8', newline='\n')

category_rows = [f'| `{category}` | [{category}/LLM.md]({category}/LLM.md) | {USE[category]} |' for category in sorted(categories)]
inventory_rows = []
for category in sorted(categories):
    for item in categories[category]:
        inventory_rows.append(f"| `{item['doc']}` | {', '.join(f'`<{tag}>`' for tag in item['tags'])} | [{category}/LLM.md]({category}/LLM.md) |")

global_doc = f'''# IS Web Components para LLM

## Ruta de lectura

1. Elegir categoría. 2. Abrir `LLM.md` de categoría. 3. Abrir MD del módulo. 4. Confirmar API en JS/CSS. 5. Ejecutar checker.

## Categorías

| Carpeta | Índice | Propósito |
| --- | --- | --- |
{chr(10).join(category_rows)}

## Inventario de módulos y tags

Un documento corresponde a pareja JS/CSS; módulos multi-tag aparecen una vez.

| Documento | Tags | Categoría |
| --- | --- | --- |
{chr(10).join(inventory_rows)}

## Convenciones globales

- Tags públicos usan `is-*`; módulos ES registran al importarse, a veces mediante factories/herencia.
- Shadow DOM usa [`_shared/adopt-css.js`](_shared/adopt-css.js).
- Eventos conservan detail/bubbles/composed/cancelable.
- Forms reutilizan [`_shared/form-associated.js`](_shared/form-associated.js).
- Escala usa font-size contextual y em; no size variants.

## Reusar antes de crear

- CSS: [`_shared/adopt-css.js`](_shared/adopt-css.js), [`_shared/scrollbars.css`](_shared/scrollbars.css).
- Forms/fecha: [`_shared/form-associated.js`](_shared/form-associated.js), [`_shared/date-field-core.js`](_shared/date-field-core.js), [`_shared/date-utils.js`](_shared/date-utils.js), [`_shared/picker-element.js`](_shared/picker-element.js).
- Overlays: [`_shared/position.js`](_shared/position.js), [`helpers/popup.md`](helpers/popup.md).
- Charts: [`_shared/svg-chart-engine.js`](_shared/svg-chart-engine.js), [`_shared/chart-palette.js`](_shared/chart-palette.js), marks.
- Diagramas: specs/layout/turtle/edit/kind registry existentes.
- Grid: [`_shared/grid-data.js`](_shared/grid-data.js), [`_shared/grid-types.js`](_shared/grid-types.js), [`_shared/grid-ui.js`](_shared/grid-ui.js).
- Iconos: [`_shared/iconify-loader.js`](_shared/iconify-loader.js). Preferencias: [`_shared/prefs.js`](_shared/prefs.js).

## Qué hacer

- Buscar componente/helper/shared antes de escribir.
- Leer consumidores; corregir raíz común.
- Un MD por módulo JS/CSS; listar todos tags.
- Localizar segmento `src/components/`; no asumir cantidad de `../`.
- Tomar preview desde `manifest.js.page`; omitir si no existe.
- Fuente gana ante divergencia; preservar accesibilidad/validación.
- Preservar cambios concurrentes; usuario gestiona commits.

## Qué no hacer

- No inventar API ni detectar elementos solo por literal customElements.define.
- No crear MD por child multi-tag ni presentar marks/specs/shared como elementos.
- No duplicar stdlib/platform/shared ni añadir tooling innecesario.
- No crear size variants, borrar archivos o crear commits automáticos.

## Errores aprendidos y prevención

1. Manifest cambiante dejó conteos viejos: checker deriva por script.
2. Tags se confundieron con módulos: tag principal + lista tags.
3. Preview se asumió plano: usar manifest page.
4. Prefijo `../` cambió: localizar `src/components/`.
5. Categoría lógica difiere de carpeta: MD vive junto a fuente.
6. Regex literal omitió factories: manifest da inventario, fuente contrato.
7. Internos se confundieron con API: status internal.
8. Preview puede quedar viejo: fuente gana.
9. Búsqueda case-insensitive de marcador pendiente chocó con palabra española “todo”: validar marcador solo uppercase.
10. Tooling podía reinventarse: Node stdlib + selfcheck existente.
11. Extractor confundió `if/for` con métodos: excluir keywords y validar tablas.
12. Extractor aceptó separadores/rangos como tokens CSS: exigir identificador completo y no terminar en guion.
13. `hasAttribute` no prueba tipo booleano: marcar boolean solo con setter toggle o contrato explícito.

## Reglas obligatorias para LLM

- Consultar MD específico; API ausente no se inventa.
- Si checker falla, corregir inconsistencia, no bajar aserción.
- Objetos/payloads usan propiedad documentada.
- Mantener links/frontmatter sincronizados con manifest.

## Verificación

    node scripts/docs-consistency.selfcheck.mjs

Salida base: `docs consistency self-check: PASS (104 modules, 112 tags, 10 categories)`.
'''
(COMP / 'LLM.md').write_text(global_doc, encoding='utf-8', newline='\n')
print(f'CREATED {len(modules)} component docs + {len(categories)} category indexes + 1 global index')
```
