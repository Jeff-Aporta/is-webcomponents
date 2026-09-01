import '../actions/button.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import {
  addMonths,
  clampISO,
  daysInMonth,
  firstDayOfWeek,
  inRangeISO,
  isoOf,
  isoWeek,
  monthKey,
  monthLabels,
  parseISO,
  startOfMonth,
  todayISO,
  toISO,
  weekdayLabels,
} from '../_shared/date-utils.js';
import '../actions/dropdown.js';
import './month-calendar.js';
import './year-calendar.js';
import { ElementBase } from '../../core/element-base.js';
/**
 * <is-date-picker> — Calendario inline (equivalente a DateCalendar de MUI X).
 *
 * Tres vistas: día, mes y año. El mes y el año del encabezado son triggers de
 * un is-dropdown para saltar sin encadenar clics en las flechas.
 *
 * Atributos:
 *   value            yyyy-mm-dd · rango: `inicio/fin`
 *   mode             single | range
 *   min / max        ISO
 *   view             day | month | year   (vista mostrada)
 *   views            subconjunto permitido, p. ej. "month year"
 *   open-to          vista inicial
 *   locale, first-day-of-week (0=domingo), weekday-width (narrow|short|long)
 *   show-outside-days, fixed-weeks, show-week-numbers
 *   disable-past, disable-future, disabled-dates="ISO,ISO", disabled-days="0,6"
 *   disabled, readonly
 * Events: is-change { value } | { start, end } · is-view-change { view }
 *         is-month-change { month }
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base">
      <div class="nav" part="nav">
        <is-button variant="plain" pill class="nav-btn" data-nav="-1" aria-label="Anterior">‹</is-button>
        <div class="nav-title" part="month-label">
          <is-dropdown class="jump" data-jump="month" placement="bottom">
            <is-button variant="plain" with-caret slot="trigger" class="nav-select" part="month-select">
              <span class="nav-select-text"></span><span class="caret" aria-hidden="true">▾</span>
            </is-button>
          </is-dropdown>
          <is-dropdown class="jump" data-jump="year" placement="bottom">
            <is-button variant="plain" with-caret slot="trigger" class="nav-select" part="year-select">
              <span class="nav-select-text"></span><span class="caret" aria-hidden="true">▾</span>
            </is-button>
          </is-dropdown>
        </div>
        <is-button variant="plain" pill class="nav-btn" data-nav="1" aria-label="Siguiente">›</is-button>
      </div>
      <div class="day-view">
        <div class="weekdays" part="weekdays"></div>
        <div class="grid" part="grid" role="grid"></div>
      </div>
      <is-month-calendar class="month-view" part="month-view" hidden></is-month-calendar>
      <is-year-calendar class="year-view" part="year-view" hidden></is-year-calendar>
    </div>
  `;

  const OBSERVED = [
    'value', 'mode', 'min', 'max', 'locale', 'view', 'views', 'open-to',
    'first-day-of-week', 'weekday-width', 'show-outside-days', 'fixed-weeks',
    'show-week-numbers', 'disable-past', 'disable-future', 'disabled-dates',
    'disabled-days', 'disabled', 'readonly', 'preview-to', 'nav', 'month',
  ];

  const VIEWS = ['day', 'month', 'year'];

  function isoSet(attr) {
    return new Set(String(attr || '').split(/[\s,]+/).filter(Boolean));
  }

  class IsDatePicker extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    radius: '--is-datepicker-radius',
    'border-color': { prop: '--is-datepicker-border', onlyColorValues: true },
    bg: { prop: '--is-datepicker-bg', onlyColorValues: true },
    };

    static get observedAttributes(): string[] { return [...OBSERVED, 'radius', 'border-color', 'bg']; }

    #base!: HTMLElement;
    #nav!: HTMLElement;
    #monthDd!: HTMLElement;
    #yearDd!: HTMLElement;
    #monthText!: HTMLElement;
    #yearText!: HTMLElement;
    #weekdays!: HTMLElement;
    #grid!: HTMLElement;
    #dayView!: HTMLElement;
    #monthView!: HTMLElement;
    #yearView!: HTMLElement;
    #view = startOfMonth(new Date());
    #rangeStart = null;
    #rangeEnd = null;
    #pickingEnd = false;
    #hoverIso = null;
    #focusIso = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      this.#base = shadow.querySelector<HTMLElement>('.base')!;
      this.#nav = shadow.querySelector<HTMLElement>('.nav')!;
      this.#monthDd = shadow.querySelector<HTMLElement>('[data-jump="month"]')!;
      this.#yearDd = shadow.querySelector<HTMLElement>('[data-jump="year"]')!;
      this.#monthText = this.#monthDd.querySelector<HTMLElement>('.nav-select-text')!;
      this.#yearText = this.#yearDd.querySelector<HTMLElement>('.nav-select-text')!;
      this.#weekdays = shadow.querySelector<HTMLElement>('.weekdays')!;
      this.#grid = shadow.querySelector<HTMLElement>('.grid')!;
      this.#dayView = shadow.querySelector<HTMLElement>('.day-view')!;
      this.#monthView = shadow.querySelector<HTMLElement>('.month-view')!;
      this.#yearView = shadow.querySelector<HTMLElement>('.year-view')!;

      this.#wireJump(this.#monthDd, 'month');
      this.#wireJump(this.#yearDd, 'year');
      this.#nav.addEventListener('click', this.#onNav);
      this.#grid.addEventListener('click', this.#onPick);
      this.#grid.addEventListener('keydown', this.#onGridKey);
      this.#grid.addEventListener('pointerover', this.#onDayEnter);
      this.#grid.addEventListener('focusin', this.#onDayEnter);
      this.#grid.addEventListener('pointerleave', this.#onDayLeave);
      this.#grid.addEventListener('focusout', this.#onDayLeave);
      this.#monthView.addEventListener('is-change', this.#onMonthView);
      this.#yearView.addEventListener('is-change', this.#onYearView);
    }

    onConnected() {
      if (!this.hasAttribute('mode')) this.setAttribute('mode', 'single');
      if (!this.hasAttribute('view')) {
        this.setAttribute('view', this.getAttribute('open-to') || this.views[0]);
      }
      this.#parseValueAttr();
      this.#render();
    }

    onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
      if (name === 'value' || name === 'mode') this.#parseValueAttr();
      if (name === 'view') emit(this, 'is-view-change', { view: this.view });
      if (name === 'month' && newVal && newVal !== monthKey(this.#view)) {
        const d = parseISO(`${newVal}-01`);
        if (d) this.#view = d;
      }
      this.#render();
      if (name === 'preview-to') this.#paintPreview();
    }

    /* ── API ──────────────────────────────────────────────────────────── */

    get value() { return this.getAttribute('value') ?? ''; }
    set value(v) { v ? this.setAttribute('value', String(v)) : this.removeAttribute('value'); }

    get mode() { return this.getAttribute('mode') === 'range' ? 'range' : 'single'; }
    set mode(v) { this.setAttribute('mode', v === 'range' ? 'range' : 'single'); }

    get locale() { return this.getAttribute('locale') || document.documentElement.lang || undefined; }
    set locale(v) { v ? this.setAttribute('locale', v) : this.removeAttribute('locale'); }

    get min() { return this.getAttribute('min') ?? ''; }
    set min(v) { v ? this.setAttribute('min', v) : this.removeAttribute('min'); }

    get max() { return this.getAttribute('max') ?? ''; }
    set max(v) { v ? this.setAttribute('max', v) : this.removeAttribute('max'); }

    /** Vistas permitidas, en el orden en que se recorren. */
    get views() {
      const raw = String(this.getAttribute('views') || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
      const list = VIEWS.filter((v) => raw.includes(v));
      return list.length ? list : VIEWS.slice();
    }
    set views(v) { this.setAttribute('views', Array.isArray(v) ? v.join(' ') : String(v)); }

    get view() {
      const v = this.getAttribute('view');
      return this.views.includes(v) ? v : this.views[0];
    }
    set view(v) { this.setAttribute('view', v); }

    /** Mes visible, `yyyy-mm`. Como atributo, fija el mes (modo controlado). */
    get month() { return monthKey(this.#view); }
    set month(v) { this.setAttribute('month', String(v)); }

    /** Mueve la vista sin pasar por el atributo (útil en modo controlado). */
    showMonth(key) {
      const d = parseISO(`${key}-01`);
      if (d) this.#setView(d, { silent: true });
    }

    /**
     * Fin tentativo del rango impuesto desde fuera: lo usa is-date-range-picker
     * para que el hover en un mes pinte la banda en todos los calendarios.
     */
    get previewTo() { return this.getAttribute('preview-to') || null; }
    set previewTo(v) { v ? this.setAttribute('preview-to', v) : this.removeAttribute('preview-to'); }

    /** Flechas visibles: both | prev | next | none. */
    get nav() {
      const v = this.getAttribute('nav');
      return ['both', 'prev', 'next', 'none'].includes(v) ? v : 'both';
    }
    set nav(v) { this.setAttribute('nav', v); }

    get firstDayOfWeek() {
      const attr = this.getAttribute('first-day-of-week');
      const n = Number(attr);
      if (attr != null && attr !== '' && n >= 0 && n <= 6) return n;
      return firstDayOfWeek(this.locale);
    }
    set firstDayOfWeek(v) { this.setAttribute('first-day-of-week', String(v)); }

    get showOutsideDays() { return this.hasAttribute('show-outside-days'); }
    set showOutsideDays(v) { this.toggleAttribute('show-outside-days', !!v); }

    get fixedWeeks() { return this.hasAttribute('fixed-weeks'); }
    set fixedWeeks(v) { this.toggleAttribute('fixed-weeks', !!v); }

    get showWeekNumbers() { return this.hasAttribute('show-week-numbers'); }
    set showWeekNumbers(v) { this.toggleAttribute('show-week-numbers', !!v); }

    get disablePast() { return this.hasAttribute('disable-past'); }
    set disablePast(v) { this.toggleAttribute('disable-past', !!v); }

    get disableFuture() { return this.hasAttribute('disable-future'); }
    set disableFuture(v) { this.toggleAttribute('disable-future', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get readonly() { return this.hasAttribute('readonly'); }
    set readonly(v) { this.toggleAttribute('readonly', !!v); }

    /** Días bloqueados uno a uno: `disabled-dates="2026-07-04 2026-07-05"`. */
    get disabledDates() { return isoSet(this.getAttribute('disabled-dates')); }
    set disabledDates(v) {
      this.setAttribute('disabled-dates', Array.isArray(v) ? v.join(' ') : String(v));
    }

    /** Días de la semana bloqueados: `disabled-days="0 6"` (domingo y sábado). */
    get disabledDays() {
      return new Set(
        String(this.getAttribute('disabled-days') || '')
          .split(/[\s,]+/).filter(Boolean).map(Number).filter((n: number) => n >= 0 && n <= 6),
      );
    }
    set disabledDays(v) {
      this.setAttribute('disabled-days', Array.isArray(v) ? v.join(' ') : String(v));
    }

    /** Mueve la vista N meses (o años, si la vista es de meses). */
    navigate(delta) {
      this.#setView(this.view === 'month'
        ? new Date(this.#view.getFullYear() + delta, this.#view.getMonth(), 1)
        : addMonths(this.#view, delta));
    }

    /** Deja el foco del teclado en un día concreto (navega de mes si hace falta). */
    focusDate(iso) {
      const d = parseISO(iso);
      if (!d) return;
      this.#focusIso = iso;
      if (monthKey(d) !== this.month) this.#setView(startOfMonth(d));
      else this.#render();
      this.#grid.querySelector<HTMLElement>(`[data-iso="${iso}"]`)?.focus();
    }

    clear() {
      this.#rangeStart = null;
      this.#rangeEnd = null;
      this.#pickingEnd = false;
      this.removeAttribute('value');
      this.#render();
    }

    /* ── Interno ──────────────────────────────────────────────────────── */

    /** Punto único de cambio de mes: repinta y avisa una sola vez. */
    #setView(date, { silent = false } = {}) {
      this.#view = startOfMonth(date);
      this.#render();
      if (!silent) emit(this, 'is-month-change', { month: monthKey(this.#view) });
    }

    #parseValueAttr() {
      // Un cambio de value/mode desde fuera invalida el día señalado: el puntero
      // no tiene por qué seguir sobre el calendario.
      this.#hoverIso = null;
      const raw = this.value.trim();
      if (this.mode === 'range') {
        const parts = raw.split(/\s*[/,|]\s*/).filter(Boolean);
        this.#rangeStart = parts[0] && parseISO(parts[0]) ? parts[0] : null;
        this.#rangeEnd = parts[1] && parseISO(parts[1]) ? parts[1] : null;
        this.#pickingEnd = !!this.#rangeStart && !this.#rangeEnd;
        this.#view = this.#viewForValue(parseISO(this.#rangeStart) || parseISO(this.#rangeEnd));
      } else {
        this.#rangeStart = raw && parseISO(raw) ? raw : null;
        this.#rangeEnd = null;
        this.#pickingEnd = false;
        this.#view = this.#viewForValue(parseISO(this.#rangeStart));
      }
    }

    /**
     * Con atributo `month` el mes lo manda quien nos usa (is-date-range-picker
     * empuja el mismo rango a varios calendarios y cada uno muestra el suyo);
     * sin él, la vista sigue al valor.
     */
    #viewForValue(anchor) {
      const attr = this.getAttribute('month');
      const controlled = attr && parseISO(`${attr}-01`);
      if (controlled) return controlled;
      return anchor ? startOfMonth(anchor) : this.#view;
    }

    #writeValue() {
      if (this.mode === 'range' && this.#rangeStart && this.#rangeEnd) {
        this.setAttribute('value', `${this.#rangeStart}/${this.#rangeEnd}`);
      } else if (this.#rangeStart) {
        this.setAttribute('value', this.#rangeStart);
      } else {
        this.removeAttribute('value');
      }
    }

    /** Reglas de bloqueo acumuladas: rango, pasado/futuro, fechas y días sueltos. */
    #isDayDisabled(iso, date) {
      if (this.disabled) return true;
      if (!inRangeISO(iso, this.min, this.max)) return true;
      if (this.disablePast && iso < todayISO()) return true;
      if (this.disableFuture && iso > todayISO()) return true;
      if (this.disabledDates.has(iso)) return true;
      if (this.disabledDays.has(date.getDay())) return true;
      return false;
    }

    #monthReachable(year, month) {
      const first = isoOf(year, month, 1);
      const last = isoOf(year, month, daysInMonth(year, month));
      if (this.min && last < this.min) return false;
      if (this.max && first > this.max) return false;
      if (this.disableFuture && first > todayISO()) return false;
      if (this.disablePast && last < todayISO()) return false;
      return true;
    }

    /**
     * Las listas se llenan al abrir: así siempre reflejan la vista actual y no
     * se crean 12 + N custom elements en cada repintado del calendario.
     */
    #wireJump(dd: HTMLElement, kind) {
      dd.addEventListener('is-show', () => {
        if (kind === 'month') this.#fillMonths();
        else this.#fillYears();
      });

      dd.addEventListener('is-after-show', () => {
        // El propio dropdown enfoca el primer ítem en un rAF; este va después.
        requestAnimationFrame(() => {
          const active = dd.querySelector<HTMLElement>('is-dropdown-item[checked]');
          if (!active) return;
          active.focus();
          active.scrollIntoView({ block: 'center' });
        });
      });

      dd.addEventListener('is-select', (e) => {
        const n = Number(e.detail?.item?.value);
        if (!Number.isFinite(n)) return;
        this.#view = kind === 'month'
          ? new Date(this.#view.getFullYear(), n, 1)
          : new Date(n, this.#view.getMonth(), 1);
        emit(this, 'is-month-change', { month: this.month });
        this.#render();
      });

      // Los eventos del dropdown interno no son API de is-date-picker.
      for (const type of ['is-show', 'is-hide', 'is-after-show', 'is-after-hide', 'is-select']) {
        dd.addEventListener(type, (e) => e.stopPropagation());
      }
    }

    /** Solo los ítems: el trigger también es hijo del is-dropdown. */
    #setJumpItems(dd, items) {
      for (const old of dd.querySelectorAll<HTMLElement>(':scope > is-dropdown-item')) old.remove();
      dd.append(...items);
    }

    #jumpItem(value: string, label, active, disabled) {
      const item = document.createElement('is-dropdown-item');
      item.value = String(value);
      item.textContent = label;
      if (active) {
        item.type = 'checkbox';
        item.checked = true;
      }
      if (disabled) item.disabled = true;
      return item;
    }

    #fillMonths() {
      const year = this.#view.getFullYear();
      const labels = monthLabels(this.locale, { width: 'long', year });
      this.#setJumpItems(this.#monthDd, labels.map((label, m) => this.#jumpItem(
        m, label, m === this.#view.getMonth(), !this.#monthReachable(year, m),
      )));
    }

    #fillYears() {
      const current = this.#view.getFullYear();
      // Sin min/max no hay lista finita: una ventana alrededor de la vista, que
      // se recentra cada vez que se abre.
      const from = Math.min(this.min ? +this.min.slice(0, 4) : current - 12, current);
      const until = Math.max(this.max ? +this.max.slice(0, 4) : current + 12, current);
      const items = [];
      for (let y = from; y <= until; y++) items.push(this.#jumpItem(y, String(y), y === current, false));
      this.#setJumpItems(this.#yearDd, items);
    }

    /* ── Render ───────────────────────────────────────────────────────── */

    #render() {
      const view = this.view;
      this.#base.dataset.view = view;
      const year = this.#view.getFullYear();
      const month = this.#view.getMonth();

      this.#monthText.textContent = monthLabels(this.locale, { width: 'long', year })[month];
      this.#yearText.textContent = String(year);

      const views = this.views;
      this.#monthDd.hidden = view !== 'day' || !views.includes('month');
      this.#yearDd.hidden = view === 'year' || !views.includes('year');
      const nav = this.nav;
      for (const btn of this.#nav.querySelectorAll<HTMLElement>('[data-nav]')) {
        const side = btn.dataset.nav === '-1' ? 'prev' : 'next';
        btn.hidden = view === 'year' || nav === 'none' || (nav !== 'both' && nav !== side);
      }

      this.#dayView.hidden = view !== 'day';
      this.#monthView.hidden = view !== 'month';
      this.#yearView.hidden = view !== 'year';

      if (view === 'day') this.#renderDays(year, month);
      else if (view === 'month') this.#renderMonthView(year);
      else this.#renderYearView(year);
    }

    #renderMonthView(year: string) {
      this.#monthView.setAttribute('year', String(year));
      const selected = this.#rangeStart && parseISO(this.#rangeStart);
      if (selected && selected.getFullYear() === year) {
        this.#monthView.setAttribute('value', this.#rangeStart.slice(0, 7));
      } else {
        this.#monthView.removeAttribute('value');
      }
      this.#mirror(this.#monthView, ['min', 'max', 'locale', 'disabled', 'readonly']);
    }

    #renderYearView(year: string) {
      this.#yearView.setAttribute('value', String(year));
      this.#mirror(this.#yearView, ['min', 'max', 'disabled', 'readonly']);
      this.#yearView.scrollToSelection?.();
    }

    #mirror(el: HTMLElement, names) {
      for (const name of names) {
        if (name === 'locale') {
          const v = this.locale;
          if (v) el.setAttribute(name, v);
          else el.removeAttribute(name);
          continue;
        }
        // Los booleanos llegan como cadena vacía: hasAttribute distingue present/ausente.
        if (this.hasAttribute(name)) el.setAttribute(name, this.getAttribute(name) ?? '');
        else el.removeAttribute(name);
      }
    }

    #renderWeekdays(fdow) {
      const labels = weekdayLabels(this.locale, {
        width: this.getAttribute('weekday-width') || 'short',
        firstDay: fdow,
      });
      const cells = [];
      if (this.showWeekNumbers) {
        const corner = document.createElement('div');
        corner.className = 'wd wk';
        corner.setAttribute('aria-hidden', 'true');
        corner.textContent = '#';
        cells.push(corner);
      }
      for (const label of labels) {
        const el = document.createElement('div');
        el.className = 'wd';
        el.setAttribute('role', 'columnheader');
        el.textContent = label;
        cells.push(el);
      }
      this.#weekdays.replaceChildren(...cells);
    }

    #renderDays(year, month) {
      const fdow = this.firstDayOfWeek;
      this.#renderWeekdays(fdow);
      this.#base.style.setProperty('--is-dp-cols', this.showWeekNumbers ? '2.2em repeat(7, 1fr)' : 'repeat(7, 1fr)');

      const total = daysInMonth(year, month);
      const lead = (new Date(year, month, 1).getDay() - fdow + 7) % 7;
      const rows = this.fixedWeeks ? 6 : Math.ceil((lead + total) / 7);
      const today = todayISO();
      const focusTarget = this.#pickFocusIso(year, month, total);

      const weeks = [];
      for (let r = 0; r < rows; r++) {
        const row = document.createElement('div');
        row.className = 'week';
        row.setAttribute('role', 'row');

        if (this.showWeekNumbers) {
          const firstOfRow = new Date(year, month, 1 - lead + r * 7);
          const wk = document.createElement('div');
          wk.className = 'wknum';
          wk.setAttribute('role', 'rowheader');
          wk.setAttribute('part', 'week-number');
          wk.textContent = String(isoWeek(toISO(firstOfRow)));
          row.appendChild(wk);
        }

        for (let c = 0; c < 7; c++) {
          const date = new Date(year, month, 1 - lead + r * 7 + c);
          const iso = toISO(date);
          const outside = date.getMonth() !== month || date.getFullYear() !== year;

          if (outside && !this.showOutsideDays) {
            const filler = document.createElement('div');
            filler.className = 'day empty';
            filler.setAttribute('role', 'gridcell');
            row.appendChild(filler);
            continue;
          }

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'day';
          btn.setAttribute('part', 'day');
          btn.setAttribute('role', 'gridcell');
          btn.dataset.iso = iso;
          btn.textContent = String(date.getDate());
          if (outside) btn.setAttribute('data-outside', '');
          if (iso === today) btn.setAttribute('data-today', '');
          const selected = iso === this.#rangeStart || iso === this.#rangeEnd;
          btn.setAttribute('aria-selected', String(selected));
          if (selected) btn.setAttribute('data-selected', '');
          if (this.#isInSelection(iso)) btn.setAttribute('data-in-range', '');
          if (this.#isDayDisabled(iso, date)) {
            btn.disabled = true;
            btn.setAttribute('data-disabled', '');
          }
          btn.tabIndex = iso === focusTarget ? 0 : -1;
          row.appendChild(btn);
        }
        weeks.push(row);
      }

      this.#grid.replaceChildren(...weeks);
      this.#paintPreview();
    }

    /** Única parada del tabulador dentro de la rejilla. */
    #pickFocusIso(year, month, total) {
      const candidates = [this.#focusIso, this.#rangeStart, this.#rangeEnd, todayISO()];
      for (const iso of candidates) {
        if (!iso) continue;
        const d = parseISO(iso);
        if (!d || d.getFullYear() !== year || d.getMonth() !== month) continue;
        if (!this.#isDayDisabled(iso, d)) return iso;
      }
      for (let day = 1; day <= total; day++) {
        const iso = isoOf(year, month, day);
        if (!this.#isDayDisabled(iso, new Date(year, month, day))) return iso;
      }
      return null;
    }

    #isInSelection(iso) {
      if (!this.#rangeStart) return false;
      if (this.mode !== 'range' || !this.#rangeEnd) return iso === this.#rangeStart;
      const a = this.#rangeStart < this.#rangeEnd ? this.#rangeStart : this.#rangeEnd;
      const b = this.#rangeStart < this.#rangeEnd ? this.#rangeEnd : this.#rangeStart;
      return iso >= a && iso <= b;
    }

    /** Hay un inicio de rango esperando su fin: se puede previsualizar. */
    #isPreviewing() {
      return this.mode === 'range' && this.#pickingEnd && !!this.#rangeStart && !this.#rangeEnd;
    }

    /**
     * Pinta el rango tentativo entre el inicio y el día bajo el cursor / foco.
     * Toca solo atributos de las celdas ya renderizadas: repintar el grid
     * perdería el hover y el foco en cada movimiento.
     */
    #paintPreview() {
      // El hover propio manda; `preview-to` cubre el caso de varios calendarios
      // compartiendo un mismo rango.
      const to = this.#isPreviewing() ? (this.#hoverIso ?? this.previewTo) : null;
      const back = to && to < this.#rangeStart;
      const from = back ? to : this.#rangeStart;
      const until = back ? this.#rangeStart : to;

      for (const cell of this.#grid.querySelectorAll<HTMLElement>('.day')) {
        const iso = cell.dataset.iso;
        if (!iso) continue;
        cell.toggleAttribute('data-in-preview', !!to && iso >= from && iso <= until);
        if (to && iso === to && iso !== this.#rangeStart) {
          cell.setAttribute('data-preview-edge', back ? 'start' : 'end');
        } else {
          cell.removeAttribute('data-preview-edge');
        }
      }
    }

    #setHover(iso) {
      if (this.#hoverIso === iso) return;
      this.#hoverIso = iso;
      this.#paintPreview();
      if (this.mode === 'range') emit(this, 'is-day-hover', { iso });
    }

    /* ── Eventos ──────────────────────────────────────────────────────── */

    #onDayEnter = (e) => {
      const btn = e.target.closest?.('button.day');
      if (!btn || btn.disabled) return;
      this.#setHover(btn.dataset.iso);
    };

    #onDayLeave = (e) => {
      if (e.relatedTarget && this.#grid.contains(e.relatedTarget)) return;
      this.#setHover(null);
    };

    #onNav = (e) => {
      const btn = e.target.closest('[data-nav]');
      if (!btn) return;
      this.navigate(Number(btn.dataset.nav));
    };

    #onPick = (e) => {
      const btn = e.target.closest('button.day');
      if (!btn || btn.disabled) return;
      this.#commitDay(btn.dataset.iso);
    };

    #commitDay(iso) {
      if (this.readonly || this.disabled) return;
      this.#focusIso = iso;

      if (this.mode === 'range') {
        if (!this.#pickingEnd) {
          this.#rangeStart = iso;
          this.#rangeEnd = null;
          this.#pickingEnd = true;
        } else {
          if (iso < this.#rangeStart) {
            this.#rangeEnd = this.#rangeStart;
            this.#rangeStart = iso;
          } else {
            this.#rangeEnd = iso;
          }
          this.#pickingEnd = false;
        }
        this.#writeValue();
        this.#render();
        emit(this, 'is-change', { start: this.#rangeStart, end: this.#rangeEnd });
        return;
      }

      this.#rangeStart = iso;
      this.#writeValue();
      this.#render();
      emit(this, 'is-change', { value: iso });
    }

    #onGridKey = (e) => {
      const btn = e.target.closest?.('button.day');
      if (!btn) return;
      const iso = btn.dataset.iso;
      const shift = e.shiftKey;
      const moves = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
      };

      if (e.key in moves) {
        e.preventDefault();
        this.#moveFocus(iso, moves[e.key]);
        return;
      }
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        const d = parseISO(iso);
        const offset = (d.getDay() - this.firstDayOfWeek + 7) % 7;
        const target = new Date(d);
        target.setDate(d.getDate() + (e.key === 'Home' ? -offset : 6 - offset));
        this.#moveFocusTo(toISO(target), e.key === 'Home' ? -1 : 1);
        return;
      }
      if (e.key === 'PageUp' || e.key === 'PageDown') {
        e.preventDefault();
        const dir = e.key === 'PageUp' ? -1 : 1;
        const d = parseISO(iso);
        const target = shift
          ? new Date(d.getFullYear() + dir, d.getMonth(), 1)
          : addMonths(d, dir);
        const day = Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
        this.#moveFocusTo(isoOf(target.getFullYear(), target.getMonth(), day), dir);
      }
    };

    #moveFocus(fromIso, step: number) {
      const d = parseISO(fromIso);
      if (!d) return;
      d.setDate(d.getDate() + step);
      this.#moveFocusTo(toISO(d), step > 0 ? 1 : -1);
    }

    /** Aterriza en `iso`; si está bloqueado, sigue buscando en esa dirección. */
    #moveFocusTo(iso, dir) {
      let target = clampISO(iso, this.min, this.max);
      for (let i = 0; i < 40; i++) {
        const d = parseISO(target);
        if (!d) return;
        if (!this.#isDayDisabled(target, d)) {
          this.focusDate(target);
          return;
        }
        d.setDate(d.getDate() + dir);
        target = toISO(d);
        if (!inRangeISO(target, this.min, this.max)) return;
      }
    }

    #onMonthView = (e) => {
      e.stopPropagation();
      const { year, month } = e.detail;
      this.#view = new Date(year, month, 1);
      emit(this, 'is-month-change', { month: this.month });
      const views = this.views;
      if (views.includes('day')) {
        this.view = 'day';
        this.#render();
        return;
      }
      // Sin vista de días, elegir mes es elegir valor: primer día alcanzable.
      this.#commitDay(clampISO(isoOf(year, month, 1), this.min, this.max));
    };

    #onYearView = (e) => {
      e.stopPropagation();
      const { year } = e.detail;
      this.#view = new Date(year, this.#view.getMonth(), 1);
      const views = this.views;
      const next = views.includes('month') ? 'month' : views.includes('day') ? 'day' : null;
      if (next) {
        this.view = next;
        this.#render();
        return;
      }
      this.#commitDay(clampISO(isoOf(year, 0, 1), this.min, this.max));
    };
  }

  defineElement('is-date-picker', IsDatePicker, 'IsDatePicker');
})();
