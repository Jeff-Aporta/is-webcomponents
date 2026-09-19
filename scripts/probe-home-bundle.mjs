// Scratch: contexto de las refs a ISWebComponentsLoader y core/loader en home.min.js
import fs from 'node:fs';
const src = fs.readFileSync('dist/pages/home.min.js', 'utf8');

const show = (label, re) => {
  console.log(`\n=== ${label} ===`);
  let m;
  let n = 0;
  while ((m = re.exec(src)) !== null && n < 5) {
    const start = Math.max(0, m.index - 80);
    const end = Math.min(src.length, m.index + 80);
    console.log(`  ...${src.slice(start, end).replace(/\n/g, '\\n')}...`);
    n++;
  }
};

show('ISWebComponentsLoader context', /ISWebComponentsLoader/g);
show('core/loader.min.js context', /core\/loader\.min\.js/g);
show('import( context', /import\s*\(/g);
show('fromCharCode|String.fromCharCode context', /fromCharCode/g);
