/**
 * Carga un PreviewDefinition desde JSON (fetch en browser, fs en Node).
 * @param {string | URL} url
 * @returns {Promise<import('./types.d.ts').PreviewDefinition>}
 */
export async function loadDefinitionJson(url: string | URL) {
  const href = typeof url === 'string' ? url : url.href;
  if (typeof process !== 'undefined' && process.versions?.node && href.startsWith('file:')) {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    return JSON.parse(readFileSync(fileURLToPath(href), 'utf8'));
  }
  if (typeof process !== 'undefined' && process.versions?.node && !/^https?:/i.test(href)) {
    const { readFileSync } = await import('node:fs');
    const { pathToFileURL } = await import('node:url');
    const asUrl = href.startsWith('file:') ? href : pathToFileURL(href).href;
    const { fileURLToPath } = await import('node:url');
    return JSON.parse(readFileSync(fileURLToPath(asUrl), 'utf8'));
  }
  const res = await fetch(href);
  if (!res.ok) throw new Error(`loadDefinitionJson: ${res.status} ${href}`);
  return res.json();
}
