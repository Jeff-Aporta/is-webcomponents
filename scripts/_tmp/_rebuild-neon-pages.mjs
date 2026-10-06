import { join, dirname, basename, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { access, readFile, mkdir, readdir, stat, copyFile } from "node:fs/promises";
import { build } from "esbuild";
import { bundleMinJs, bundleMinCss, docsBanner } from "../../src/cdn/build/bundle-min.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dist = join(root, "dist", "cdn");
const compRoot = join(root, "src", "components");
const coreRoot = join(root, "src", "core");
const cssRoot = join(root, ".tmp-scss", "src");

async function walk(dir, out = []) {
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "_shared") continue;
      await walk(p, out);
    } else if (/\.(ts|js)$/.test(name.name) && !/^index\.(ts|js)$/.test(name.name)
               && !name.name.endsWith(".d.ts")
               && !name.name.includes(".selfcheck.")
               && !name.name.includes(".preview.")
               && !name.name.endsWith(".json")
               && !/^doc-demo-(boot|host)\.(ts|js)$/.test(name.name)
               && !name.name.endsWith(".schemas.ts")) {
      out.push(p);
    }
  }
  return out;
}

const entries = (await walk(compRoot)).sort();
const manifest = (await import("../../src/manifest.ts")).default;
const tagToComponent = new Map();
for (const e of entries) tagToComponent.set(basename(e).replace(/\.(ts|js)$/, ""), e);
const manifestCategoryByTag = new Map(manifest.map((m) => [m.tag.replace(/^iswc-/, ""), m.category]));
const folderFor = (file) => {
  const t = basename(file).replace(/\.(ts|js)$/, "");
  if (manifestCategoryByTag.has(t)) return manifestCategoryByTag.get(t);
  return relative(compRoot, file).split(/[\\/]/)[0];
};

const externalComponents = {
  name: "external-components",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\.(ts|js)$/ }, (args) => {
      if (args.kind === "entry-point") return null;
      const abs = resolve(args.resolveDir, args.path);
      if (abs === coreRoot || abs.startsWith(coreRoot + sep)) return null;
      if (basename(abs).replace(/\.(ts|js)$/, "") === "base-sheets") {
        return { path: "../_shared/base-sheets.min.js", external: true };
      }
      if (!abs.startsWith(compRoot)) return null;
      if (abs.includes(`${sep}_shared${sep}`)) return null;
      const t = basename(abs).replace(/\.(ts|js)$/, "");
      if (!tagToComponent.has(t)) return null;
      return { path: `../${folderFor(abs)}/${t}.min.js`, external: true };
    });
  },
};

async function rebuildOne(srcRel, category) {
  const inFile = join(compRoot, srcRel);
  const tag = basename(inFile).replace(/\.(ts|js)$/, "");
  const cssIn = join(cssRoot, "components", srcRel.replace(/\.(ts|js)$/i, ".css"));
  const outDir = join(dist, category);
  const outJs = join(outDir, `${tag}.min.js`);
  const outCss = join(outDir, `${tag}.min.css`);
  await mkdir(outDir, { recursive: true });
  const hasCss = await access(cssIn).then(() => true, () => false);
  if (hasCss) await bundleMinCss(cssIn, outCss);
  await bundleMinJs({
    entry: inFile,
    outfile: outJs,
    plugins: [externalComponents],
    banner: docsBanner([`rebuild: ${tag}`]),
    define: hasCss ? { __IS_COMPONENT_CSS__: JSON.stringify(await readFile(outCss, "utf8")) } : undefined,
  });
  console.log(`OK ${relative(root, outJs)} ${(await stat(outJs)).size}`);
}

await rebuildOne("preview/demo-section.ts", "preview");
await bundleMinCss(
  join(cssRoot, "styles", "presentation.css"),
  join(root, "dist", "previews", "doc-presentation.min.css"),
);
console.log("OK presentation");

await mkdir(join(root, "dist", "pages"), { recursive: true });
for (const name of ["icons", "home", "theming", "ecosystem"]) {
  await copyFile(join(root, "src", "pages", `${name}.json`), join(root, "dist", "pages", `${name}.json`));
  const ts = join(root, "src", "pages", `${name}.ts`);
  try { await access(ts); } catch { continue; }
  await build({
    entryPoints: [ts],
    outfile: join(root, "dist", "pages", `${name}.min.js`),
    bundle: true, minify: true, format: "esm", target: "es2020",
  });
  console.log(`OK pages/${name}`);
}

// cleanup bad outfile if present
try { await access(join(dist, "preview", "demo-section.ts.min.js")); 
  const { unlink } = await import("node:fs/promises");
  await unlink(join(dist, "preview", "demo-section.ts.min.js"));
  console.log("cleaned demo-section.ts.min.js");
} catch {}
