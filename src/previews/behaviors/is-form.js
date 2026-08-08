/**
 * Demo <is-form> con cuerpo JSON compacto (json2html / html2json).
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  const out = root.querySelector('#fJsonOut');
  const bodyOut = root.querySelector('#fBodyOut');
  const log = root.querySelector('#fLog');

  const paint = (el, data) => {
    if (!el) return;
    el.textContent = JSON.stringify(data, null, 2);
  };
  const paintLog = (msg) => {
    if (!log) return;
    const code = log.querySelector('code') || log;
    code.textContent = msg;
  };

  const schema = {
    mode: 'edit',
    submitLabel: 'Aceptar',
    body: [
      ['h3', { slot: 'header', style: 'margin:0.5rem 0' }, 'Curso'],
      ['div', {
        slot: 'content',
        style: 'display:flex;flex-direction:column;gap:0.75rem;padding:0.5rem',
      },
      ['is-input', {
        name: 'icurso', label: 'Código', required: true, 'full-width': true, 'label-placement': 'float',
      }],
      ['is-input', {
        name: 'ncurso', label: 'Nombre', 'full-width': true, 'label-placement': 'float',
      }],
      ['is-switch', { name: 'activo' }, 'Activo'],
      ],
    ],
    values: { icurso: 'C001', ncurso: 'Nómina electrónica', activo: true },
  };

  const demo = root.querySelector('#fDemo');
  if (demo) {
    demo.fromJSON(schema);
    paint(out, demo.toJSON());
    demo.addEventListener('is-submit', (e) => {
      paint(out, e.detail?.json ?? demo.toJSON());
      paintLog('is-submit');
    });
    demo.addEventListener('is-cancel', () => paintLog('is-cancel'));
  }

  root.querySelector('#fBtnToJson')?.addEventListener('click', () => {
    if (!demo) return;
    paint(out, demo.toJSON());
    paintLog('toJSON()');
  });

  root.querySelector('#fBtnSet')?.addEventListener('click', () => {
    if (!demo) return;
    demo.setValues({
      icurso: 'C099',
      ncurso: 'Inventarios',
      activo: false,
    });
    paint(out, demo.getValues());
    paintLog('setValues(demo)');
  });

  const round = root.querySelector('#fRound');
  paint(bodyOut, schema.body);

  const remount = () => {
    if (!round) return;
    round.fromJSON({
      submitLabel: 'Guardar',
      body: schema.body,
      values: { icurso: 'C002', ncurso: 'Contabilidad', activo: true },
    });
    paint(bodyOut, round.html2json());
    paintLog('fromJSON(body)');
  };

  root.querySelector('#fBtnRemount')?.addEventListener('click', remount);
  remount();
}

export function unmount() {
  /* no-op */
}
