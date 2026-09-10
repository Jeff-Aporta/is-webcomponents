import { leerConBase, extraerObservados } from './src/utils/health/exhaustive/_helpers.ts';
const TS = 'src/components/layout/dialog.ts';
const src = leerConBase(TS);
for (const a of ['open', 'label', 'light-dismiss', 'backdrop-variant']) {
  console.log(a, ':', src.includes(`'${a}'`) || src.includes(`"${a}"`) || src.includes(`--${a}`));
}
console.log('Observados:', extraerObservados(TS));