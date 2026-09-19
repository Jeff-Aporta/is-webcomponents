// Scratch: examinar dist/gallery-app.min.js para references a '/pages/' y al loader
import fs from 'node:fs';
const src = fs.readFileSync('dist/gallery-app.min.js', 'utf8');
console.log('size:', src.length);

// buscar '/pages/' literal
const pagesRefs = src.match(/\/pages\/[^'"`\s]*/g) || [];
console.log('\nUnique /pages/ refs in gallery-app:');
[...new Set(pagesRefs)].slice(0, 30).forEach(r => console.log('  ', r));

// buscar la import del loader
const loaderImport = src.match(/['"`][^'"`\s]*loader[^'"`\s]*['"`]/g) || [];
console.log('\nloader references:');
[...new Set(loaderImport)].slice(0, 10).forEach(r => console.log('  ', r));

// buscar la declaración kt (mismo truco que home.min.js)
const ktDec = src.match(/(?:const|let|var)\s+\w+\s*=\s*["'`][^"'`]*(?:dist\/pages|dist\/cdn|cdn\.jsdelivr)[^"'`]*["'`]/g) || [];
console.log('\nbase URL declarations:');
ktDec.slice(0, 5).forEach(r => console.log('  ', r));
