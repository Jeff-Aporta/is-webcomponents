import '../actions/button.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { escapeHtml } from '../_shared/dom-utils.js';

/**
 * <is-full-calendar> — Vista día/semana/mes con eventos.
 *
 * Atributos
 *   view         month | week | day  (default month)
 *   date         fecha inicial ISO (default hoy)
 *   first-day    0=domingo, 1=lunes (default 1)
 *   locale       etiqueta del tag Intl (default 'es')
 *   hours-start, hours-end  rango horario en week/day (default 7..20)
 *
 * Datos
 *   <script type="application/json">
 *   { events: [{ id, title, date: 'YYYY-MM-DD', start: 'HH:MM', end?: 'HH:MM', color? }, ...] }
 *   </script>
 *
 * API
 *   cal.setDate(iso)   cal.setView(view)   cal.prev()   cal.next()   cal.today()
 *   cal.events         array vivo (read-only)
 *
 * Eventos
 *   is-day-click       detail: { date }
 *   is-event-click     detail: { event, date }
 *   is-view-change     detail: { view, date }
 */
(() => {
  const OBSERVED = ['view', 'date', 'first-day', 'locale', 'hours-start', 'hours-end'];

  class IsFullCalendar extends HTMLElement {
    static get observedAttributes(): string[] { return OBSERVED; }
    #mounted = false;
    #events = [];
    #cursor = new Date();
    #title!: HTMLElement;
    #grid!: HTMLElement;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot!.innerHTML = /* html */ `
        <div part="root" class="root">
          <header part="toolbar" class="toolbar">
            <is-button variant="outlined" class="ctrl" data-act="prev" aria-label="Anterior">‹</is-button>
            <is-button variant="outlined" class="ctrl today" data-act="today">Hoy</is-button>
            <is-button variant="outlined" class="ctrl" data-act="next" aria-label="Siguiente">›</is-button>
            <span class="title" id="ttl"></span>
            <span class="spacer"></span>
            <is-button variant="filled" color="brand" class="view-btn is-active" data-view="month">Mes</is-button>
            <is-button variant="outlined" class="view-btn" data-view="week">Semana</is-button>
            <is-button variant="outlined" class="view-btn" data-view="day">Día</is-button>
          </header>
          <div part="grid" class="grid" id="grid"></div>
        </div>
      `;
      adoptCss(this.shadowRoot!, import.meta.url);
      this.#title = this.shadowRoot!.getElementById('ttl')!;
      this.#grid = this.shadowRoot!.getElementById('grid')!;
      this.#grid.addEventListener('click', (e) => this.#onClick(e));
      this.shadowRoot!.querySelector<HTMLElement>('.toolbar').addEventListener('click', (e) => this.#onToolbar(e));
    }

    connectedCallback(): void {
      this.#mounted = true;
      const d = this.getAttribute('date');
      if (d) this.#cursor = new Date(d);
      this.#readEvents();
      this.#syncViewButtons(this.getAttribute('view') || 'month');
      this.#render();
    }

    attributeChangedCallback() {
      if (!this.#mounted) return;
      this.#render();
    }

    get events() { return this.#events; }
    set events(list) {
      this.#events = Array.isArray(list) ? list : [];
      if (this.#mounted) this.#render();
    }

    setDate(iso) { this.setAttribute('date', iso); }
    setView(v) { this.setAttribute('view', v); }
    prev() { this.#cursor = shift(this.#cursor, this.getAttribute('view') || 'month', -1); this.#render(); }
    next() { this.#cursor = shift(this.#cursor, this.getAttribute('view') || 'month', +1); this.#render(); }
    today() { this.#cursor = new Date(); this.#render(); }

    #readEvents() {
      const script = [...this.children].find((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
      if (!script) { this.#events = []; return; }
      try { this.#events = (JSON.parse(script.textContent)).events || []; }
      catch { this.#events = []; }
    }

    #onToolbar(e) {
      // `is-button` es el host: el click no llega como <button>.
      const btn = e.target.closest('[data-act],[data-view]');
      if (!btn) return;
      if (btn.dataset.act === 'prev') this.prev();
      else if (btn.dataset.act === 'next') this.next();
      else if (btn.dataset.act === 'today') this.today();
      else if (btn.dataset.view) {
        this.setView(btn.dataset.view);
        this.#syncViewButtons(btn.dataset.view);
        emit(this, 'is-view-change', { view: btn.dataset.view, date: this.#cursor.toISOString() });
      }
    }

    /** El botón activo se marca con la variante de `is-button`, no repintando
     *  fondo desde este CSS: eso caería en el host y no en su <button>. */
    #syncViewButtons(view) {
      this.shadowRoot!.querySelectorAll<HTMLElement>('.view-btn').forEach((b: HTMLElement) => {
        const active = b.dataset.view === view;
        b.classList.toggle('is-active', active);
        b.setAttribute('variant', active ? 'filled' : 'outlined');
        if (active) b.setAttribute('color', 'brand');
        else b.removeAttribute('color');
      });
    }

    #onClick(e) {
      const cell = e.target.closest('[data-iso]');
      if (!cell) return;
      const iso = cell.dataset.iso;
      emit(this, 'is-day-click', { date: iso });
      const ev = e.target.closest('[data-evid]');
      if (ev) {
        const evt = this.#events.find((x) => x.id === ev.dataset.evid);
        emit(this, 'is-event-click', { event: evt, date: iso });
      }
    }

    #render() {
      const view = this.getAttribute('view') || 'month';
      const locale = this.getAttribute('locale') || 'es';
      this.#title.textContent = titleFor(this.#cursor, view, locale);
      if (view === 'month') this.#renderMonth(locale);
      else this.#renderWeekOrDay(view, locale);
    }

    #renderMonth(locale) {
      const firstDay = Number(this.getAttribute('first-day') ?? 1);
      const monthStart = new Date(this.#cursor.getFullYear(), this.#cursor.getMonth(), 1);
      const monthEnd = new Date(this.#cursor.getFullYear(), this.#cursor.getMonth() + 1, 0);
      const offset = (monthStart.getDay() - firstDay + 7) % 7;
      const start = new Date(monthStart); start.setDate(start.getDate() - offset);
      const totalDays = Math.ceil((offset + monthEnd.getDate()) / 7) * 7;
      const today = new Date();
      const wd = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
      const dayOffset = (i) => wd[(i + firstDay - 1) % 7];
      let html = `<div class="month">`;
      for (let i = 0; i < 7; i++) html += `<div class="wk-head">${dayOffset(i)}</div>`;
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const iso = ymd(d);
        const inMonth = d.getMonth() === this.#cursor.getMonth();
        const isToday = sameDay(d, today);
        const events = this.#events.filter((e) => e.date === iso).slice(0, 3);
        html += `<button class="day ${inMonth ? '' : 'out'} ${isToday ? 'today' : ''}" data-iso="${iso}">
          <span class="num">${d.getDate()}</span>
          <ul class="events">${events.map((e) => `<li class="ev" data-evid="${e.id}" style="--c:${e.color || 'var(--is-accent)'}">${escapeHtml(e.title)}</li>`).join('')}</ul>
        </button>`;
      }
      html += `</div>`;
      this.#grid.innerHTML = html;
      this.#grid.dataset.view = 'month';
    }

    #renderWeekOrDay(view, locale) {
      const firstDay = Number(this.getAttribute('first-day') ?? 1);
      const startHour = Number(this.getAttribute('hours-start') ?? 7);
      const endHour = Number(this.getAttribute('hours-end') ?? 20);
      const refDate = new Date(this.#cursor);
      // inicio de la semana
      const day = refDate.getDay();
      const offset = (day - firstDay + 7) % 7;
      const weekStart = new Date(refDate); weekStart.setDate(refDate.getDate() - offset);
      const daysCount = view === 'week' ? 7 : 1;
      const headerDay = (i) => {
        const d = new Date(weekStart);
        if (view === 'day') return new Date(refDate);
        d.setDate(weekStart.getDate() + i);
        return d;
      };
      let html = `<div class="grid-week"><div class="axis"></div>`;
      for (let i = 0; i < daysCount; i++) {
        const d = headerDay(i);
        const iso = ymd(d);
        html += `<div class="col-head" data-iso="${iso}">${d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit' })}</div>`;
      }
      html += `</div><div class="hours">`;
      html += `<div class="axis">`;
      for (let h = startHour; h < endHour; h++) html += `<div class="hour">${pad(h)}:00</div>`;
      html += `</div>`;
      for (let i = 0; i < daysCount; i++) {
        const d = headerDay(i);
        const iso = ymd(d);
        html += `<div class="day-col" data-iso="${iso}">`;
        for (let h = startHour; h < endHour; h++) {
          html += `<button class="cell-hour" data-iso="${iso}" data-hour="${h}" aria-label="${iso} ${pad(h)}:00"></button>`;
        }
        // eventos del día
        const events = this.#events.filter((e) => e.date === iso);
        for (const e of events) {
          if (!e.start) continue;
          const [hh, mm] = (e.start || '00:00').split(':').map(Number);
          const topPct = ((hh - startHour) + mm / 60) / (endHour - startHour);
          const endMin = e.end ? (() => { const [eh, em] = e.end.split(':').map(Number); return (eh - startHour) + em / 60; })() : (hh - startHour) + 1;
          const heightPct = Math.max(((endMin) / (endHour - startHour)) - topPct, 1 / (endHour - startHour));
          html += `<div class="ev-block" data-evid="${e.id}" data-iso="${iso}" style="top:${(topPct * 100).toFixed(2)}%; height:${(heightPct * 100).toFixed(2)}%; --c:${e.color || 'var(--is-accent)'}">
            <strong>${escapeHtml(e.title)}</strong>
            <small>${e.start}${e.end ? `–${e.end}` : ''}</small>
          </div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
      this.#grid.innerHTML = html;
      this.#grid.dataset.view = view;
    }
  }

  function shift(date, view, dir: number) {
    const d = new Date(date);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    return d;
  }

  function titleFor(d, view, locale) {
    if (view === 'month') return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const day = d.getDay();
      const offset = (day + 6) % 7;
      const start = new Date(d); start.setDate(start.getDate() - offset);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const fmt = { day: '2-digit', month: 'short' };
      return `${start.toLocaleDateString(locale, fmt)} – ${end.toLocaleDateString(locale, fmt)}`;
    }
    return d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  function pad(n: string) { return String(n).padStart(2, '0'); }
  function ymd(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  defineElement('is-full-calendar', IsFullCalendar);
})();
