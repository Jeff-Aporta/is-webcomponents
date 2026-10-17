import { assertEquals } from "jsr:@std/assert@1";
import { renderShell } from "../../src/vendor-distributions/server/render-shell.ts";

const SHA = "a".repeat(40);
const BASE = {
  titulo: "ERP SQLite",
  descripcion: "Administración de bases SQLite",
  prefijo: "erp",
  kit: { repo: "Jeff-Aporta/is-webcomponents", sha: SHA },
};

Deno.test("renderShell: shell básico con loader pineado y tag raíz", async () => {
  const html = await renderShell(BASE);
  assertEquals(html.includes("<title>ERP SQLite</title>"), true);
  assertEquals(html.includes('<meta name="description" content="Administración de bases SQLite">'), true);
  assertEquals(html.includes("https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@" + SHA + "/dist/cdn/core/loader.min.js"), true);
  assertEquals(html.includes("<erp-app></erp-app>"), true);
  assertEquals(html.includes('data-theme="dark"'), true);
});

Deno.test("renderShell: escapa título (XSS)", async () => {
  const html = await renderShell({ ...BASE, titulo: "<script>alert(1)</script>" });
  assertEquals(html.includes("<script>alert(1)</script>"), false);
  assertEquals(html.includes("&lt;script&gt;"), true);
});

Deno.test("renderShell: ?s= con resolverMeta ajusta título/og", async () => {
  const html = await renderShell(BASE, {
    s: "cliente-42",
    resolverMeta: async (s) => ({ titulo: "Cliente " + s, og: { imagen: "https://x/img.png" } }),
  });
  assertEquals(html.includes("<title>Cliente cliente-42</title>"), true);
  assertEquals(html.includes('content="https://x/img.png"'), true);
});

Deno.test("renderShell: sin sha sirve loader del propio origen", async () => {
  const html = await renderShell({ titulo: "x", prefijo: "erp" });
  assertEquals(html.includes("./dist/cdn/core/loader.min.js"), true);
  assertEquals(html.includes("cdn.jsdelivr.net"), false);
});
