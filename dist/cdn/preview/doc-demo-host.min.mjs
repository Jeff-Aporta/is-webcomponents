/*!
 * ISWC - docs (LLM)
 * md: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/doc-demo.md
 */
var s=new URL("../core/loader.min.mjs?v=mbwzgh",import.meta.url).href,{iswcLoader:e}=await import(s),o=document.querySelector("iswc-doc-demo");o?.hasAttribute("local")?e.configure({local:!0}):o?.hasAttribute("prefer-self")&&e.configure({preferSelf:!0});var t=o?.getAttribute("sheets-cache");t&&e.sheets.install({cacheName:t});await e.loadPageModules(["iswc-doc-demo-boot"]);await e.load("iswc-doc-demo");
