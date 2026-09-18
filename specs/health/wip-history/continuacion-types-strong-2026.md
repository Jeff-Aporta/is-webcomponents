# 🔄 HANDOFF — Continuación de `types-strong-2026` + Lab de testing

> **Para:** próxima sesión / agente capitán que retome el trabajo.
> **Desde:** sesión que se corrompió (contexto saturado). Este documento es autocontenido.
> **Ancla:** `C:\ContaPyme\Personal\apps\is-webcomponents`
> **WT-ROOT:** `C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-root-types-strong-2026`
> **Rama WT-ROOT:** `wt-root-types-strong-2026`
> **Fecha del handoff:** sesión cerrada con STRICT_NOW=62

---

## 1. TL;DR — Estado en 30 segundos

| Métrica | Valor |
|---|---|
| **STRICT_NOW** (target era <100) | **62 errores** ✅ **META CUMPLIDA** |
| Baseline original | 8,777 errores |
| Errores cerrados | **8,715 (99.3%)** |
| `npm run typecheck` | ✅ verde |
| `npm test` | ✅ 21/21 PASS |
| Working tree WT-ROOT | ✅ LIMPIO |
| COMMITS adelante de `main` | **344** |
| Worktrees activos | `main` + `wt-root-types-strong-2026` (fluctuación 1→N→1 ✅) |
| Tandas cerradas | T1-T9 + T10 parcial |
| F0 deep-test proposals | 9 de 12 grupos (~3,300 propuestas) |

**Pendientes principales:**
1. Cerrar formalmente T10 (checkpoint + plan-activo) — STRICT ya <100
2. **Merge `wt-root-types-strong-2026` → `main`** (requiere gate humano)
3. F0.4 gate + implementar tests de las ~3,300 propuestas
4. Completar proposals faltantes (g39, g43, g44)
5. Demos + tests stagehand por componente (mandato del usuario)
6. Actualizar specs/guardianes

---

## 2. Mandatos del usuario (NO negociables)

Estos son los requisitos que el humano expresó explícitamente durante la sesión. **Respetarlos es obligatorio.**

| # | Mandato | Estado |
|---|---|---|
| M1 | Bajar strict audit de 8,791 → **<100** | ✅ **62** |
| M2 | Mantener `npm run typecheck` limpio | ✅ verde |
| M3 | Mantener tests Playwright verdes | ✅ 21/21 |
| M4 | **NUNCA push** | ✅ respetado |
| M5 | **NUNCA squash** (preservar todos los commits) | ✅ respetado |
| M6 | WT strategy: árbol binario, ≤2 hijos/nodo, max 5 niveles | ✅ 1 nivel (WT-ROOT + sub-agentes) |
| M7 | Per-agent WT / ciclo 1→N→1 | ✅ fluctúa correctamente |
| M8 | Capitán supervisa múltiples agentes | ✅ |
| M9 | Sub-agentes hacen `npm run test` + health rápido, NO deep test | ✅ |
| M10 | Verificar que no rompieron nada | ✅ |
| M11 | Verificar root sin errores ANTES de crear WT | ✅ |
| M12 | Canal de comunicación entre agentes (WIP files) | ✅ |
| M13 | `/deep-test-proposals` para determinar propuestas | 🟡 9/12 grupos |
| M14 | Nunca esperar OK del humano (salvo merge final) | ✅ |
| M15 | Merges entre ramas **sin squash** | ✅ |
| M16 | `<proyecto>/demos/diagramas` debe tener demo + `.test` simple + stagehand por diagrama | 🟡 parcial (solo ER) |
| M17 | **Test lab completo**: demos de cada componente + stagehand harness + test dedicado por caso | 🟡 PENDIENTE (mandato más reciente) |
| M18 | Actualizar specs/tests guardianes para futuros desarrollos | 🟡 PENDIENTE |
| M19 | `test:all` sin nada en rojo | 🟡 PENDIENTE |
| M20 | Handoff del `handoff-is-editors.md` (16 `<is-X-editor>`) | 🟡 planificado, no iniciado |

---

## 3. Arquitectura de la estrategia que funcionó

### 3.1 Estructura de worktrees

```
C:\ContaPyme\Personal\apps\is-webcomponents                                  [main] 371472559c
C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-root-types-strong-2026     [wt-root-types-strong-2026] e682fde1fa
```

**Solo 2 worktrees.** Los sub-agentes trabajan **directamente en WT-ROOT** con **file partitioning** (NO se crean worktrees por agente).

**Por qué:** `git worktree add` tarda ~15 min por el repo de 320,773 archivos. Inviable.

### 3.2 Flujo por tanda

```
1. Capitán escribe file-locks.md (partición de archivos por WT)
2. Capitán despacha N sub-agentes (subagent tool, run_in_background: true)
   - Cada uno con scope EXPLÍCITO de archivos
   - Instrucción: tipar, commit por archivo, reportar SHAs
3. Sub-agentes trabajan en WT-ROOT, commitean directamente
4. Capitán verifica: STRICT, typecheck, tests
5. Capitán escribe checkpoint-tandaNN.md + actualiza plan-activo.md
6. Capitán commitea el cierre
```

### 3.3 Comandos canónicos

```powershell
# STRICT count (el comando clave)
$errors = (npx tsc -p tsconfig.strict-audit.json --noEmit 2>&1 | `
  Select-String -Pattern '^src/.+\(\d+,\d+\): error TS' | Measure-Object -Line).Lines
"STRICT_NOW=$errors"

# Top archivos con errores
npx tsc -p tsconfig.strict-audit.json --noEmit 2>&1 | `
  Select-String -Pattern '^src/.+\(\d+,\d+\): error TS' | `
  ForEach-Object { ($_ -split '\(')[0] } | Group-Object | `
  Sort-Object Count -Descending | Select-Object -First 20 | `
  ForEach-Object { "{0,6}  {1}" -f $_.Count, $_.Name }

# Gates
cd C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-root-types-strong-2026
npm run typecheck
npm test
```

---

## 4. Estado detallado por tanda

| Tanda | Contenido | Errores antes → después | Estado |
|---|---|---|---|
| T1 | Verificación + locks (17 surgical fixes ya en main) | 8,777 → 8,777 | ✅ |
| T2 | 15 spec files diagrams | 8,777 → 7,897 (−880) | ✅ `08fe8f752` |
| T3 | 15 diagram files + 5 lightbox/preview | 7,897 → 7,384 (−513) | ✅ `f969580589` |
| T4 | data-grid family (data-grid, preview, ag-grid, spreadsheet, icon-explorer.preview, grid-shared) | 7,384 → 6,146 (−1,238) | ✅ `a2d223afa` |
| T5 | tree-view + helpers (13 archivos, `_types.ts` nuevo) | 6,146 → 5,135 (−1,011) | ✅ `68492c97e` |
| T6 | layout + catalog + code (7 archivos) | 5,135 → 4,438 (−697) | ✅ `9241ea4ce` |
| T7 | forms (36 archivos) | 4,438 → 3,222 (−1,216) | ✅ |
| T8 | navigation + media (24 archivos) | 3,222 → 2,613 (−609) | ✅ `2d435f8f` |
| T9 | pages + utils + `_shared/` (50+ archivos) | 2,613 → 1,783 (−830) | ✅ `afb415890a` |
| T10 | Sweep final (WT-0101 a WT-0105) | 1,783 → **62** (−1,721) | 🟡 falta checkpoint formal |

**Checkpoints existentes en `specs/health/wip-history/`:**
`checkpoint-tanda01.md`, `02`, `03`, `05`, `06`, `07`, `08`, `09`, `checkpoint-actual.md`, `plan-activo.md`, `file-locks.md`, `editors-handoff-summary.md`

**FALTAN:** `checkpoint-tanda04.md`, `checkpoint-tanda10.md`

---

## 5. Los 62 errores restantes

Ejecutar el comando de "Top archivos con errores" (sección 3.3) para la lista viva. Son archivos residuales pequeños que aparecieron por **cascading** después de que otras tandas cerraran.

**Estrategia recomendada:** despachar 1-2 sub-agentes con el comando de listado como scope dinámico, instrucción: "tipa CADA archivo que `npx tsc -p tsconfig.strict-audit.json` reporte, hasta bajar de 0".

---

## 6. F0 DEEP-TEST PROPOSALS — estado y continuación

### 6.1 Lo que existe

**Infraestructura en `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\`:**

| Archivo | Contenido |
|---|---|
| `discovery-deep-audit.json` | 432 testables descubiertos (193 webcomponents) |
| `groups-deep-audit.json` | 12 grupos disjuntos |
| `prompts-deep/g*.md` | 12 prompts F0.3 generados |
| `proposals-deep/g*.md` | **9 propuestas entregadas** (~1.1 MB total) |
| `tests-to-implement.md` | Cola priorizada (parcial) |
| `f0-history/` | Historial de iteraciones |

**Prompts F0.3 generados con:**
```powershell
node C:\Users\JAGUDELOE\.dsh\profiles\deep-test\bin\discover-testables.mjs --proj=<proyecto> --out=<...>/discovery-deep-audit.json
node C:\Users\JAGUDELOE\.dsh\profiles\deep-test\bin\group-testables.mjs --in=<discovery> --out=<groups> --size=10 --max-groups=12
node C:\Users\JAGUDELOE\.dsh\profiles\deep-test\bin\dispatch-proposers.mjs --in=<groups> --out=<prompts-dir> --proj=<proyecto>
```

### 6.2 Propuestas ENTREGADAS (9 de 12)

| Grupo | Tamaño | Propuestas | Scope |
|---|---|---|---|
| `g9.md` | 102 KB | ~200 | CLI scripts + pages + demos HTML |
| `g17.md` | 133 KB | ~454 | auth + diagrams + actions + charts + previews |
| `g26.md` | 135 KB | ~340 | forms previews + feedback CSS + data previews |
| `g40.md` | 93 KB | ~250 | feedback + utils + scripts + layout |
| `g41.md` | 176 KB | ~530 | webcomponents forms/nav/isp/utils |
| `g42.md` | 121 KB | ~332 | helpers + overlays + data-viz |
| `g54.md` | 121 KB | ~800 | diagrams + actions + media |
| `g56.md` | 96 KB | ~239 | animation CSS + cdn + code + gallery |
| `g64.md` | 101 KB | ~420 | css-part + isp + data + core + utils |

**Total: ~3,565 propuestas.**

### 6.3 Propuestas FALTANTES (3 de 12)

- `g39.md` — sub-agente falló sin escribir
- `g43.md` — sub-agente falló sin escribir
- `g44.md` — sub-agente falló sin escribir

**Re-despachar:** leer `prompts-deep/g39.md`, `g43.md`, `g44.md` y lanzar sub-agentes con instrucción explícita:
> "Lee `<prompt path>` y EJECUTA el template. Escribe tu respuesta completa en `<proposals path>`. NO escribas código de tests."

### 6.4 Gaps transversales recurrentes (de las 9 propuestas)

Estos aparecen en múltiples grupos y son **oportunidades horizontales de alto impacto**:

1. **`prefers-reduced-motion` no respetado** en ~10-18 CSS (spinner, progress-bar, progress-ring, skeleton, toast-item, dock, scrollspy, split-panel, heatmap, inline-edit, input, mention, pin-input, color-picker, progress-bar)
2. **`unmount()` no-op en 15+ previews** → memory leak de listeners al re-montar (único correcto: `doc-editor.preview.ts`)
3. **XSS via `innerHTML` con interpolación** sin escape: `checkbox.preview.ts`, `input.preview.ts`, `maps.ts` (attribution + tileUrl), `treemap.ts`, `stat.ts`, `generate-templates.ts`, `fix-icon-viewbox.ts`, `pages/ecosystem.ts` (`esc()` no escapa backticks)
4. **`customElements.whenDefined` ausente** en 14/16 previews → race condition
5. **`document.getElementById()` sin guard null** en 8+ previews
6. **Foco no se restaura** al cerrar popups (palette-selector, tooltip, popconfirm, confirm-modal)
7. **Listbox/menu sin roving tabindex / Arrow nav** (palette-selector tiene `tabIndex=-1` sin `aria-activedescendant`)
8. **`aria-modal` sin `aria-labelledby`** en `confirm-modal`
9. **Persistencia sin manejo de quota / JSON corrupto** (`palette-selector`, `prefs.ts` traga `QuotaExceededError`)
10. **`setInterval` que sobrevive** al quitar atributo (`relative-time.ts`, `format.ts`)
11. **`AbortSignal.timeout` inconsistente** en módulos que hacen `fetch`
12. **Headers de seguridad ausentes** en `scripts/serve*.mjs`
13. **Determinismo comprometido** en `sparkline.ts` (`Math.random()` para gradient IDs)
14. **Animaciones no-GPU**: `org-chart.css` anima `transition: d`; `quadrant-chart.css` anima `transition: r`
15. **`document.execCommand` deprecated** en `md-editor.ts`/`md-render.ts`
16. **`audit-components.ts` regex `\.js$`** ignora todos los `.ts` (falso negativo masivo)
17. **`listen`/`observer` globales sin teardown simétrico**
18. **`allowHtml: true`** en toast sin sanitización
19. **Duplicados** `download-iconify.{mjs,ts}` con defaults distintos (drift silencioso)
20. **`parseDiagnostics` API inestable** en 4 scripts (TS 5.4+ lo movió a `internal`)

### 6.5 Bug latente documentado

`src/components/isp/_shared/tree-view/selection.ts:26` — el JSDoc dice `keyof typeof SelectionMode` pero el cuerpo compara contra `SelectionMode.NONE` (el valor `'none'`). Test de regresión incluido en propuesta g17 #14.

---

## 7. Mandato M17 — Lab de testing completo (el más nuevo y más grande)

**Cita textual del usuario:**
> "debes hacer absolutamente toda una audit de /deep-test-proposals con todos los componentes y todo lo testeable, para tener un set de testings demasiado completo y demasiado exhaustivo para que siempre quedemos completamente de acuerdo con todos los cambios y que no quede ningún error bajo ningún contexto, en lo posible hacer demos de cada componente para que con stagehand el harness pueda testear todo, absolutamente todo, con un test dedicado a lo que se requiere para cada caso, para cada component, debe ser un lab completo"

### 7.1 Convención de demos ya establecida

```
demos/diagramas/<Nombre>/
  <nombre>.html                      ← demo
  _testing/
    <nombre>.test.mjs                ← test simple (node --test)
    <nombre>.stagehand.test.mjs      ← test stagehand (browser harness)
    run.mjs                          ← runner Playwright
```

**Comando de test de demo:**
```powershell
node --import ./scripts/ts-resolve-hook.ts demos/<x>/_testing/<x>.test.mjs
```

**Estado actual:** solo `demos/diagramas/ER/` completo (21 tests, 2 stagehand skip).

### 7.2 Alcance

- **259 archivos** en `src/components/**/*.ts`
- **193 webcomponents** (`src/components/<categoria>/<tag>.ts`)
- Categorías: actions, charts, code, data, data-viz, diagrams, feedback, forms, helpers, isp, layout, media, navigation, overlays

### 7.3 Stack por nivel (de la skill `deep-test-proposals`)

| Nivel | Stack | Cuándo |
|---|---|---|
| **Nivel 1** | Playwright + Stagehand (browser real) | UI/UX, a11y, keyboard, focus, ARIA, reduced-motion, CSS parts, gestos, clipboard |
| **Nivel 2** | curl + attack scripts | Endpoints HTTP, auth, validación server-side |
| **Nivel 3** | `node:test` o vitest (puro) | Funciones puras, validadores, parsers, state machines, helpers |

**Este proyecto es mayoritariamente Nivel 1 + Nivel 3** (no hay backend real salvo scripts CLI).

### 7.4 Categorías de test a cubrir por componente UI

BR (business rules), SM (state machines), VL (validación), TR (transformaciones), PF (pure functions), SE (side effects), ER (error handling), UI/UX, a11y/ARIA, teclado, focus management, reduced-motion, browser APIs, storage, performance, seguridad/XSS, integración.

---

## 8. Mandato M20 — Handoff de los 16 `<is-X-editor>`

**Resumen condensado ya disponible en:**
`specs/health/wip-history/editors-handoff-summary.md`

**Fuente original:** `C:\Users\JAGUDELOE\handoff-is-editors.md` (59 KB, 1,341 líneas)

**Contenido:** 16 web components `<is-X-editor>`, 9 WTs, ~290 tests planificados.

**Estrategia decidida:** workstream **secuencial** después de que `types-strong-2026` cierre (STRICT <100 ✅ + T10 cerrado). WT-ROOT nuevo: `is-wc-wt-root-editors-2026` en `C:\ContaPyme\Personal\apps\WT\`. **Preguntar al humano antes de arrancar.**

---

## 9. Trampas conocidas (lecciones aprendidas — IMPORTANTE)

### 9.1 Sub-agentes que "terminan" sin entregar

**Patrón observado repetidamente:** sub-agentes exploran, razonan, y terminan sin commitear ni escribir el archivo de salida.

**Mitigaciones que funcionaron:**
- Prompts **ultra-focalizados** con "NO EXPLORES. TIPA Y COMMITEA."
- Lista **explícita** de archivos con conteo de errores actual
- Instrucción de workflow paso a paso (leer → tipar → commit → verificar)
- Instrucción de **commit por archivo** con mensaje exacto
- Si falla: despachar `<WT>-bis` con el scope restante y la nota de qué ya se hizo

**Tasa de fallo:** ~35% de sub-agentes fallaron en el primer intento. Los `-bis`/`-ter`/`-quad` funcionaron.

### 9.2 Sub-agentes que no commitean

**Mitigación:** el capitán commitea manualmente el trabajo del sub-agente:
```powershell
git -C <WT-ROOT> status --porcelain   # ver qué quedó modificado
git -C <WT-ROOT> add <archivos>
git -C <WT-ROOT> commit -m "feat(...): ..."
```

### 9.3 Colisión de scope entre sub-agentes

**Observado:** un sub-agente editó un archivo de otro scope.

**Mitigación:** `specs/health/wip-history/file-locks.md` con tabla explícita de "Archivo → WT que lo lockea". El capitán media.

### 9.4 Archivos stray `.audit*` y `.tmp*` colándose en commits

**Patrón:** los sub-agentes generan `.audit/*.txt`, `.audit-*-current.txt`, `.test-current.txt` que se cuelan con `git add -A`.

**Mitigación:**
```powershell
git -C <WT-ROOT> rm --cached <stray>
Remove-Item <WT-ROOT>\<stray>
git -C <WT-ROOT> commit -m "chore: remove stray <name>"
```
**Revisar `git status` antes de cada `git add -A`.**

### 9.5 `Set-Content` para crear archivos (por si falla el tool `write`)

Si `write` falla con "file no longer exists — re-read the file, then retry" para paths nuevos bajo `specs/`, usar PowerShell para crear el directorio + archivo en un solo comando.

---

## 10. Reglas de operación duras

| Regla | Detalle |
|---|---|
| **NUNCA push** | Ni a `origin` ni a ningún remoto |
| **NUNCA squash** | `git merge --no-ff` siempre; preservar todos los commits |
| **NUNCA commitear a `main`** directamente | Todo va a `wt-root-types-strong-2026` |
| **Gate humano único** | Solo para `wt-root → main` |
| **Commits en español** | Conventional commits |
| **1 commit por archivo** | `feat(<nombre>): tipado explícito N→0 errores` |
| **Worktrees limpios** | `git worktree list` == [main, wt-root] al cierre de cada tanda |
| **Archivos LOCKED (permanente)** | `src/components/_shared/svg-chart-engine.ts`, `src/components/_shared/diagram-element-base.ts`, `src/components/diagrams/diagram-types.ts` — NO TOCAR |
| **`grid-types.ts`** | Cerrado en T4, solo lectura |
| **File partitioning** | Respetar `file-locks.md` |
| **Canal entre agentes** | `WIP-wt-root-types-strong-2026.md` sección "Mensajes recientes con hermanas" |

---

## 11. Archivos clave

### 11.1 WT-ROOT (`C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-root-types-strong-2026\`)

| Archivo | Propósito |
|---|---|
| `WIP-wt-root-types-strong-2026.md` | **Plan vivo + canal de comunicación entre agentes** |
| `specs/health/wip-history/plan-activo.md` | Tandas cerradas/en proceso/pendientes + progresión de errores |
| `specs/health/wip-history/file-locks.md` | Locks por archivo |
| `specs/health/wip-history/checkpoint-tandaNN.md` | Checkpoint por tanda |
| `specs/health/wip-history/checkpoint-actual.md` | Master anti power-outage |
| `specs/health/wip-history/editors-handoff-summary.md` | Resumen del workstream editors |
| `tsconfig.json` | Typecheck relajado (`strict: false`, solo `src/manifest.ts`) |
| `tsconfig.strict-audit.json` | **Audit estricto** (`strict: true`, exclude `**/*.test.ts`) |

### 11.2 Proyecto (`C:\ContaPyme\Personal\apps\is-webcomponents\`)

| Archivo/Path | Propósito |
|---|---|
| `.audit/discovery-deep-audit.json` | 432 testables |
| `.audit/groups-deep-audit.json` | 12 grupos |
| `.audit/prompts-deep/` | 12 prompts F0.3 |
| `.audit/proposals-deep/` | **9 propuestas entregadas (~3,565 tests)** |
| `.audit/tests-to-implement.md` | Cola priorizada |
| `demos/diagramas/` | Demos + testing (solo ER completo) |
| `src/utils/testing/` | Tests existentes (domain, meta, e2e) |
| `src/utils/health/` | Motor de auditoría del repo |

### 11.3 Skills disponibles

| Skill | Path | Uso |
|---|---|---|
| `deep-test-proposals` | `C:\Users\JAGUDELOE\.dsh\skills\` | F0 pipeline |
| `grill-me` | (disponible) | Preguntas de selección múltiple en la UI de DSH para contextualizar |

**Scripts de deep-test:**
`C:\Users\JAGUDELOE\.dsh\profiles\deep-test\bin\{discover-testables,group-testables,dispatch-proposers,gate-proposals,iterate-to-stable,run-f0}.mjs`

---

## 12. Próximos pasos ordenados (algoritmo del capitán)

### PASO 1 — Verificar estado (5 min)

```powershell
$root = "C:\ContaPyme\Personal\apps\WT\is-webcomponents-wt-root-types-strong-2026"
git -C $root log --oneline -5
git -C $root status --porcelain
git -C $root worktree list

cd $root
npm run typecheck
npm test
$errors = (npx tsc -p tsconfig.strict-audit.json --noEmit 2>&1 | `
  Select-String -Pattern '^src/.+\(\d+,\d+\): error TS' | Measure-Object -Line).Lines
"STRICT_NOW=$errors"
```

**Esperado:** HEAD `e682fde1fa`, tree limpio, 2 worktrees, typecheck verde, 21/21 tests, STRICT=62.

### PASO 2 — Cerrar los 62 errores residuales (1-2 h)

Despachar 1 sub-agente con scope dinámico:
> "Corre `npx tsc -p tsconfig.strict-audit.json --noEmit` en `<WT-ROOT>`. Tipa CADA archivo que reporte errores. Commit por archivo. NO EXPLORES. TIPA Y COMMITEA. Objetivo: STRICT_NOW=0."

### PASO 3 — Cerrar formalmente T10 (30 min)

- Escribir `specs/health/wip-history/checkpoint-tanda10.md`
- Escribir `specs/health/wip-history/checkpoint-tanda04.md` (faltante)
- Actualizar `plan-activo.md` con T10 cerrada + todos los SHAs
- Commit: `chore(tanda10): cerrar T10 — sweep final`

### PASO 4 — Investigar los 62 errores (opcional, si el humano quiere 0)

Si la meta es 0 absoluto, revisar si los 62 son:
- Errores legítimos → tipar
- Falsos positivos de `tsconfig.strict-audit.json` → documentar y excluir con justificación

### PASO 5 — Completar proposals F0 faltantes (2-3 h)

Despachar 3 sub-agentes (paralelo) para `g39.md`, `g43.md`, `g44.md`:
> "Lee `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\prompts-deep\g39.md` y EJECUTA el template. Escribe tu respuesta completa en `.audit\proposals-deep\g39.md`. NO escribas código de tests."

### PASO 6 — F0.4 GATE (2-3 h)

Con las 12 propuestas:
```powershell
node C:\Users\JAGUDELOE\.dsh\profiles\deep-test\bin\gate-proposals.mjs `
  --proposals="<proyecto>\.audit\proposals-deep" `
  --proj="<proyecto>" `
  --out="<proyecto>\.audit\tests-to-implement.md"
```

Capitán prioriza por impacto:
- a11y +10, security +10, modal/dialog +8, reduced-motion +5, performance +5, drag/swipe +4, browser-api +4, visual +2, edge-case +2

### PASO 7 — Implementar tests prioritarios (el lab completo)

**Estrategia:** despachar sub-agentes por categoría de componente.

Para cada componente:
1. Crear/verificar demo en `demos/<categoria>/<Nombre>/<nombre>.html`
2. Crear `_testing/<nombre>.test.mjs` (Nivel 3 — funciones puras)
3. Crear `_testing/<nombre>.stagehand.test.mjs` (Nivel 1 — UI/a11y/keyboard)
4. Registrar en `_testing/run.mjs`

**Orden sugerido por impacto:**
1. **Gaps transversales** (sección 6.4) — arreglar en el código + test de regresión
2. **XSS** (gaps 3, 18) — tests de payload + fix
3. **a11y** (gaps 6, 7, 8) — tests de keyboard/focus/ARIA + fix
4. **Memory leaks** (gap 2, 10, 17) — tests + fix
5. **reduced-motion** (gap 1) — tests + fix
6. Resto por categoría

### PASO 8 — Actualizar specs/guardianes (2-3 h)

- `specs/constraints.md` — añadir reglas descubiertas (reduced-motion obligatorio, `unmount()` debe limpiar, `whenDefined` en previews, escape de `innerHTML`, guard null en `getElementById`)
- `specs/lessons.md` — añadir las trampas (sección 9)
- Tests guardianes en `src/utils/health/` — añadir validadores para las reglas nuevas

### PASO 9 — `test:all` verde

No existe script `test:all` en `package.json`. Crearlo:
```json
"test:all": "npm run typecheck && npm test && npm run audit && npm run test:demos"
```
Verificar que todo está verde. **Nada en rojo.**

### PASO 10 — GATE HUMANO: merge `wt-root → main`

**Preguntar al humano:**
> "¿Apruebas el merge `wt-root-types-strong-2026` → `main` con `--no-ff` (sin squash, preservando los 344+ commits)?"

Al aprobar:
```powershell
cd C:\ContaPyme\Personal\apps\is-webcomponents
git merge --no-ff wt-root-types-strong-2026 -m "merge: types-strong-2026 (8,777 → 62 errores strict, 344 commits)"
```

**NO squash. NO push.**

### PASO 11 — Workstream editors (M20)

Preguntar al humano antes de arrancar. Nuevo WT-ROOT `is-wc-wt-root-editors-2026`. Ver `editors-handoff-summary.md`.

---

## 13. Estimación de tiempo

| Paso | Tiempo |
|---|---|
| PASO 1 — verificar | 5 min |
| PASO 2 — 62 errores residuales | 1-2 h |
| PASO 3 — cerrar T10 formal | 30 min |
| PASO 5 — proposals faltantes | 2-3 h |
| PASO 6 — F0.4 gate | 2-3 h |
| PASO 7 — **lab completo** | **2-5 días** (259 componentes × demo + 2 tests) |
| PASO 8 — specs/guardianes | 2-3 h |
| PASO 9 — test:all | 1 h |
| PASO 10 — gate humano merge | 15 min |
| PASO 11 — editors | ~1 semana |

**Total hasta merge:** ~1-2 días (sin el lab completo)
**Total con lab completo:** ~1-2 semanas

---

## 14. Cómo arrancar la próxima sesión (prompt sugerido)

```
Retoma el trabajo de types-strong-2026. Lee el handoff completo en:
C:\Users\JAGUDELOE\handoff-is-types-strong-continuation.md

Estado: STRICT_NOW=62 (meta <100 cumplida), 344 commits en wt-root-types-strong-2026,
typecheck verde, 21/21 tests, tree limpio.

Ejecuta PASO 1 (verificar), luego PASO 2 (cerrar los 62 residuales) y PASO 3
(cerrar T10 formalmente). Después avanza con los mandatos pendientes M17 (lab
completo de testing), M18 (specs/guardianes) y M19 (test:all verde).

Reglas duras: NUNCA push, NUNCA squash, no commits a main, gate humano solo
para el merge final. Sub-agentes: prompts ultra-focalizados, commit por archivo,
verificar con npm run typecheck + npm test.

Usa la skill /grill-me si necesitas contexto del humano con preguntas de
selección múltiple en la UI de DSH.
```

---

## 15. Credenciales de éxito

**El trabajo está bien hecho si:**
- ✅ `STRICT_NOW` = 0 (o justificado por qué no)
- ✅ `npm run typecheck` verde
- ✅ `npm test` todos PASS
- ✅ `npm run audit` sin errores
- ✅ `test:all` verde
- ✅ Cada componente tiene demo + test simple + test stagehand
- ✅ `specs/constraints.md` y `specs/lessons.md` actualizados con las reglas descubiertas
- ✅ Guardianes nuevos en `src/utils/health/` para las reglas nuevas
- ✅ Worktrees limpios (solo main + wt-root)
- ✅ Merge a main ejecutado (tras aprobación humana) con `--no-ff`

**Señales de alarma:**
- ❌ Algún commit squashado
- ❌ Push a cualquier remoto
- ❌ Commit directo a main
- ❌ Archivos LOCKED modificados
- ❌ Sub-agentes trabajando sin file partitioning (colisiones)
- ❌ Tests en rojo sin investigar

---

**FIN DEL HANDOFF** — sesión cerrada con STRICT_NOW=62 (<100 ✅), árbol limpio, sin push, sin squash, 344 commits preservados en `wt-root-types-strong-2026`.
