import { buildHostHtml, sanitizeSvgRoot, startStaticServer } from '../../src/cdn/tools/index.ts';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const html = buildHostHtml({
  scriptUrl: 'http://127.0.0.1:9/x.js',
  tag: 'iswc-component-diagram',
  payload: { a: 1 },
  attrs: { theme: 'insoft-cd' },
});
if (!html.includes('iswc-component-diagram') || !html.includes('__ISWC_RENDER_READY__')) {
  throw new Error('html bad');
}

const s = sanitizeSvgRoot('<svg viewBox="0 0 100 50" style="width:100%"><g/></svg>');
if (s.width !== 100 || s.height !== 50 || /style=/.test(s.svg.match(/<svg[^>]*>/)[0])) {
  throw new Error('sanitize bad');
}

const root = join(process.cwd(), '.iswc-render-tmp');
await mkdir(root, { recursive: true });
await writeFile(join(root, 'ping.txt'), 'ok');
const srv = await startStaticServer(process.cwd());
const res = await fetch(srv.base + '.iswc-render-tmp/ping.txt');
const body = await res.text();
srv.close();
await rm(join(root, 'ping.txt'), { force: true });
if (body !== 'ok') throw new Error('server bad: ' + body);
console.log('tools ok');
