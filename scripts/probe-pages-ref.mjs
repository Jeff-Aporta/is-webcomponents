// Scratch: busca referencias a 'pages' y 'CDN_ROOT' en dist/cdn/core/loader.min.js
import fs from 'node:fs';
const path = 'dist/cdn/core/loader.min.js';
const src = fs.readFileSync(path, 'utf8');
console.log('size:', src.length);
console.log('matches for "pages":', (src.match(/pages/g) || []).length);
console.log('matches for "dist/":', (src.match(/dist\//g) || []).length);
console.log('matches for "/core/":', (src.match(/\/core\//g) || []).length);
console.log('matches for "preferSelf":', (src.match(/preferSelf/g) || []).length);
// find any URL that looks like an asset
const urls = src.match(/['"`][^'"`\s]+\.min\.[jc]s['"`]/g) || [];
console.log('\nUnique .min.js/.min.css URLs in loader:');
[...new Set(urls)].forEach(u => console.log('  ', u));
console.log('\nUnique "/pages" contexts:');
const pageMatches = src.match(/.{0,40}pages.{0,40}/g) || [];
pageMatches.slice(0, 10).forEach(m => console.log('  ', m));
