# Diseño: documentación jerárquica para LLM de IS Web Components

**Fecha:** 2026-07-31  
**Proyecto:** `AppWebcomponents`  
**Snapshot base:** 104 módulos documentales, 112 custom element tags

## Objetivo

Crear documentación fácil de descubrir y segura para un LLM:

1. `src/components/LLM.md` define mapa global, reglas obligatorias, reutilización y errores conocidos.
2. Cada categoría física contiene `LLM.md` con selector, componentes, dependencias, qué hacer y qué evitar.
3. Cada pareja pública `<nombre>.js` + `<nombre>.css` referenciada por `manifest.js` tiene `<nombre>.md` junto a fuentes.
4. `helpers/popup.md` documenta building block interno adicional.
5. `scripts/docs-consistency.selfcheck.mjs` detecta inventario, frontmatter, secciones, links y navegación inconsistentes.

Prosa en español. Identificadores técnicos conservan forma exacta.

## Alcance base

Snapshot de `manifest.js` al 2026-07-31:

- 111 tags públicos.
- 103 rutas JS públicas únicas con pareja CSS.
- 1 módulo interno adicional: `helpers/popup.js` + `popup.css`, tag `is-popup`.
- **104 documentos de componente/módulo**, cubriendo **112 tags**.
- 10 categorías físicas: `actions`, `charts`, `data`, `diagrams`, `feedback`, `forms`, `helpers`, `layout`, `media`, `navigation`.
- 10 índices de categoría y 1 índice global.
- **115 archivos Markdown bajo `src/components/`** para snapshot base.

Checker deriva inventario desde `manifest.js`; si aparecen componentes nuevos, falla indicando docs faltantes. No depende solo de conteos duros.

## Módulos multi-tag

Un MD por pareja JS/CSS, no un MD duplicado por tag:

- `data/transfer.md`: `is-transfer`, `is-transfer-item`.
- `data/kanban.md`: `is-kanban`, `is-kanban-column`, `is-kanban-card`.
- `navigation/tab-group.md`: `is-tab-group`, `is-tab`, `is-tab-panel`.
- `navigation/carousel.md`: `is-carousel`, `is-carousel-item`.
- `navigation/tree.md`: `is-tree`, `is-tree-item`.
- `navigation/stepper.md`: `is-stepper`, `is-stepper-step`.

`charts/marks-cartesian.js` y `charts/marks-radial.js` no son custom elements. Se describen como dependencias internas, sin MD de componente.

## Fuentes de verdad

Cada documento requiere leer:

1. JS: registro, API, lifecycle, eventos, dependencias y comportamiento.
2. CSS: parts, estados, atributos visuales y custom properties.
3. Preview declarado por `manifest.js`, cuando exista.
4. `manifest.js`: tags, categoría lógica y preview.

Si preview y fuente difieren, manda JS/CSS actual. `is-cdn-snippet` e `is-popup` no tienen preview declarado; frontmatter omite `preview`.

## Documento de componente/módulo

```yaml
---
tag: is-example
tags:
  - is-example
category: example
status: public
source: ./example.js
style: ./example.css
preview: ../../previews/example/is-example.html
---
```

`tag` identifica tag principal. `tags` enumera todos los tags del módulo. `is-popup` usa `status: internal`. `preview` se omite cuando no existe.

Secciones obligatorias:

```markdown
# `<is-example>`
## Propósito
## Cuándo usarlo
## Cuándo no usarlo
## Importación
## Ejemplo mínimo
## API
### Atributos y propiedades
### Slots
### Eventos
### Métodos y propiedades públicas
### CSS parts
### Custom states
### CSS custom properties
### Integración con formularios
## Comportamiento
## Dependencias y componentes relacionados
## Accesibilidad
## Ejemplo avanzado
## Errores comunes
## Reglas para LLM
## Fuentes
```

Reglas:

- Secciones vacías dicen **“No expone”**.
- Atributos/propiedades incluyen tipo, default, reflexión y restricciones verificables.
- Eventos incluyen `detail`, `bubbles`, `composed` y `cancelable` cuando aplique.
- Ejemplos usan solo API existente.
- Documentos multi-tag separan contrato de cada tag dentro de `## API`.
- `## Errores comunes` explica fallos reales y prevención.
- `## Reglas para LLM` expresa órdenes concretas y prohibiciones.
- `## Fuentes` enlaza categoría, JS, CSS y preview existente.

## Índices de categoría

Cada `<categoria>/LLM.md` contiene:

```markdown
# `<categoria>` para LLM
## Propósito
## Qué componente elegir
## Componentes
## Composición y relaciones
## Reusar antes de crear
## Dependencias compartidas
## Patrones comunes
## Qué hacer
## Qué no hacer
## Errores conocidos y prevención
## Módulos internos
## Navegación
```

## Índice global

`src/components/LLM.md` contiene:

- ruta global → categoría → componente;
- mapa de 10 categorías;
- índice de módulos y 112 tags base;
- convenciones `is-*`, ES modules, Shadow DOM y `adoptCss`;
- eventos, theming, parts, states, tokens y formularios;
- mapa de shared modules para no rehacer funcionalidad;
- reglas obligatorias, qué hacer, qué no hacer y errores aprendidos;
- instrucción de consultar documento específico y no inventar API.

## Reglas globales obligatorias para LLM

### Qué hacer

- Buscar helper, shared module o componente existente antes de escribir código.
- Reusar `adoptCss`, form-associated helpers, motores de charts/diagramas, position/popup, grid y date/picker cores existentes.
- Leer callers/consumidores antes de cambiar helper compartido.
- Usar un MD por módulo JS/CSS y enumerar todos sus tags.
- Tomar rutas de preview exactas desde `manifest.js`.
- Escalar componentes mediante `em` y `font-size` contextual; no crear variantes de tamaño.
- Mantener accesibilidad, validación y manejo de errores de límites de confianza.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs` tras cambios en manifest, componentes o documentación.
- Preservar cambios concurrentes; usuario gestiona commits.

### Qué no hacer

- No inventar atributos, propiedades, eventos, slots, parts, states ni tokens.
- No asumir que cada archivo registra tag mediante literal `customElements.define`; existen factories/herencia.
- No asumir preview plano `previews/is-*.html`; rutas están agrupadas y algunos componentes no tienen preview.
- No crear MD duplicado por cada tag de módulo multi-tag.
- No presentar `marks-*`, specs, engines o shared helpers como custom elements.
- No duplicar lógica existente en `_shared` ni añadir dependencias para funciones ya resueltas.
- No crear variantes `small|medium|large`; usar escala contextual.
- No modificar fuente para hacerla coincidir con documentación; documentación describe fuente actual.
- No borrar archivos ni crear commits automáticamente.

## Errores aprendidos y prevención

1. **Conteo obsoleto por manifest cambiante.** Prevención: checker deriva inventario dinámicamente y reporta docs faltantes/extra.
2. **Confundir tags con módulos.** Prevención: agrupar manifest por `script`; frontmatter contiene `tag` principal y lista `tags`.
3. **Asumir rutas de preview planas.** Prevención: validar `preview` contra `manifest.js.page`; omitirlo si no existe.
4. **Asumir cantidad fija de `../` en `script`/`style`.** Prevención: localizar segmento `src/components/` y derivar ruta física desde ahí.
5. **Confundir categoría lógica y carpeta física.** Prevención: documentación vive junto a JS/CSS; índices globales pueden explicar categoría lógica.
6. **Detectar elementos solo por regex literal.** Prevención: usar manifest y revisar factories/bases compartidas.
7. **Documentar internos como API pública.** Prevención: `status: internal` y separación explícita en índices.
8. **Copiar preview obsoleto.** Prevención: JS/CSS prevalecen y checker valida rutas, no afirmaciones copiadas.
9. **Validar `TODO` sin distinguir mayúsculas marcó la palabra española “todo”.** Prevención: `TODO|TBD` se busca case-sensitive; frases naturales se validan aparte.
10. **Crear tooling nuevo innecesario.** Prevención: usar patrón existente `*.selfcheck.mjs` y Node stdlib; no añadir TypeScript ni test runner.
11. **Extractor confundió `if`/`for` con métodos públicos.** Prevención: excluir keywords y hacer fallar checker si aparecen como métodos.
12. **Extractor aceptó separadores o rangos incompletos como tokens CSS.** Prevención: validar nombre completo de custom property y rechazar guion final.
13. **`hasAttribute` se interpretó como prueba de atributo booleano.** Prevención: clasificar boolean solo con setter `toggleAttribute` o contrato explícito.

## Checker de consistencia

Crear `scripts/docs-consistency.selfcheck.mjs` usando `node:assert` y APIs Node nativas. Añadir `node scripts/docs-consistency.selfcheck.mjs`.

Debe validar:

- scripts únicos de `manifest.js` + `helpers/popup.js` tienen MD;
- JS, CSS y previews declarados existen;
- frontmatter cubre todos los tags y status correcto;
- secciones obligatorias;
- índices por categoría y global;
- links relativos;
- placeholders prohibidos;
- docs extra no respaldados por manifest/popup;
- índice global y categoría mencionan tags/documentos esperados.

No crear `tests/`: no está ignorada y repo ya usa `*.selfcheck.mjs`. No añadir dependencias.

## Verificación

- `node scripts/docs-consistency.selfcheck.mjs` termina con `docs consistency self-check: PASS`.
- Snapshot base: 104 documentos de componente, 10 índices y 1 global.
- Checker falla de forma legible si manifest cambia.
- Estado git confirma que fuentes concurrentes quedaron intactas.

## Restricciones

- No modificar JS, CSS, previews, `manifest.js`, build ni estilos, salvo crear checker y añadir script npm autorizado.
- No alterar cambios preexistentes o concurrentes.
- No crear commits.
- No borrar archivos.
- No crear archivos temporales.
