# tour-deploy — Spec del tour pre-push + post-push

**Fecha**: 2026-09-18
**Estado**: ACTIVO (obligatorio antes/después de cada push a `main`)
**Issue resuelto**: GH Pages servía 14+ 404s (TS source paths de `src/components/<cat>/*.preview.js` no se sirven). El tour captura estos antes del push (local) y confirma después (remoto).

## TL;DR

Antes del push → corre `npm run prepush` (levanta `serve.mjs` local + ejecuta `tour-deploy.mjs --local`). Después del push → `npm run postpush` (corre `tour-deploy.mjs --remote` contra `jeff-aporta.github.io/is-webcomponents`).

Si el tour rojo (cualquier 404), NO hacer push hasta corregir.

## Tres capas del tour

### Capa 1 — HEAD checks (binarios)

`scripts/tour-deploy.mjs` hace `HEAD` contra cada bundle crítico:

```javascript
const CRITICAL_PATHS = [
  'index.html',
  'dist/cdn/core/loader.min.js',
  'dist/gallery-app.min.js',
  ...SCRIPTS_BUNDLES.map(s => `dist/scripts/${s}.min.js`),
  ...PAGES_BUNDLES.flatMap(p => [`dist/pages/${p}.min.js`, `dist/pages/${p}.json`]),
  'dist/cdn/skills/is-webcomponents/PROMPT.md',
];
```

Estas listas se sincronizan con `bundle-scripts.mjs`. Si añades un nuevo script o page, actualiza **ambas** listas.

### Capa 2 — Catalog walk

Descubre todos los `*.preview.min.js` en `dist/previews/<cat>/`, los mapea a `<tag>`, y hace `GET ?s=<base64(component:tag)>` para cada uno. Cualquier 404 indica un demo que falla.

```javascript
function discoverPreviews() {
  const out = [];
  for (const cat of readdirSync('dist/previews', { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    for (const f of readdirSync(join('dist/previews', cat.name))) {
      if (f.endsWith('.preview.min.js')) {
        out.push(`is-${f.replace(/\.preview\.min\.js$/, '')}`);
      }
    }
  }
  return out;
}
```

### Capa 3 (futuro) — Browser real

Captura console errors con playwright/stagehand. Para añadir:
1. Reemplazar `fetchDemo()` con `page.goto(...)` + `page.on('console', ...)`.
2. Mantener el catálogo de demos como source-of-truth.

## Hook al flujo de trabajo

| Comando | Cuándo | Qué hace |
|---|---|---|
| `npm run prepush` (alias de `tour:local`) | Antes de `git push origin main` | Levanta `serve.mjs` local (puerto 8491) → ejecuta tour HEAD + catalog walk |
| `npm run postpush` (alias de `tour:remote`) | Después de `git push origin main` (esperar ~90s para cache GH Pages) | Ejecuta tour contra `jeff-aporta.github.io/is-webcomponents` |
| `npm run bundle` | Antes de cualquier push | Regenera `dist/scripts/`, `dist/pages/`, `dist/previews/`, `dist/cdn/skills/` |
| `npm run test:all` | Antes de cualquier push | typecheck + tests + audit |

## Diagnóstico de fallos frecuentes

| Síntoma | Causa probable | Fix |
|---|---|---|
| `FAIL dist/scripts/<x>.min.js (404)` | `bundle-scripts.mjs` no se corrió | `npm run bundle` |
| `FAIL dist/pages/<x>.min.js (404)` | Page agregada sin bundle | Añadir `<x>` a `pages` array en `bundle-scripts.mjs` |
| `FAIL dist/previews/<cat>/<tag>.preview.min.js (404)` | Preview.ts no se bundleó | Verificar que `bundle-scripts.mjs` lo detectó (revisar logs) |
| `FAIL dist/cdn/skills/.../PROMPT.md (404)` | Skill no copiado | Verificar `cp -r src/skills dist/cdn/skills` en build.mjs |
| `FAIL index.html (404)` | Working tree sucio o branch incorrecto | `git status` + checkout main |
| Cache devuelve versión vieja | GH Pages cache 1-3 min | Re-run después de 90s |

## Anti-patrones (NO hacer)

- ❌ NO añadir `?v=Ticks` o similar al URL del fetch (rompe el tour-script).
- ❌ NO usar `Promise.all` en catalog walk (golpea GH Pages con N requests simultáneos → throttle).
- ❌ NO skip al tour "porque ya sé que está verde" — la fuente del bug es precisamente el bypass.
- ❌ NO hacer push sin `npm run prepush` previo.

## Roadmap

- [ ] Capa 3: integrar `@browserbasehq/stagehand` ya instalado para captura real de console errors.
- [ ] Capa 4: comparar screenshots antes/después (drift visual).
- [ ] Crear `tests/tour-deploy.test.ts` con fixtures que mockean fetch para CI.
- [ ] Integrar con CI (`.github/workflows/deploy.yml` pre-push + post-deploy step).
