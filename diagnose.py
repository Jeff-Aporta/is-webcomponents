"""Diagnóstico del bug icon-only + del sistema de eventos."""
from playwright.sync_api import sync_playwright

URL = "http://localhost:8765/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.goto(URL, wait_until="networkidle")

    # 1) Verificar que los labels se renderizan (vía slot assignedNodes)
    print("=== Label rendering (slot.assignedNodes) ===")
    for sel, expected in [("#apiBtn", "Hazme click"), ("#pgBtn", "Hola mundo"), ("#evtBtn", "Probar eventos")]:
        info = page.locator(sel).evaluate("""el => {
            const slot = el.shadowRoot.querySelector('slot:not([name])');
            const nodes = slot.assignedNodes();
            return {
                tag: el.tagName,
                slotChildren: nodes.length,
                labelText: nodes.map(n => n.textContent.trim()).join('')
            };
        }""")
        ok = info["labelText"] == expected
        print(f"  {sel:<10} slotChildren={info['slotChildren']}  label='{info['labelText']}'  {'OK' if ok else 'MISMATCH'}")

    # 2) Diagnosticar icon-only
    print()
    print("=== Icon-only diagnostic ===")
    page.evaluate("""() => {
        const b = document.createElement('wa-button');
        b.id = 'ioTest';
        b.variant = 'brand';
        b.innerHTML = '<svg viewBox=\\"0 0 16 16\\" fill=\\"currentColor\\" width=\\"1em\\" height=\\"1em"><use href=\\"#i-gear\\"/></svg>';
        document.body.appendChild(b);
    }""")
    info = page.locator("#ioTest").evaluate("""el => {
        const slots = el.shadowRoot.querySelectorAll('slot');
        const slotInfo = Array.from(slots).map(s => ({
            name: s.name || '(default)',
            assigned: s.assignedNodes().map(n => n.nodeType === 1 ? '<' + n.tagName + '>' : '#text').join(',')
        }));
        return {
            internalsExists: !!el.internals_,
            matches: el.matches(':state(icon-button)'),
            // Leemos el states via WeakMap o try
            slotInfo
        };
    }""")
    print(f"  {info}")

    # Intentar leer states via try/catch
    state_info = page.evaluate("""() => {
        const el = document.getElementById('ioTest');
        try {
            // @ts-ignore
            const i = el.attachInternals ? el.attachInternals() : null;
            return { hasInternals: !!i, hasStates: !!(i && i.states) };
        } catch (e) {
            return { error: e.message };
        }
    }""")
    print(f"  internals test: {state_info}")

    # 3) Verificar version del navegador
    ver = page.evaluate("navigator.userAgent")
    print()
    print(f"=== Browser ===\n  {ver}")

    browser.close()
