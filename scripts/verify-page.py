"""Verifica shell, iframe, temas, paletas y loading."""
from playwright.sync_api import sync_playwright

URL = "http://localhost:8765/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto(URL, wait_until="networkidle")

    frame = page.frame_locator("#previewFrame")
    frame.locator("is-button").first.wait_for()
    assert frame.locator("is-button").count() > 0
    assert page.locator("#themeToggle").inner_text().strip() == ""

    page.locator("#brand").click()
    page.locator('#brandMenu [data-palette="contapyme"]').click()
    page.wait_for_timeout(100)
    assert frame.locator("html").get_attribute("data-palette") == "contapyme"
    conta = frame.locator("html").evaluate(
        "el => getComputedStyle(el).getPropertyValue('--is-color-brand-500').trim()"
    )
    assert conta == "dodgerblue", conta

    page.locator("#brand").click()
    page.locator('#brandMenu [data-palette="agrowin"]').click()
    page.wait_for_timeout(100)
    agro = frame.locator("html").evaluate(
        "el => getComputedStyle(el).getPropertyValue('--is-color-brand-500').trim()"
    )
    assert agro == "yellowgreen", agro

    old_theme = frame.locator("html").get_attribute("data-theme")
    page.locator("#themeToggle").click()
    page.wait_for_timeout(100)
    assert frame.locator("html").get_attribute("data-theme") != old_theme

    loading = frame.locator("#loadingDemo")
    loading.click()
    assert loading.get_attribute("loading") == ""
    spinner = loading.evaluate(
        "el => getComputedStyle(el.shadowRoot.querySelector('.btn__spinner')).display"
    )
    assert spinner in ("flex", "inline-flex"), spinner
    page.wait_for_timeout(1900)
    assert loading.get_attribute("loading") is None
    assert not page_errors, page_errors
    print("gallery runtime: ok")
    browser.close()
