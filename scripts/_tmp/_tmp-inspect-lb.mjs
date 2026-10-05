import { readFileSync, existsSync } from 'node:fs';
const j = readFileSync('dist/cdn/diagrams/diagram-lightbox.min.js', 'utf8');
console.log('has iswc-lightbox-bg in js', j.includes('iswc-lightbox-bg'));
console.log('has display:none in js', j.includes('display:none') || j.includes('display: none'));
console.log('has &[open] in js', j.includes('&[open]'));
const idx = j.indexOf('__IS_COMPONENT_CSS__');
console.log('define idx', idx);
// find long CSS-like string
const m = j.match(/:host\{[^`]{20,80}/);
console.log('host match', m?.[0]);
const m2 = j.match(/iswc-lightbox[^"']{0,40}/);
console.log('lightbox token', m2?.[0]);
